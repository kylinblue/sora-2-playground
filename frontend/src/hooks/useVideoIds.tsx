import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VideoIdsContextType {
  videoIds: string[];
  addVideoId: (id: string) => void;
  removeVideoId: (id: string) => void;
  clearVideoIds: () => void;
}

const VideoIdsContext = createContext<VideoIdsContextType | undefined>(undefined);

const VIDEO_IDS_STORAGE_KEY = 'sora_video_ids';

export function VideoIdsProvider({ children }: { children: ReactNode }) {
  const [videoIds, setVideoIds] = useState<string[]>(() => {
    // Load video IDs from localStorage on mount
    try {
      const stored = localStorage.getItem(VIDEO_IDS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load video IDs from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    // Save video IDs to localStorage whenever they change
    try {
      localStorage.setItem(VIDEO_IDS_STORAGE_KEY, JSON.stringify(videoIds));
    } catch (error) {
      console.error('Failed to save video IDs to localStorage:', error);
    }
  }, [videoIds]);

  const addVideoId = (id: string) => {
    setVideoIds((prev) => {
      // Avoid duplicates and add to the beginning
      if (prev.includes(id)) return prev;
      return [id, ...prev];
    });
  };

  const removeVideoId = (id: string) => {
    setVideoIds((prev) => prev.filter((vid) => vid !== id));
  };

  const clearVideoIds = () => {
    setVideoIds([]);
  };

  return (
    <VideoIdsContext.Provider value={{ videoIds, addVideoId, removeVideoId, clearVideoIds }}>
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
