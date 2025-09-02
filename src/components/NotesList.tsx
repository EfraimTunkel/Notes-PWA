import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Note, ViewType, SortType } from '../types';
import { NoteCard } from './NoteCard';
import {
  Folder, LayoutGrid, LayoutList, ArrowDownNarrowWide,
  ArrowUpNarrowWide, ChevronDown, Check, Tag, X, Trash2,
  Search, MoreVertical, BookText, Plus, FolderPlus, PenLine
} from './icons';
import { formatRelativeTime } from '../utils';

interface NotesListProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onPinNote: (id: string) => void;
  onDuplicateNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onEmptyTrash: () => void;
  onAddNewNote: () => void;
  onAddNewFolder: () => void;
  currentFolder: string;
  cardViewType: ViewType;
  setCardViewType: React.Dispatch<React.SetStateAction<ViewType>>;
  sortBy: SortType;
  setSortBy: React.Dispatch<React.SetStateAction<SortType>>;
  activeTagFilter: string;
  setActiveTagFilter: (tag: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isSearchActive: boolean;
  setIsSearchActive: (isActive: boolean) => void;
  onRenameCurrentFolder: () => void;
  onDeleteCurrentFolder: () => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes, onSelectNote, onDeleteNote, onPinNote, onDuplicateNote, onRestoreNote, onDeletePermanently, onEmptyTrash, onAddNewNote, onAddNewFolder,
  currentFolder, cardViewType, setCardViewType, sortBy, setSortBy,
  activeTagFilter, setActiveTagFilter, searchTerm, setSearchTerm, searchInputRef, isSearchActive, setIsSearchActive,
  onRenameCurrentFolder, onDeleteCurrentFolder
}) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const isTrashView = currentFolder === 'Trash';
  const isUserFolder = !['All Notes', 'Trash', 'Inbox'].includes(currentFolder) && !activeTagFilter && !searchTerm;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getHeading = () => {
    if (activeTagFilter) return `#${activeTagFilter}`;
    if (searchTerm) return `Results for "${searchTerm}"`;
    return currentFolder;
  }

  return (
    <div className="flex flex-col animate-fade-in p-4 sm:p-6 lg:p-8 h-full">
      <header className="flex justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
            {currentFolder === 'Trash' ? <Trash2 size={32} className="text-gray-500 dark:text-gray-400"/> : <Folder size={32} className="text-gray-500 dark:text-gray-400"/>}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate">{getHeading()}</h1>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Search */}
            <div className={`hidden md:flex items-center rounded-full bg-gray-200/60 dark:bg-gray-800/60 transition-all duration-300 ${isSearchActive ? 'w-64 ring-1 ring-indigo-500 bg-white dark:bg-gray-900' : 'w-10'}`}>
                <button onClick={() => { setIsSearchActive(true); searchInputRef.current?.focus(); }} className="p-2.5" title="Search (Ctrl+F)">
                    <Search className="text-gray-500 dark:text-gray-400" size={20} />
                </button>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onBlur={() => !searchTerm && setIsSearchActive(false)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`h-full w-full bg-transparent focus:outline-none pr-4 transition-opacity ${isSearchActive ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>

            {/* More Options */}
            <div className="relative" ref={optionsMenuRef}>
                <button onClick={() => setShowOptionsMenu(s => !s)} className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/80">
                    <MoreVertical size={20} />
                </button>
                {showOptionsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-700 rounded-lg shadow-2xl py-2 z-20 border border-gray-200 dark:border-gray-600 animate-fade-in-down">
                      {/* View options */}
                      <div className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">VIEW</div>
                      <div className="flex justify-around items-center px-3 py-1">
                          <button onClick={() => setCardViewType('grid')} className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-l-md transition-colors ${cardViewType === 'grid' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                              <LayoutGrid size={18} /> Grid
                          </button>
                          <button onClick={() => setCardViewType('list')} className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-r-md transition-colors ${cardViewType === 'list' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                              <LayoutList size={18} /> List
                          </button>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                      {/* Sort options */}
                      <div className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">SORT BY</div>
                      <div>
                          <button onClick={() => {setSortBy('most_recent'); setShowOptionsMenu(false);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between">
                              Most Recent {sortBy === 'most_recent' && <Check size={16} />}
                          </button>
                          <button onClick={() => {setSortBy('oldest'); setShowOptionsMenu(false);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between">
                              Oldest {sortBy === 'oldest' && <Check size={16} />}
                          </button>
                          <button onClick={() => {setSortBy('title_asc'); setShowOptionsMenu(false);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between">
                              Title (A-Z) {sortBy === 'title_asc' && <Check size={16} />}
                          </button>
                          <button onClick={() => {setSortBy('title_desc'); setShowOptionsMenu(false);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between">
                              Title (Z-A) {sortBy === 'title_desc' && <Check size={16} />}
                          </button>
                      </div>

                      {isUserFolder && (
                        <>
                          <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                          <div className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">FOLDER ACTIONS</div>
                          <button onClick={() => { onRenameCurrentFolder(); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                            <PenLine size={16} /> Rename
                          </button>
                          <button onClick={() => { onDeleteCurrentFolder(); setShowOptionsMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                            <Trash2 size={16} /> Delete
                          </button>
                        </>
                      )}

                      {/* Mobile-only options */}
                      <div className="md:hidden">
                          <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                          <button onClick={() => {onAddNewFolder(); setShowOptionsMenu(false);}} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
                              <FolderPlus size={16} /> New Folder
                          </button>
                      </div>
                  </div>
                )}
            </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
            {isTrashView && notes.length > 0 && (
                <button onClick={onEmptyTrash} className="flex items-center justify-center px-4 py-2 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 font-semibold transition">
                    <Trash2 size={16} className="mr-2"/> Empty Trash
                </button>
            )}
            {activeTagFilter && (
                <div className="flex items-center animate-fade-in">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filtering by:</span>
                <span className="ml-2 px-3 py-1 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 rounded-full flex items-center">
                    <Tag size={14} className="mr-1.5" />
                    {activeTagFilter}
                    <button onClick={() => setActiveTagFilter('')} className="ml-2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 focus:outline-none p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/80">
                    <X size={14} />
                    </button>
                </span>
                </div>
            )}
        </div>
      </div>
      
      <div className={`flex-1 overflow-y-auto ${cardViewType === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col'} gap-5 auto-rows-min pb-20 md:pb-0 pt-2 -mx-2 px-2`}>
        {notes.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-8 h-full animate-fade-in">
            {isTrashView ? (
              <>
                <Trash2 size={80} className="mb-6 text-gray-400 dark:text-gray-500" />
                <h3 className="text-2xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Trash is empty
                </h3>
                <p className="max-w-sm">
                  When you move notes to the trash, they will appear here. You can restore them or delete them permanently.
                </p>
              </>
            ) : (
              <>
                <BookText size={80} className="mb-6 text-gray-400 dark:text-gray-500" />
                <h3 className="text-2xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Your workspace is ready
                </h3>
                <p className="max-w-sm mb-6">
                  Create your first note and watch your ideas come to life.
                </p>
                {!searchTerm && (
                  <button 
                      onClick={onAddNewNote} 
                      className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg transition-all duration-200 ease-in-out transform active:scale-95 hover:-translate-y-1"
                  >
                      <Plus size={20} className="mr-2"/> Create New Note
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          notes.map(note => (
            <NoteCard key={note.id} note={note} onSelectNote={onSelectNote} onDeleteNote={onDeleteNote} onPinNote={onPinNote} onDuplicateNote={onDuplicateNote} onRestoreNote={onRestoreNote} onDeletePermanently={onDeletePermanently} cardViewType={cardViewType} isTrashView={isTrashView} setActiveTagFilter={setActiveTagFilter} searchTerm={searchTerm} />
          ))
        )}
      </div>
    </div>
  );
};