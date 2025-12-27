"use client";

import Image from "next/image";
import { Download, FileText, File, Video, Music, Archive } from "lucide-react";
import { formatFileSize, getFileType } from "@/lib/utils/fileValidation";

interface FileAttachmentProps {
  url: string;
  name: string;
  size: number;
  type: string;
}

function getFileIcon(mimeType: string) {
  const fileType = getFileType(mimeType);

  switch (fileType) {
    case 'document':
      return <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    case 'video':
      return <Video className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    case 'audio':
      return <Music className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    case 'archive':
      return <Archive className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    default:
      return <File className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
  }
}

export function FileAttachment({ url, name, size, type }: FileAttachmentProps) {
  const isImage = type.startsWith('image/');

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f0e7dd] dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-700">
      {isImage ? (
        <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
          <Image
            src={url}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          {getFileIcon(type)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(size)}
        </p>
      </div>
      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
        aria-label={`Download ${name}`}
      >
        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </a>
    </div>
  );
}
