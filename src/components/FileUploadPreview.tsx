"use client";

import { X, AlertCircle, Loader2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils/fileValidation";

export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadProgress: number;
  url?: string;
  path?: string;
  error?: string;
}

interface FileUploadPreviewProps {
  files: AttachedFile[];
  onRemove: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
}

export function FileUploadPreview({ files, onRemove, onRetry }: FileUploadPreviewProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-2 space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </p>
              {file.uploadStatus === 'uploading' && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {file.uploadProgress}%
                </span>
              )}
              {file.uploadStatus === 'error' && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {file.error || 'Upload failed'}
                </span>
              )}
              {file.uploadStatus === 'completed' && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Uploaded
                </span>
              )}
            </div>
            {file.uploadStatus === 'uploading' && (
              <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                  style={{ width: `${file.uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {file.uploadStatus === 'uploading' && (
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
          )}

          {file.uploadStatus === 'error' && onRetry && (
            <button
              onClick={() => onRetry(file.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
              aria-label="Retry upload"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          )}

          <button
            onClick={() => onRemove(file.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
            aria-label={`Remove ${file.name}`}
            disabled={file.uploadStatus === 'uploading'}
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
