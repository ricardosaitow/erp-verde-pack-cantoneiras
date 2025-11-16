import React, { ReactNode } from 'react';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`bg-white rounded-lg shadow-xl transform transition-all w-full ${sizeClasses[size]} flex flex-col overflow-hidden`} style={{ height: '90vh', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white z-10">
          <h2 id="modal-title" className="text-xl font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            aria-label="Fechar modal"
          >
            <XIcon />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
