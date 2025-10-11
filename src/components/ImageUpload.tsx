import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageSelect: (imageData: string | null) => void;
  currentImage: string | null;
  disabled?: boolean;
  targetSize?: string; // 例: "1280x720"
}

export function ImageUpload({ onImageSelect, currentImage, disabled, targetSize = '1280x720' }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);

  // 目標サイズをパース
  const [targetWidth, targetHeight] = targetSize.split('x').map(Number);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Canvasで指定サイズにリサイズ
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // 画像を中央配置して描画（アスペクト比を維持してフィット）
          const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (targetWidth - scaledWidth) / 2;
          const y = (targetHeight - scaledHeight) / 2;

          // 背景を黒で塗りつぶし
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // 画像を描画
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          // Base64に変換（PNG形式）
          const resizedBase64 = canvas.toDataURL('image/png', 1.0);
          console.log(`📷 画像リサイズ完了: ${img.width}x${img.height} → ${targetWidth}x${targetHeight}`);
          resolve(resizedBase64);
        };
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('画像サイズは10MB以下にしてください');
      return;
    }

    // 画像形式チェック
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    try {
      // 画像を指定サイズにリサイズ
      const resizedBase64 = await resizeImage(file);
      setPreviewUrl(resizedBase64);
      onImageSelect(resizedBase64);
      toast.success(`参照画像を設定しました (${targetSize}にリサイズ済み)`);
    } catch (error) {
      console.error('画像処理エラー:', error);
      const errorMsg = error instanceof Error ? error.message : '画像の処理に失敗しました';
      toast.error(errorMsg);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('参照画像を削除しました');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        参照画像（任意）
      </label>
      
      {previewUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/50">
          <img 
            src={previewUrl} 
            alt="参照画像" 
            className="w-full h-48 object-contain"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
              </div>
            </div>
          </Button>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        参照画像は自動的に{targetSize}にリサイズされます。画像の雰囲気やスタイルを反映した動画が生成されます。
      </p>
    </div>
  );
}
