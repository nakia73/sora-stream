import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageSelect: (imageData: string | null) => void;
  currentImage: string | null;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, currentImage, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);

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
      // Base64に変換
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setPreviewUrl(base64Data);
        onImageSelect(base64Data);
        toast.success('参照画像を設定しました');
      };
      reader.onerror = () => {
        toast.error('画像の読み込みに失敗しました');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('画像読み込みエラー:', error);
      toast.error('画像の処理に失敗しました');
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
        参照画像を設定すると、その画像の雰囲気やスタイルを反映した動画が生成されます
      </p>
    </div>
  );
}
