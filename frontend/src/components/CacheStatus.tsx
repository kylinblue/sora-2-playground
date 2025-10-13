import { useState, useEffect } from 'react';
import { mediaCacheService } from '../services/cache';

export function CacheStatus() {
  const [stats, setStats] = useState({ count: 0, size: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const cacheStats = await mediaCacheService.getStats();
    setStats(cacheStats);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached videos and thumbnails? You will need to re-download them.')) {
      return;
    }

    try {
      await mediaCacheService.clear();
      await loadStats();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return null;
  }

  if (stats.count === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">
              Cache: {stats.count} item{stats.count !== 1 ? 's' : ''} ({formatBytes(stats.size)})
            </p>
            <p className="text-xs text-blue-700">
              Videos and thumbnails are cached locally to work offline
            </p>
          </div>
        </div>
        <button
          onClick={handleClearCache}
          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}
