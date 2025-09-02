
import React from 'react';

interface AlertDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText: string;
  cancelText?: string;
  icon: React.ReactNode;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ title, message, onConfirm, onCancel, confirmText, cancelText, icon }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 transform transition-all animate-scale-in">
        <div className="flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">{message}</p>
        <div className="flex justify-around space-x-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200 ease-in-out transform active:scale-95"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-full font-semibold ${cancelText ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} shadow-md transition-all duration-200 ease-in-out transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${cancelText ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
