import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Note } from '../types';
import {
  CornerDownLeft, Pin, PinOff, Trash2, Maximize, Minimize, Folder,
  Undo, Redo, Code, List, ListOrdered, Link, Quote, Image,
  X, Tag, Check, CheckSquare, Maximize2, Minimize2, MoreVertical,
  Heading1, Heading2, Heading3, Share2, Type, Highlighter, Table2, Paperclip,
  FileDown, ArrowUpFromLine, ArrowDownFromLine, ArrowLeftFromLine, ArrowRightFromLine,
  ChevronDown, Plus, Combine, UnfoldVertical, AlignLeft, AlignCenter, AlignRight, Palette, Baseline, Pipette,
} from './icons';
import { formatRelativeTime } from '../utils';
import { LinkDialog } from './LinkDialog';
import { useLocalStorage } from '../hooks/useLocalStorage';


declare const hljs: any;

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onBack: () => void;
  allFolders: string[];
  showAlert: (message: string) => void;
  isFocusMode: boolean;
  setIsFocusMode: (isFocus: boolean) => void;
}

const FormattingButton: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    isActive: boolean;
    children: React.ReactNode;
    ariaLabel: string;
    className?: string;
    title?: string;
}> = ({ onClick, isActive, children, ariaLabel, className = '', title }) => (
  <button
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    aria-label={ariaLabel}
    title={title || ariaLabel}
    className={`p-2 rounded-lg transition-colors duration-150 transform active:scale-95 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700'} ${className}`}
  >
    {children}
  </button>
);

const slashCommands = [
  { command: 'h1', title: 'Heading 1', description: 'Large section heading', icon: <Heading1 size={18} /> },
  { command: 'h2', title: 'Heading 2', description: 'Medium section heading', icon: <Heading2 size={18} /> },
  { command: 'h3', title: 'Heading 3', description: 'Small section heading', icon: <Heading3 size={18} /> },
  { command: 'ul', title: 'Bulleted List', description: 'Create a simple list', icon: <List size={18} /> },
  { command: 'ol', title: 'Numbered List', description: 'Create a list with numbers', icon: <ListOrdered size={18} /> },
  { command: 'todo', title: 'To-do List', description: 'Track tasks with a checklist', icon: <CheckSquare size={18} /> },
  { command: 'quote', title: 'Quote', description: 'Capture a quote', icon: <Quote size={18} /> },
  { command: 'code', title: 'Code Block', description: 'Capture a code snippet', icon: <Code size={18} /> },
  { command: 'table', title: 'Table', description: 'Insert a data table', icon: <Table2 size={18} /> },
];

