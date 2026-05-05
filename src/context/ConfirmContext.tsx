import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import '../styles/confirm-modal.css';

interface ConfirmOptions {
  title?: string;
  message?: string;
}

interface ConfirmContextType {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>({ confirm: () => Promise.resolve(false) });

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('Sei sicuro?');
  const [message, setMessage] = useState("Questa azione non può essere annullata. Vuoi procedere con l'eliminazione?");
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirmFn = useCallback((options?: ConfirmOptions) => {
    if (options?.title) setTitle(options.title);
    if (options?.message) setMessage(options.message);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm: confirmFn }}>
      {children}
      {isOpen && (
        <div className="confirm-modal-overlay active" onClick={() => handleClose(false)}>
          <div className="confirm-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div className="confirm-icon">
                <i className="ph ph-warning-circle" />
              </div>
              <h2>{title}</h2>
              <p>{message}</p>
            </div>
            <div className="confirm-modal-actions">
              <button className="btn btn-ghost" onClick={() => handleClose(false)}>Annulla</button>
              <button className="btn btn-danger" onClick={() => handleClose(true)}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
