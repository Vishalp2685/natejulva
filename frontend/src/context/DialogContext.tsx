import React, { createContext, useContext, useState, useCallback } from 'react';

interface DialogContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showAlert: (title: string, message: string, onConfirm?: () => void) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmLabel?: string,
    cancelLabel?: string
  ) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'confirm' | 'alert' | 'loading'>('alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirmLabel, setConfirmLabel] = useState('Confirm');
  const [cancelLabel, setCancelLabel] = useState('Cancel');
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);

  const showLoading = useCallback((msg = 'Processing request...') => {
    setType('loading');
    setTitle('Please Wait');
    setMessage(msg);
    setOnConfirmCallback(null);
    setOnCancelCallback(null);
    setIsOpen(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showAlert = useCallback((t: string, msg: string, onConfirm?: () => void) => {
    setType('alert');
    setTitle(t);
    setMessage(msg);
    setOnConfirmCallback(onConfirm ? () => onConfirm : null);
    setOnCancelCallback(null);
    setIsOpen(true);
  }, []);

  const showConfirm = useCallback(
    (
      t: string,
      msg: string,
      onConfirm: () => void,
      onCancel?: () => void,
      cLabel = 'Confirm',
      canLabel = 'Cancel'
    ) => {
      setType('confirm');
      setTitle(t);
      setMessage(msg);
      setConfirmLabel(cLabel);
      setCancelLabel(canLabel);
      setOnConfirmCallback(() => onConfirm);
      if (onCancel) {
        setOnCancelCallback(() => onCancel);
      } else {
        setOnCancelCallback(null);
      }
      setIsOpen(true);
    },
    []
  );

  const hideDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (onConfirmCallback) {
      onConfirmCallback();
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (onCancelCallback) {
      onCancelCallback();
    }
  };

  return (
    <DialogContext.Provider value={{ showLoading, hideLoading, showAlert, showConfirm, hideDialog }}>
      {children}
      {isOpen && (
        <div style={backdropStyle} onClick={type !== 'loading' ? hideDialog : undefined}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            {type === 'loading' ? (
              <div style={loadingContainerStyle}>
                <div style={spinnerStyle}></div>
                <h3 style={titleStyle}>{title}</h3>
                <p style={messageStyle}>{message}</p>
              </div>
            ) : (
              <div>
                <h3 style={titleStyle}>{title}</h3>
                <p style={messageStyle}>{message}</p>
                <div style={actionsContainerStyle}>
                  {type === 'confirm' && (
                    <button style={cancelButtonStyle} onClick={handleCancel}>
                      {cancelLabel}
                    </button>
                  )}
                  <button style={confirmButtonStyle} onClick={handleConfirm}>
                    {type === 'confirm' ? confirmLabel : 'OK'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

// Styles for the dialog modal overlay and card matching the theme
const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(43, 29, 36, 0.55)',
  backdropFilter: 'blur(6px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  animation: 'dialog-fade-in 0.2s ease-out',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#FFFDF9',
  border: '1.5px solid rgba(212, 163, 115, 0.25)',
  borderRadius: '20px',
  padding: '2.5rem 2rem',
  width: '100%',
  maxWidth: '400px',
  boxShadow: '0 20px 50px rgba(128, 10, 63, 0.15)',
  animation: 'dialog-scale-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  textAlign: 'center',
};

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid rgba(128, 10, 63, 0.15)',
  borderTopColor: '#800A3F',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#800A3F',
  marginBottom: '0.75rem',
  marginTop: '0.5rem',
};

const messageStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  color: '#6E5F67',
  lineHeight: '1.55',
  marginBottom: '1.5rem',
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'center',
};

const confirmButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.75rem',
  backgroundColor: '#800A3F',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '0.88rem',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  boxShadow: '0 4px 12px rgba(128, 10, 63, 0.15)',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.75rem',
  backgroundColor: 'transparent',
  color: '#800A3F',
  border: '1.5px solid rgba(128, 10, 63, 0.2)',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '0.88rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
