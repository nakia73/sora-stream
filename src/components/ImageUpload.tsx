import { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImageUploadProps {
  onImageSelect: (imageData: string | null) => void;
  currentImage: string | null;
  disabled?: boolean;
  targetSize?: string;
}

export function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  disabled, 
  targetSize = '1280x720' 
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentSize, setCurrentSize] = useState<string>(targetSize);
  const [needsResize, setNeedsResize] = useState(false);
  const lastFileRef = useRef<File | null>(null);

  // targetSizeが変更された場合の処理
  useEffect(() => {
    console.log('🔄 targetSize変更検知:', {
      previousSize: currentSize,
      newSize: targetSize,
      hasImage: !!previewUrl,
      hasFile: !!lastFileRef.current,
    });

    const autoResizeOnSizeChange = async () => {
      if (targetSize !== currentSize && previewUrl && lastFileRef.current) {
        console.log('🔄 解像度変更検知 - 自動リサイズを開始します');
        
        try {
          // 自動的に再リサイズを実行
          const resizedBase64 = await resizeImage(lastFileRef.current);
          
          setPreviewUrl(resizedBase64);
          setCurrentSize(targetSize);
          setNeedsResize(false);
          onImageSelect(resizedBase64);
          
          console.log('✅ 自動リサイズ完了:', targetSize);
          toast.success(`解像度を${targetSize}に変更し、画像を自動リサイズしました`, {
            duration: 4000,
          });
        } catch (error) {
          console.error('❌ 自動リサイズエラー:', error);
          
          // エラー時は手動リサイズを促す
          setNeedsResize(true);
          setCurrentSize(targetSize);
          
          const errorMsg = error instanceof Error ? error.message : '不明なエラー';
          toast.error(`自動リサイズに失敗しました: ${errorMsg}`, {
            description: '手動でリサイズボタンを押してください',
            duration: 6000,
          });
        }
      } else if (targetSize !== currentSize) {
        setCurrentSize(targetSize);
      }
    };

    autoResizeOnSizeChange();
  }, [targetSize, currentSize, previewUrl, onImageSelect]);

  // currentImageが外部から変更された場合の処理
  useEffect(() => {
    console.log('🖼️ ImageUpload: currentImage変更検知:', {
      hasCurrentImage: !!currentImage,
      currentImageLength: currentImage?.length,
      currentPreview: previewUrl?.substring(0, 50),
    });
    
    if (currentImage !== previewUrl) {
      setPreviewUrl(currentImage);
      setNeedsResize(false);
      console.log('✅ previewUrlを更新しました');
    }
  }, [currentImage, previewUrl]);

  // 目標サイズをパース
  const [targetWidth, targetHeight] = targetSize.split('x').map(Number);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('🔄 画像リサイズ開始:', {
        fileName: file.name,
        fileSize: file.size,
        targetSize: `${targetWidth}x${targetHeight}`,
      });

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const img = new Image();
          
          img.onload = () => {
            try {
              console.log('📏 元画像サイズ:', {
                width: img.width,
                height: img.height,
              });

              // 解像度チェック - より詳細な分析
              const originalPixels = img.width * img.height;
              const targetPixels = targetWidth * targetHeight;
              const resolutionRatio = originalPixels / targetPixels;
              const aspectRatio = img.width / img.height;
              const targetAspectRatio = targetWidth / targetHeight;

              console.log('📊 解像度分析:', {
                originalPixels,
                targetPixels,
                resolutionRatio: resolutionRatio.toFixed(2),
                isUpscaling: resolutionRatio < 1,
                aspectRatio: aspectRatio.toFixed(2),
                targetAspectRatio: targetAspectRatio.toFixed(2),
                aspectRatioDiff: Math.abs(aspectRatio - targetAspectRatio).toFixed(2),
              });

              // エラーハンドリング: 極端に低い解像度
              if (resolutionRatio < 0.25) {
                const errorMsg = `画像の解像度が目標の25%未満です（${img.width}x${img.height} → ${targetWidth}x${targetHeight}）`;
                console.error('❌ 解像度エラー:', errorMsg);
                toast.error(errorMsg, {
                  description: 'より高解像度の画像を使用することを強く推奨します',
                  duration: 8000,
                });
              } else if (resolutionRatio < 0.5) {
                console.warn('⚠️ 画像解像度が目標の50%未満です - 品質が低下する可能性があります');
                toast.warning('画像の解像度が低いため、品質が低下する可能性があります', {
                  description: `元画像: ${img.width}x${img.height} → 目標: ${targetWidth}x${targetHeight}`,
                  duration: 6000,
                });
              } else if (resolutionRatio < 0.75) {
                console.info('ℹ️ 画像解像度が目標の75%未満です');
                toast.info('画像が少しアップスケールされます', {
                  description: '最適な品質のため、より高解像度の画像を推奨します',
                  duration: 4000,
                });
              }

              // アスペクト比の大きな違いを警告
              if (Math.abs(aspectRatio - targetAspectRatio) > 0.3) {
                console.warn('⚠️ アスペクト比が大きく異なります');
                toast.warning('画像と目標のアスペクト比が異なります', {
                  description: '黒い帯が表示される可能性があります',
                  duration: 5000,
                });
              }

              // Canvas処理のエラーハンドリング
              const canvas = document.createElement('canvas');
              
              // メモリチェック: 巨大な画像の場合
              const estimatedMemoryMB = (targetWidth * targetHeight * 4) / (1024 * 1024);
              if (estimatedMemoryMB > 100) {
                console.warn('⚠️ 大きなCanvasサイズ - メモリ使用量:', estimatedMemoryMB.toFixed(2), 'MB');
                toast.warning('処理中...', {
                  description: '高解像度のため時間がかかる場合があります',
                  duration: 3000,
                });
              }
              
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d', { 
                alpha: true,
                willReadFrequently: false 
              });
              
              if (!ctx) {
                const error = new Error('Canvas contextの取得に失敗しました。ブラウザの制限により処理できません。');
                console.error('❌ Canvas context エラー');
                reject(error);
                return;
              }

              try {
                // 画像を中央配置して描画（アスペクト比を維持）
                const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (targetWidth - scaledWidth) / 2;
                const y = (targetHeight - scaledHeight) / 2;

                // 背景を黒で塗りつぶし
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // 高品質な画像補間を有効化
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 画像を描画
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                // Base64に変換（PNG形式、最高品質）
                let resizedBase64: string;
                try {
                  resizedBase64 = canvas.toDataURL('image/png', 1.0);
                } catch (canvasError) {
                  console.error('❌ toDataURL エラー:', canvasError);
                  throw new Error('画像データの変換に失敗しました。画像が大きすぎる可能性があります。');
                }
                
                console.log('✅ 画像リサイズ完了:', {
                  originalSize: `${img.width}x${img.height}`,
                  targetSize: `${targetWidth}x${targetHeight}`,
                  base64Length: resizedBase64.length,
                  base64SizeMB: (resizedBase64.length / (1024 * 1024)).toFixed(2),
                  base64Preview: resizedBase64.substring(0, 80) + '...',
                });
                
                // Base64サイズチェック
                const base64SizeMB = resizedBase64.length / (1024 * 1024);
                if (base64SizeMB > 5) {
                  console.warn('⚠️ Base64データが5MBを超えています:', base64SizeMB.toFixed(2), 'MB');
                  toast.warning('画像データが大きいため、API送信に時間がかかる可能性があります', {
                    duration: 5000,
                  });
                }
                
                resolve(resizedBase64);
              } catch (drawError) {
                console.error('❌ Canvas描画エラー:', drawError);
                reject(new Error('画像の描画に失敗しました: ' + (drawError instanceof Error ? drawError.message : '不明なエラー')));
              }
            } catch (error) {
              console.error('❌ Canvas処理エラー:', error);
              reject(error);
            }
          };
          
          img.onerror = (error) => {
            console.error('❌ 画像読み込みエラー:', error);
            reject(new Error('画像の読み込みに失敗しました'));
          };
          
          img.src = e.target?.result as string;
        } catch (error) {
          console.error('❌ Image要素処理エラー:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ FileReader エラー:', error);
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('ℹ️ ファイルが選択されていません');
      return;
    }

    console.log('📁 ファイル選択:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      targetSize,
    });

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.error('❌ ファイルサイズ超過:', sizeMB, 'MB');
      toast.error(`画像サイズが大きすぎます (${sizeMB}MB)`, {
        description: '画像サイズは10MB以下にしてください',
        duration: 6000,
      });
      return;
    }

    // 画像形式チェック
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
      console.error('❌ 無効なファイル形式:', file.type);
      toast.error('サポートされていない画像形式です', {
        description: 'PNG, JPG, WebP, GIF形式の画像を選択してください',
        duration: 6000,
      });
      return;
    }

    try {
      console.log('🔄 画像処理を開始します...');
      
      // ファイルを保存（再リサイズ用）
      lastFileRef.current = file;
      
      // 画像を指定サイズにリサイズ
      const resizedBase64 = await resizeImage(file);
      
      console.log('📤 親コンポーネントに画像データを送信:', {
        base64Length: resizedBase64.length,
        base64Preview: resizedBase64.substring(0, 80) + '...',
        targetSize,
      });
      
      // プレビューを更新
      setPreviewUrl(resizedBase64);
      setCurrentSize(targetSize);
      setNeedsResize(false);
      
      // 親コンポーネントに通知
      onImageSelect(resizedBase64);
      
      console.log('✅ 画像アップロード処理完了');
      toast.success(`参照画像を設定しました (${targetSize}にリサイズ済み)`, {
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ 画像処理エラー:', error);
      
      // エラーの詳細なハンドリング
      let errorTitle = '画像処理エラー';
      let errorDescription = '画像の処理に失敗しました';
      
      if (error instanceof Error) {
        errorDescription = error.message;
        
        if (error.message.includes('Canvas')) {
          errorTitle = 'Canvas処理エラー';
        } else if (error.message.includes('読み込み')) {
          errorTitle = '画像読み込みエラー';
        } else if (error.message.includes('変換')) {
          errorTitle = '画像変換エラー';
        }
      }
      
      toast.error(errorTitle, {
        description: errorDescription,
        duration: 8000,
      });
      
      // エラー時はファイル参照をクリア
      lastFileRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResize = async () => {
    if (!lastFileRef.current) {
      console.error('❌ リサイズするファイルがありません');
      toast.error('ファイルが見つかりません。再度アップロードしてください。');
      return;
    }

    try {
      console.log('🔄 画像を再リサイズします:', targetSize);
      const resizedBase64 = await resizeImage(lastFileRef.current);
      
      setPreviewUrl(resizedBase64);
      setCurrentSize(targetSize);
      setNeedsResize(false);
      onImageSelect(resizedBase64);
      
      toast.success(`画像を${targetSize}にリサイズしました`);
    } catch (error) {
      console.error('❌ 再リサイズエラー:', error);
      toast.error('再リサイズに失敗しました');
    }
  };

  const handleRemove = () => {
    console.log('🗑️ 画像削除処理開始');
    
    setPreviewUrl(null);
    setNeedsResize(false);
    lastFileRef.current = null;
    onImageSelect(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log('✅ 画像削除完了');
    toast.success('参照画像を削除しました');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        参照画像（任意）
      </label>
      
      {needsResize && previewUrl && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            解像度設定が変更されました。画像を再リサイズしてください。
            <Button
              size="sm"
              variant="outline"
              onClick={handleResize}
              className="ml-2 h-7 text-xs"
            >
              今すぐリサイズ
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {previewUrl ? (
        <div className={`relative group rounded-lg overflow-hidden border ${needsResize ? 'border-amber-500' : 'border-border'} bg-muted/50`}>
          <img 
            src={previewUrl} 
            alt="参照画像" 
            className="w-full h-48 object-contain"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {needsResize && (
              <Button
                variant="default"
                size="sm"
                onClick={handleResize}
                disabled={disabled}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                リサイズ
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              削除
            </Button>
          </div>
          <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${needsResize ? 'bg-amber-500 text-white' : 'bg-black/70 text-white'}`}>
            {needsResize ? `要リサイズ → ${targetSize}` : currentSize}
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full h-32 border-dashed border-2 hover:bg-muted/50"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-6 h-6" />
              <div className="text-sm">
                <span className="font-medium">クリックして画像を選択</span>
                <div className="text-xs mt-1">PNG, JPG, WebP (最大10MB)</div>
                <div className="text-xs text-primary mt-1 font-medium">
                  自動的に {targetSize} にリサイズされます
                </div>
              </div>
            </div>
          </Button>
        </div>
      )}
      
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          参照画像を設定すると、画像の雰囲気やスタイルを反映した動画が生成されます。
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          💡 ヒント: 解像度を変更する前に画像をアップロードすると、自動的に最適なサイズにリサイズされます。
        </p>
      </div>
    </div>
  );
}
