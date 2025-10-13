import { useState, useEffect } from 'react';
import { Video } from '../types';
import { apiService } from '../services/api';

interface VideoPlayerProps {
  video: Video;
  prompt?: string;
  onClose: () => void;
}

export function VideoPlayer({ video, prompt, onClose }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Load video when component mounts
  useEffect(() => {
    apiService.downloadVideo(video.id, 'video')
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load video:', error);
        setLoading(false);
      });

    // Cleanup blob URL on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [video.id]);

  const handleDownload = async () => {
    try {
      const blob = await apiService.downloadVideo(video.id, 'video');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download video:', error);
      alert('Failed to download video');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Video Player</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading video...</span>
            </div>
          ) : videoUrl ? (
            <video
              controls
              className="w-full rounded-lg"
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex items-center justify-center py-8 text-red-600">
              Failed to load video
            </div>
          )}

          {prompt && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Original Prompt
              </label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {prompt}
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Model:</span> {video.model}
              </div>
              <div>
                <span className="font-medium">Size:</span> {video.size}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {video.seconds}s
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(video.created_at * 1000).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Download Video
          </button>
        </div>
      </div>
    </div>
  );
}
