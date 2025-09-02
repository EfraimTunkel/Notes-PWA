import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Note, ViewType, SortType } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateUUID, highlightText } from './utils';
import { NotesList } from './components/NotesList';
import { NoteEditor } from './components/NoteEditor';
import { AlertDialog } from './components/AlertDialog';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { PromptDialog } from './components/PromptDialog';
import { Plus, CircleAlert, Menu, Search, FolderPlus, Folder } from './components/icons';

const FOLDER_NAME_MAX_LENGTH = 30;

// Mobile Search Overlay Component
const MobileSearch: React.FC<{
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onClose: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isActive: boolean;
  notes: Note[];
  onSelectNote: (id: string) => void;
}> = ({ searchTerm, setSearchTerm, onClose, searchInputRef, isActive, notes, onSelectNote }) => {
  useEffect(() => {
    if (isActive) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isActive, searchInputRef]);

  if (!isActive) return null;

  return (
    <div className="md:hidden fixed inset-0 bg-gray-50 dark:bg-gray-900 z-40 flex flex-col animate-fade-in" role="dialog" aria-modal="true">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-500 dark:text-gray-400" size={20} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search all notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded-lg pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
          />
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {searchTerm && notes.length > 0 && (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {notes.map(note => {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = note.content || '';
              const contentPreview = tempDiv.textContent || tempDiv.innerText || '';

              return (
                <li key={note.id}>
                  <button 
                    onClick={() => onSelectNote(note.id)} 
                    className="w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                      {highlightText(note.title || 'Untitled Note', searchTerm)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mt-1">
                      {highlightText(contentPreview, searchTerm)}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                      <Folder size={14} className="mr-1.5 flex-shrink-0" />
                      <span className="truncate">{note.folder || 'Inbox'}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {searchTerm && notes.length === 0 && (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
            <Search size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300">No results found</h3>
            <p className="mt-1">Try searching for something else.</p>
          </div>
        )}
        {!searchTerm && (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
            <Search size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300">Search your notes</h3>
            <p className="mt-1">Find notes by title, content, or tag.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Bottom Navigation Component
const BottomNav: React.FC<{
  onMenuOpen: () => void;
  onNewNote: () => void;
  onSearch: () => void;
}> = ({ onMenuOpen, onNewNote, onSearch }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 z-30 grid grid-cols-5 items-center">
      <button onClick={onMenuOpen} className="flex justify-center items-center h-full hover:bg-gray-200 dark:hover:bg-gray-700 col-span-2" aria-label="Open menu">
        <Menu size={24} />
      </button>
      <div className="flex justify-center">
        <button
          onClick={onNewNote}
          className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all transform active:scale-95 hover:scale-105 -translate-y-4"
          aria-label="Create new note"
          title="New Note (Ctrl+N)"
        >
          <Plus size={28} />
        </button>
      </div>
      <button onClick={onSearch} className="flex justify-center items-center h-full hover:bg-gray-200 dark:hover:bg-gray-700 col-span-2" aria-label="Search notes" title="Search (Ctrl+F)">
        <Search size={24} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [notes, setNotes] = useLocalStorage<Note[]>('notesApp', []);
  const [userFolders, setUserFolders] = useLocalStorage<string[]>('userFolders', ['Inbox']);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState('All Notes');
  
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('notesAppDarkMode', false);
  const [cardViewType, setCardViewType] = useLocalStorage<ViewType>('notesAppViewType', 'grid');
  const [sortBy, setSortBy] = useLocalStorage<SortType>('notesAppSortBy', 'most_recent');
  
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; confirmText: string; onConfirm: () => void; onCancel?: () => void; } | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string, id: number, onUndo?: () => void } | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [promptInfo, setPromptInfo] = useState<{ title: string; message: string; placeholder: string; initialValue?: string; confirmText: string; onConfirm: (value: string) => void; maxLength?: number } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>('notesAppSidebarCollapsed', false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('focus-mode', isFocusMode && !!selectedNoteId);
    
    const lightTheme = document.querySelector('link[href*="github.min.css"]') as HTMLLinkElement;
    const darkTheme = document.querySelector('link[href*="github-dark.min.css"]') as HTMLLinkElement;

    if (lightTheme && darkTheme) {
        lightTheme.disabled = isDarkMode;
        darkTheme.disabled = !isDarkMode;
    }
  }, [isDarkMode, isFocusMode, selectedNoteId]);
  
  useEffect(() => {
    const handleResize = () => {
      // Tailwind's `md` breakpoint is 768px.
      // If the window is smaller than the desktop breakpoint and the sidebar is collapsed, expand it.
      if (window.innerWidth < 768 && isSidebarCollapsed) {
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial render to set correct state

    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed, setIsSidebarCollapsed]);

  const showToast = useCallback((message: string) => {
    setToastInfo({ message, id: Date.now() });
  }, []);
  
  const allFolders = useMemo(() => {
    const specialFolders = ['All Notes'];
    if (notes.some(n => n.isDeleted)) {
        specialFolders.push('Trash');
    }
    // Ensure Inbox is always first in user folders
    const sortedUserFolders = [...new Set(userFolders)].sort((a, b) => {
        if (a === 'Inbox') return -1;
        if (b === 'Inbox') return 1;
        return a.localeCompare(b);
    });
    return [...specialFolders, ...sortedUserFolders];
  }, [notes, userFolders]);

  const handleCreateFolder = useCallback((folderName: string) => {
      const trimmed = folderName.trim();
      if (!trimmed) return;
      if (trimmed.length > FOLDER_NAME_MAX_LENGTH) {
        showToast(`Folder name cannot exceed ${FOLDER_NAME_MAX_LENGTH} characters.`);
        return;
      }
      if (allFolders.map(f => f.toLowerCase()).includes(trimmed.toLowerCase())) {
          showToast(`Folder "${trimmed}" already exists.`);
          return;
      }
      setUserFolders(prev => [...prev, trimmed]);
      setCurrentFolder(trimmed);
      showToast(`Folder "${trimmed}" created.`);
  }, [allFolders, setUserFolders, showToast]);

  const handleShowCreateFolderPrompt = useCallback(() => {
    setPromptInfo({
        title: "Create New Folder",
        message: "Enter a name for your new folder. You can add notes to it later.",
        placeholder: "e.g. Work, Ideas, Recipes",
        confirmText: "Create Folder",
        maxLength: FOLDER_NAME_MAX_LENGTH,
        onConfirm: (folderName) => {
            handleCreateFolder(folderName);
            setPromptInfo(null);
        }
    });
  }, [handleCreateFolder]);

  const handleAddNote = useCallback(() => {
    const newNote: Note = {
      id: generateUUID(),
      title: 'New Note',
      content: '',
      timestamp: new Date(),
      isPinned: false,
      folder: currentFolder === 'All Notes' || currentFolder === 'Trash' ? 'Inbox' : currentFolder,
      tags: [],
      isDeleted: false,
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  }, [currentFolder, setNotes]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;
        const target = e.target as HTMLElement;

        // Escape key logic
        if (e.key === 'Escape') {
            if (alertInfo || promptInfo) {
                setAlertInfo(null);
                setPromptInfo(null);
            } else if (isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            } else if (isSearchActive) {
                setIsSearchActive(false);
                setSearchTerm('');
            } else if (selectedNoteId) {
                setSelectedNoteId(null);
                setIsFocusMode(false);
            }
            return;
        }
        
        // Prevent shortcuts from firing inside inputs/textareas, except for search
        const isEditing = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
        if (isEditing && !(isCtrlCmd && (e.key === 'f' || e.key === 'k'))) {
            return;
        }

        // App-level shortcuts
        if (isCtrlCmd && e.key === 'n') {
            e.preventDefault();
            handleAddNote();
        }

        if (isCtrlCmd && (e.key === 'f' || e.key === 'k')) {
            e.preventDefault();
            if (selectedNoteId) return; // Don't allow search when editor is open
            if (window.innerWidth < 768) { // Mobile
                setIsSearchActive(true);
            } else { // Desktop
                searchInputRef.current?.focus();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [handleAddNote, selectedNoteId, alertInfo, promptInfo, isSearchActive, isMobileMenuOpen]);


  const handleUpdateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  }, [setNotes]);

  const handleRestoreNote = useCallback((id: string, silent = false) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isDeleted: false, deletedTimestamp: undefined } : n));
    if (!silent) {
      showToast("Note restored.");
    }
  }, [setNotes, showToast]);

  const handleMoveToTrash = useCallback((id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isDeleted: true, isPinned: false, deletedTimestamp: new Date() } : n));
    if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setIsFocusMode(false);
    }
    setToastInfo({
        message: "Note moved to trash.",
        id: Date.now(),
        onUndo: () => handleRestoreNote(id, true)
    });
  }, [setNotes, selectedNoteId, handleRestoreNote]);

  const handleDeletePermanently = useCallback((id: string) => {
      setAlertInfo({
          title: "Delete Note Permanently?",
          message: "This action cannot be undone. The note will be gone forever.",
          confirmText: "Delete",
          onConfirm: () => {
              setNotes(prev => prev.filter(note => note.id !== id));
              setAlertInfo(null);
              showToast("Note permanently deleted.");
          },
          onCancel: () => setAlertInfo(null)
      });
  }, [setNotes, showToast]);

  const handleEmptyTrash = useCallback(() => {
      setAlertInfo({
          title: "Empty Trash?",
          message: "All notes in the trash will be permanently deleted. This cannot be undone.",
          confirmText: "Empty Trash",
          onConfirm: () => {
              setNotes(prev => prev.filter(note => !note.isDeleted));
              setAlertInfo(null);
              showToast("Trash has been emptied.");
          },
          onCancel: () => setAlertInfo(null)
      });
  }, [setNotes, showToast]);

  const handlePinNote = useCallback((id: string) => {
    setNotes(prev => {
        const noteToPin = prev.find(n => n.id === id);
        if (!noteToPin) return prev;
        const updatedNote = { ...noteToPin, isPinned: !noteToPin.isPinned, timestamp: new Date() };
        showToast(updatedNote.isPinned ? "Note pinned." : "Note unpinned.");
        return [updatedNote, ...prev.filter(n => n.id !== id)];
    });
  }, [setNotes, showToast]);
  
  const handleDuplicateNote = useCallback((id: string) => {
    const noteToDuplicate = notes.find(n => n.id === id);
    if (noteToDuplicate) {
      const newNote: Note = {
        ...noteToDuplicate,
        id: generateUUID(),
        title: `Copy of ${noteToDuplicate.title}`,
        timestamp: new Date(),
        isPinned: false,
      };
      setNotes(prev => [newNote, ...prev]);
      showToast("Note duplicated.");
    }
  }, [notes, setNotes, showToast]);
  
  const handleRenameFolder = useCallback((oldName: string, newName: string) => {
    if (!newName || newName.trim() === '' || oldName === newName) return;
    if (['All Notes', 'Trash', 'Inbox'].includes(oldName)) {
        showToast("Cannot rename special folders.");
        return;
    }
    const trimmedNewName = newName.trim();
     if (trimmedNewName.length > FOLDER_NAME_MAX_LENGTH) {
        showToast(`Folder name cannot exceed ${FOLDER_NAME_MAX_LENGTH} characters.`);
        return;
    }
    if (allFolders.map(f => f.toLowerCase()).includes(trimmedNewName.toLowerCase())) {
        showToast(`Folder "${trimmedNewName}" already exists.`);
        return;
    }

    setNotes(prev => prev.map(note => note.folder === oldName ? { ...note, folder: trimmedNewName } : note));
    setUserFolders(prev => prev.map(f => f === oldName ? trimmedNewName : f));
    
    if (currentFolder === oldName) {
      setCurrentFolder(trimmedNewName);
    }
    showToast(`Folder renamed to "${trimmedNewName}".`);
  }, [setNotes, setUserFolders, allFolders, currentFolder, showToast]);

  const handleDeleteFolder = useCallback((folderName: string) => {
    if (['All Notes', 'Trash', 'Inbox'].includes(folderName)) {
        showToast("Cannot delete special folders.");
        return;
    }

    setAlertInfo({
      title: `Delete "${folderName}"?`,
      message: `All notes in this folder will be moved to your Inbox. This action cannot be undone.`,
      confirmText: "Delete Folder",
      onConfirm: () => {
        setNotes(prev => prev.map(note => note.folder === folderName ? { ...note, folder: 'Inbox' } : note));
        setUserFolders(prev => prev.filter(f => f !== folderName));
        if (currentFolder === folderName) {
            setCurrentFolder('Inbox');
        }
        setAlertInfo(null);
        showToast(`Folder "${folderName}" deleted.`);
      },
      onCancel: () => setAlertInfo(null)
    });
  }, [setNotes, setUserFolders, currentFolder, showToast]);

  const handleRenameCurrentFolderRequest = useCallback(() => {
    if (['All Notes', 'Trash', 'Inbox'].includes(currentFolder)) {
      showToast("Cannot rename special folders.");
      return;
    }
    setPromptInfo({
        title: `Rename "${currentFolder}"`,
        message: "Enter a new name for this folder.",
        placeholder: "New folder name",
        initialValue: currentFolder,
        confirmText: "Rename",
        maxLength: FOLDER_NAME_MAX_LENGTH,
        onConfirm: (newName) => {
            handleRenameFolder(currentFolder, newName);
            setPromptInfo(null);
        }
    });
  }, [currentFolder, handleRenameFolder, showToast]);
  
  const handleDeleteCurrentFolderRequest = useCallback(() => {
    handleDeleteFolder(currentFolder);
  }, [currentFolder, handleDeleteFolder]);

  const folderNoteCounts = useMemo(() => {
    const nonTrashedNotes = notes.filter(n => !n.isDeleted);
    const counts: { [key: string]: number } = { 
        'All Notes': nonTrashedNotes.length,
        'Trash': notes.length - nonTrashedNotes.length
    };
    nonTrashedNotes.forEach(note => {
      const folder = note.folder || 'Inbox';
      counts[folder] = (counts[folder] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (searchTerm) {
      const allNotes = notes.filter(note => !note.isDeleted);
      return allNotes.filter(note =>
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    
    let notesToFilter: Note[];
    if (currentFolder === 'Trash') {
        notesToFilter = notes.filter(note => note.isDeleted);
    } else if (currentFolder === 'All Notes') {
        notesToFilter = notes.filter(note => !note.isDeleted);
    } else {
        notesToFilter = notes.filter(note => (note.folder || 'Inbox') === currentFolder && !note.isDeleted);
    }

    const byTag = activeTagFilter ? notesToFilter.filter(note => note.tags.includes(activeTagFilter)) : notesToFilter;
    
    return byTag;
  }, [notes, searchTerm, currentFolder, activeTagFilter]);

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      switch (sortBy) {
        case 'oldest': return a.timestamp.getTime() - b.timestamp.getTime();
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        case 'most_recent': default: return b.timestamp.getTime() - a.timestamp.getTime();
      }
    });
  }, [filteredNotes, sortBy]);

  const handleExport = useCallback((format: 'json' | 'md') => {
    let content = '';
    const filename = `notes-export-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(notes.filter(n => !n.isDeleted), null, 2);
    } else {
      content = sortedNotes.map(note => {
        const tags = note.tags.length ? `Tags: #${note.tags.join(' #')}` : '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        
        tempDiv.querySelectorAll('.todo-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const contentSpan = item.querySelector('.todo-content');
            const isChecked = item.getAttribute('data-checked') === 'true' || checkbox?.checked;
            const text = contentSpan ? contentSpan.textContent : item.textContent;
            item.outerHTML = `* [${isChecked ? 'x' : ' '}] ${text}`;
        });
        
        tempDiv.querySelectorAll('pre code').forEach(code => {
            const lang = [...code.classList].find(c => c.startsWith('language-'))?.replace('language-', '') || '';
            code.parentElement!.outerHTML = "\n```" + lang + "\n" + code.textContent + "\n```\n";
        });
        
        const markdownContent = tempDiv.innerText;

        return `---
# ${note.title || 'Untitled Note'}
*Folder: ${note.folder || 'Inbox'} | Last Modified: ${new Date(note.timestamp).toLocaleString()}*
${tags}
---

${markdownContent}

`;
      }).join('\n\n====================\n\n');
    }
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [notes, sortedNotes]);
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedNotes = JSON.parse(text) as Note[];
        
        if (!Array.isArray(importedNotes)) throw new Error("Invalid format: not an array.");

        const mergedNotes = [...notes];
        let importedCount = 0;

        importedNotes.forEach(importedNote => {
            if (importedNote.id && importedNote.title) {
                const existingNote = notes.find(n => n.id === importedNote.id);
                const newNote = { ...importedNote, id: existingNote ? generateUUID() : importedNote.id };
                mergedNotes.unshift(newNote);
                importedCount++;
            }
        });

        setNotes(mergedNotes);
        showToast(`${importedCount} notes imported successfully!`);
      } catch (error) {
        console.error("Import failed:", error);
        setAlertInfo({ title: "Import Failed", message: `Please ensure the file is a valid JSON export from this app. Error: ${error.message}`, confirmText: "OK", onConfirm: () => setAlertInfo(null) });
      } finally {
        if(event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };
  
  const handleImportCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            // Naive parser: split by newline, then comma. Does not handle commas in quotes well.
            const rows = text.split('\n').map(row => row.split(','));
            
            if (rows.length === 0 || (rows.length === 1 && rows[0].length <= 1 && rows[0][0] === '')) {
                showToast("CSV file is empty or invalid.");
                return;
            }

            let tableHtml = '<div class="table-wrapper" contenteditable="false"><table contenteditable="true">';
            // Header
            tableHtml += '<thead><tr>';
            rows[0].forEach(header => {
                tableHtml += `<th><p>${header.trim() || ''}</p></th>`;
            });
            tableHtml += '</tr></thead>';
            // Body
            tableHtml += '<tbody>';
            rows.slice(1).forEach(row => {
                if (row.some(cell => cell.trim() !== '')) { // Skip empty rows
                    tableHtml += '<tr>';
                    for (let i = 0; i < rows[0].length; i++) {
                        tableHtml += `<td><p>${(row[i] || '').trim()}</p></td>`;
                    }
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table></div><p><br></p>';

            const newNote: Note = {
                id: generateUUID(),
                title: file.name.replace(/\.csv$/i, ''),
                content: tableHtml,
                timestamp: new Date(),
                isPinned: false,
                folder: 'Inbox',
                tags: [],
                isDeleted: false,
            };

            setNotes(prev => [newNote, ...prev]);
            setSelectedNoteId(newNote.id);
            showToast(`Imported "${file.name}" successfully.`);

        } catch (error) {
            console.error("CSV Import failed:", error);
            setAlertInfo({ title: "Import Failed", message: `Could not parse the CSV file. Error: ${(error as Error).message}`, confirmText: "OK", onConfirm: () => setAlertInfo(null) });
        } finally {
            if (event.target) event.target.value = "";
        }
    };
    reader.readAsText(file);
  };

  const selectedNote = useMemo(() => notes.find(note => note.id === selectedNoteId), [notes, selectedNoteId]);
  
  const handleSelectNoteFromSearch = useCallback((id: string) => {
    setSelectedNoteId(id);
    setIsSearchActive(false);
    setSearchTerm(''); 
  }, []);


  return (
    <div className="h-screen w-screen flex bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
      <Sidebar
        allFolders={allFolders}
        folderNoteCounts={folderNoteCounts}
        currentFolder={currentFolder}
        setCurrentFolder={(folder) => {
          setCurrentFolder(folder);
          setSelectedNoteId(null);
          setActiveTagFilter('');
          setSearchTerm('');
          setIsSearchActive(false);
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onImport={handleImport}
        onImportCsv={handleImportCsv}
        onExport={handleExport}
        onShowCreateFolderPrompt={handleShowCreateFolderPrompt}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onAddNewNote={handleAddNote}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      <main className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-gray-900/95">
        {selectedNote ? (
          <div className="p-2 sm:p-4 h-full">
            <NoteEditor
                note={selectedNote}
                onSave={handleUpdateNote}
                onDelete={handleMoveToTrash}
                onPin={handlePinNote}
                onBack={() => {
                    setSelectedNoteId(null);
                    setIsFocusMode(false);
                }}
                allFolders={allFolders}
                showAlert={showToast}
                isFocusMode={isFocusMode}
                setIsFocusMode={setIsFocusMode}
            />
          </div>
        ) : (
          <>
            <MobileSearch
              isActive={isSearchActive}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onClose={() => {
                setIsSearchActive(false);
                setSearchTerm('');
              }}
              searchInputRef={searchInputRef}
              notes={sortedNotes}
              onSelectNote={handleSelectNoteFromSearch}
            />
            <NotesList
              notes={sortedNotes}
              onSelectNote={setSelectedNoteId}
              onDeleteNote={handleMoveToTrash}
              onPinNote={handlePinNote}
              onDuplicateNote={handleDuplicateNote}
              onRestoreNote={handleRestoreNote}
              onDeletePermanently={handleDeletePermanently}
              onEmptyTrash={handleEmptyTrash}
              onAddNewNote={handleAddNote}
              onAddNewFolder={handleShowCreateFolderPrompt}
              currentFolder={currentFolder}
              cardViewType={cardViewType}
              setCardViewType={setCardViewType}
              sortBy={sortBy}
              setSortBy={setSortBy}
              activeTagFilter={activeTagFilter}
              setActiveTagFilter={setActiveTagFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchInputRef={searchInputRef}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              onRenameCurrentFolder={handleRenameCurrentFolderRequest}
              onDeleteCurrentFolder={handleDeleteCurrentFolderRequest}
            />
          </>
        )}
      </main>

      {!selectedNoteId && (
        <BottomNav
          onMenuOpen={() => setIsMobileMenuOpen(true)}
          onNewNote={handleAddNote}
          onSearch={() => {
            setIsSearchActive(true);
          }}
        />
      )}

      {toastInfo && (
        <Toast
          key={toastInfo.id}
          message={toastInfo.message}
          onDismiss={() => setToastInfo(null)}
          onUndo={toastInfo.onUndo}
        />
      )}

      {alertInfo && (
        <AlertDialog
          title={alertInfo.title}
          message={alertInfo.message}
          onConfirm={alertInfo.onConfirm}
          onCancel={alertInfo.onCancel ?? (() => setAlertInfo(null))}
          confirmText={alertInfo.confirmText}
          cancelText={alertInfo.onCancel ? "Cancel" : undefined}
          icon={<CircleAlert size={48} className={alertInfo.title.includes("Delete") || alertInfo.title.includes("Empty") ? "text-red-500" : "text-indigo-500"} />}
        />
      )}
      
      {promptInfo && (
        <PromptDialog
          title={promptInfo.title}
          message={promptInfo.message}
          placeholder={promptInfo.placeholder}
          initialValue={promptInfo.initialValue}
          confirmText={promptInfo.confirmText}
          onConfirm={promptInfo.onConfirm}
          onCancel={() => setPromptInfo(null)}
          icon={<FolderPlus size={48} className="text-indigo-500" />}
          maxLength={promptInfo.maxLength}
        />
      )}
    </div>
  );
};

export default App;