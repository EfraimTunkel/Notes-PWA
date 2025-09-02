import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Info, Check, RotateCcw } from './icons';

interface ToastProps {
  message: string;
  duration?: number;
  onDismiss: () => void;
  onUndo?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 5000, onDismiss, onUndo }) => {
  const [visible, setVisible] = useState(false);
  const [dragState, setDragState] = useState({ startY: 0, deltaY: 0, isDragging: false });
  const toastRef = useRef<HTMLDivElement>(null);
  // FIX: Provide an initial value of `undefined` to `useRef`. The no-argument overload for `useRef` can cause an "Expected 1 arguments, but got 0" error with some TypeScript configurations.
  const dismissTimer = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  useEffect(() => {
    setVisible(true);
    dismissTimer.current = setTimeout(dismiss, duration);
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [duration, dismiss]);

  const handleUndo = () => {
    if (onUndo) onUndo();
    dismiss();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setDragState({ ...dragState, startY: e.touches[0].clientY, isDragging: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragState.isDragging) return;
    const currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - dragState.startY); // Only allow swiping down
    setDragState(s => ({ ...s, deltaY: delta }));
  };

  const handleTouchEnd = () => {
    if (!dragState.isDragging) return;
    
    // FIX: This logic now correctly handles taps and small drags, restarting the timer.
    const currentDeltaY = dragState.deltaY;
    setDragState({ startY: 0, deltaY: 0, isDragging: false });

    if (currentDeltaY > 50) { // Dismiss threshold
      dismiss();
    } else {
      // Snap back and restart timer
      dismissTimer.current = setTimeout(dismiss, duration - 1000); // Resume timer with a bit less time
    }
  };

  const opacity = Math.max(0, 1 - (dragState.deltaY / 150));
  const transform = `translateY(${dragState.deltaY}px)`;
  const transition = dragState.isDragging ? 'none' : 'all 0.3s ease';

  return (
    <div
      ref={toastRef}
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 shadow-2xl ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{
        transform: `translateX(-50%) ${transform}`,
        opacity,
        transition,
        touchAction: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Check size={20} className="text-green-400 dark:text-green-600" />
      <span className="font-medium text-sm">{message}</span>
      {onUndo && (
        <>
          <div className="w-px h-4 bg-gray-600 dark:bg-gray-400"></div>
          <button onClick={handleUndo} className="flex items-center gap-1.5 text-sm font-bold text-indigo-300 dark:text-indigo-500 hover:underline">
            <RotateCcw size={16} />
            Undo
          </button>
        </>
      )}
    </div>
  );
};
