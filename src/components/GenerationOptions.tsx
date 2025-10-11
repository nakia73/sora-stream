import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GenerationOptions as Options } from '@/hooks/useVideoGeneration';

interface GenerationOptionsProps {
  options: Options;
  onChange: (options: Options) => void;
  disabled?: boolean;
}

export function GenerationOptions({ options, onChange, disabled }: GenerationOptionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="resolution">解像度</Label>
        <Select
          value={options.resolution}
          onValueChange={(value) =>
            onChange({ ...options, resolution: value as '720p' | '1080p' })
          }
          disabled={disabled}
        >
          <SelectTrigger id="resolution" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="720p">720p</SelectItem>
            <SelectItem value="1080p">1080p</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aspectRatio">アスペクト比</Label>
        <Select
          value={options.aspectRatio}
          onValueChange={(value) =>
            onChange({ ...options, aspectRatio: value as '16:9' | '9:16' | '1:1' })
          }
          disabled={disabled}
        >
          <SelectTrigger id="aspectRatio" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9 (横長)</SelectItem>
            <SelectItem value="9:16">9:16 (縦長)</SelectItem>
            <SelectItem value="1:1">1:1 (正方形)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">長さ</Label>
        <Select
          value={options.duration.toString()}
          onValueChange={(value) =>
            onChange({ ...options, duration: parseInt(value) as 4 | 8 | 12 })
          }
          disabled={disabled}
        >
          <SelectTrigger id="duration" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4秒</SelectItem>
            <SelectItem value="8">8秒</SelectItem>
            <SelectItem value="12">12秒</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">モデル</Label>
        <Select
          value={options.model}
          onValueChange={(value) =>
            onChange({ ...options, model: value as 'sora-2' | 'sora-2-pro' })
          }
          disabled={disabled}
        >
          <SelectTrigger id="model" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sora-2">Sora 2</SelectItem>
            <SelectItem value="sora-2-pro">Sora 2 Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
