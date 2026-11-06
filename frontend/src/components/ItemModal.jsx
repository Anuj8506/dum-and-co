import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { money } from '../utils/format';
import { useApp } from '../utils/AppContext';
import { DietMark } from './MenuCard';
export default function ItemModal({ item, onClose }) {
  const { addToCart } = useApp();
  const [portion, setPortion] = useState(item.portions[0].name),
    [addons, setAddons] = useState([]);
  const dialog = useRef();
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  const price =
    Math.round(item.pricePaise * item.portions.find((p) => p.name === portion).multiplier) +
    item.addons.filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.pricePaise, 0);
  return (
    <dialog
      ref={dialog}
      className="item-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-content">
        <button className="modal-close" aria-label="Close item" onClick={onClose}>
          <X size={20} />
        </button>
        <img className="modal-image" src={item.image} alt={item.name} />
        <div className="modal-body">
          <DietMark vegetarian={item.vegetarian} />
          <h2>{item.name}</h2>
          <p>{item.description}</p>
          <p className="allergens">
            Allergens: {item.allergens.length ? item.allergens.join(', ') : 'None listed'}. Prepared
            in a shared kitchen.
          </p>
          <fieldset>
            <legend>Make it your portion</legend>
            {item.portions.map((p) => (
              <label className="choice" key={p.name}>
                <input
                  type="radio"
                  name="portion"
                  value={p.name}
                  checked={portion === p.name}
                  onChange={() => setPortion(p.name)}
                />
                <span>{p.name}</span>
                <b>{money(Math.round(item.pricePaise * p.multiplier))}</b>
              </label>
            ))}
          </fieldset>
          {item.addons.length > 0 && (
            <fieldset>
              <legend>A little extra?</legend>
              {item.addons.map((a) => (
                <label className="choice" key={a.name}>
                  <input
                    type="checkbox"
                    checked={addons.includes(a.name)}
                    onChange={(e) =>
                      setAddons(
                        e.target.checked ? [...addons, a.name] : addons.filter((n) => n !== a.name)
                      )
                    }
                  />
                  <span>{a.name}</span>
                  <b>+{money(a.pricePaise)}</b>
                </label>
              ))}
            </fieldset>
          )}
          <button
            disabled={!item.available}
            className="button full"
            onClick={() => {
              addToCart({
                menuItem: item._id,
                name: item.name,
                image: item.image,
                portion,
                addons,
                unitPaise: price,
              });
              onClose();
            }}
          >
            <Plus size={18} /> Add to bag <span className="push-right">{money(price)}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
