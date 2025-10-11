import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  videoUrl: string;
  onDownload: () => void;
}

export function VideoPlayer({ videoUrl, onDownload }: VideoPlayerProps) {
  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-muted glow-primary">
        <video
          src={videoUrl}
          controls
          className="w-full aspect-video"
          autoPlay
          loop
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onDownload} className="flex-1 gradient-primary gap-2">
          <Download className="w-4 h-4" />
          ダウンロード
        </Button>
      </div>
    </div>
  );
}
