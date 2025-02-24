// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useNoteApi } from '@/lib/api';
import Link from 'next/link';

interface Note {
    id: number;
    title: string;
    content: string;
    is_encrypted: boolean;
    tags: string[];
    created_at: string;
    updated_at: string | null;
}

export default function Dashboard() {
    const { token, isAuthenticated, logout, loading: authLoading } = useAuth();
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const api = useNoteApi(token);

    useEffect(() => {

        if (authLoading) {
            return;
        }

        if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            router.push('/login');
            return;
        }

        if (!authLoading && isAuthenticated && token) {
            const fetchNotes = async () => {
                try {
                    console.log('Fetching notes');
                    const data = await api.getNotes();
                    setNotes(data);
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

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const handleDeleteNote = async (id: number) => {
        try {
            await api.deleteNote(id);
            setNotes(notes.filter(note => note.id !== id));
        } catch (err) {
            setError('Failed to delete note');
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">Checking authentication...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <header className="bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-white">Your Vault</h1>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/notes/new"
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-900 hover:bg-green-800"
                        >
                            New Note
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-900"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {notes.length === 0 ? (
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-white">No notes yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new note.</p>
                        <div className="mt-6">
                            <Link
                                href="/notes/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white g-green-800 hover:bg-green-900"
                            >
                                Create note
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {notes.map(note => (
                            <div key={note.id} className="bg-gray-800 overflow-hidden shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium text-white truncate">{note.title}</h3>
                                        {note.is_encrypted && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Encrypted
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500 line-clamp-3">{note.content}</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex space-x-2">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-900 text-gray-800">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 bg-gray-900 px-4 py-4 sm:px-6">
                                    <div className="flex justify-end space-x-3">
                                        <Link
                                            href={`/notes/${note.id}`}
                                            className="text-sm font-medium text-green-700 hover:text-green-600"
                                        >
                                            View
                                        </Link>
                                        <Link
                                            href={`/notes/${note.id}/edit`}
                                            className="text-sm font-medium text-green-700 hover:text-green-600"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="text-sm font-medium text-red-600 hover:text-red-500"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}