interface Note {
  id: number;
  title: string;
  content: string;
  is_encrypted: boolean;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  user_id: number;
  folder_id?: number | null;
}

interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  user_id: number;
  created_at: string;
  updated_at: string | null;
}

interface CreateNoteData {
  title: string;
  content: string;
  is_encrypted: boolean;
  tags?: string[];
  folder_id?: number | null;
}

interface CreateFolderData {
  name: string;
  parent_id?: number | null;
}

interface UpdateFolderData {
  name?: string;
  parent_id?: number | null;
}

interface File {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  is_encrypted: boolean;
  folder_id: number | null;
  created_at: string;
  updated_at: string | null;
  user_id: number;
}

interface UpdateFileData {
  filename?: string;
  folder_id?: number | null;
}

interface ProgressEvent {
  loaded: number;
  total: number;
}

export const useNoteApi = (token: string | null) => {
  console.log("useNoteApi called with token:", !!token);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const baseUrl = 'http://localhost:8000';

  // Note operations
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

    // Handle empty content with encryption enabled
    if (data.content === '' && data.is_encrypted) {
      // Either use a special placeholder or temporarily disable encryption
      data.content = ''; // Keep it empty, but the backend will handle it specially
    }

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

    // Handle empty content with encryption enabled
    if (data.content === '' && data.is_encrypted) {
      // Same handling as in createNote for consistency
      data.content = ''; // Keep it empty, but the backend will handle it specially
    }

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

  // Folder operations
  const getFolders = async (parentId?: number | null): Promise<Folder[]> => {
    if (!token) throw new Error('Not authenticated');

    let url = `${baseUrl}/folders/`;
    if (parentId !== undefined && parentId !== null) {
      url += `?parent_id=${parentId}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch folders');
    }

    return response.json();
  };

  const getFolder = async (id: number): Promise<Folder> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/folders/${id}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch folder');
    }

    return response.json();
  };

  const createFolder = async (data: CreateFolderData): Promise<Folder> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/folders/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    return response.json();
  };

  const updateFolder = async (id: number, data: UpdateFolderData): Promise<Folder> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/folders/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update folder');
    }

    return response.json();
  };

  const deleteFolder = async (id: number, recursive: boolean = false): Promise<void> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/folders/${id}?recursive=${recursive}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete folder');
    }
  };

  const getFolderNotes = async (folderId: number): Promise<Note[]> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/folders/${folderId}/notes`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch folder notes');
    }

    return response.json();
  };

  // File operations
  const uploadFile = async (
    formData: FormData,
    queryParams: string = '',
    progressCallback?: (progressEvent: ProgressEvent) => void
  ): Promise<File> => {
    if (!token) throw new Error('Not authenticated');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('POST', `${baseUrl}/files/?${queryParams}`);

      // Set auth header
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Handle response
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Error: ${xhr.status}`));
        }
      };

      // Handle errors
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      // Handle progress events
      if (progressCallback) {
        xhr.upload.onprogress = progressCallback;
      }

      // Send the form data
      xhr.send(formData);
    });
  };

  const getFiles = async (folderId?: number | null): Promise<File[]> => {
    if (!token) throw new Error('Not authenticated');

    let url = `${baseUrl}/files/`;
    if (folderId !== undefined && folderId !== null) {
      url += `?folder_id=${folderId}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return response.json();
  };

  const downloadFile = async (fileId: number): Promise<boolean> => {
    if (!token) throw new Error('Not authenticated');

    // Instead of fetching directly, we'll open the file in a new window
    // This will trigger the browser's download behavior
    window.open(`${baseUrl}/files/${fileId}/download`, '_blank');
    return true;
  };

  const deleteFile = async (fileId: number): Promise<void> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  };

  const updateFile = async (fileId: number, data: UpdateFileData): Promise<File> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${baseUrl}/files/${fileId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update file');
    }

    return response.json();
  };

  return {
    // Note operations
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,

    // Folder operations
    getFolders,
    getFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderNotes,

    // File operations
    uploadFile,
    getFiles,
    downloadFile,
    deleteFile,
    updateFile
  };
};