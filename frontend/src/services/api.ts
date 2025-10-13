import axios, { AxiosInstance } from 'axios';
import { Video, VideoCreateParams, VideoListResponse } from '../types';
import { mediaCacheService } from './cache';

class SoraApiService {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include API key
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return config;
    });
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createVideo(params: VideoCreateParams): Promise<Video> {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('model', params.model);
    formData.append('seconds', params.seconds);
    formData.append('size', params.size);

    if (params.input_reference) {
      formData.append('input_reference', params.input_reference);
    }

    const response = await this.client.post<Video>('/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getVideoStatus(videoId: string): Promise<Video> {
    const response = await this.client.get<Video>(`/videos/${videoId}`);
    return response.data;
  }

  async listVideos(videoIds: string[]): Promise<VideoListResponse> {
    // If no video IDs, return empty list
    if (!videoIds || videoIds.length === 0) {
      return { object: 'list', data: [] };
    }

    // Send comma-separated video IDs
    const params = { video_ids: videoIds.join(',') };
    const response = await this.client.get<VideoListResponse>('/videos', { params });
    return response.data;
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.client.delete(`/videos/${videoId}`);
    // Clear cached media for this video
    await mediaCacheService.delete(videoId);
  }

  async remixVideo(videoId: string, prompt: string): Promise<Video> {
    const response = await this.client.post<Video>(`/videos/${videoId}/remix`, {
      prompt,
    });
    return response.data;
  }

  async improvePrompt(prompt: string): Promise<{ original: string; improved: string }> {
    const response = await this.client.post<{ original: string; improved: string }>('/prompts/improve', {
      prompt,
    });
    return response.data;
  }

  getVideoUrl(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet' = 'video'): string {
    const url = `/api/videos/${videoId}/content?variant=${variant}`;
    if (this.apiKey) {
      return url;
    }
    return url;
  }

  async downloadVideo(videoId: string, variant: 'video' | 'thumbnail' | 'spritesheet' = 'video'): Promise<Blob> {
    // Check cache first
    const cachedBlob = await mediaCacheService.get(videoId, variant);
    if (cachedBlob) {
      console.log(`Using cached ${variant} for ${videoId}`);
      return cachedBlob;
    }

    // Cache miss - download from API
    console.log(`Downloading ${variant} for ${videoId} from API`);
    const response = await this.client.get(`/videos/${videoId}/content`, {
      params: { variant },
      responseType: 'blob',
    });

    const blob = response.data;

    // Store in cache for future use
    await mediaCacheService.set(videoId, variant, blob);

    return blob;
  }
}

export const apiService = new SoraApiService();
