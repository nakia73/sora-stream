import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface GenerationOptions {
  size: '1280x720' | '720x1280' | '720x720' | '1792x1024' | '1024x1792';
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
}

const POLLING_INTERVAL = 10000; // 10秒

export function useVideoGeneration() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem('openai_api_key');
  });

  const [video, setVideo] = useState<VideoState>({
    id: null,
    status: 'idle',
    progress: 0,
    videoUrl: null,
    prompt: '',
    options: {
      size: '1280x720',
      seconds: '4',
      model: 'sora-2',
    },
  });

  const saveApiKey = useCallback((key: string) => {
    localStorage.setItem('openai_api_key', key);
    setApiKey(key);
    toast.success('APIキーを保存しました');
  }, []);

  const generateVideo = useCallback(
    async (prompt: string, options: GenerationOptions) => {
      if (!apiKey) {
        toast.error('APIキーが設定されていません');
        return;
      }

      try {
        setVideo({
          id: null,
          status: 'queued',
          progress: 0,
          videoUrl: null,
          prompt,
          options,
        });

        // 動画生成リクエスト
        const response = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
            prompt: prompt,
            size: options.size,
            seconds: options.seconds,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || '動画生成リクエストに失敗しました');
        }

        const data = await response.json();
        const videoId = data.id;

        setVideo((prev) => ({
          ...prev,
          id: videoId,
          status: 'queued',
        }));

        toast.success('動画生成を開始しました');

        // ポーリング開始
        pollVideoStatus(videoId);
      } catch (error) {
        console.error('動画生成エラー:', error);
        toast.error(error instanceof Error ? error.message : '動画生成に失敗しました');
        setVideo((prev) => ({
          ...prev,
          status: 'failed',
        }));
      }
    },
    [apiKey]
  );

  const pollVideoStatus = useCallback(
    async (videoId: string) => {
      const poll = async () => {
        try {
          const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            throw new Error('ステータス確認に失敗しました');
          }

          const data = await response.json();

          setVideo((prev) => ({
            ...prev,
            status: data.status,
            progress: data.progress || 0,
          }));

          if (data.status === 'completed') {
            setVideo((prev) => ({
              ...prev,
              videoUrl: data.video_url,
            }));
            toast.success('動画生成が完了しました！');
          } else if (data.status === 'failed') {
            toast.error('動画生成に失敗しました');
          } else if (data.status === 'queued' || data.status === 'in_progress') {
            // 継続してポーリング
            setTimeout(poll, POLLING_INTERVAL);
          }
        } catch (error) {
          console.error('ステータス確認エラー:', error);
          toast.error('ステータス確認に失敗しました');
          setVideo((prev) => ({
            ...prev,
            status: 'failed',
          }));
        }
      };

      poll();
    },
    [apiKey]
  );

  const downloadVideo = useCallback(async () => {
    if (!video.videoUrl) {
      toast.error('ダウンロードする動画がありません');
      return;
    }

    try {
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sora-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('動画をダウンロードしました');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      toast.error('ダウンロードに失敗しました');
    }
  }, [video.videoUrl]);

  const resetVideo = useCallback(() => {
    setVideo({
      id: null,
      status: 'idle',
      progress: 0,
      videoUrl: null,
      prompt: '',
      options: {
        size: '1280x720',
        seconds: '4',
        model: 'sora-2',
      },
    });
  }, []);

  return {
    apiKey,
    video,
    saveApiKey,
    generateVideo,
    downloadVideo,
    resetVideo,
  };
}
