import React from 'react';

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const TIME_UNITS = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1
};

export const formatRelativeTime = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return "just now";

  for (const [unit, value] of Object.entries(TIME_UNITS)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return date.toLocaleString();
};

// FIX: Replaced JSX with React.createElement to make it valid in a .ts file.
export const highlightText = (text: string, highlight: string): React.ReactNode => {
    if (!highlight || !highlight.trim()) {
        return text;
    }
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return React.createElement(React.Fragment, null,
        parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase() ? (
                React.createElement('mark', {
                    key: i,
                    className: "bg-yellow-200 dark:bg-yellow-500/50 rounded p-0 m-0"
                }, part)
            ) : (
                part
            )
        )
    );
};
