export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

export async function uploadFile(
  file: File,
  userId: string,
  conversationId: number | null,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {

  console.log('[Storage] Uploading file via API:', {
    userId,
    conversationId,
    fileName: file.name,
    fileSize: file.size
  });

  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversationId', conversationId.toString());
  }

  // Upload via API route
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    console.error('[Storage] Upload error:', errorData);
    throw new Error(errorData.error || 'Upload failed');
  }

  const result = await response.json();

  if (!result.success || !result.file) {
    throw new Error('Invalid response from upload API');
  }

  console.log('[Storage] Upload successful:', result.file);

  return result.file;
}

export async function deleteFile(path: string): Promise<void> {
  // Delete via API route
  const response = await fetch('/api/upload', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(errorData.error || 'Delete failed');
  }
}

export async function uploadWithRetry(
  file: File,
  userId: string,
  conversationId: number | null,
  maxRetries = 3,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadFile(file, userId, conversationId, onProgress);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Upload failed after retries');
}
