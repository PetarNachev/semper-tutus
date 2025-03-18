'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface FileProps {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  is_encrypted: boolean;
  folder_id: number | null;
  created_at: string;
  updated_at: string | null;
}

// File Upload Component
export function FileUploader({ 
  folderId, 
  onFileUploaded, 
  api 
}: { 
  folderId: number | null; 
  onFileUploaded: (file: FileProps) => void;
  api: any;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [encrypt, setEncrypt] = useState(true);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Add query parameters
      const queryParams = new URLSearchParams();
      if (folderId) {
        queryParams.append('folder_id', folderId.toString());
      }
      queryParams.append('is_encrypted', encrypt.toString());
      
      // Use custom upload method from api
      const uploadedFile = await api.uploadFile(formData, queryParams.toString(), (progressEvent) => {
        // Update progress
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      // Notify parent
      onFileUploaded(uploadedFile);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="encrypt-file"
          checked={encrypt}
          onChange={(e) => setEncrypt(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="encrypt-file" className="text-sm text-gray-300">
          Encrypt File
        </label>
      </div>
      
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-md 
            ${isUploading 
              ? 'bg-gray-700 cursor-not-allowed' 
              : 'bg-blue-900 hover:bg-blue-800 cursor-pointer'} 
            text-white`}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </label>
        
        {isUploading && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
              {progress}%
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// File List Component
export function FileList({ 
  files, 
  onFileSelect, 
  onFileDelete,
  api
}: { 
  files: FileProps[]; 
  onFileSelect: (file: FileProps) => void;
  onFileDelete: (id: number) => void;
  api: any;
}) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get icon based on file type
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (contentType.startsWith('video/')) {
      return (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (contentType.startsWith('audio/')) {
      return (
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    } else if (
      contentType === 'application/pdf' ||
      contentType === 'application/msword' ||
      contentType.includes('document')
    ) {
      return (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
  };
  
  // Handle file download
  const handleDownload = async (file: FileProps) => {
    try {
      // Call API to get file download URL
      await api.downloadFile(file.id);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">Files</h3>
      
      {files.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No files in this folder
        </div>
      ) : (
        <ul className="space-y-1">
          {files.map(file => (
            <li 
              key={file.id}
              className="flex items-center py-2 px-2 rounded-md hover:bg-gray-750 group"
            >
              <div className="mr-2">
                {getFileIcon(file.content_type)}
              </div>
              
              <div className="flex-1 min-w-0" onClick={() => onFileSelect(file)}>
                <div className="text-sm font-medium text-gray-300 truncate">
                  {file.filename}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                  {file.is_encrypted && (
                    <span className="ml-2 text-green-500">🔒 Encrypted</span>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="text-gray-400 hover:text-blue-400 p-1"
                  title="Download"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                
                <button
                  onClick={() => onFileDelete(file.id)}
                  className="text-gray-400 hover:text-red-400 p-1"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// File Preview Component
export function FilePreview({ file }: { file: FileProps | null }) {
  const router = useRouter();
  
  if (!file) {
    return null;
  }
  
  // Check if file is an image that can be previewed
  const isPreviewableImage = file.content_type.startsWith('image/') && (
    file.content_type.includes('jpeg') || 
    file.content_type.includes('jpg') || 
    file.content_type.includes('png') || 
    file.content_type.includes('gif') ||
    file.content_type.includes('svg')
  );
  
  // Get file extension from filename
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">{file.filename}</h3>
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="border-t border-gray-700 py-4">
        {isPreviewableImage ? (
          <div className="flex justify-center">
            <img
              src={`/api/files/${file.id}/download`}
              alt={file.filename}
              className="max-w-full max-h-80 object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-6xl mb-4">
              {getFileIcon(file.content_type)}
            </div>
            <div className="text-center">
              <div className="text-lg text-gray-300 font-medium">
                {getFileExtension(file.filename).toUpperCase()} File
              </div>
              <p className="text-gray-500 mt-1">
                Preview not available. Please download to view.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-gray-400">Type</div>
          <div className="text-white">{file.content_type}</div>
          
          <div className="text-gray-400">Size</div>
          <div className="text-white">
            {formatFileSize(file.size)}
          </div>
          
          <div className="text-gray-400">Encrypted</div>
          <div className="text-white">
            {file.is_encrypted ? 'Yes' : 'No'}
          </div>
          
          <div className="text-gray-400">Uploaded</div>
          <div className="text-white">
            {new Date(file.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <a
          href={`/api/files/${file.id}/download`}
          download={file.filename}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          Download File
        </a>
      </div>
    </div>
  );
}

// Helper to format file size
export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}