'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useNoteApi } from '@/lib/api';
import Link from 'next/link';

// Add Folder interface
interface Folder {
    id: number;
    name: string;
    parent_id: number | null;
    user_id: number;
    created_at: string;
    updated_at: string | null;
}

export default function NewNote() {
    const { token, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get folder_id from query parameters
    const initialFolderId = searchParams ? searchParams.get('folder_id') : null;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [isEncrypted, setIsEncrypted] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [folderId, setFolderId] = useState<number | null>(initialFolderId ? Number(initialFolderId) : null);
    const [folders, setFolders] = useState<Folder[]>([]);

    // API client reference
    const api = token ? useNoteApi(token) : null;

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Load folders for the dropdown
        const loadFolders = async () => {
            if (!api) return;

            try {
                const folderData = await api.getFolders();
                setFolders(folderData);
            } catch (err) {
                console.error('Error loading folders:', err);
            }
        };

        loadFolders();
    }, [isAuthenticated, authLoading, router, api]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title) {
            setError('Title is required.');
            return;
        }

        if (!api) {
            setError('Not authenticated');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Split tags by commas and trim whitespace
            const tagArray = tags.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            await api.createNote({
                title,
                content,
                is_encrypted: isEncrypted,
                tags: tagArray,
                folder_id: folderId // Include folder_id
            });

            router.push('/dashboard');
        } catch (err) {
            console.error('Error creating note:', err);
            setError('Failed to create note. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get folder path for display
    const getFolderPath = (folderId: number | null): string => {
        if (!folderId) return 'None';

        const paths: string[] = [];
        let currentId: number | null = folderId;

        while (currentId) {
            const folder = folders.find(f => f.id === currentId);
            if (!folder) break;

            paths.unshift(folder.name);
            currentId = folder.parent_id;
        }



        return paths.join(' / ') || 'Unknown';
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <header className="bg-gray-800 shadow px-4 py-3 flex justify-between items-center">
                <h1 className="text-xl font-bold text-white">New Note</h1>
                <Link href="/dashboard" className="px-3 py-1 text-sm font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600">
                    Cancel
                </Link>
            </header>

            <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {error && (
                    <div className="bg-red-900 border-l-4 border-red-500 text-white p-4 mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-medium mb-2" htmlFor="title">
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            className="bg-gray-800 text-white w-full px-3 py-2 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Note title"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-medium mb-2" htmlFor="content">
                            Content
                        </label>
                        <textarea
                            id="content"
                            rows={12}
                            className="bg-gray-800 text-white w-full px-3 py-2 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your note here..."
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-medium mb-2" htmlFor="tags">
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            id="tags"
                            className="bg-gray-800 text-white w-full px-3 py-2 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="work, important, ideas"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-medium mb-2" htmlFor="folder">
                            Folder
                        </label>
                        <select
                            id="folder"
                            className="bg-gray-800 text-white w-full px-3 py-2 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                            value={folderId !== null ? folderId.toString() : ''}
                            onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">None (Uncategorized)</option>
                            {folders.map(folder => (
                                <option key={folder.id} value={folder.id}>
                                    {getFolderPath(folder.id)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6 flex items-center">
                        <input
                            type="checkbox"
                            id="encrypt"
                            className="mr-2"
                            checked={isEncrypted}
                            onChange={(e) => setIsEncrypted(e.target.checked)}
                        />
                        <label htmlFor="encrypt" className="text-gray-400 text-sm">
                            Encrypt this note
                        </label>
                    </div>

                    <div className="flex justify-between">
                        <Link href="/dashboard" className="px-4 py-2 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-600 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Note'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}