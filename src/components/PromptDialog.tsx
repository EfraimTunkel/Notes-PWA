import React, { useState, useEffect, useRef } from 'react';
import { X } from './icons';

interface PromptDialogProps {
  title: string;
  message: string;
  placeholder: string;
  initialValue?: string;
  confirmText: string;
  onConfirm: (inputValue: string) => void;
  onCancel: () => void;
  icon: React.ReactNode;
  maxLength?: number;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  title, message, placeholder, initialValue = '', confirmText, onConfirm, onCancel, icon, maxLength
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 transform transition-all animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">{message}</p>
        <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
            />
            {maxLength && (
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1 pr-1">
                    {inputValue.length} / {maxLength}
                </div>
            )}
        </div>
        <div className="flex justify-around space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200 ease-in-out transform active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-full font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 ease-in-out transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};