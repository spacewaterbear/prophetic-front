import { useRef } from "react";
import { AttachedFile } from "@/components/FileUploadPreview";
import { uploadWithRetry, deleteFile } from "@/lib/supabase/storage";
import { validateFile } from "@/lib/utils/fileValidation";
import { toast } from "sonner";

interface UseFileUploadProps {
  userId?: string;
  conversationId?: number | null;
  attachedFiles: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
}

export function useFileUpload({
  userId,
  conversationId,
  attachedFiles,
  onFilesChange,
}: UseFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (!userId) {
      toast.error("Please log in to upload files");
      return;
    }

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid file");
        continue;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile: AttachedFile = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadStatus: "uploading",
        uploadProgress: 0,
      };

      const updatedFiles = [...attachedFiles, newFile];
      onFilesChange?.(updatedFiles);

      try {
        const uploaded = await uploadWithRetry(
          file,
          userId,
          conversationId || null,
          3,
          (progress) => {
            onFilesChange?.(
              updatedFiles.map((f) =>
                f.id === fileId ? { ...f, uploadProgress: progress } : f,
              ),
            );
          },
        );

        onFilesChange?.(
          updatedFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  uploadStatus: "completed" as const,
                  uploadProgress: 100,
                  url: uploaded.url,
                  path: uploaded.path,
                }
              : f,
          ),
        );

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error("Upload error:", error);
        onFilesChange?.(
          updatedFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  uploadStatus: "error" as const,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f,
          ),
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await processFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    const file = attachedFiles.find((f) => f.id === fileId);
    if (file?.path) {
      try {
        await deleteFile(file.path);
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
    onFilesChange?.(attachedFiles.filter((f) => f.id !== fileId));
  };

  const handleRetryUpload = async (fileId: string) => {
    if (!userId) return;

    const file = attachedFiles.find((f) => f.id === fileId);
    if (!file) return;

    onFilesChange?.(
      attachedFiles.map((f) =>
        f.id === fileId
          ? {
              ...f,
              uploadStatus: "uploading" as const,
              uploadProgress: 0,
              error: undefined,
            }
          : f,
      ),
    );

    try {
      const uploaded = await uploadWithRetry(
        file.file,
        userId,
        conversationId || null,
        3,
        (progress) => {
          onFilesChange?.(
            attachedFiles.map((f) =>
              f.id === fileId ? { ...f, uploadProgress: progress } : f,
            ),
          );
        },
      );

      onFilesChange?.(
        attachedFiles.map((f) =>
          f.id === fileId
            ? {
                ...f,
                uploadStatus: "completed" as const,
                uploadProgress: 100,
                url: uploaded.url,
                path: uploaded.path,
              }
            : f,
        ),
      );

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      onFilesChange?.(
        attachedFiles.map((f) =>
          f.id === fileId
            ? {
                ...f,
                uploadStatus: "error" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        ),
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  return {
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleRetryUpload,
    processFiles,
  };
}
