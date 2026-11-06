import { useEffect, useRef } from 'react';
export default function WorkspaceModal({ children, onClose, labelledBy }) {
  const ref = useRef();
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      className="workspace-dialog"
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
