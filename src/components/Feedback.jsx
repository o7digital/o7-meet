import { Icon } from './Icon';

export function LoadingState({ label = 'Cargando…' }) {
  return <div className="state-page"><div className="loader" /><p>{label}</p></div>;
}

export function EmptyState({ title, description, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name="calendar" /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Toast({ message, onClose }) {
  if (!message) return null;
  return <div className="toast" role="status"><Icon name="check" /><span>{message}</span><button onClick={onClose} aria-label="Cerrar"><Icon name="close" size={15} /></button></div>;
}

export function ConfirmDialog({ open, title, children, confirmLabel, secondaryLabel, onConfirm, onSecondary, onClose }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={onClose}><Icon name="close" /></button><h2 id="dialog-title">{title}</h2><div className="modal-content">{children}</div><div className="modal-actions">{secondaryLabel && <button className="secondary" onClick={onSecondary}>{secondaryLabel}</button>}<button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}
