/**
 * IndexedDB cache for storing video and thumbnail blobs
 * Prevents issues with expired OpenAI download links
 */

interface CachedMedia {
  id: string;
  variant: 'video' | 'thumbnail' | 'spritesheet';
  blob: Blob;
  cachedAt: number;
}

const DB_NAME = 'sora-media-cache';
const DB_VERSION = 1;
const STORE_NAME = 'media';

class MediaCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('variant', 'variant', { unique: false });
          objectStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          console.log('Created IndexedDB object store');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Generate cache key for a video/thumbnail
   */
  private getCacheKey(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet'): string {
    return `${videoId}-${variant}`;
  }

  /**
   * Store media blob in cache
   */
  async set(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet', blob: Blob): Promise<void> {
    try {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');

      const cacheKey = this.getCacheKey(videoId, variant);
      const cachedMedia: CachedMedia = {
        id: cacheKey,
        variant,
        blob,
        cachedAt: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cachedMedia);

        request.onsuccess = () => {
          console.log(`Cached ${variant} for video ${videoId}`);
          resolve();
        };

        request.onerror = () => {
          console.error(`Failed to cache ${variant}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error storing in cache:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Retrieve media blob from cache
   */
  async get(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet'): Promise<Blob | null> {
    try {
      await this.init();
      if (!this.db) return null;

      const cacheKey = this.getCacheKey(videoId, variant);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const result = request.result as CachedMedia | undefined;
          if (result) {
            console.log(`Cache hit for ${variant} ${videoId}`);
            resolve(result.blob);
          } else {
            console.log(`Cache miss for ${variant} ${videoId}`);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Failed to retrieve from cache:', request.error);
          resolve(null); // Return null on error instead of failing
        };
      });
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Check if media exists in cache
   */
  async has(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet'): Promise<boolean> {
    const blob = await this.get(videoId, variant);
    return blob !== null;
  }

  /**
   * Delete specific media from cache
   */
  async delete(videoId: string, variant?: 'video' | 'thumbnail' | 'spritesheet'): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      if (variant) {
        // Delete specific variant
        const cacheKey = this.getCacheKey(videoId, variant);
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(cacheKey);

          request.onsuccess = () => {
            console.log(`Deleted ${variant} for video ${videoId} from cache`);
            resolve();
          };

          request.onerror = () => {
            console.error('Failed to delete from cache:', request.error);
            reject(request.error);
          };
        });
      } else {
        // Delete all variants for this video
        await Promise.all([
          this.delete(videoId, 'video'),
          this.delete(videoId, 'thumbnail'),
          this.delete(videoId, 'spritesheet')
        ]);
      }
    } catch (error) {
      console.error('Error deleting from cache:', error);
    }
  }

  /**
   * Clear all cached media
   */
  async clear(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('Cleared all media cache');
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to clear cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; size: number }> {
    try {
      await this.init();
      if (!this.db) return { count: 0, size: 0 };

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = async () => {
          const items = request.result as CachedMedia[];
          let totalSize = 0;

          for (const item of items) {
            totalSize += item.blob.size;
          }

          resolve({
            count: items.length,
            size: totalSize
          });
        };

        request.onerror = () => {
          console.error('Failed to get cache stats:', request.error);
          resolve({ count: 0, size: 0 });
        };
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, size: 0 };
    }
  }
}

export const mediaCacheService = new MediaCacheService();
