"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

interface GoogleDrivePickerProps {
  onFilesSelected: (files: File[]) => void;
  onError?: (error: string) => void;
}

// Google Picker API configuration
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export function GoogleDrivePicker({ onFilesSelected, onError }: GoogleDrivePickerProps) {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  useEffect(() => {
    // Load Google API scripts
    const loadGoogleAPIs = () => {
      // Load gapi (Google API client)
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi?.load('client:picker', () => {
          setPickerApiLoaded(true);
        });
      };
      document.body.appendChild(gapiScript);

      // Load Google Identity Services (GIS)
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        setGisLoaded(true);
      };
      document.body.appendChild(gisScript);
    };

    if (!window.gapi || !window.google?.accounts) {
      loadGoogleAPIs();
    } else {
      setPickerApiLoaded(true);
      setGisLoaded(true);
    }
  }, []);

  const authenticateUser = async () => {
    if (!GOOGLE_CLIENT_ID) {
      const error = 'Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.';
      toast.error(error);
      onError?.(error);
      return null;
    }

    try {
      const client = window.google?.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.access_token) {
            setOauthToken(response.access_token);
          }
        },
      });

      return new Promise<string>((resolve, reject) => {
        client.callback = (response: any) => {
          if (response.error) {
            reject(response.error);
            return;
          }
          resolve(response.access_token);
        };
        client.requestAccessToken();
      });
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  const createPicker = async () => {
    if (!pickerApiLoaded || !gisLoaded) {
      toast.error('Google APIs are still loading. Please try again in a moment.');
      return;
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_APP_ID) {
      const error = 'Google Drive API not configured. Please set environment variables: NEXT_PUBLIC_GOOGLE_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_APP_ID';
      toast.error(error);
      onError?.(error);
      return;
    }

    try {
      // Get OAuth token
      const token = oauthToken || await authenticateUser();
      if (!token) return;

      setOauthToken(token);

      // Create and render the picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setAppId(GOOGLE_APP_ID)
        .setCallback(pickerCallback)
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error creating picker:', error);
      toast.error('Failed to open Google Drive picker');
      onError?.(error instanceof Error ? error.message : 'Failed to open picker');
    }
  };

  const pickerCallback = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const selectedFiles = data.docs as GoogleDriveFile[];

      toast.info(`Downloading ${selectedFiles.length} file(s) from Google Drive...`);

      try {
        const files: File[] = [];

        for (const driveFile of selectedFiles) {
          const file = await downloadFileFromDrive(driveFile.id, driveFile.name, oauthToken!);
          if (file) {
            files.push(file);
          }
        }

        if (files.length > 0) {
          onFilesSelected(files);
          toast.success(`Successfully downloaded ${files.length} file(s) from Google Drive`);
        }
      } catch (error) {
        console.error('Error downloading files:', error);
        toast.error('Failed to download files from Google Drive');
        onError?.(error instanceof Error ? error.message : 'Download failed');
      }
    }
  };

  const downloadFileFromDrive = async (
    fileId: string,
    fileName: string,
    accessToken: string
  ): Promise<File | null> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error(`Error downloading file ${fileName}:`, error);
      toast.error(`Failed to download ${fileName}`);
      return null;
    }
  };

  return { createPicker };
}

export function useGoogleDrivePicker(
  onFilesSelected: (files: File[]) => void,
  onError?: (error: string) => void
) {
  const { createPicker } = GoogleDrivePicker({ onFilesSelected, onError });
  return { openGoogleDrivePicker: createPicker };
}
