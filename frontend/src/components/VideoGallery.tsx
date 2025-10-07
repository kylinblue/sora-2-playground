import { useState, useEffect } from 'react';
import { Video } from '../types';
import { apiService } from '../services/api';
import { VideoPlayer } from './VideoPlayer';

interface VideoGalleryProps {
  videos: Video[];
  onRefresh: () => void;
  onClear: () => void;
  onDelete: (videoId: string) => void;
  onRemix: (videoId: string, prompt: string) => void;
}

function VideoCard({ video, onSelect, onDelete, onRemix }: {
  video: Video;
  onSelect: () => void;
  onDelete: () => void;
  onRemix: (prompt: string) => void;
}) {
  const [showRemixInput, setShowRemixInput] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [progress, setProgress] = useState(video.progress);

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
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      case 'queued': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {video.status === 'completed' ? (
        <div className="relative cursor-pointer" onClick={onSelect}>
          <img
            src={apiService.getVideoUrl(video.id, 'thumbnail')}
            alt="Video thumbnail"
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          {video.status === 'failed' ? (
            <div className="text-center p-4">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">Generation Failed</p>
              {video.error && (
                <p className="text-xs text-gray-500 mt-1">{video.error.message}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">{video.status === 'queued' ? 'Queued' : 'Processing'}</p>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}%</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {video.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{video.model}</span>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {video.size} • {video.seconds}s
        </div>

        {video.status === 'completed' && (
          <>
            {!showRemixInput ? (
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
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  placeholder="Describe changes..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
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

export function VideoGallery({ videos, onRefresh, onClear, onDelete, onRemix }: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  if (videos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h3>
        <p className="text-gray-500">Create your first video to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Videos</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={() => video.status === 'completed' && setSelectedVideo(video)}
            onDelete={() => onDelete(video.id)}
            onRemix={(prompt) => onRemix(video.id, prompt)}
          />
        ))}
      </div>

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  );
}
