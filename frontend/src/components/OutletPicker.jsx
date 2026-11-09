import { useEffect, useRef } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useApp } from '../utils/AppContext';

export default function OutletPicker() {
  const { user, menu, outletId, chooseOutlet } = useApp();
  const picker = useRef(null);
  const trigger = useRef(null);
  const locked = user?.role === 'kitchen';
  const currentId = locked ? user.outlet : outletId || menu.outlet?._id;
  const current = menu.outlets.find((outlet) => outlet._id === currentId) || menu.outlet;
  const canChoose = !locked && menu.outlets.length > 0;

  useEffect(() => {
    if (!canChoose) return;
    const closeOutside = (event) => {
      if (picker.current?.open && !picker.current.contains(event.target)) {
        picker.current.open = false;
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [canChoose]);

  const close = () => {
    picker.current.open = false;
    trigger.current.focus({ preventScroll: true });
  };

  const handleKeys = (event) => {
    if (event.key === 'Escape' && picker.current.open) {
      event.preventDefault();
      close();
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    picker.current.open = true;
    const options = Array.from(picker.current.querySelectorAll('button'));
    const index = options.indexOf(document.activeElement);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = index < 0 && direction < 0 ? options.length - 1 : index + direction;
    options[(next + options.length) % options.length]?.focus();
  };

  const location = (
    <>
      <span className="outlet-pin">
        <MapPin size={18} aria-hidden="true" />
      </span>
      <span className="outlet-trigger-text">
        <span className="outlet-caption">Your kitchen</span>
        <span className="outlet-name">{current?.name || 'Local kitchen'}</span>
      </span>
    </>
  );

  return (
    <div className="outlet-picker">
      {canChoose ? (
        <details
          ref={picker}
          onKeyDown={handleKeys}
          onBlur={(event) => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
              event.currentTarget.open = false;
            }
          }}
        >
          <summary className="outlet-trigger" ref={trigger}>
            {location}
            <ChevronDown className="outlet-chevron" size={16} aria-hidden="true" />
          </summary>
          <div className="outlet-panel" role="group" aria-label="Choose a kitchen">
            <p>Choose a kitchen</p>
            {menu.outlets.map((outlet) => (
              <button
                key={outlet._id}
                type="button"
                className="outlet-option"
                aria-current={outlet._id === current?._id ? 'true' : undefined}
                onClick={() => {
                  if (outlet._id !== current?._id) chooseOutlet(outlet._id);
                  close();
                }}
              >
                <span className="outlet-option-text">
                  <span>{outlet.name}</span>
                  {outlet.address && <small>{outlet.address}</small>}
                </span>
                {outlet._id === current?._id && (
                  <span className="outlet-check">
                    <Check size={15} strokeWidth={2.3} aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </details>
      ) : (
        <div className="outlet-trigger">{location}</div>
      )}
    </div>
  );
}
