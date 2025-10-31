import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface VideoData {
  id: string;
  prompt: string;
}

interface VideoIdsContextType {
  addVideoPrompt: (id: string, prompt: string) => void;
  removeVideoPrompt: (id: string) => void;
  clearAllPrompts: () => void;
  getPrompt: (id: string) => string | undefined;
}

const VideoIdsContext = createContext<VideoIdsContextType | undefined>(undefined);

const VIDEO_DATA_STORAGE_KEY = 'sora_video_prompts';

export function VideoIdsProvider({ children }: { children: ReactNode }) {
  const [videoData, setVideoData] = useState<Record<string, VideoData>>(() => {
    // Load video prompts from localStorage on mount
    try {
      const stored = localStorage.getItem(VIDEO_DATA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load video prompts from localStorage:', error);
      return {};
    }
  });

  // Save to localStorage whenever videoData changes
  useEffect(() => {
    try {
      localStorage.setItem(VIDEO_DATA_STORAGE_KEY, JSON.stringify(videoData));
    } catch (error) {
      console.error('Failed to save video prompts to localStorage:', error);
    }
  }, [videoData]);

  const addVideoPrompt = useCallback((id: string, prompt: string) => {
    setVideoData((prev) => ({
      ...prev,
      [id]: { id, prompt }
    }));
  }, []);

  const removeVideoPrompt = useCallback((id: string) => {
    setVideoData((prev) => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  }, []);

  const clearAllPrompts = useCallback(() => {
    setVideoData({});
  }, []);

  const getPrompt = useCallback((id: string): string | undefined => {
    return videoData[id]?.prompt;
  }, [videoData]);

  return (
    <VideoIdsContext.Provider value={{ addVideoPrompt, removeVideoPrompt, clearAllPrompts, getPrompt }}>
      {children}
    </VideoIdsContext.Provider>
  );
}

export function useVideoIds() {
  const context = useContext(VideoIdsContext);
  if (context === undefined) {
    throw new Error('useVideoIds must be used within a VideoIdsProvider');
  }
  return context;
}
