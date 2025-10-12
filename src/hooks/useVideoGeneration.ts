import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { VideoState, GenerationOptions } from '@/types/video';
import * as soraApi from '@/services/soraApi';

const POLLING_INTERVAL = 10000; // 10秒

export type { GenerationOptions, VideoState };

export function useVideoGeneration() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem('openai_api_key');
    } catch (error) {
      console.error('❌ localStorage読み込みエラー:', error);
      return null;
    }
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

  // ポーリングタイムアウトの参照を保持（クリーンアップ用）
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 現在の動画URLを保持（クリーンアップ用）
  const currentVideoUrlRef = useRef<string | null>(null);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    console.log('🎯 useVideoGeneration: マウントされました');
    return () => {
      console.log('🗑️ useVideoGeneration: クリーンアップ開始');
      
      // ポーリングを停止
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        console.log('⏹️ ポーリングタイムアウトをクリア');
      }
      
      // Blob URLをクリーンアップ
      if (currentVideoUrlRef.current && currentVideoUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentVideoUrlRef.current);
        console.log('🗑️ Blob URLをクリーンアップ:', currentVideoUrlRef.current);
        currentVideoUrlRef.current = null;
      }
    };
  }, []);

  const saveApiKey = useCallback((key: string) => {
    try {
      localStorage.setItem('openai_api_key', key);
      setApiKey(key);
      toast.success('APIキーを保存しました');
      console.log('✅ APIキー保存成功');
    } catch (error) {
      console.error('❌ APIキー保存エラー:', error);
      toast.error('APIキーの保存に失敗しました');
    }
  }, []);

  const setReferenceImage = useCallback((imageData: string | null) => {
    console.log('🖼️ useVideoGeneration.setReferenceImage called:', {
      hasImage: !!imageData,
      imageLength: imageData?.length,
      imagePreview: imageData ? imageData.substring(0, 80) + '...' : null,
      timestamp: new Date().toISOString(),
    });

    setVideo((prev) => {
      const newState = {
        ...prev,
        referenceImage: imageData,
      };
      
      console.log('📝 Video state updated:', {
        previousHasImage: !!prev.referenceImage,
        previousImageLength: prev.referenceImage?.length,
        newHasImage: !!newState.referenceImage,
        newImageLength: newState.referenceImage?.length,
        imagePreview: newState.referenceImage ? newState.referenceImage.substring(0, 80) + '...' : null,
      });
      
      return newState;
    });
  }, []);

  const cleanupResources = useCallback(() => {
    console.log('🧹 リソースクリーンアップ開始');

    // ポーリングを停止
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      console.log('⏹️ 既存のポーリングを停止しました');
    }

    // 既存の動画URLをクリーンアップ
    if (currentVideoUrlRef.current && currentVideoUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentVideoUrlRef.current);
      console.log('🗑️ 古い動画URLをクリーンアップしました:', currentVideoUrlRef.current);
      currentVideoUrlRef.current = null;
    }
  }, []);

  const generateVideo = useCallback(
    async (prompt: string, options: GenerationOptions, referenceImage?: string | null) => {
      console.log('🎬 generateVideo called:', {
        promptLength: prompt.length,
        hasReferenceImage: !!referenceImage,
        referenceImageLength: referenceImage?.length,
        referenceImageType: typeof referenceImage,
        referenceImagePreview: referenceImage ? referenceImage.substring(0, 80) + '...' : null,
        videoStateReferenceImage: video.referenceImage ? video.referenceImage.substring(0, 80) + '...' : null,
        videoStateHasImage: !!video.referenceImage,
        currentVideoUrl: currentVideoUrlRef.current,
        pollingActive: !!pollingTimeoutRef.current,
        timestamp: new Date().toISOString(),
      });
      
      if (!apiKey) {
        toast.error('APIキーが設定されていません');
        console.error('❌ APIキーが未設定');
        return;
      }

      try {
        // リソースをクリーンアップ
        cleanupResources();

        // 状態をリセット
        setVideo({
          id: null,
          status: 'queued',
          progress: 0,
          videoUrl: null,
          prompt,
          options,
          referenceImage: referenceImage || null,
        });

        console.log('📤 動画生成APIを呼び出します...');

        // API呼び出し
        const data = await soraApi.generateVideo(apiKey, prompt, options, referenceImage);

        setVideo((prev) => ({
          ...prev,
          id: data.id,
          status: 'queued',
        }));

        toast.success('動画生成を開始しました');

        // ポーリング開始
        pollVideoStatus(data.id);
      } catch (error) {
        console.error('❌ 動画生成エラー:', error);
        const errorMessage = error instanceof Error ? error.message : '動画生成に失敗しました';
        
        toast.error(errorMessage, {
          duration: 10000,
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
    [apiKey, cleanupResources]
  );

  const pollVideoStatus = useCallback(
    async (videoId: string) => {
      const poll = async () => {
        try {
          console.log('🔍 ステータス確認:', videoId);

          const data = await soraApi.getVideoStatus(apiKey!, videoId);

          setVideo((prev) => ({
            ...prev,
            status: data.status as VideoState['status'],
            progress: data.progress || 0,
          }));

          if (data.status === 'completed') {
            console.log('✅ 動画生成完了 - 動画URLを取得します');
            
            try {
              const blob = await soraApi.getVideoContent(apiKey!, videoId);
              const videoUrl = URL.createObjectURL(blob);
              
              console.log('✅ 動画URL生成成功:', {
                urlPreview: videoUrl.substring(0, 50) + '...',
                blobSize: blob.size,
                blobType: blob.type,
                previousUrl: currentVideoUrlRef.current,
              });
              
              // 新しいURLを参照に保存
              currentVideoUrlRef.current = videoUrl;
              
              setVideo((prev) => ({
                ...prev,
                videoUrl: videoUrl,
              }));
              
              toast.success('動画生成が完了しました！');
            } catch (error) {
              console.error('❌ 動画コンテンツ取得エラー:', error);
              const errorMsg = error instanceof Error ? error.message : '不明なエラー';
              toast.error(`動画の取得に失敗しました: ${errorMsg}`, {
                duration: 10000,
              });
              setVideo((prev) => ({
                ...prev,
                status: 'failed',
              }));
            }
          } else if (data.status === 'failed') {
            const errorMsg = data.error?.message || '動画生成に失敗しました';
            console.error('❌ 動画生成失敗:', data.error || 'エラー詳細なし');
            toast.error(`動画生成失敗: ${errorMsg}`, {
              duration: 10000,
            });
          } else if (data.status === 'queued' || data.status === 'in_progress') {
            console.log(`⏳ ポーリング継続 - ステータス: ${data.status}, 進捗: ${data.progress}%`);
            pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL);
          } else {
            console.warn('⚠️ 未知のステータス:', data.status);
            pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL);
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
          
          // エラー時はポーリングを停止
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
            console.log('⏹️ エラーによりポーリングを停止');
          }
        }
      };

      console.log('🚀 ポーリング開始:', videoId);
      poll();
    },
    [apiKey]
  );

  const downloadVideo = useCallback(async () => {
    console.log('💾 ダウンロード開始:', {
      hasVideoUrl: !!video.videoUrl,
      videoUrl: video.videoUrl,
      currentUrlRef: currentVideoUrlRef.current,
    });

    if (!video.videoUrl) {
      toast.error('ダウンロードする動画がありません');
      console.error('❌ 動画URLが存在しません');
      return;
    }

    try {
      console.log('📥 動画データをフェッチ中...');
      const response = await fetch(video.videoUrl);
      
      if (!response.ok) {
        throw new Error(`動画のフェッチに失敗しました: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('✅ Blob取得成功:', {
        blobSize: blob.size,
        blobType: blob.type,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sora_video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      console.log('✅ ダウンロード開始:', a.download);
      
      // クリーンアップ
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('🗑️ ダウンロード用URLをクリーンアップ');
      }, 100);

      toast.success('動画のダウンロードを開始しました');
    } catch (error) {
      console.error('❌ ダウンロードエラー:', error);
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      toast.error(`ダウンロードに失敗しました: ${errorMsg}`);
    }
  }, [video.videoUrl]);

  const resetVideo = useCallback(() => {
    console.log('🔄 動画状態をリセット');
    
    cleanupResources();

    setVideo({
      id: null,
      status: 'idle',
      progress: 0,
      videoUrl: null,
      prompt: '',
      options: video.options,
      referenceImage: null,
    });

    console.log('✅ リセット完了');
  }, [video.options, cleanupResources]);

  const updateOptions = useCallback((options: GenerationOptions) => {
    console.log('⚙️ 生成オプション更新:', options);
    setVideo((prev) => ({ ...prev, options }));
  }, []);

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
