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
        <Label htmlFor="size">解像度・向き</Label>
        <Select
          value={options.size}
          onValueChange={(value) =>
            onChange({
              ...options,
              size: value as '1280x720' | '720x1280' | '1792x1024' | '1024x1792',
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="size" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1280x720">1280x720 (横長・HD)</SelectItem>
            <SelectItem value="720x1280">720x1280 (縦長)</SelectItem>
            <SelectItem value="1792x1024">1792x1024 (横長・高解像度) ※Pro</SelectItem>
            <SelectItem value="1024x1792">1024x1792 (縦長・高解像度) ※Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seconds">長さ</Label>
        <Select
          value={options.seconds}
          onValueChange={(value) =>
            onChange({ ...options, seconds: value as '4' | '8' | '12' })
          }
          disabled={disabled}
        >
          <SelectTrigger id="seconds" className="bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4秒</SelectItem>
            <SelectItem value="8">8秒</SelectItem>
            <SelectItem value="12">12秒</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 col-span-2">
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
            <SelectItem value="sora-2">Sora 2 ($0.10/秒)</SelectItem>
            <SelectItem value="sora-2-pro">Sora 2 Pro ($0.30〜$0.50/秒)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
