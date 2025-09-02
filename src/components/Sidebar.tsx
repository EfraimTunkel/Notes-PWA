import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Folder, Moon, Sun, Trash2, Download, Upload, Plus, X, Menu, MoreVertical, PenLine, Check, ChevronsLeft, ChevronsRight, StickyNote, FileUp } from './icons';

interface SidebarProps {
    allFolders: string[];
    folderNoteCounts: { [key: string]: number };
    currentFolder: string;
    setCurrentFolder: (folder: string) => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onImportCsv: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: (format: 'json' | 'md') => void;
    onShowCreateFolderPrompt: () => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    onAddNewNote: () => void;
    onRenameFolder: (oldName: string, newName: string) => void;
    onDeleteFolder: (folderName: string) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
}

const FOLDER_NAME_MAX_LENGTH = 30;

export const Sidebar: React.FC<SidebarProps> = ({
    allFolders, folderNoteCounts, currentFolder, setCurrentFolder, isDarkMode, setIsDarkMode,
    onImport, onImportCsv, onExport, onShowCreateFolderPrompt, isMobileMenuOpen, setIsMobileMenuOpen, onAddNewNote,
    onRenameFolder, onDeleteFolder, isSidebarCollapsed, setIsSidebarCollapsed
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
    const [newFolderNameInput, setNewFolderNameInput] = useState('');
    const [activeOptions, setActiveOptions] = useState<string | null>(null);
    
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);
    const importCsvFileRef = useRef<HTMLInputElement>(null);
    const mobileSidebarRef = useRef<HTMLElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (renamingFolder) {
            setActiveOptions(null);
        }
    }, [renamingFolder]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setShowExportMenu(false);
          }
          if (mobileSidebarRef.current && !mobileSidebarRef.current.contains(event.target as Node) && !(event.target as Element).closest('[aria-label="Open menu"]')) {
            setIsMobileMenuOpen(false);
          }
          if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
            setActiveOptions(null);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsMobileMenuOpen]);

    const handleStartRename = (folderName: string) => {
        setRenamingFolder(folderName);
        setNewFolderNameInput(folderName);
        setActiveOptions(null);
    };

    const handleConfirmRename = () => {
        if (renamingFolder) {
            onRenameFolder(renamingFolder, newFolderNameInput);
        }
        setRenamingFolder(null);
        setNewFolderNameInput('');
    };

    const isSpecialFolder = (folder: string) => ['All Notes', 'Trash', 'Inbox'].includes(folder);

    const sidebarContent = (
        <div className="flex flex-col h-full">
            <div className={`flex items-center gap-2 px-4 pt-4 pb-2 shrink-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <StickyNote size={20} className="text-yellow-900/70" />
                </div>
                <h1 className={`text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Notes</h1>
            </div>

            <div className="px-3 py-2 shrink-0">
                <button
                    onClick={() => { onAddNewNote(); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-sm hover:bg-indigo-700 transition-all duration-200 transform active:scale-95 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title="New Note (Ctrl+N)"
                >
                    <Plus size={20} />
                    <span className={isSidebarCollapsed ? 'hidden' : ''}>New Note</span>
                </button>
            </div>

            <nav className="flex-1 px-2 pt-2 pb-4 space-y-1 overflow-y-auto">
                {allFolders.map(folder => {
                    const isTrash = folder === 'Trash';
                    const isActive = currentFolder === folder;
                    const isRenaming = renamingFolder === folder;

                    if (isRenaming) {
                        return (
                            <div key={`${folder}-renaming`} className="flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                <Folder size={18} />
                                <input
                                    type="text"
                                    value={newFolderNameInput}
                                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                                    onBlur={handleConfirmRename}
                                    autoFocus
                                    maxLength={FOLDER_NAME_MAX_LENGTH}
                                    className="w-full text-sm bg-transparent focus:outline-none text-indigo-700 dark:text-indigo-200"
                                />
                                <button onClick={handleConfirmRename} className="p-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800">
                                    <Check size={16} className="text-indigo-600 dark:text-indigo-300"/>
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div key={folder} className="group relative">
                            <button 
                                onClick={() => { setCurrentFolder(folder); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'} ${isSidebarCollapsed ? 'justify-between' : 'justify-between'}`}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    {isTrash ? <Trash2 size={18} /> : <Folder size={18} />}
                                    <span className={`truncate ${isSidebarCollapsed ? 'hidden' : ''}`}>{folder}</span>
                                </div>
                                {!isSidebarCollapsed && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-indigo-600 dark:bg-indigo-400/30 dark:text-indigo-100' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {folderNoteCounts[folder] || 0}
                                    </span>
                                )}
                            </button>
                            {!isSpecialFolder(folder) && !isSidebarCollapsed && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 transition-opacity hidden md:block">
                                     <button onClick={() => setActiveOptions(activeOptions === folder ? null : folder)} className="p-1.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                                        <MoreVertical size={16} />
                                     </button>
                                     {activeOptions === folder && (
                                        <div ref={optionsMenuRef} className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-2xl py-1 z-20 border border-gray-200 dark:border-gray-600 animate-fade-in-up">
                                            <button onClick={() => handleStartRename(folder)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"><PenLine size={14}/> Rename</button>
                                            <button onClick={() => { onDeleteFolder(folder); setActiveOptions(null); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                                        </div>
                                     )}
                                </div>
                            )}
                        </div>
                    )
                })}
                <button onClick={() => { onShowCreateFolderPrompt(); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <Plus size={18} />
                    <span className={isSidebarCollapsed ? 'hidden' : ''}>New Folder</span>
                </button>
            </nav>

            <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setShowExportMenu(s => !s)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <Download size={18} />
                        <span className={isSidebarCollapsed ? 'hidden' : ''}>Import / Export</span>
                    </button>
                    {showExportMenu && (
                        <div className={`absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-gray-700 rounded-lg shadow-2xl py-1 z-30 border border-gray-200 dark:border-gray-600 animate-fade-in-up ${isSidebarCollapsed ? 'left-full ml-2 bottom-auto top-0' : ''}`}>
                            <button onClick={() => { importCsvFileRef.current?.click(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"><FileUp size={16}/> Import from CSV</button>
                            <button onClick={() => { importFileRef.current?.click(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"><Upload size={16}/> Import from JSON</button>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <button onClick={() => { onExport('json'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">Export as JSON</button>
                            <button onClick={() => { onExport('md'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">Export as Markdown</button>
                        </div>
                    )}
                    <input type="file" ref={importCsvFileRef} accept=".csv" onChange={onImportCsv} className="hidden" />
                    <input type="file" ref={importFileRef} accept=".json" onChange={onImport} className="hidden" />
                </div>
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                    <span className={isSidebarCollapsed ? 'hidden' : ''}>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`w-full hidden md:flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 mt-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    {isSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                    <span className={isSidebarCollapsed ? 'hidden' : ''}>Collapse</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Sidebar (off-canvas) */}
            <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
                <aside ref={mobileSidebarRef} className={`absolute inset-y-0 left-0 w-72 bg-white dark:bg-gray-800/95 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {sidebarContent}
                </aside>
            </div>


            {/* Desktop Sidebar */}
            <aside className={`sidebar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/50 flex-col shrink-0 hidden md:flex transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                {sidebarContent}
            </aside>
        </>
    );
};