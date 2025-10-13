import { useState, useEffect } from 'react';
import { mediaCacheService } from '../services/cache';

export function useCacheStats() {
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

  return {
    stats,
    loading,
    formatBytes,
    clearCache: handleClearCache,
  };
}
