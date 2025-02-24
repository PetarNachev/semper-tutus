// src/app/notes/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useNoteApi } from '@/lib/api';
import Link from 'next/link';

export default function NewNote() {
    const { token, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isEncrypted, setIsEncrypted] = useState(true);
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = useNoteApi(token);

    useEffect(() => {
        console.log("NewNote auth state:", { authLoading, isAuthenticated, hasToken: !!token });

        if (!authLoading && !isAuthenticated) {
            console.log("Not authenticated, redirecting to login");
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router, token]);

    // If still loading auth, show loading
    if (authLoading) {
        return <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">Checking authentication...</div>;
    }

    if (!isAuthenticated) {
        router.push('/login');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);

            await api.createNote({
                title,
                content,
                is_encrypted: isEncrypted,
                tags: tagArray
            });

            router.push('/dashboard');
        } catch (err) {
            setError('Failed to create note');
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return null; // Don't render anything while redirecting
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <header className="bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">Create New Note</h1>
                        <Link href="/dashboard" className="text-green-700 hover:text-indigo-800">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label htmlFor="title" className="block text-sm font-medium text-gray-200">
                                Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full bg-gray-700 rounded-md border-gray-600 shadow-sm focus:border-green-700 focus:ring-green-700 sm:text-sm"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="content" className="block text-sm font-medium text-gray-200">
                                Content
                            </label>
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={8}
                                className="mt-1 block w-full bg-gray-700 rounded-md border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-green-700 sm:text-sm"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="tags" className="block text-sm font-medium text-gray-200">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                id="tags"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className="mt-1 block w-full bg-gray-700 rounded-md border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-green-700 sm:text-sm"
                                placeholder="personal, important, todo"
                            />
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center">
                                <input
                                    id="encrypted"
                                    type="checkbox"
                                    checked={isEncrypted}
                                    onChange={(e) => setIsEncrypted(e.target.checked)}
                                    className="h-4 w-4 text-green-700 bg-gray-700 focus:ring-green-700 border-gray-600 rounded"
                                />
                                <label htmlFor="encrypted" className="ml-2 block text-sm text-white">
                                    Encrypt this note
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                Encrypted notes are protected with your master key and can only be read by you.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/dashboard"
                                className="bg-gray-800 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 mr-3"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-900 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700"
                            >
                                {loading ? 'Creating...' : 'Create Note'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}