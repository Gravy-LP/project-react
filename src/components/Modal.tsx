import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="detail-modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content glass-panel">
        <button className="close-modal" onClick={onClose}>
          <i className="ph ph-x" />
        </button>
        <div className="modal-body-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
