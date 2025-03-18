'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Note {
  id: number;
  title: string;
  content: string;
  is_encrypted: boolean;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  user_id: number;
  folder_id: number | null;
}

interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  user_id: number;
  created_at: string;
  updated_at: string | null;
}

interface FolderTreeProps {
  folders: Folder[];
  notes: Note[];
  activeNote: number | null;
  setActiveNote: (id: number) => void;
  activeFolder: number | null;
  setActiveFolder: (id: number | null) => void;
  isMobile: boolean;
  setSidebarOpen: (open: boolean) => void;
  onCreateFolder: (name: string, parentId: number | null) => Promise<Folder>;
  onCreateNote: (folderId: number | null) => void;
  onDeleteFolder: (id: number, recursive: boolean) => Promise<void>;
  onRenameFolder: (id: number, newName: string) => Promise<void>;
  onMoveNote: (noteId: number, folderId: number | null) => Promise<void>;
  // Add a new prop for creating notes directly in the dashboard
  createNoteInline?: (title: string, folderId: number | null) => Promise<Note>;
  setNotes?: (notes: Note[]) => void;
  expandedFolders: { [key: number]: boolean };
  setExpandedFolders: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  notes,
  activeNote,
  setActiveNote,
  activeFolder,
  setActiveFolder,
  isMobile,
  setSidebarOpen,
  onCreateFolder,
  onCreateNote,
  onDeleteFolder,
  onRenameFolder,
  onMoveNote,
  createNoteInline,
  setNotes,
  expandedFolders,
  setExpandedFolders
}) => {
  // State for UI interactions
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, folderId: number | null }>({
    visible: false,
    x: 0,
    y: 0,
    folderId: null
  });
  const [newFolderParentId, setNewFolderParentId] = useState<number | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<number | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  // New state for inline note creation
  const [creatingNewNote, setCreatingNewNote] = useState(false);
  const [newNoteFolderId, setNewNoteFolderId] = useState<number | null>(null);

  // Refs for DOM interaction
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const renameFolderInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Find root folders (those without parent_id)
  const rootFolders = folders.filter(folder => folder.parent_id === null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when showing new folder input
  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  // Focus input when renaming folder
  useEffect(() => {
    if (renameFolderId !== null && renameFolderInputRef.current) {
      renameFolderInputRef.current.focus();
    }
  }, [renameFolderId]);

  // Function to toggle folder expansion
  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Handle context menu opening
  const handleContextMenu = (e: React.MouseEvent, folderId: number | null) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      folderId
    });
  };

  // Handle new folder creation
  const handleNewFolder = () => {
    setNewFolderParentId(contextMenu.folderId);
    setNewFolderName('');
    setShowNewFolderInput(true);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Save new folder
  const saveNewFolder = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim(), newFolderParentId);
      setShowNewFolderInput(false);
      setNewFolderName('');

      // Auto-expand parent folder
      if (newFolderParentId !== null) {
        setExpandedFolders(prev => ({
          ...prev,
          [newFolderParentId]: true
        }));
      }
    } else {
      // Close the input if name is empty
      setShowNewFolderInput(false);
    }
  };

  // Handle creating a new note
  const handleNewNote = async () => {
    console.log("handleNewNote called");
    setContextMenu(prev => ({ ...prev, visible: false }));

    // If we have the inline creation functionality
    if (createNoteInline && setNotes) {
      try {
        // Get the current folder ID
        const folderId = contextMenu.folderId !== null ? contextMenu.folderId : activeFolder;

        // Create a new note directly - let createNoteInline handle everything
        await createNoteInline("Untitled", folderId);

        // DO NOT set notes or active note here - that's already done in createNoteInline

        // We can still expand the folder
        if (folderId !== null) {
          setExpandedFolders(prev => ({
            ...prev,
            [folderId]: true
          }));
        }

        // And close sidebar on mobile
        if (isMobile) {
          setSidebarOpen(false);
        }
      } catch (err) {
        console.error("Error creating new note:", err);
      }
    } else {
      // Fall back to original behavior
      onCreateNote(contextMenu.folderId);
    }
  };

  // Handle folder rename
  const handleRenameFolder = () => {
    if (contextMenu.folderId !== null) {
      const folder = folders.find(f => f.id === contextMenu.folderId);
      if (folder) {
        setRenameFolderId(folder.id);
        setRenameFolderName(folder.name);
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    }
  };

  // Save folder rename
  const saveRename = async () => {
    if (renameFolderId !== null && renameFolderName.trim()) {
      await onRenameFolder(renameFolderId, renameFolderName.trim());
      setRenameFolderId(null);
    } else {
      // Cancel rename if name is empty
      setRenameFolderId(null);
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = () => {
    if (contextMenu.folderId !== null) {
      const hasChildren = folders.some(f => f.parent_id === contextMenu.folderId);
      const hasNotes = notes.some(n => n.folder_id === contextMenu.folderId);

      if (hasChildren || hasNotes) {
        if (confirm('This folder contains items. Delete everything?')) {
          onDeleteFolder(contextMenu.folderId, true);
        }
      } else {
        onDeleteFolder(contextMenu.folderId, false);
      }

      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  // Find child folders for a given parent
  const getChildFolders = (parentId: number): Folder[] => {
    return folders.filter(folder => folder.parent_id === parentId);
  };

  // Find notes for a given folder
  const getFolderNotes = (folderId: number): Note[] => {
    return notes.filter(note => note.folder_id === folderId);
  };

  // Get notes not in any folder (for root level)
  const getRootNotes = (): Note[] => {
    return notes.filter(note => note.folder_id === null);
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Handle Enter key in inputs
  const handleInputKeyDown = (e: React.KeyboardEvent, saveFunction: () => void) => {
    if (e.key === 'Enter') {
      saveFunction();
    } else if (e.key === 'Escape') {
      setShowNewFolderInput(false);
      setRenameFolderId(null);
    }
  };

  // Render a folder with its child folders and notes
  const renderFolder = (folder: Folder) => {
    const isExpanded = expandedFolders[folder.id] || false;
    const childFolders = getChildFolders(folder.id);
    const folderNotes = getFolderNotes(folder.id);
    const isActive = activeFolder === folder.id;
    const isRenaming = renameFolderId === folder.id;

    return (
      <div key={folder.id} className="pl-2">
        <div
          className={`flex items-center py-1 cursor-pointer ${isActive ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
          onClick={() => {
            setActiveFolder(folder.id);
            toggleFolder(folder.id);
          }}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
        >
          {/* Arrow indicator that mirrors the screenshot design */}
          <span
            className="mr-1 text-gray-500 w-4 h-4 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
          >
            {isExpanded ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </span>

          <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>

          {isRenaming ? (
            <input
              ref={renameFolderInputRef}
              className="bg-gray-700 text-gray-300 text-sm outline-none border border-blue-500 px-1 py-0 rounded w-full"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => handleInputKeyDown(e, saveRename)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm text-gray-400 truncate">{folder.name}</span>
          )}
        </div>

        {/* New folder input (when adding under this folder) */}
        {showNewFolderInput && newFolderParentId === folder.id && (
          <div className="ml-6 mt-1 mb-1">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
              <input
                ref={newFolderInputRef}
                className="bg-gray-700 text-gray-300 text-sm outline-none border border-blue-500 px-1 py-0 rounded w-full"
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={saveNewFolder}
                onKeyDown={(e) => handleInputKeyDown(e, saveNewFolder)}
              />
            </div>
          </div>
        )}

        {/* Folder contents (if expanded) */}
        {isExpanded && (
          <div className="ml-2 border-l border-gray-800">
            {/* Render child folders */}
            {childFolders.map(childFolder => renderFolder(childFolder))}

            {/* Render notes in this folder */}
            {folderNotes.map(note => (
              <div
                key={note.id}
                className={`flex items-center py-1 pl-6 cursor-pointer ${activeNote === note.id
                    ? 'bg-gray-800 text-gray-300'
                    : 'text-gray-400 hover:bg-gray-800'
                  }`}
                onClick={() => {
                  setActiveNote(note.id);
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Handle note context menu if needed
                }}
              >
                <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 truncate">
                  <div className="text-sm font-medium truncate">{note.title}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {formatDate(note.updated_at || note.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-1 relative bg-gray-900">
      {/* Explorer header with actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-500">EXPLORER</div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              // Collapse all folders
              setExpandedFolders({});
            }}
            className="text-gray-500 hover:text-gray-300"
            title="Collapse All"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              // Use the active folder as parent instead of root
              setNewFolderParentId(activeFolder);
              setNewFolderName('');
              setShowNewFolderInput(true);
            }}
            className="text-gray-500 hover:text-gray-300"
            title="New Folder"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleNewNote()}
            className="text-gray-500 hover:text-gray-300"
            title="New Note"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Root level new folder input */}
      {showNewFolderInput && newFolderParentId === null && (
        <div className="px-3 py-2">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            <input
              ref={newFolderInputRef}
              className="bg-gray-700 text-gray-300 text-sm outline-none border border-blue-500 px-1 py-0 rounded w-full"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={saveNewFolder}
              onKeyDown={(e) => handleInputKeyDown(e, saveNewFolder)}
            />
          </div>
        </div>
      )}

      {/* Root Folders */}
      {rootFolders.map(folder => renderFolder(folder))}

      {/* Root Notes (not in any folder) */}
      <div className="mt-2 pl-2">
        <div
          className="flex items-center py-1 px-3 cursor-pointer hover:bg-gray-800"
          onClick={() => setActiveFolder(null)}
          onContextMenu={(e) => handleContextMenu(e, null)}
        >
          <span className="mr-1 text-gray-500 w-4 h-4 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
          <div className="text-sm font-medium text-gray-500">Uncategorized</div>
        </div>
        {getRootNotes().map(note => (
          <div
            key={note.id}
            className={`flex items-center py-1 pl-6 cursor-pointer ${activeNote === note.id
                ? 'bg-gray-800 text-gray-300'
                : 'text-gray-400 hover:bg-gray-800'
              }`}
            onClick={() => {
              setActiveNote(note.id);
              if (isMobile) {
                setSidebarOpen(false);
              }
            }}
          >
            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 truncate">
              <div className="text-sm font-medium truncate">{note.title}</div>
              <div className="text-xs text-gray-600 truncate">
                {formatDate(note.updated_at || note.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="absolute bg-gray-800 border border-gray-700 rounded shadow-lg z-10"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            maxWidth: '200px'
          }}
        >
          <ul className="py-1">
            <li>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700"
                onClick={handleNewFolder}
              >
                New Folder
              </button>
            </li>
            <li>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700"
                onClick={handleNewNote}
              >
                New Note
              </button>
            </li>
            {contextMenu.folderId !== null && (
              <>
                <li className="border-t border-gray-700">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700"
                    onClick={handleRenameFolder}
                  >
                    Rename
                  </button>
                </li>
                <li>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                    onClick={handleDeleteFolder}
                  >
                    Delete
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FolderTree;