import { useState, useEffect } from 'react';
import { Video } from '../types';
import { apiService } from '../services/api';
import { VideoPlayer } from './VideoPlayer';
import { useCacheStats } from './CacheStatus';

interface VideoGalleryProps {
  videos: Video[];
  onRefresh: () => void;
  onClear: () => void;
  onDelete: (videoId: string) => void;
  onRemix: (videoId: string, prompt: string) => void;
  onReusePrompt: (prompt: string) => void;
  onUseFrame: (videoId: string, position: 'first' | 'last') => void;
  getPrompt: (videoId: string) => string | undefined;
}

function VideoCard({ video, onSelect, onDelete, onRemix, onReusePrompt, onUseFrame, prompt }: {
  video: Video;
  onSelect: () => void;
  onDelete: () => void;
  onRemix: (prompt: string) => void;
  onReusePrompt: () => void;
  onUseFrame: (position: 'first' | 'last') => void;
  prompt?: string;
}) {
  const [showRemixInput, setShowRemixInput] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [progress, setProgress] = useState(video.progress);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Load thumbnail for completed videos
  useEffect(() => {
    if (video.status === 'completed' && !thumbnailUrl) {
      apiService.downloadVideo(video.id, 'thumbnail')
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setThumbnailUrl(url);
        })
        .catch((error) => {
          console.error('Failed to load thumbnail:', error);
        });
    }

    // Cleanup blob URL on unmount
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [video.status, video.id]);

  useEffect(() => {
    if (video.status === 'in_progress' || video.status === 'queued') {
      const interval = setInterval(async () => {
        try {
          const updatedVideo = await apiService.getVideoStatus(video.id);
          setProgress(updatedVideo.progress);
          if (updatedVideo.status === 'completed' || updatedVideo.status === 'failed') {
            clearInterval(interval);
            window.location.reload(); // Simple refresh on completion
          }
        } catch (error) {
          console.error('Failed to fetch video status:', error);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [video.id, video.status]);

  const handleRemixSubmit = () => {
    if (remixPrompt.trim()) {
      onRemix(remixPrompt.trim());
      setRemixPrompt('');
      setShowRemixInput(false);
    }
  };

  const getStatusColor = () => {
    switch (video.status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'queued': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {video.status === 'completed' ? (
        <div className="relative cursor-pointer" onClick={onSelect}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 dark:border-gray-500"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {video.status === 'failed' ? (
            <div className="text-center p-4">
              <svg className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">Generation Failed</p>
              {video.error && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{video.error.message}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{video.status === 'queued' ? 'Queued' : 'Processing'}</p>
              <div className="w-48 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progress}%</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {video.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{video.model}</span>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {video.size} • {video.seconds}s
        </div>

        {video.status === 'failed' && (
          <div className="space-y-2">
            <button
              onClick={onDelete}
              className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Failed Video
            </button>
          </div>
        )}

        {video.status === 'completed' && (
          <>
            {!showRemixInput ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRemixInput(true)}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Remix
                  </button>
                  <button
                    onClick={onDelete}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
                {prompt && (
                  <button
                    onClick={onReusePrompt}
                    className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reuse Prompt
                  </button>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => onUseFrame('first')}
                    className="flex-1 px-2 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded hover:from-purple-600 hover:to-blue-600 flex items-center justify-center gap-1"
                    title="Use first frame as reference image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                    <span>First</span>
                  </button>
                  <button
                    onClick={() => onUseFrame('last')}
                    className="flex-1 px-2 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded hover:from-purple-600 hover:to-blue-600 flex items-center justify-center gap-1"
                    title="Use last frame as reference image"
                  >
                    <span>Last</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  placeholder="Describe changes..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRemixSubmit}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Create Remix
                  </button>
                  <button
                    onClick={() => setShowRemixInput(false)}
                    className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function VideoGallery({ videos, onRefresh, onClear, onDelete, onRemix, onReusePrompt, onUseFrame, getPrompt }: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { stats, formatBytes, clearCache } = useCacheStats();

  if (videos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No videos yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Create your first video to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Videos</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {stats.count > 0 && (
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 flex items-center gap-2"
              title={`Cache: ${stats.count} item${stats.count !== 1 ? 's' : ''} (${formatBytes(stats.size)}). Videos and thumbnails are cached locally to work offline.`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Clear Cache
            </button>
          )}
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const prompt = getPrompt(video.id);
          return (
            <VideoCard
              key={video.id}
              video={video}
              prompt={prompt}
              onSelect={() => video.status === 'completed' && setSelectedVideo(video)}
              onDelete={() => onDelete(video.id)}
              onRemix={(remixPrompt) => onRemix(video.id, remixPrompt)}
              onReusePrompt={() => prompt && onReusePrompt(prompt)}
              onUseFrame={(position) => onUseFrame(video.id, position)}
            />
          );
        })}
      </div>

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          prompt={getPrompt(selectedVideo.id)}
          onClose={() => setSelectedVideo(null)}
          onUseFrame={onUseFrame}
        />
      )}
    </>
  );
}
