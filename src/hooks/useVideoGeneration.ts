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
          const errorMessage = error.error?.message || '動画生成リクエストに失敗しました';
          const errorCode = error.error?.code || error.error?.type || 'unknown';
          
          // エラータイプに応じた詳細メッセージ
          let detailedMessage = errorMessage;
          if (errorCode === 'billing_hard_limit_reached') {
            detailedMessage = '❌ OpenAIの課金制限に達しています。\n\nOpenAIダッシュボードで課金設定を確認してください:\nhttps://platform.openai.com/settings/organization/billing';
          } else if (response.status === 403 && errorMessage.includes('organization must be verified')) {
            detailedMessage = '❌ OpenAI組織の認証が必要です。\n\n以下のURLから組織認証を行ってください:\nhttps://platform.openai.com/settings/organization/general\n\n認証後、反映まで最大15分かかる場合があります。';
          } else if (response.status === 401) {
            detailedMessage = '❌ APIキーが無効です。\n\n設定画面から正しいAPIキーを入力してください。';
          } else if (response.status === 429) {
            detailedMessage = '❌ レート制限に達しました。\n\nしばらく待ってから再度お試しください。';
          }
          
          throw new Error(detailedMessage);
        }

        const data = await response.json();
        const videoId = data.id;
        
        // 生成開始レスポンスをログ出力
        console.log('🎬 動画生成開始 - レスポンス:', JSON.stringify(data, null, 2));

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
        const errorMessage = error instanceof Error ? error.message : '動画生成に失敗しました';
        
        // 複数行のエラーメッセージを表示
        toast.error(errorMessage, {
          duration: 10000, // 10秒間表示
          style: {
            whiteSpace: 'pre-line',
            maxWidth: '500px',
          },
        });
        
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
          
          // APIレスポンスの詳細をログ出力
          console.log('📹 動画ステータスレスポンス:', JSON.stringify(data, null, 2));

          setVideo((prev) => ({
            ...prev,
            status: data.status,
            progress: data.progress || 0,
          }));

          if (data.status === 'completed') {
            console.log('✅ 動画生成完了 - レスポンス詳細:', data);
            
            // video_urlの存在確認
            if (!data.video_url) {
              console.error('❌ エラー: video_urlがレスポンスに含まれていません');
              console.error('レスポンス内容:', JSON.stringify(data, null, 2));
              toast.error('動画URLが取得できませんでした。APIレスポンスを確認してください。', {
                duration: 10000,
              });
              setVideo((prev) => ({
                ...prev,
                status: 'failed',
              }));
              return;
            }
            
            setVideo((prev) => ({
              ...prev,
              videoUrl: data.video_url,
            }));
            toast.success('動画生成が完了しました！');
          } else if (data.status === 'failed') {
            console.error('❌ 動画生成失敗:', data.error || 'エラー詳細なし');
            const errorMsg = data.error?.message || '動画生成に失敗しました';
            toast.error(`動画生成失敗: ${errorMsg}`, {
              duration: 10000,
            });
          } else if (data.status === 'queued' || data.status === 'in_progress') {
            console.log(`⏳ ポーリング継続 - ステータス: ${data.status}, 進捗: ${data.progress}%`);
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
