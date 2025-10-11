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
  referenceImage: string | null; // Base64 image data
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
    referenceImage: null,
  });

  const saveApiKey = useCallback((key: string) => {
    localStorage.setItem('openai_api_key', key);
    setApiKey(key);
    toast.success('APIキーを保存しました');
  }, []);

  const generateVideo = useCallback(
    async (prompt: string, options: GenerationOptions, referenceImage?: string | null) => {
      if (!apiKey) {
        toast.error('APIキーが設定されていません');
        return;
      }

      try {
        // 既存の動画URLをクリーンアップ（メモリリーク防止）
        if (video.videoUrl && video.videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(video.videoUrl);
          console.log('🗑️ 古い動画URLをクリーンアップしました');
        }

        setVideo({
          id: null,
          status: 'queued',
          progress: 0,
          videoUrl: null,
          prompt,
          options,
          referenceImage: referenceImage || null,
        });

        // FormDataを構築（OpenAI Sora APIはmultipart/form-data形式）
        const formData = new FormData();
        formData.append('model', options.model);
        formData.append('prompt', prompt);
        formData.append('size', options.size);
        formData.append('seconds', options.seconds);

        // 参照画像がある場合は追加
        if (referenceImage) {
          try {
            // Base64文字列からBlobに変換
            // data:image/png;base64,... の形式から base64 部分を抽出
            const base64Data = referenceImage.split(',')[1];
            if (!base64Data) {
              throw new Error('Base64データの抽出に失敗しました');
            }
            
            // Base64をバイナリデコード
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Blobを作成
            const blob = new Blob([bytes], { type: 'image/png' });
            const file = new File([blob], 'reference.png', { type: 'image/png' });
            
            // FormDataに追加
            formData.append('input_reference', file);
            
            console.log('📷 参照画像を追加しました:', {
              size: blob.size,
              type: blob.type,
            });
          } catch (error) {
            console.error('参照画像の変換エラー:', error);
            toast.error('参照画像の処理に失敗しました');
            throw error;
          }
        }

        console.log('🎬 動画生成リクエスト送信:', {
          model: options.model,
          prompt: prompt.substring(0, 50) + '...',
          size: options.size,
          seconds: options.seconds,
          hasImage: !!referenceImage,
        });

        // 動画生成リクエスト（multipart/form-data形式）
        const response = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            // Content-Typeは自動設定されるため指定しない（boundary付きで送信される）
          },
          body: formData,
        });

        if (!response.ok) {
          let error;
          let errorMessage = '動画生成リクエストに失敗しました';
          let errorCode = 'unknown';
          
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              error = await response.json();
              errorMessage = error.error?.message || errorMessage;
              errorCode = error.error?.code || error.error?.type || 'unknown';
            } else {
              const textError = await response.text();
              console.error('❌ 非JSONエラーレスポンス:', textError);
              errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
            }
          } catch (parseError) {
            console.error('❌ エラーレスポンスのパースに失敗:', parseError);
            errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
          }
          
          console.error('❌ APIエラー詳細:', {
            status: response.status,
            statusText: response.statusText,
            errorCode,
            errorMessage,
            error,
          });
          
          // エラータイプに応じた詳細メッセージ
          let detailedMessage = errorMessage;
          if (errorCode === 'billing_hard_limit_reached') {
            detailedMessage = '❌ OpenAIの課金制限に達しています。\n\nOpenAIダッシュボードで課金設定を確認してください:\nhttps://platform.openai.com/settings/organization/billing';
          } else if (response.status === 403) {
            if (errorMessage.includes('organization must be verified')) {
              detailedMessage = '❌ OpenAI組織の認証が必要です。\n\n以下のURLから組織認証を行ってください:\nhttps://platform.openai.com/settings/organization/general\n\n認証後、反映まで最大15分かかる場合があります。';
            } else {
              detailedMessage = `❌ アクセスが拒否されました。\n\n${errorMessage}\n\nAPIキーの権限を確認してください。`;
            }
          } else if (response.status === 401) {
            detailedMessage = '❌ APIキーが無効です。\n\n設定画面から正しいAPIキーを入力してください。';
          } else if (response.status === 429) {
            detailedMessage = '❌ レート制限に達しました。\n\nしばらく待ってから再度お試しください。';
          } else if (response.status === 400) {
            detailedMessage = `❌ リクエストが不正です。\n\n${errorMessage}\n\nプロンプトや設定を確認してください。`;
          } else if (response.status >= 500) {
            detailedMessage = `❌ OpenAIサーバーエラーが発生しました。\n\n${errorMessage}\n\nしばらく待ってから再度お試しください。`;
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
        console.error('❌ 動画生成エラー:', error);
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
    [apiKey, video.videoUrl]
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
            let errorMsg = 'ステータス確認に失敗しました';
            try {
              const errorData = await response.json();
              errorMsg = errorData.error?.message || errorMsg;
              console.error('❌ ステータス確認エラー:', errorData);
            } catch {
              console.error('❌ ステータス確認エラー: HTTP', response.status);
            }
            throw new Error(errorMsg);
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
            console.log('✅ 動画生成完了 - 動画URLを取得します');
            
            try {
              // OpenAI Sora API では /content エンドポイントで動画を取得
              const contentResponse = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
              });

              if (!contentResponse.ok) {
                throw new Error(`動画コンテンツ取得失敗: ${contentResponse.status}`);
              }

              // Blobとして動画データを取得
              const blob = await contentResponse.blob();
              const videoUrl = URL.createObjectURL(blob);
              
              console.log('✅ 動画URL生成成功:', videoUrl.substring(0, 50) + '...');
              
              setVideo((prev) => ({
                ...prev,
                videoUrl: videoUrl,
              }));
              toast.success('動画生成が完了しました！');
            } catch (error) {
              console.error('❌ 動画コンテンツ取得エラー:', error);
              toast.error('動画の取得に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'), {
                duration: 10000,
              });
              setVideo((prev) => ({
                ...prev,
                status: 'failed',
              }));
            }
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
          } else {
            console.warn('⚠️ 未知のステータス:', data.status);
            // 未知のステータスでもポーリングを継続
            setTimeout(poll, POLLING_INTERVAL);
          }
        } catch (error) {
          console.error('❌ ステータス確認エラー:', error);
          const errorMsg = error instanceof Error ? error.message : 'ステータス確認に失敗しました';
          toast.error(`ステータス確認エラー: ${errorMsg}`, {
            duration: 8000,
          });
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
      // ObjectURLから直接ダウンロード
      const a = document.createElement('a');
      a.href = video.videoUrl;
      a.download = `sora-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('動画をダウンロードしました');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      toast.error('ダウンロードに失敗しました');
    }
  }, [video.videoUrl]);

  const updateOptions = useCallback((options: GenerationOptions) => {
    setVideo((prev) => ({
      ...prev,
      options,
    }));
  }, []);

  const setReferenceImage = useCallback((imageData: string | null) => {
    setVideo((prev) => ({
      ...prev,
      referenceImage: imageData,
    }));
  }, []);

  const resetVideo = useCallback(() => {
    // 既存のObjectURLをクリーンアップ
    if (video.videoUrl && video.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(video.videoUrl);
    }
    
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
      referenceImage: null,
    });
  }, [video.videoUrl]);

  return {
    apiKey,
    video,
    saveApiKey,
    generateVideo,
    downloadVideo,
    resetVideo,
    updateOptions,
    setReferenceImage,
  };
}
