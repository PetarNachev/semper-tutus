'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useNoteApi } from '@/lib/api';
import Link from 'next/link';
import debounce from 'lodash.debounce';
import FolderTree from '@/components/folders/folderTree';

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

export default function Dashboard() {
    const { token, isAuthenticated, logout, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeNote, setActiveNote] = useState<number | null>(null);
    const [saveStatus, setSaveStatus] = useState<{ [key: number]: string }>({});
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [activeFolder, setActiveFolder] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<{ [key: number]: boolean }>({});
    const [openTabs, setOpenTabs] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<number | null>(null);

    // Track if there are pending changes
    const pendingChanges = useRef<{ [key: number]: boolean }>({});
    // Create debounced update function that persists between renders
    const debouncedUpdateNoteRef = useRef<any>(null);
    // Track if API is initialized
    const apiRef = useRef<any>(null);

    // Search notes based on query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredNotes(notes);
        } else {
            const query = searchQuery.toLowerCase();
            const matched = notes.filter(note =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query)
            );
            setFilteredNotes(matched);
        }
    }, [searchQuery, notes]);

    // Check if we're on mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
            // Auto-collapse sidebar on mobile
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        // Check initially
        checkIfMobile();

        // Listen for window resize
        window.addEventListener('resize', checkIfMobile);

        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    // Initialize API when token is available
    useEffect(() => {
        if (token) {
            apiRef.current = useNoteApi(token);
        }
    }, [token]);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            router.push('/login');
            return;
        }

        // Only fetch notes if we have a token and the API is initialized
        if (!authLoading && isAuthenticated && token && apiRef.current) {
            const fetchNotes = async () => {
                try {
                    console.log('Fetching data');
                    setLoading(true);

                    // Fetch folders
                    const folderData = await apiRef.current.getFolders();
                    setFolders(folderData);
                    console.log('Folders loaded:', folderData.length);

                    // Fetch notes
                    const noteData = await apiRef.current.getNotes();
                    setNotes(noteData);
                    console.log('Notes loaded:', noteData.length);
                    // Set the first note as active if there's at least one note
                    if (noteData.length > 0 && activeNote === null) {
                        const firstNoteId = noteData[0].id;
                        setActiveNote(firstNoteId);
                        setActiveTab(firstNoteId);
                        setOpenTabs([firstNoteId]); // Initialize with first note as open tab
                    }
                } catch (err) {
                    console.error('Error fetching notes:', err);
                    setError('Failed to fetch notes');
                } finally {
                    setLoading(false);
                }
            };

            fetchNotes();
        }
    }, [isAuthenticated, authLoading, token]);

    const handleCreateFolder = async (name: string, parentId: number | null) => {
        try {
            // If parentId is null but there's an active folder, use that as the parent
            const actualParentId = parentId !== null ? parentId : activeFolder;

            const newFolder = await apiRef.current.createFolder({
                name,
                parent_id: actualParentId
            });

            setFolders(prevFolders => [...prevFolders, newFolder]);
            setActiveFolder(newFolder.id);

            // Ensure the parent folder is expanded
            if (actualParentId !== null) {
                setExpandedFolders(prev => ({
                    ...prev,
                    [actualParentId]: true
                }));
            }

            return newFolder;
        } catch (err) {
            console.error('Error creating folder:', err);
            setError('Failed to create folder');
        }
    };

    const isEncryptedEmptyContent = (content: string): boolean => {
        // Check if it looks like an encrypted empty string
        return content.startsWith('gAAAAA') &&
            !content.includes('\n') &&
            content.length > 30 &&
            content.length < 200; // Typical length for encrypted empty string
    }

    // Function to open a tab when a note is clicked
    const openNoteTab = (noteId: number) => {
        console.log(`Opening tab for note ID: ${noteId}`);
        // Only add to tabs if not already there
        if (!openTabs.includes(noteId)) {
            setOpenTabs(prev => [...prev, noteId]);
        }

        // Always set both active tab and active note
        setActiveTab(noteId);
        setActiveNote(noteId); // This drives the display in the right panel
    };

    // Function to close a tab
    const closeTab = (noteId: number, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }

        // Remove the tab
        setOpenTabs(prev => prev.filter(id => id !== noteId));

        // If we're closing the active tab, activate another tab
        if (activeTab === noteId) {
            const remainingTabs = openTabs.filter(id => id !== noteId);
            if (remainingTabs.length > 0) {
                // Activate the tab to the left, or the first tab if this is the leftmost tab
                const currentIndex = openTabs.indexOf(noteId);
                const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                setActiveTab(remainingTabs[newActiveIndex < remainingTabs.length ? newActiveIndex : 0]);
                setActiveNote(remainingTabs[newActiveIndex < remainingTabs.length ? newActiveIndex : 0]);
            } else {
                // No tabs left, clear active note
                setActiveTab(null);
                setActiveNote(null);
            }
        }
    };

    // Rename a folder
    const handleRenameFolder = async (id: number, newName: string) => {
        try {
            const updatedFolder = await apiRef.current.updateFolder(id, { name: newName });

            setFolders(prevFolders =>
                prevFolders.map(folder =>
                    folder.id === id ? { ...folder, name: newName } : folder
                )
            );
        } catch (err) {
            console.error('Error renaming folder:', err);
            setError('Failed to rename folder');
        }
    };

    // Delete a folder
    const handleDeleteFolder = async (id: number, recursive: boolean) => {
        try {
            await apiRef.current.deleteFolder(id, recursive);

            // Remove the folder from state
            setFolders(prevFolders =>
                prevFolders.filter(folder => folder.id !== id)
            );

            // If deleting recursively, also remove any notes in this folder
            if (recursive) {
                setNotes(prevNotes =>
                    prevNotes.filter(note => note.folder_id !== id)
                );
            }

            // If this was the active folder, clear it
            if (activeFolder === id) {
                setActiveFolder(null);
            }
        } catch (err) {
            console.error('Error deleting folder:', err);
            setError('Failed to delete folder');
        }
    };

    // Create a new note in the specified folder
    const handleCreateNote = (folderId: number | null) => {
        const query = folderId ? `?folder_id=${folderId.toString()}` : '';
        console.log('Navigating to /notes/new with query:', query);
        router.push(`/notes/new${query}`);
    };

    const createNoteInline = async (title: string, folderId: number | null) => {
        console.log(`Creating note with title: ${title}, folder: ${folderId}`);
        try {
            if (!apiRef.current) {
                console.error('API not initialized');
                setError('API not initialized');
                return null;
            }

            // Create the note
            const newNote = await apiRef.current.createNote({
                title: title,
                content: '',
                is_encrypted: true,
                tags: [],
                folder_id: folderId
            });
            console.log(`Note created with ID: ${newNote.id}`);
            // Add note to state
            setNotes(prevNotes => [...prevNotes, newNote]);

            // Important: Use only ONE way to display the note - through tabs
            // Don't set active note directly - let the openNoteTab function do it
            openNoteTab(newNote.id);

            return newNote;
        } catch (err) {
            console.error('Failed to create note:', err);
            setError('Failed to create note');
            return null;
        }
    };

    // Move a note to a different folder
    const handleMoveNote = async (noteId: number, folderId: number | null) => {
        try {
            const updatedNote = await apiRef.current.updateNote(noteId, { folder_id: folderId });

            // Update the note in state
            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, folder_id: folderId } : note
                )
            );
        } catch (err) {
            console.error('Error moving note:', err);
            setError('Failed to move note');
        }
    };

    const handleLogout = async () => {
        // Save any pending changes before logout
        await saveAllPendingChanges();
        await logout();
        router.push('/login');
    };

    const handleDeleteNote = async (id: number, event?: React.MouseEvent) => {
        // Stop propagation to prevent note activation
        if (event) {
            event.stopPropagation();
        }

        // Close menu
        setMenuOpen(null);

        try {
            await apiRef.current.deleteNote(id);
            setNotes(notes.filter(note => note.id !== id));

            // Clear any pending changes for this note
            const newPendingChanges = { ...pendingChanges.current };
            delete newPendingChanges[id];
            pendingChanges.current = newPendingChanges;

            // If this was the active note, select another one
            if (activeNote === id) {
                // Find the next note to select
                const remainingNotes = notes.filter(note => note.id !== id);
                if (remainingNotes.length > 0) {
                    setActiveNote(remainingNotes[0].id);
                } else {
                    setActiveNote(null);
                }
            }
        } catch (err) {
            setError('Failed to delete note');
        }
    };

    const updateNote = async (id: number, updatedFields: Partial<Note>) => {
        if (!apiRef.current) {
            console.error('API not initialized');
            setError('API not initialized');
            return;
        }

        setSaveStatus(prev => ({ ...prev, [id]: 'Saving...' }));

        try {
            const updatedNote = await apiRef.current.updateNote(id, updatedFields);
            setNotes(prevNotes => prevNotes.map(note => (note.id === id ? updatedNote : note)));
            setSaveStatus(prev => ({ ...prev, [id]: 'Saved' }));

            // Clear pending change flag for this note
            pendingChanges.current = { ...pendingChanges.current, [id]: false };

            // Clear save status after a delay
            setTimeout(() => {
                setSaveStatus(prev => {
                    const newStatus = { ...prev };
                    if (newStatus[id] === 'Saved') {
                        delete newStatus[id];
                    }
                    return newStatus;
                });
            }, 2000);

        } catch (err) {
            console.error('Failed to update note:', err);
            setError('Failed to update note');
            setSaveStatus(prev => ({ ...prev, [id]: 'Error saving' }));
        }
    };

    // Initialize debounced update function
    useEffect(() => {
        debouncedUpdateNoteRef.current = debounce((id: number, updatedFields: Partial<Note>) => {
            updateNote(id, updatedFields);
        }, 500);

        return () => {
            // Cancel any pending debounced calls when component unmounts
            if (debouncedUpdateNoteRef.current?.cancel) {
                debouncedUpdateNoteRef.current.cancel();
            }
        };
    }, []);

    const handleChange = (id: number, field: keyof Note, value: string) => {
        // Update local state immediately for responsive UI
        setNotes(prevNotes =>
            prevNotes.map(note =>
                note.id === id ? { ...note, [field]: value } : note
            )
        );

        // Mark this note as having pending changes
        pendingChanges.current = { ...pendingChanges.current, [id]: true };

        // Show editing status
        setSaveStatus(prev => ({ ...prev, [id]: 'Editing...' }));

        // Schedule the debounced update
        if (debouncedUpdateNoteRef.current) {
            debouncedUpdateNoteRef.current(id, { [field]: value });
        }
    };

    const handleManualSave = (id: number, event?: React.MouseEvent) => {
        // Stop propagation
        if (event) {
            event.stopPropagation();
        }

        // Find the current note
        const note = notes.find(n => n.id === id);
        if (!note) return;

        // Cancel any pending debounced saves
        if (debouncedUpdateNoteRef.current?.cancel) {
            debouncedUpdateNoteRef.current.cancel();
        }

        // Perform immediate save
        updateNote(id, { title: note.title, content: note.content });
    };

    const saveAllPendingChanges = async () => {
        if (!apiRef.current) return;

        // Cancel any pending debounced saves
        if (debouncedUpdateNoteRef.current?.cancel) {
            debouncedUpdateNoteRef.current.cancel();
        }

        // Save all notes with pending changes
        const promises = notes
            .filter(note => pendingChanges.current[note.id])
            .map(note => updateNote(note.id, { title: note.title, content: note.content }));

        await Promise.all(promises);
    };
    const handleSetActiveNote = (noteId: number) => {
        setActiveNote(noteId);
        openNoteTab(noteId);

        // If on mobile, close the sidebar
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    // Toggle menu for a note
    const toggleMenu = (id: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setMenuOpen(menuOpen === id ? null : id);
    };

    // Menu reference for click outside detection
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Don't close if clicking the menu button or inside the menu
            if (
                menuButtonRef.current?.contains(event.target as Node) ||
                menuRef.current?.contains(event.target as Node)
            ) {
                return;
            }
            setMenuOpen(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Save all pending changes when navigating away
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasPendingChanges = Object.values(pendingChanges.current).some(Boolean);
            if (hasPendingChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [notes]);

    // Get the active note object
    const currentNote = notes.find(note => note.id === activeNote);

    // Format date to show only the date part
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Group notes by tags (or category)
    const groupedNotes = notes.reduce((groups: { [key: string]: Note[] }, note) => {
        // Use the first tag as group, or "Uncategorized" if no tags
        const group = note.tags && note.tags.length > 0 ? note.tags[0] : "Uncategorized";

        if (!groups[group]) {
            groups[group] = [];
        }

        groups[group].push(note);
        return groups;
    }, {});

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Loading your notes...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-gray-800 shadow px-4 py-3 flex justify-between items-center">
                <div className="flex items-center">
                    {/* Mobile sidebar toggle */}
                    <button
                        className="text-gray-400 hover:text-white mr-3 md:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {sidebarOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-white">Your Vault</h1>
                </div>
                <button onClick={handleLogout} className="px-3 py-1 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600">
                    Logout
                </button>
            </header>

            {/* Error message */}
            {error && (
                <div className="bg-red-900 border-l-4 border-red-500 text-white px-4 py-2 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-white">&times;</button>
                </div>
            )}

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Replace your existing tag-based grouping with the folder tree */}
                <div className={`bg-gray-800 overflow-y-auto border-r border-gray-700 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 md:w-0 overflow-hidden'
                    }`}>
                    {/* Sidebar header with search */}
                    <div className="sticky top-0 bg-gray-800 z-10 p-3 border-b border-gray-700">
                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder="Search notes..."
                                className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Show folder tree when not searching */}
                    {!searchQuery ? (
                        <FolderTree
                            folders={folders}
                            notes={notes}
                            activeNote={activeNote}
                            setActiveNote={handleSetActiveNote}
                            activeFolder={activeFolder}
                            setActiveFolder={setActiveFolder}
                            isMobile={isMobile}
                            setSidebarOpen={setSidebarOpen}
                            onCreateFolder={handleCreateFolder}
                            onCreateNote={handleCreateNote}
                            onDeleteFolder={handleDeleteFolder}
                            onRenameFolder={handleRenameFolder}
                            onMoveNote={handleMoveNote}
                            createNoteInline={createNoteInline}
                            setNotes={setNotes}
                            expandedFolders={expandedFolders}
                            setExpandedFolders={setExpandedFolders}
                        />
                    ) : (
                        // Show search results when searching
                        <div className="mt-2">
                            {filteredNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400">No notes match your search</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    <div className="text-sm font-medium text-gray-400 mb-1">Search Results</div>
                                    {filteredNotes.map(note => (
                                        <div
                                            key={note.id}
                                            className={`flex items-center py-1 pl-2 cursor-pointer ${activeNote === note.id
                                                ? 'bg-gray-700 text-white'
                                                : 'text-gray-300 hover:bg-gray-750'
                                                }`}
                                            onClick={() => {
                                                openNoteTab(note.id); // Open tab when clicking search result
                                                if (isMobile) {
                                                    setSidebarOpen(false);
                                                }
                                            }}
                                        >
                                            <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <div className="flex-1 truncate">
                                                <div className="text-sm font-medium truncate">{note.title}</div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {formatDate(note.updated_at || note.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right content area */}
                <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                    {/* Tabs bar */}
                    {openTabs.length > 0 && (
                        <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto hide-scrollbar">
                            {openTabs.map(tabId => {
                                const note = notes.find(n => n.id === tabId);
                                if (!note) return null;

                                return (
                                    <div
                                        key={tabId}
                                        className={`flex items-center px-3 py-2 border-r border-gray-700 cursor-pointer min-w-0 max-w-xs ${activeTab === tabId ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-750'
                                            }`}
                                        onClick={() => {
                                            setActiveTab(tabId);
                                            setActiveNote(tabId);
                                        }}
                                    >
                                        <div className="truncate text-sm text-gray-300 mr-2">
                                            {note.title || "Untitled"}
                                        </div>
                                        <button
                                            className="text-gray-500 hover:text-gray-300 ml-auto"
                                            onClick={(e) => closeTab(tabId, e)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!sidebarOpen && isMobile && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="absolute top-16 left-4 z-10 bg-gray-800 text-gray-400 hover:text-white p-2 rounded-full shadow-lg"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}

                    {currentNote ? (
                        <>
                            {/* Note header */}
                            <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                                <input
                                    className="bg-transparent text-white text-xl font-bold focus:outline-none w-full"
                                    value={currentNote.title}
                                    onChange={(e) => handleChange(currentNote.id, 'title', e.target.value)}
                                    placeholder="Untitled Note"
                                />
                                <div className="flex items-center">
                                    <span className={`text-xs px-2 py-1 rounded mr-2 ${saveStatus[currentNote.id] === 'Saved'
                                        ? 'bg-green-900 text-green-100'
                                        : saveStatus[currentNote.id] === 'Saving...'
                                            ? 'bg-blue-900 text-blue-100'
                                            : saveStatus[currentNote.id] === 'Editing...'
                                                ? 'bg-yellow-800 text-yellow-100'
                                                : saveStatus[currentNote.id] === 'Error saving'
                                                    ? 'bg-red-800 text-red-100'
                                                    : 'hidden'
                                        }`}>
                                        {saveStatus[currentNote.id]}
                                    </span>

                                    {/* Menu button */}
                                    <button
                                        onClick={(e) => toggleMenu(currentNote.id, e)}
                                        className="text-gray-400 hover:text-white p-1"
                                        ref={menuOpen === currentNote.id ? menuButtonRef : null}
                                    >
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <circle cx="10" cy="6" r="2" />
                                            <circle cx="10" cy="10" r="2" />
                                            <circle cx="10" cy="14" r="2" />
                                        </svg>
                                    </button>

                                    {menuOpen === currentNote.id && (
                                        <div
                                            className="absolute right-4 top-14 mt-2 w-64 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
                                            onClick={(e) => e.stopPropagation()}
                                            ref={menuRef}
                                        >
                                            <div className="py-1">
                                                <div className="px-4 py-2 text-xs text-gray-400">
                                                    <div className="mb-1">
                                                        <span className="font-medium">Created:</span> {new Date(currentNote.created_at).toLocaleString()}
                                                    </div>
                                                    {currentNote.updated_at && (
                                                        <div className="mb-1">
                                                            <span className="font-medium">Updated:</span> {new Date(currentNote.updated_at).toLocaleString()}
                                                        </div>
                                                    )}
                                                    <div className="mb-1">
                                                        <span className="font-medium">Encrypted:</span> {currentNote.is_encrypted ? 'Yes' : 'No'}
                                                    </div>
                                                </div>

                                                {/* Tags editing */}
                                                <div className="border-t border-gray-600 my-1"></div>
                                                <div className="px-4 py-2">
                                                    <div className="text-xs font-medium text-gray-400 mb-1">Tags (comma separated)</div>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-gray-600 text-white text-sm border border-gray-500 rounded px-2 py-1"
                                                        value={currentNote.tags ? currentNote.tags.join(', ') : ''}
                                                        onChange={(e) => {
                                                            const tagArray = e.target.value.split(',')
                                                                .map(tag => tag.trim())
                                                                .filter(tag => tag.length > 0);

                                                            // Direct update for tags changes
                                                            updateNote(currentNote.id, { tags: tagArray });
                                                        }}
                                                        placeholder="work, important, ideas"
                                                    />
                                                </div>

                                                <div className="border-t border-gray-600 my-1"></div>
                                                <button
                                                    onClick={(e) => handleManualSave(currentNote.id, e)}
                                                    className="block w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-600"
                                                >
                                                    Save Note
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteNote(currentNote.id, e)}
                                                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                                                >
                                                    Delete Note
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Note content */}
                            <div className="flex-1 overflow-auto p-4">
                                <textarea
                                    className="w-full h-full bg-transparent text-white text-base border-0 focus:outline-none resize-none"
                                    value={isEncryptedEmptyContent(currentNote.content) ? '' : currentNote.content}
                                    onChange={(e) => handleChange(currentNote.id, 'content', e.target.value)}
                                    placeholder="Start writing..."
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <p>No note selected</p>
                                {notes.length > 0 ? (
                                    <p className="text-sm mt-2">Select a note from the sidebar or create a new one</p>
                                ) : (
                                    <Link href="/notes/new" className="mt-4 inline-block px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800">
                                        Create Your First Note
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}