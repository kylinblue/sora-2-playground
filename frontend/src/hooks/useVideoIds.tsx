import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface VideoData {
  id: string;
  prompt: string;
}

interface VideoIdsContextType {
  videoIds: string[];
  videoData: Record<string, VideoData>;
  addVideoId: (id: string, prompt: string) => void;
  removeVideoId: (id: string) => void;
  clearVideoIds: () => void;
  getPrompt: (id: string) => string | undefined;
}

const VideoIdsContext = createContext<VideoIdsContextType | undefined>(undefined);

const VIDEO_DATA_STORAGE_KEY = 'sora_video_data';

export function VideoIdsProvider({ children }: { children: ReactNode }) {
  const [videoData, setVideoData] = useState<Record<string, VideoData>>(() => {
    // Load video data from localStorage on mount
    try {
      const stored = localStorage.getItem(VIDEO_DATA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load video data from localStorage:', error);
      return {};
    }
  });

  // Derive videoIds array from videoData object (sorted by insertion order)
  const videoIds = Object.keys(videoData);

  useEffect(() => {
    // Save video data to localStorage whenever it changes
    try {
      localStorage.setItem(VIDEO_DATA_STORAGE_KEY, JSON.stringify(videoData));
    } catch (error) {
      console.error('Failed to save video data to localStorage:', error);
    }
  }, [videoData]);

  const addVideoId = (id: string, prompt: string) => {
    setVideoData((prev) => {
      // If already exists, don't add again
      if (prev[id]) return prev;
      // Add to beginning by creating new object with id first
      return { [id]: { id, prompt }, ...prev };
    });
  };

  const removeVideoId = (id: string) => {
    setVideoData((prev) => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  };

  const clearVideoIds = () => {
    setVideoData({});
  };

  const getPrompt = (id: string): string | undefined => {
    return videoData[id]?.prompt;
  };

  return (
    <VideoIdsContext.Provider value={{ videoIds, videoData, addVideoId, removeVideoId, clearVideoIds, getPrompt }}>
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
