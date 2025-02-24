// src/lib/api.ts
interface Note {
    id: number;
    title: string;
    content: string;
    is_encrypted: boolean;
    tags: string[];
    created_at: string;
    updated_at: string | null;
    user_id: number;
  }
  
  interface CreateNoteData {
    title: string;
    content: string;
    is_encrypted: boolean;
    tags?: string[];
  }
  
  export const useNoteApi = (token: string | null) => {

    console.log("useNoteApi called with token:", !!token);
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  
    const baseUrl = 'http://localhost:8000';
  
    const getNotes = async (): Promise<Note[]> => {
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${baseUrl}/notes/`, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    };
  
    const getNote = async (id: number): Promise<Note> => {
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${baseUrl}/notes/${id}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch note');
      }
      return response.json();
    };
  
    const createNote = async (data: CreateNoteData): Promise<Note> => {
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${baseUrl}/notes/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    };
  
    const updateNote = async (id: number, data: Partial<CreateNoteData>): Promise<Note> => {
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${baseUrl}/notes/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update note');
      }
      return response.json();
    };
  
    const deleteNote = async (id: number): Promise<void> => {
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${baseUrl}/notes/${id}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
    };
  
    return {
      getNotes,
      getNote,
      createNote,
      updateNote,
      deleteNote
    };
  };