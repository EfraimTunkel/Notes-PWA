import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Note } from '../types';
import { Folder, Pin, PinOff, Trash2, Tag, RotateCcw, Copy, MoreVertical } from './icons';
import { formatRelativeTime, highlightText } from '../utils';

interface NoteCardProps {
  note: Note;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onPinNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  cardViewType: 'grid' | 'list';
  isTrashView: boolean;
  setActiveTagFilter: (tag: string) => void;
  searchTerm?: string;
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, onSelectNote, onDeleteNote, onPinNote, onRestoreNote, onDeletePermanently,
  onDuplicateNote, cardViewType, isTrashView, setActiveTagFilter, searchTerm
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const cardBaseClasses = "bg-white dark:bg-gray-800 rounded-lg p-5 flex flex-col justify-between border border-gray-200/80 dark:border-gray-700/60 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-1";
  const cardListViewClasses = "flex-row items-start";

  const contentPreview = useMemo(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content || '';
    return tempDiv.textContent || tempDiv.innerText || 'No content';
  }, [note.content]);

  const handleNoteClick = () => {
    if (!isTrashView) {
      onSelectNote(note.id);
    }
  };

  return (
    <div className={`${cardBaseClasses} ${cardViewType === 'list' ? cardListViewClasses : ''} ${isTrashView ? 'opacity-70 hover:opacity-100' : ''}`}>
      <div onClick={handleNoteClick} className={`${!isTrashView ? 'cursor-pointer' : ''} flex-1`}>
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">{highlightText(note.title || 'Untitled Note', searchTerm || '')}</h3>
        <p className={`text-gray-600 dark:text-gray-400 text-sm line-clamp-4`}>{highlightText(contentPreview, searchTerm || '')}</p>
      </div>
      <div className={`flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 ${cardViewType === 'list' ? 'mt-0 pt-0 border-t-0 ml-4 flex-shrink-0' : ''}`}>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center truncate" title={new Date(note.timestamp).toLocaleString()}>
          {note.folder && <Folder size={14} className="mr-1.5 flex-shrink-0" />}
          <span className="truncate">{note.folder || 'Inbox'}</span>
          <span className="mx-1.5">&middot;</span>
          {formatRelativeTime(new Date(note.timestamp))}
        </span>

        <div className="flex items-center space-x-1">
          {isTrashView ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); onRestoreNote(note.id); }} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-all" aria-label="Restore"><RotateCcw size={18} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDeletePermanently(note.id); }} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all" aria-label="Delete permanently"><Trash2 size={18} /></button>
            </>
          ) : (
            <div className="relative" ref={optionsRef}>
              <button onClick={(e) => { e.stopPropagation(); onPinNote(note.id); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400" aria-label={note.isPinned ? "Unpin" : "Pin"}>
                {note.isPinned ? <PinOff size={18} className="text-indigo-500" /> : <Pin size={18} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowOptions(s => !s); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400" aria-label="More options">
                <MoreVertical size={18} />
              </button>
              {showOptions && (
                <div className="absolute right-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-2xl py-1 z-20 border border-gray-200 dark:border-gray-600 animate-fade-in-up">
                  <button onClick={(e) => { e.stopPropagation(); onDuplicateNote(note.id); setShowOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"><Copy size={14} className="mr-2" /> Duplicate</button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); setShowOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"><Trash2 size={14} className="mr-2" /> Move to Trash</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
