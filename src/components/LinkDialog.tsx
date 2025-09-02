import React, { useState, useEffect, useRef } from 'react';
import { Link, X } from './icons';

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { url: string; text: string }) => void;
  initialText?: string;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({ isOpen, onClose, onConfirm, initialText = '' }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState(initialText);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl('');
      // Timeout to allow the dialog to render before focusing
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialText]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    const trimmedUrl = url.trim();
    if (trimmedUrl) {
      const trimmedText = text.trim();
      onConfirm({ url: trimmedUrl, text: trimmedText || trimmedUrl });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 transform transition-all animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center mb-4">
          <Link size={48} className="text-indigo-500" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-center text-gray-900 dark:text-gray-100">Create a Link</h3>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">Enter the destination URL. You can also provide optional display text.</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
              id="link-url"
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
            />
          </div>
          <div>
            <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Text (optional)</label>
            <input
              id="link-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. My Website"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
            />
          </div>
        </div>
        
        <div className="flex justify-around space-x-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200 ease-in-out transform active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-full font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 ease-in-out transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            Create Link
          </button>
        </div>
      </div>
    </div>
  );
};