const TableSizePicker: React.FC<{ onSelect: (rows: number, cols: number) => void }> = ({ onSelect }) => {
    const [grid, setGrid] = useState({ rows: 1, cols: 1 });
    const MAX_ROWS = 8;
    const MAX_COLS = 10;

    return (
        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-scale-in">
            <p className="text-center mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                Insert Table: {grid.rows} &times; {grid.cols}
            </p>
            <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: MAX_ROWS * MAX_COLS }).map((_, i) => {
                    const row = Math.floor(i / MAX_COLS) + 1;
                    const col = (i % MAX_COLS) + 1;
                    const isHighlighted = row <= grid.rows && col <= grid.cols;
                    return (
                        <div
                            key={i}
                            className={`w-6 h-6 border-2 rounded-md cursor-pointer transition-all duration-150 ${isHighlighted ? 'bg-indigo-500 border-indigo-300 dark:border-indigo-600 scale-105' : 'bg-gray-200 dark:bg-gray-600 hover:bg-indigo-300 dark:hover:bg-indigo-500'}`}
                            onMouseOver={() => setGrid({ rows: row, cols: col })}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelect(grid.rows, grid.cols)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// Color definitions
const BG_COLORS = ["", "#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#dbeafe", "#e0e7ff", "#f3e8ff", "#e5e7eb", "#d1d5db"];
const TEXT_COLORS = ["", "#111827", "#b91c1c", "#c2410c", "#a16207", "#15803d", "#1d4ed8", "#5b21b6", "#ffffff"];

// Color conversion utilities
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100; l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (60 <= h && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (120 <= h && h < 180) { [r, g, b] = [0, c, x]; }
  else if (180 <= h && h < 240) { [r, g, b] = [0, x, c]; }
  else if (240 <= h && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (300 <= h && h < 360) { [r, g, b] = [c, 0, x]; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const VisualColorPicker: React.FC<{ color: string; onChange: (newColor: string) => void; }> = ({ onChange }) => {
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [lightness, setLightness] = useState(50);
    const panelRef = useRef<HTMLDivElement>(null);
    const hueSliderRef = useRef<HTMLDivElement>(null);

    const handleColorChange = useCallback((h: number, s: number, l: number) => {
        const [r, g, b] = hslToRgb(h, s, l);
        onChange(rgbToHex(r, g, b));
    }, [onChange]);

    useEffect(() => {
        handleColorChange(hue, saturation, lightness);
    }, [hue, saturation, lightness, handleColorChange]);

    const handleMouseEvent = (
        e: React.MouseEvent<HTMLDivElement>,
        handler: (e: MouseEvent) => void
    ) => {
        handler(e.nativeEvent);
        const onMouseMove = (moveEvent: MouseEvent) => handler(moveEvent);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handlePanelDrag = (e: MouseEvent) => {
        if (!panelRef.current) return;
        const { left, top, width, height } = panelRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(width, e.clientX - left));
        const y = Math.max(0, Math.min(height, e.clientY - top));
        setSaturation((x / width) * 100);
        setLightness(100 - (y / height) * 100);
    };
    
    const handleHueDrag = (e: MouseEvent) => {
        if (!hueSliderRef.current) return;
        const { left, width } = hueSliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(width, e.clientX - left));
        setHue((x / width) * 360);
    };
    
    const panelHandlePos = { left: `${saturation}%`, top: `${100 - lightness}%` };
    const hueHandlePos = { left: `${(hue / 360) * 100}%` };
    const currentColor = rgbToHex(...hslToRgb(hue, saturation, lightness));

    return (
        <div className="color-picker-popover">
            <div ref={panelRef} onMouseDown={(e) => handleMouseEvent(e, handlePanelDrag)} className="color-panel" style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}>
                <div className="color-panel-handle" style={panelHandlePos} />
            </div>
            <div ref={hueSliderRef} onMouseDown={(e) => handleMouseEvent(e, handleHueDrag)} className="hue-slider-container">
                <div className="hue-slider-handle" style={hueHandlePos} />
            </div>
            <div className="color-preview-container">
                <div className="color-preview-box" style={{ backgroundColor: currentColor }} />
                <div className="flex-1">
                    <input
                        type="text"
                        value={currentColor}
                        readOnly
                        className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 focus:outline-none px-2 py-1 font-mono"
                    />
                </div>
            </div>
        </div>
    );
};

const AdvancedColorPicker: React.FC<{
    title: string; icon: React.ReactNode; colors: string[]; recentColors: string[];
    onSelect: (color: string) => void; onAddRecent: (color: string) => void; closeMenu?: () => void;
}> = ({ title, icon, colors, recentColors, onSelect, onAddRecent, closeMenu }) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [customColor, setCustomColor] = useState('#4F46E5');

    const handleApplyCustomColor = () => {
        onSelect(customColor);
        onAddRecent(customColor);
        setIsPickerOpen(false);
        closeMenu?.();
    };

    return (
        <div className="p-2 w-72">
            <div className="flex items-center gap-2 px-1 text-sm font-medium text-gray-700 dark:text-gray-300">{icon} {title}</div>
            <div className="color-palette-grid mt-2">
                {colors.map((color, index) => (
                    <button key={index} onClick={() => { onSelect(color); closeMenu?.(); }} onMouseDown={(e) => e.preventDefault()} className="color-swatch" style={{ backgroundColor: color || '#ffffff', border: color ? '' : '1px solid #d1d5db' }} aria-label={`Color ${color || 'default'}`} />
                ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
            <div className="px-1">
                <div className="relative">
                    <button onClick={() => setIsPickerOpen(o => !o)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <Pipette size={14} /> Custom Color
                    </button>
                    {isPickerOpen && (
                        <div onMouseDown={(e) => e.stopPropagation()} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
                            <VisualColorPicker color={customColor} onChange={setCustomColor} />
                            <button onClick={handleApplyCustomColor} className="w-full mt-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                Apply Color
                            </button>
                        </div>
                    )}
                </div>
                {recentColors.length > 0 && (
                    <>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-3 mb-1.5">RECENT</div>
                        <div className="recent-colors-grid">
                            {recentColors.map((color, index) => (
                                <button key={index} onClick={() => { onSelect(color); closeMenu?.(); }} onMouseDown={(e) => e.preventDefault()} className="color-swatch" style={{ backgroundColor: color }} aria-label={`Recent Color ${color}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const DropdownMenu: React.FC<{ trigger: React.ReactNode; children: React.ReactNode; }> = ({ trigger, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setIsOpen(o => !o)}>{trigger}</div>
            {isOpen && (
                <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-scale-in">
                    {React.Children.map(children, child =>
                        React.isValidElement(child)
                            ? React.cloneElement(child as React.ReactElement<any>, { closeMenu: () => setIsOpen(false) })
                            : child
                    )}
                </div>
            )}
        </div>
    );
};

const TableRibbon: React.FC<{
    actions: any;
    recentColors: string[];
    onAddRecentColor: (color: string) => void;
}> = ({ actions, recentColors, onAddRecentColor }) => {
    return (
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-1.5 flex items-center flex-wrap gap-1 animate-fade-in-down">
            <span className="font-bold text-sm text-gray-600 dark:text-gray-300 px-2 mr-2">Table Tools</span>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

            <FormattingButton onClick={actions.addRowAbove} isActive={false} ariaLabel="Add Row Above"><ArrowUpFromLine size={18} /></FormattingButton>
            <FormattingButton onClick={actions.addRowBelow} isActive={false} ariaLabel="Add Row Below"><ArrowDownFromLine size={18} /></FormattingButton>
            <FormattingButton onClick={actions.addColLeft} isActive={false} ariaLabel="Add Column Left"><ArrowLeftFromLine size={18} /></FormattingButton>
            <FormattingButton onClick={actions.addColRight} isActive={false} ariaLabel="Add Column Right"><ArrowRightFromLine size={18} /></FormattingButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

            <FormattingButton onClick={actions.mergeCells} isActive={false} ariaLabel="Merge Cells"><Combine size={18} /></FormattingButton>
            <FormattingButton onClick={actions.unmergeCells} isActive={false} ariaLabel="Unmerge Cells"><UnfoldVertical size={18} /></FormattingButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

            <FormattingButton onClick={() => actions.setTextAlign('left')} isActive={false} ariaLabel="Align Left"><AlignLeft size={18} /></FormattingButton>
            <FormattingButton onClick={() => actions.setTextAlign('center')} isActive={false} ariaLabel="Align Center"><AlignCenter size={18} /></FormattingButton>
            <FormattingButton onClick={() => actions.setTextAlign('right')} isActive={false} ariaLabel="Align Right"><AlignRight size={18} /></FormattingButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
            
            <DropdownMenu trigger={<FormattingButton onClick={(e) => e.preventDefault()} isActive={false} ariaLabel="Background Color"><Palette size={18} /></FormattingButton>}>
                <AdvancedColorPicker title="Background Color" icon={<Palette size={14} />} colors={BG_COLORS} recentColors={recentColors} onSelect={actions.setBackgroundColor} onAddRecent={onAddRecentColor} />
            </DropdownMenu>
            <DropdownMenu trigger={<FormattingButton onClick={(e) => e.preventDefault()} isActive={false} ariaLabel="Text Color"><Baseline size={18} /></FormattingButton>}>
                <AdvancedColorPicker title="Text Color" icon={<Baseline size={14} />} colors={TEXT_COLORS} recentColors={recentColors} onSelect={actions.setTextColor} onAddRecent={onAddRecentColor} />
            </DropdownMenu>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

            <FormattingButton onClick={actions.deleteRow} isActive={false} ariaLabel="Delete Row" className="hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"><Trash2 size={18} /></FormattingButton>
            <FormattingButton onClick={actions.deleteCol} isActive={false} ariaLabel="Delete Column" className="hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"><Trash2 size={18} /></FormattingButton>
            <FormattingButton onClick={actions.deleteTable} isActive={false} ariaLabel="Delete Table" className="hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"><Trash2 size={18} /></FormattingButton>
        </div>
    );
};


export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onDelete, onPin, onBack, allFolders, showAlert, isFocusMode, setIsFocusMode }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [tags, setTags] = useState(note?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [currentFolder, setCurrentFolder] = useState(note?.folder || 'Inbox');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);

  const TITLE_MAX_LENGTH = 100;
  const TAG_MAX_LENGTH = 25;
  
  const contentRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef(note);
  useEffect(() => { noteRef.current = note; }, [note]);

  const noteStateRef = useRef({ title, tags, currentFolder });
  useEffect(() => {
    noteStateRef.current = { title, tags, currentFolder };
  }, [title, tags, currentFolder]);
  
  const [showEditorOptions, setShowEditorOptions] = useState(false);
  const editorOptionsRef = useRef<HTMLDivElement>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const [commandMenu, setCommandMenu] = useState({ open: false, position: { top: 0, left: 0 }, filter: '' });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const [linkDialog, setLinkDialog] = useState({ open: false, initialText: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isMobileTextFormatMenuOpen, setIsMobileTextFormatMenuOpen] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const desktopTablePickerRef = useRef<HTMLDivElement>(null);
  const mobileTablePickerRef = useRef<HTMLDivElement>(null);
  
  const [isTableActive, setIsTableActive] = useState(false);
  const [recentColors, setRecentColors] = useLocalStorage<string[]>('tableRecentColors', []);
  const [activeTableWrapper, setActiveTableWrapper] = useState<HTMLElement | null>(null);

  const [showStylesMenu, setShowStylesMenu] = useState(false);
  const stylesMenuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
      return slashCommands.filter(cmd => 
          cmd.title.toLowerCase().includes(commandMenu.filter.toLowerCase()) || 
          cmd.command.toLowerCase().includes(commandMenu.filter.toLowerCase())
      );
  }, [commandMenu.filter]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorOptionsRef.current && !editorOptionsRef.current.contains(event.target as Node)) {
        setShowEditorOptions(false);
      }
      if (stylesMenuRef.current && !stylesMenuRef.current.contains(event.target as Node)) {
        setShowStylesMenu(false);
      }
      const isOutsideDesktop = !desktopTablePickerRef.current || !desktopTablePickerRef.current.contains(event.target as Node);
      const isOutsideMobile = !mobileTablePickerRef.current || !mobileTablePickerRef.current.contains(event.target as Node);
      if (isOutsideDesktop && isOutsideMobile) {
        setShowTablePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSave = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (noteRef.current && contentRef.current) {
          onSave({
            ...noteRef.current,
            title: noteStateRef.current.title,
            content: contentRef.current.innerHTML,
            tags: noteStateRef.current.tags,
            folder: noteStateRef.current.currentFolder,
            timestamp: new Date()
          });
        }
      }, 1000);
    };
  }, [onSave]);
  
  const highlightCode = useCallback(() => {
    if (contentRef.current && typeof hljs !== 'undefined') {
      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, []);

  const updateFormattingState = useCallback(() => {
    const formats: Record<string, boolean> = {};
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertOrderedList', 'insertUnorderedList'];
    commands.forEach(cmd => formats[cmd] = document.queryCommandState(cmd));
    const block = document.queryCommandValue('formatBlock');
    formats.h1 = block === 'h1';
    formats.h2 = block === 'h2';
    formats.h3 = block === 'h3';
    formats.blockquote = block === 'blockquote';
    formats.pre = block === 'pre';
    setActiveFormats(formats);
  }, []);

  const insertTable = (rows: number, cols: number) => {
      let colgroup = '<colgroup>';
      for (let c = 0; c < cols; c++) {
          colgroup += `<col style="width: 120px;"/>`;
      }
      colgroup += '</colgroup>';

      let thead = '<thead><tr>';
      for (let c = 0; c < cols; c++) {
          thead += `<th><p>Header ${c + 1}</p><div class="col-resize-handle" contenteditable="false"></div></th>`;
      }
      thead += '</tr></thead>';

      let tbody = '<tbody>';
      for (let r = 1; r < rows; r++) {
          let tr = '<tr>';
          for (let c = 0; c < cols; c++) {
              tr += `<td><p><br></p><div class="row-resize-handle" contenteditable="false"></div></td>`;
          }
          tr += '</tr>';
          tbody += tr;
      }
      tbody += '</tbody>';

      const tableHTML = `<div class="table-wrapper" contenteditable="false"><table contenteditable="true">${colgroup}${thead}${tbody}</table></div><p><br></p>`;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && contentRef.current?.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const frag = range.createContextualFragment(tableHTML);
        const lastNode = frag.lastChild;
        range.insertNode(frag);
        if (lastNode) { // Move cursor after the inserted table
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        document.execCommand('insertHTML', false, tableHTML);
      }
      
      setShowTablePicker(false);
  };

  const executeCommand = useCallback((command: string) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      let textNode = node;
      let offset = range.startOffset;

      while (offset > 0 && textNode.textContent?.[offset-1] !== '/') {
          offset--;
      }
      
      if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent?.[offset-1] === '/') {
          const deleteRange = document.createRange();
          deleteRange.setStart(textNode, offset - 1);
          deleteRange.setEnd(range.endContainer, range.endOffset);
          selection.removeAllRanges();
          selection.addRange(deleteRange);
          document.execCommand('delete');
      }
      
      switch (command) {
          case 'h1':
          case 'h2':
          case 'h3':
              document.execCommand('formatBlock', false, command);
              break;
          case 'ul':
              document.execCommand('insertUnorderedList');
              break;
          case 'ol':
              document.execCommand('insertOrderedList');
              break;
          case 'quote':
              document.execCommand('formatBlock', false, 'blockquote');
              break;
          case 'code':
              document.execCommand('formatBlock', false, 'pre');
              highlightCode();
              break;
          case 'table':
              insertTable(3, 3);
              break;
          case 'todo':
              const list = document.createElement('ul');
              list.className = 'todo-list';
              const item = document.createElement('li');
              item.className = 'todo-item';
              item.setAttribute('data-checked', 'false');
              item.innerHTML = `<input type="checkbox" /><span class="todo-content" contenteditable="true"></span>`;
              list.appendChild(item);
              document.execCommand('insertHTML', false, list.outerHTML);
              const newTodo = contentRef.current?.querySelector('.todo-item:last-child .todo-content');
              if (newTodo) {
                  const newRange = document.createRange();
                  newRange.selectNodeContents(newTodo);
                  newRange.collapse(false);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
              }
              break;
      }
      setCommandMenu({ ...commandMenu, open: false });
  }, [commandMenu, highlightCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!commandMenu.open || filteredCommands.length === 0) return;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedCommandIndex(prev => (prev === 0 ? filteredCommands.length - 1 : prev - 1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedCommandIndex(prev => (prev === filteredCommands.length - 1 ? 0 : prev + 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            executeCommand(filteredCommands[selectedCommandIndex].command);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setCommandMenu({ ...commandMenu, open: false });
        }
    };
    const editorDiv = contentRef.current;
    editorDiv?.addEventListener('keydown', handleKeyDown);
    return () => editorDiv?.removeEventListener('keydown', handleKeyDown);
}, [commandMenu.open, filteredCommands, selectedCommandIndex, executeCommand]);
  
  useEffect(() => {
      setTitle(note.title);
      setTags(note.tags);
      setCurrentFolder(note.folder);
      if (contentRef.current) {
          contentRef.current.innerHTML = note.content || '';
          highlightCode();
      }
  }, [note.id, highlightCode]);

  const handleInput = useCallback((e: Event) => {
    debouncedSave();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
  
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    if (node.nodeType === 3 && node.textContent) { // Text node
      const textBeforeCursor = node.textContent.slice(0, range.startOffset);
  
      // Slash command logic
      const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
      const parentNode = node.parentElement;
      const isStartOfBlock = parentNode?.textContent?.trim().startsWith('/');
  
      if (slashMatch && isStartOfBlock) {
        const rect = range.getBoundingClientRect();
        setCommandMenu({ open: true, filter: slashMatch[1], position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX } });
        setSelectedCommandIndex(0);
      } else {
        setCommandMenu(prev => ({ ...prev, open: false }));
      }
  
      // Markdown shortcut logic (on space)
      const inputEvent = e as InputEvent;
      if (inputEvent.data === ' ') {
        const textBeforeSpace = textBeforeCursor.slice(0, -1);
        const blockTransforms: {[key:string]: string} = { '#': 'h1', '##': 'h2', '###': 'h3', '*': 'insertUnorderedList', '-': 'insertUnorderedList', '1.': 'insertOrderedList', '>': 'blockquote' };
        for (const key in blockTransforms) {
          if (textBeforeSpace === key) {
            document.execCommand('delete', false); // delete the space
            for (let i = 0; i < key.length; i++) {
              document.execCommand('delete', false); // delete the key
            }
            if(blockTransforms[key].startsWith('insert')) {
              document.execCommand(blockTransforms[key]);
            } else {
              document.execCommand('formatBlock', false, blockTransforms[key]);
            }
            e.preventDefault();
            break;
          }
        }
      }
    } else {
      setCommandMenu(prev => ({ ...prev, open: false }));
    }
  }, [debouncedSave]);
  
    useEffect(() => {
        const editorDiv = contentRef.current;
        if (!editorDiv) return;
        
        const handleSelectionChange = () => {
            updateFormattingState();
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return setIsTableActive(false);

            const node = selection.anchorNode;
            if (!editorDiv.contains(node)) return setIsTableActive(false);

            // FIX: Cast `node` to `Element` to use `closest`, as `Node` type doesn't have this method.
            const parentTable = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('table');
            const tableWrapper = parentTable?.closest('.table-wrapper');
            
            const tableIsActive = !!parentTable;
            setIsTableActive(tableIsActive);
            setActiveTableWrapper(tableIsActive ? tableWrapper as HTMLElement : null);
        };
        
        editorDiv.addEventListener('input', handleInput);
        document.addEventListener('selectionchange', handleSelectionChange);
        editorDiv.addEventListener('click', handleSelectionChange);
        editorDiv.addEventListener('keyup', handleSelectionChange);
        
        return () => {
            editorDiv.removeEventListener('input', handleInput);
            document.removeEventListener('selectionchange', handleSelectionChange);
            editorDiv.removeEventListener('click', handleSelectionChange);
            editorDiv.removeEventListener('keyup', handleSelectionChange);
        };
    }, [handleInput, updateFormattingState]);

    // Effect for advanced table interactions
    useEffect(() => {
        const editor = contentRef.current;
        if (!editor) return;

        const resizingRef = { current: { type: null as 'col' | 'row' | null, target: null as HTMLElement | null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 } };
        const selectionRef = { current: { isSelecting: false, startCell: null as HTMLTableCellElement | null, endCell: null as HTMLTableCellElement | null } };

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Column/Row Resizing
            if (target.matches('.col-resize-handle, .row-resize-handle')) {
                e.preventDefault();
                const type = target.matches('.col-resize-handle') ? 'col' : 'row';
                const th = target.closest('th');
                const tr = target.closest('tr');
                if (type === 'col' && th) {
                    const table = th.closest('table');
                    const colGroup = table?.querySelector('colgroup');
                    if (colGroup) {
                        const colIndex = th.cellIndex;
                        resizingRef.current = { type: 'col', target: colGroup.children[colIndex] as HTMLElement, startX: e.clientX, startY: 0, startWidth: (colGroup.children[colIndex] as HTMLElement).offsetWidth, startHeight: 0 };
                        document.body.classList.add('col-resizing');
                    }
                } else if (type === 'row' && tr) {
                    resizingRef.current = { type: 'row', target: tr, startY: e.clientY, startX: 0, startHeight: tr.offsetHeight, startWidth: 0 };
                    document.body.classList.add('row-resizing');
                }
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                return;
            }
            
            const cell = target.closest('th, td');
            if(cell && !e.shiftKey) { // Standard click or start of drag
                selectionRef.current = { isSelecting: true, startCell: cell as HTMLTableCellElement, endCell: cell as HTMLTableCellElement };
                updateSelection(cell as HTMLTableCellElement, cell as HTMLTableCellElement);
                document.addEventListener('mouseover', handleMouseOver);
            } else if (cell && e.shiftKey && selectionRef.current.startCell) { // Shift-click selection
                selectionRef.current.endCell = cell as HTMLTableCellElement;
                updateSelection(selectionRef.current.startCell, selectionRef.current.endCell);
            }
            
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseOver = (e: MouseEvent) => {
            if (!selectionRef.current.isSelecting) return;
            const cell = (e.target as HTMLElement).closest('th, td');
            if (cell && cell !== selectionRef.current.endCell) {
                selectionRef.current.endCell = cell as HTMLTableCellElement;
                updateSelection(selectionRef.current.startCell, selectionRef.current.endCell);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (resizingRef.current.type === 'col') {
                const deltaX = e.clientX - resizingRef.current.startX;
                const newWidth = resizingRef.current.startWidth + deltaX;
                if (newWidth > 40 && resizingRef.current.target) { // min width
                    (resizingRef.current.target as HTMLTableColElement).style.width = `${newWidth}px`;
                }
            } else if (resizingRef.current.type === 'row') {
                const deltaY = e.clientY - resizingRef.current.startY;
                const newHeight = resizingRef.current.startHeight + deltaY;
                if (newHeight > 30 && resizingRef.current.target) { // min height
                    (resizingRef.current.target as HTMLTableRowElement).style.height = `${newHeight}px`;
                }
            }
        };
        
        const updateSelection = (startCell: HTMLTableCellElement | null, endCell: HTMLTableCellElement | null) => {
            if (!startCell || !endCell) return;
            const table = startCell.closest('table');
            if (!table) return;

            const allCells = Array.from(table.querySelectorAll('th, td'));
            allCells.forEach(c => c.classList.remove('selected-cell'));

            const allRows = Array.from(table.rows);
            const startCoords = { row: allRows.findIndex(r => r.contains(startCell)), col: startCell.cellIndex };
            const endCoords = { row: allRows.findIndex(r => r.contains(endCell)), col: endCell.cellIndex };
            
            const selectionRect = {
                minRow: Math.min(startCoords.row, endCoords.row),
                maxRow: Math.max(startCoords.row, endCoords.row),
                minCol: Math.min(startCoords.col, endCoords.col),
                maxCol: Math.max(startCoords.col, endCoords.col),
            };

            for (let r = selectionRect.minRow; r <= selectionRect.maxRow; r++) {
                for (let c = selectionRect.minCol; c <= selectionRect.maxCol; c++) {
                    if (allRows[r] && allRows[r].cells[c]) {
                        allRows[r].cells[c].classList.add('selected-cell');
                    }
                }
            }
        };


        const handleMouseUp = () => {
            if (resizingRef.current.type) {
                document.body.classList.remove('col-resizing', 'row-resizing');
                resizingRef.current = { type: null, target: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0 };
            }
            if (selectionRef.current.isSelecting) {
                selectionRef.current.isSelecting = false;
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        const handleContextMenu = (e: MouseEvent) => {
             // Disable custom context menu in favor of the ribbon
        };

        editor.addEventListener('mousedown', handleMouseDown);
        editor.addEventListener('contextmenu', handleContextMenu);

        return () => {
            editor.removeEventListener('mousedown', handleMouseDown);
            editor.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('col-resizing', 'row-resizing');
        };
    }, []);

  const applyCommand = (e: React.MouseEvent, command: string, value: string | null = null) => {
    e.preventDefault();
    document.execCommand(command, false, value);
    if (command === 'formatBlock' && value === 'pre') {
        highlightCode();
    }
    contentRef.current?.focus();
    updateFormattingState();
  };
  
  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    const selectedText = selection ? selection.toString().trim() : '';
    setLinkDialog({ open: true, initialText: selectedText });
  };

  const handleConfirmLink = ({ url, text }: { url: string; text: string }) => {
    setLinkDialog({ open: false, initialText: '' });

    const selection = window.getSelection();
    if (savedSelectionRef.current) {
        selection?.removeAllRanges();
        selection?.addRange(savedSelectionRef.current);
    }
    
    const escapeHtml = (unsafe: string) => {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    };

    if (url && text) {
        let finalUrl = url.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }
        const safeText = escapeHtml(text);
        const linkHTML = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
        document.execCommand('insertHTML', false, linkHTML);
    }
    contentRef.current?.focus();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    imageInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please select a valid image file.');
      return;
    }

    const MAX_SIZE_MB = 15;
    const WARNING_SIZE_MB = 4;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showAlert(`Image too large. Please select a file under ${MAX_SIZE_MB}MB.`);
      return;
    }

    if (file.size > WARNING_SIZE_MB * 1024 * 1024) {
      showAlert(`Warning: Large images may not save correctly due to storage limits.`);
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64Url = loadEvent.target?.result;
      if (typeof base64Url === 'string') {
        document.execCommand('insertImage', false, base64Url);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  
  const handleTodoList = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('insertHTML', false, 
      `<ul class="todo-list">
        <li class="todo-item" data-checked="false">
          <input type="checkbox" />
          <span class="todo-content" contenteditable="true">To-do item</span>
        </li>
      </ul>`
    );
  }

  const applyHighlight = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand('hiliteColor', false, 'yellow');
    contentRef.current?.focus();
  };
  
  useEffect(() => {
    const editor = contentRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('.todo-item input[type="checkbox"]')) {
        const checkbox = target as HTMLInputElement;
        const listItem = checkbox.closest('.todo-item');
        if (listItem) {
          const isChecked = checkbox.checked;
          listItem.setAttribute('data-checked', String(isChecked));
          debouncedSave();
        }
      }
    };
    editor.addEventListener('click', handleClick);
    return () => editor.removeEventListener('click', handleClick);
  }, [debouncedSave]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmedTag) return;
     if (trimmedTag.length > TAG_MAX_LENGTH) {
      showAlert(`Tags cannot exceed ${TAG_MAX_LENGTH} characters.`);
      return;
    }
    if (tags.includes(trimmedTag)) {
        setNewTagInput('');
        return;
    }
    setTags(prev => [...prev, trimmedTag]);
    setNewTagInput('');
  }, [newTagInput, tags, showAlert]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleMoveNote = (newFolder: string) => {
    const trimmed = newFolder.trim();
    if(trimmed && trimmed !== 'All Notes' && trimmed !== 'Trash'){
      setCurrentFolder(trimmed);
      setNewFolderName('');
    }
  };

  const handleShare = async () => {
    const shareTitle = noteRef.current?.title || 'Untitled Note';
    const shareText = contentRef.current?.innerText || '';
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: shareTitle,
                text: shareText,
            });
            showAlert("Note shared successfully!");
        } catch (error) {
            console.log('Sharing cancelled or failed:', error);
        }
    } else if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}`);
            showAlert("Note content copied to clipboard.");
        } catch (error) {
            showAlert("Failed to copy note content.");
            console.error('Failed to copy content:', error);
        }
    } else {
        showAlert("Sharing is not supported on this browser.");
    }
  };

  const textContent = contentRef.current ? contentRef.current.textContent || '' : '';
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = textContent.length;

  const htmlToMarkdown = (element: HTMLElement) => {
    const tempEl = element.cloneNode(true) as HTMLElement;
    tempEl.querySelectorAll('h1').forEach(h => h.outerHTML = `\n# ${(h as HTMLElement).innerText}\n`);
    tempEl.querySelectorAll('h2').forEach(h => h.outerHTML = `\n## ${(h as HTMLElement).innerText}\n`);
    tempEl.querySelectorAll('h3').forEach(h => h.outerHTML = `\n### ${(h as HTMLElement).innerText}\n`);
    tempEl.querySelectorAll('b, strong').forEach(b => b.outerHTML = `**${(b as HTMLElement).innerText}**`);
    tempEl.querySelectorAll('i, em').forEach(i => i.outerHTML = `*${(i as HTMLElement).innerText}*`);
    tempEl.querySelectorAll('blockquote').forEach(q => q.outerHTML = `\n> ${(q as HTMLElement).innerText}\n`);
    tempEl.querySelectorAll('a').forEach(a => a.outerHTML = `[${(a as HTMLElement).innerText}](${a.getAttribute('href')})`);
    tempEl.querySelectorAll('ul:not(.todo-list) > li').forEach(li => li.outerHTML = `\n* ${(li as HTMLElement).innerText}`);
    tempEl.querySelectorAll('ol > li').forEach((li, i) => li.outerHTML = `\n${i + 1}. ${(li as HTMLElement).innerText}`);
    tempEl.querySelectorAll('.todo-item').forEach(item => {
        const isChecked = item.getAttribute('data-checked') === 'true';
        item.outerHTML = `\n- [${isChecked ? 'x' : ' '}] ${item.textContent}`;
    });
    tempEl.querySelectorAll('table').forEach(table => {
        let md = '\n';
        const headers = Array.from(table.querySelectorAll('th, tr:first-child td')).map(cell => (cell as HTMLElement).innerText);
        md += `| ${headers.join(' | ')} |\n`;
        md += `| ${headers.map(() => '---').join(' | ')} |\n`;
        Array.from(table.querySelectorAll('tr')).slice(1).forEach(row => {
            const cells = Array.from(row.querySelectorAll('td')).map(cell => (cell as HTMLElement).innerText);
            md += `| ${cells.join(' | ')} |\n`;
        });
        table.outerHTML = md;
    });
    return tempEl.innerText;
  };

  const tableToCsv = (table: HTMLTableElement) => {
    let csv = [];
    for (const row of table.rows) {
        let rowData = [];
        for (const cell of row.cells) {
            let text = cell.innerText.replace(/"/g, '""');
            if (text.includes(',') || text.includes('\n')) {
                text = `"${text}"`;
            }
            rowData.push(text);
        }
        csv.push(rowData.join(','));
    }
    return csv.join('\n');
  };

  const handleExportNote = (format: 'md' | 'txt' | 'json' | 'csv') => {
    if (!contentRef.current) return;
    const noteTitle = title || 'Untitled Note';
    const filename = noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + `.${format}`;
    let content = '';
    let mimeType = '';

    switch (format) {
        case 'txt':
            content = contentRef.current.innerText;
            mimeType = 'text/plain';
            break;
        case 'json':
            content = JSON.stringify({ ...note, title, content: contentRef.current.innerHTML }, null, 2);
            mimeType = 'application/json';
            break;
        case 'md':
            content = `# ${noteTitle}\n\n${htmlToMarkdown(contentRef.current)}`;
            mimeType = 'text/markdown';
            break;
        case 'csv':
            const table = contentRef.current.querySelector('table');
            if (table) {
                content = tableToCsv(table);
                mimeType = 'text/csv';
            } else {
                showAlert("No table found in this note to export as CSV.");
                return;
            }
            break;
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowEditorOptions(false);
  };
  
    const getActiveTableInfo = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !contentRef.current) return null;

        const node = selection.anchorNode;
        if (!contentRef.current.contains(node)) return null;

        // FIX: Cast `node` to `Element` to use `closest`, as `Node` type doesn't have this method.
        const cell = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('td, th') as HTMLTableCellElement;
        const table = cell?.closest('table');
        if (!cell || !table) return null;

        const row = cell.closest('tr');
        if (!row) return null;

        const selectedCells = Array.from(table.querySelectorAll('.selected-cell'));
        if (selectedCells.length === 0) {
            selectedCells.push(cell); // If no multi-selection, operate on the current cell
        }

        return { cell, row, table, selectedCells };
    }, []);
  
    const tableActions = useMemo(() => {
        const addColumn = (colIndex: number) => {
            const info = getActiveTableInfo();
            if (!info) return;

            Array.from(info.table.rows).forEach(row => {
                const newCell = row.insertCell(colIndex);
                const isHeaderRow = row.parentElement?.tagName === 'THEAD';
                const content = isHeaderRow
                    ? '<p>Header</p><div class="col-resize-handle" contenteditable="false"></div>'
                    : '<p><br></p><div class="row-resize-handle" contenteditable="false"></div>';
                
                if (isHeaderRow) {
                    const th = document.createElement('th');
                    th.innerHTML = content;
                    newCell.replaceWith(th);
                } else {
                    newCell.innerHTML = content;
                }
            });

            const colgroup = info.table.querySelector('colgroup');
            if (colgroup) {
                const newCol = document.createElement('col');
                newCol.style.width = '120px';
                const refCol = colgroup.children[colIndex] || null;
                colgroup.insertBefore(newCol, refCol);
            }
        };

        return {
            addRowAbove: () => { const i = getActiveTableInfo(); if(i) i.table.insertRow(i.row.rowIndex).innerHTML = i.row.innerHTML.replace(/<p>.*?<\/p>/g, '<p><br></p>')},
            addRowBelow: () => { const i = getActiveTableInfo(); if(i) i.table.insertRow(i.row.rowIndex + 1).innerHTML = i.row.innerHTML.replace(/<p>.*?<\/p>/g, '<p><br></p>')},
            addColLeft: () => { const i = getActiveTableInfo(); if (i) addColumn(i.cell.cellIndex); },
            addColRight: () => { const i = getActiveTableInfo(); if (i) addColumn(i.cell.cellIndex + 1); },
            deleteRow: () => { const i = getActiveTableInfo(); if(i && i.table.rows.length > 1) i.table.deleteRow(i.row.rowIndex) },
            deleteCol: () => { const i = getActiveTableInfo(); if(i && i.row.cells.length > 1) { const cI = i.cell.cellIndex; Array.from(i.table.rows).forEach(r => r.deleteCell(cI)) }},
            deleteTable: () => getActiveTableInfo()?.table.closest('.table-wrapper')?.remove(),
            mergeCells: () => {
                const i = getActiveTableInfo(); if(!i || i.selectedCells.length <= 1) return;
                const rect = { minR: Infinity, maxR: -1, minC: Infinity, maxC: -1 };
                i.selectedCells.forEach(c => {
                    const rI = (c.parentNode as HTMLTableRowElement).rowIndex;
                    const cI = (c as HTMLTableCellElement).cellIndex;
                    if (rI < rect.minR) rect.minR = rI; if (rI > rect.maxR) rect.maxR = rI;
                    if (cI < rect.minC) rect.minC = cI; if (cI > rect.maxC) rect.maxC = cI;
                });
                const firstCell = i.selectedCells[0];
                firstCell.setAttribute('colspan', String(rect.maxC - rect.minC + 1));
                firstCell.setAttribute('rowspan', String(rect.maxR - rect.minR + 1));
                i.selectedCells.slice(1).forEach(c => c.remove());
            },
            unmergeCells: () => {
                const i = getActiveTableInfo(); if(!i) return;
                i.selectedCells.forEach(cell => {
                    const cSpan = parseInt(cell.getAttribute('colspan') || '1');
                    const rSpan = parseInt(cell.getAttribute('rowspan') || '1');
                    if (cSpan > 1 || rSpan > 1) {
                        cell.removeAttribute('colspan');
                        cell.removeAttribute('rowspan');
                        const rI = (cell.parentNode as HTMLTableRowElement).rowIndex;
                        const cI = (cell as HTMLTableCellElement).cellIndex;
                        for (let r = 0; r < rSpan; r++) {
                            for (let c = 0; c < cSpan; c++) {
                                if (r === 0 && c === 0) continue;
                                i.table.rows[rI + r].insertCell(cI + c).innerHTML = '<td><p><br></p></td>';
                            }
                        }
                    }
                });
            },
            setTextAlign: (align: string) => { const i = getActiveTableInfo(); i?.selectedCells.forEach(c => { (c as HTMLElement).style.textAlign = align; })},
            setBackgroundColor: (color: string) => { const i = getActiveTableInfo(); i?.selectedCells.forEach(c => { (c as HTMLElement).style.backgroundColor = color; })},
            setTextColor: (color: string) => { const i = getActiveTableInfo(); i?.selectedCells.forEach(c => { (c as HTMLElement).style.color = color; })},
        };
    }, [getActiveTableInfo]);
  
    const handleAddRecentColor = useCallback((color: string) => {
        setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 8));
    }, [setRecentColors]);

  const getCurrentBlockType = () => {
    if (activeFormats.h1) return 'Heading 1';
    if (activeFormats.h2) return 'Heading 2';
    if (activeFormats.h3) return 'Heading 3';
    if (activeFormats.blockquote) return 'Quote';
    if (activeFormats.pre) return 'Code Block';
    if (activeFormats.insertUnorderedList) return 'Bulleted List';
    if (activeFormats.insertOrderedList) return 'Numbered List';
    return 'Paragraph';
  };
  
  const DropdownItem: React.FC<{onClick: (e: React.MouseEvent) => void; children: React.ReactNode; isActive?: boolean}> = ({ onClick, children, isActive }) => (
    <button
        onClick={(e) => { onClick(e); setShowStylesMenu(false); }}
        onMouseDown={e => e.preventDefault()}
        className={`w-full text-left px-3 py-1.5 flex items-center gap-3 text-sm rounded transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
    >
        {children}
    </button>
  );

  const FormattingToolbarContent = (
    <>
      <FormattingButton onClick={(e) => applyCommand(e, 'undo')} isActive={false} ariaLabel="Undo"><Undo size={18} /></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'redo')} isActive={false} ariaLabel="Redo"><Redo size={18} /></FormattingButton>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>
      
      <div className="relative" ref={stylesMenuRef}>
        <button onClick={() => setShowStylesMenu(s => !s)} onMouseDown={e => e.preventDefault()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium">
            <span>{getCurrentBlockType()}</span>
            <ChevronDown size={16} />
        </button>
        {showStylesMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 z-40 py-2 animate-fade-in-down">
                <div className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">TEXT STYLES</div>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'p'); }} isActive={!Object.values(activeFormats).some(v => v)}><Type size={18}/> Paragraph</DropdownItem>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'h1'); }} isActive={activeFormats.h1}><Heading1 size={18}/> Heading 1</DropdownItem>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'h2'); }} isActive={activeFormats.h2}><Heading2 size={18}/> Heading 2</DropdownItem>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'h3'); }} isActive={activeFormats.h3}><Heading3 size={18}/> Heading 3</DropdownItem>
                <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                <DropdownItem onClick={(e) => { applyCommand(e, 'insertUnorderedList'); }} isActive={activeFormats.insertUnorderedList}><List size={18}/> Bulleted list</DropdownItem>
                <DropdownItem onClick={(e) => { applyCommand(e, 'insertOrderedList'); }} isActive={activeFormats.insertOrderedList}><ListOrdered size={18}/> Numbered list</DropdownItem>
                <DropdownItem onClick={handleTodoList} isActive={false}><CheckSquare size={18}/> To-do list</DropdownItem>
                <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'blockquote'); }} isActive={activeFormats.blockquote}><Quote size={18}/> Quote</DropdownItem>
                <DropdownItem onClick={(e) => { applyCommand(e, 'formatBlock', 'pre'); }} isActive={activeFormats.pre}><Code size={18}/> Code block</DropdownItem>
            </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>

      <FormattingButton onClick={(e) => applyCommand(e, 'bold')} isActive={activeFormats.bold} ariaLabel="Bold" title="Bold (Ctrl+B)"><b className="w-6 text-center text-base">B</b></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'italic')} isActive={activeFormats.italic} ariaLabel="Italic" title="Italic (Ctrl+I)"><i className="w-6 text-center text-base">I</i></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'underline')} isActive={activeFormats.underline} ariaLabel="Underline" title="Underline (Ctrl+U)"><u className="w-6 text-center text-base">U</u></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'strikeThrough')} isActive={activeFormats.strikeThrough} ariaLabel="Strikethrough"><s className="w-6 text-center text-base">S</s></FormattingButton>
      <FormattingButton onClick={applyHighlight} isActive={false} ariaLabel="Highlight text"><Highlighter size={18} /></FormattingButton>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>
      
      <FormattingButton onClick={handleLink} isActive={false} ariaLabel="Create Link"><Link size={18} /></FormattingButton>
      <FormattingButton onClick={handleImageClick} isActive={false} ariaLabel="Insert Image"><Image size={18} /></FormattingButton>
      <div className="relative" ref={desktopTablePickerRef}>
          <FormattingButton onClick={() => setShowTablePicker(s => !s)} isActive={false} ariaLabel="Insert Table"><Table2 size={18} /></FormattingButton>
          {showTablePicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40">
                <TableSizePicker onSelect={insertTable} />
            </div>
          )}
      </div>
    </>
  );

  const MobileTextFormatToolbarContent = (
    <>
      <FormattingButton onClick={(e) => applyCommand(e, 'bold')} isActive={activeFormats.bold} ariaLabel="Bold"><b>B</b></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'italic')} isActive={activeFormats.italic} ariaLabel="Italic"><i>I</i></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'underline')} isActive={activeFormats.underline} ariaLabel="Underline"><u>U</u></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'strikeThrough')} isActive={activeFormats.strikeThrough} ariaLabel="Strikethrough"><s>S</s></FormattingButton>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
      <FormattingButton onClick={(e) => applyCommand(e, 'formatBlock', 'h1')} isActive={activeFormats.h1} ariaLabel="Heading 1"><b>H1</b></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'formatBlock', 'h2')} isActive={activeFormats.h2} ariaLabel="Heading 2"><b>H2</b></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'insertOrderedList')} isActive={activeFormats.insertOrderedList} ariaLabel="Ordered List"><ListOrdered size={16} /></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'insertUnorderedList')} isActive={activeFormats.insertUnorderedList} ariaLabel="Unordered List"><List size={16} /></FormattingButton>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
      <FormattingButton onClick={(e) => applyCommand(e, 'formatBlock', 'blockquote')} isActive={activeFormats.blockquote} ariaLabel="Blockquote"><Quote size={16} /></FormattingButton>
      <FormattingButton onClick={(e) => applyCommand(e, 'formatBlock', 'pre')} isActive={activeFormats.pre} ariaLabel="Code Block"><Code size={16} /></FormattingButton>
    </>
  );


  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] animate-fade-in note-editor-container">
      {activeTableWrapper && (
          <>
              <button 
                  className="add-row-btn" 
                  style={{ top: (activeTableWrapper.offsetTop + activeTableWrapper.offsetHeight) + 'px', left: (activeTableWrapper.offsetLeft - 12) + 'px' }}
                  onClick={() => tableActions.addRowBelow && tableActions.addRowBelow()}
                  onMouseDown={(e) => e.preventDefault()}
              >+</button>
              <button 
                  className="add-col-btn" 
                  style={{ left: (activeTableWrapper.offsetLeft + activeTableWrapper.offsetWidth) + 'px', top: (activeTableWrapper.offsetTop - 12) + 'px' }}
                  onClick={() => tableActions.addColRight && tableActions.addColRight()}
                  onMouseDown={(e) => e.preventDefault()}
              >+</button>
          </>
      )}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <LinkDialog
        isOpen={linkDialog.open}
        onClose={() => setLinkDialog({ open: false, initialText: '' })}
        onConfirm={handleConfirmLink}
        initialText={linkDialog.initialText}
      />
      <header className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Back to notes (Esc)">
          <CornerDownLeft size={24} />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Share note"><Share2 size={20} /></button>
          <button onClick={() => onDelete(note.id)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" aria-label="Move to trash"><Trash2 size={20} /></button>
          
          <div className="relative" ref={editorOptionsRef}>
            <button onClick={() => setShowEditorOptions(s => !s)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="More options">
              <MoreVertical size={20} />
            </button>
            {showEditorOptions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-2xl z-30 border border-gray-200 dark:border-gray-600 animate-fade-in-down overflow-hidden">
                <div className="py-1">
                  <button onClick={() => { onPin(note.id); setShowEditorOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3">
                    {note.isPinned ? <PinOff size={16}/> : <Pin size={16}/>}
                    <span>{note.isPinned ? "Unpin from top" : "Pin to top"}</span>
                  </button>
                  <button onClick={() => { setIsFocusMode(!isFocusMode); setShowEditorOptions(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3">
                    {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span>{isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}</span>
                  </button>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 pt-2 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">DOWNLOAD</div>
                    <button onClick={() => handleExportNote('md')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3"><FileDown size={16}/> As Markdown (.md)</button>
                    <button onClick={() => handleExportNote('txt')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3"><FileDown size={16}/> As Plain Text (.txt)</button>
                    {contentRef.current?.querySelector('table') && 
                      <button onClick={() => handleExportNote('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-3"><FileDown size={16}/> Table as CSV (.csv)</button>
                    }
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 pt-2 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">MOVE TO</div>
                  <div className="max-h-40 overflow-y-auto">
                    {allFolders.filter(f=> f !== 'All Notes' && f !== 'Trash').map(folder => (
                      <button key={folder} onClick={() => { handleMoveNote(folder); setShowEditorOptions(false); }} className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 ${currentFolder === folder ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                          <span className="truncate">{folder || 'Inbox'}</span>
                          {currentFolder === folder && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-600/50 mt-1">
                      <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { handleMoveNote(newFolderName); setShowEditorOptions(false); } }} placeholder="New folder..." className="w-full px-2 py-1 text-base sm:text-sm rounded-md border border-gray-300 dark:border-gray-500 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="px-4 sm:px-6 pt-4 shrink-0">
        <div className="relative">
            <input
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => {
                  setIsTitleFocused(false);
                  debouncedSave();
              }}
              maxLength={TITLE_MAX_LENGTH}
              className="w-full text-3xl font-bold mb-4 bg-transparent pb-2 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
            {(isTitleFocused || title.length > 0) && (
                <div className="absolute bottom-4 right-2 text-xs font-mono text-gray-400 dark:text-gray-500 pointer-events-none">
                    {title.length}/{TITLE_MAX_LENGTH}
                </div>
            )}
        </div>
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Tag size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
          {tags.map(tag => (
            <div key={tag} className="flex items-center px-2 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 rounded-full">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/80"><X size={14} /></button>
            </div>
          ))}
          <div className="relative flex-1 min-w-[120px]">
            <input
              type="text"
              placeholder="Add tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onFocus={() => setIsTagInputFocused(true)}
              onBlur={() => setIsTagInputFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              maxLength={TAG_MAX_LENGTH}
              className="w-full px-2 py-1 rounded-md bg-transparent focus:outline-none text-base"
            />
            {(isTagInputFocused || newTagInput.length > 0) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400 dark:text-gray-500 pointer-events-none">
                    {newTagInput.length}/{TAG_MAX_LENGTH}
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-t border-gray-200 dark:border-gray-700 px-2 sm:px-4">
          <div className="hidden md:flex p-1.5 items-center flex-wrap gap-1">
              {FormattingToolbarContent}
          </div>
      </div>
      
      {isTableActive && <TableRibbon actions={tableActions} recentColors={recentColors} onAddRecentColor={handleAddRecentColor} />}
      
      <div className="flex-1 overflow-y-auto">
        <div
          ref={contentRef}
          contentEditable={true}
          className="p-4 sm:p-6 focus:outline-none text-gray-800 dark:text-gray-200 prose dark:prose-invert max-w-none"
          suppressContentEditableWarning={true}
          aria-label="Note content"
        />
      </div>

      {commandMenu.open && filteredCommands.length > 0 && (
          <div
              className="fixed w-72 bg-white dark:bg-gray-700 rounded-lg shadow-2xl py-2 z-50 border border-gray-200 dark:border-gray-600 animate-fade-in-up"
              style={{ top: commandMenu.position.top + 8, left: commandMenu.position.left }}
          >
              <div className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">COMMANDS</div>
              <div className="max-h-64 overflow-y-auto">
                  {filteredCommands.map((cmd, index) => (
                      <button
                          key={cmd.command}
                          onClick={() => executeCommand(cmd.command)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${selectedCommandIndex === index ? 'bg-indigo-50 dark:bg-indigo-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                      >
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300">
                              {cmd.icon}
                          </div>
                          <div>
                              <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{cmd.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.description}</div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}
      
      <footer className="mt-auto p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center flex-wrap gap-x-4 gap-y-1 shrink-0">
        <span className="truncate" title={new Date(note.timestamp).toLocaleString()}>
          Edited: {formatRelativeTime(new Date(note.timestamp))}
        </span>
        <div className="flex gap-4 ml-auto">
          <span>Words: {wordCount}</span>
          <span>Chars: {charCount}</span>
        </div>
      </footer>
      
      <div className="md:hidden fixed bottom-4 inset-x-0 z-20 flex justify-center px-4">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center transition-all duration-300 p-1">
            <div className="flex flex-wrap gap-1 justify-center p-1">
                {isMobileTextFormatMenuOpen ? (
                    <>
                        <FormattingButton onClick={() => setIsMobileTextFormatMenuOpen(false)} isActive={false} ariaLabel="Close format menu"><X size={16} /></FormattingButton>
                        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
                        {MobileTextFormatToolbarContent}
                    </>
                ) : (
                    <>
                        <FormattingButton onClick={() => setIsMobileTextFormatMenuOpen(true)} isActive={false} ariaLabel="Text format"><Type size={16} /></FormattingButton>
                        <FormattingButton onClick={handleTodoList} isActive={false} ariaLabel="To-Do List"><CheckSquare size={16} /></FormattingButton>
                        <div className="relative" ref={mobileTablePickerRef}>
                            <FormattingButton onClick={() => setShowTablePicker(s => !s)} isActive={false} ariaLabel="Insert Table"><Table2 size={16} /></FormattingButton>
                            {showTablePicker && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40">
                                    <TableSizePicker onSelect={insertTable} />
                                </div>
                            )}
                        </div>
                        <FormattingButton onClick={handleLink} isActive={false} ariaLabel="Create Link"><Paperclip size={16} /></FormattingButton>
                        <FormattingButton onClick={applyHighlight} isActive={false} ariaLabel="Highlight text"><Highlighter size={16} /></FormattingButton>
                        <FormattingButton onClick={handleImageClick} isActive={false} ariaLabel="Insert Image"><Image size={16} /></FormattingButton>
                    </>
                )}
            </div>
        </div>
      </div>

    </div>
  );
};