import { useState, useEffect } from 'react';
import { ApiKeyProvider, useApiKey } from './hooks/useApiKey';
import { VideoIdsProvider, useVideoIds } from './hooks/useVideoIds';
import { ApiKeyInput } from './components/ApiKeyInput';
import { VideoCreationForm } from './components/VideoCreationForm';
import { VideoGallery } from './components/VideoGallery';
import { Video, VideoCreateParams } from './types';
import { apiService } from './services/api';

function AppContent() {
  const { hasApiKey } = useApiKey();
  const { videoIds, addVideoId, removeVideoId, clearVideoIds } = useVideoIds();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = async () => {
    if (!hasApiKey) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.listVideos(videoIds);
      setVideos(response.data);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
      setError(err.response?.data?.detail || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [hasApiKey, videoIds.length]);

  const handleCreateVideo = async (params: VideoCreateParams) => {
    try {
      setError(null);
      const video = await apiService.createVideo(params);
      addVideoId(video.id); // Store video ID in local storage
      setVideos([video, ...videos]);
      alert('Video generation started! Check the gallery for progress.');
    } catch (err: any) {
      console.error('Failed to create video:', err);
      setError(err.response?.data?.detail || 'Failed to create video');
      alert(`Failed to create video: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await apiService.deleteVideo(videoId);
      removeVideoId(videoId); // Remove from local storage
      setVideos(videos.filter((v) => v.id !== videoId));
    } catch (err: any) {
      console.error('Failed to delete video:', err);
      alert(`Failed to delete video: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleRemixVideo = async (videoId: string, prompt: string) => {
    try {
      const video = await apiService.remixVideo(videoId, prompt);
      addVideoId(video.id); // Store remix video ID in local storage
      setVideos([video, ...videos]);
      alert('Video remix started! Check the gallery for progress.');
    } catch (err: any) {
      console.error('Failed to remix video:', err);
      alert(`Failed to remix video: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleClearAll = () => {
    if (!confirm('Are you sure you want to clear all videos from your local list? This will not delete them from OpenAI.')) return;

    clearVideoIds();
    setVideos([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Sora API Playground</h1>
          <p className="text-gray-600 mt-1">Generate videos with OpenAI's Sora API</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ApiKeyInput />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {hasApiKey && (
          <>
            <VideoCreationForm onSubmit={handleCreateVideo} />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <VideoGallery
                videos={videos}
                onRefresh={loadVideos}
                onClear={handleClearAll}
                onDelete={handleDeleteVideo}
                onRemix={handleRemixVideo}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            Built with{' '}
            <a href="https://platform.openai.com/docs/api-reference/videos" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              OpenAI Sora API
            </a>
          </p>
          <p className="mt-2">
            <a href="https://github.com/sshh12/sora-2-playground" className="text-gray-500 hover:text-gray-700 hover:underline" target="_blank" rel="noopener noreferrer">
              View Source Code on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ApiKeyProvider>
      <VideoIdsProvider>
        <AppContent />
      </VideoIdsProvider>
    </ApiKeyProvider>
  );
}

export default App;
