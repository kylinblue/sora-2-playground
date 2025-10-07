export interface Video {
  id: string;
  object: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  completed_at?: number;
  expires_at?: number;
  size: string;
  seconds: string;
  error?: {
    code: string;
    message: string;
  };
  remixed_from_video_id?: string;
}

export interface VideoCreateParams {
  prompt: string;
  model: 'sora-2' | 'sora-2-pro';
  seconds: string;
  size: string;
  input_reference?: File;
}

export interface VideoListResponse {
  object: 'list';
  data: Video[];
}
