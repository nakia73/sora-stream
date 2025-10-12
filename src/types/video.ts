export interface GenerationOptions {
  size: '1280x720' | '720x1280' | '1792x1024' | '1024x1792';
  seconds: '4' | '8' | '12';
  model: 'sora-2' | 'sora-2-pro';
}

export interface VideoState {
  id: string | null;
  status: 'idle' | 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  videoUrl: string | null;
  prompt: string;
  options: GenerationOptions;
  referenceImage: string | null;
}

export interface SoraApiError {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
}

export interface VideoGenerationResponse {
  id: string;
  status: string;
  progress?: number;
  error?: {
    message?: string;
    code?: string;
  };
  input_reference?: string;
}
