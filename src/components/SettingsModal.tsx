import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Key } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentApiKey: string | null;
  onSaveApiKey: (key: string) => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  currentApiKey,
  onSaveApiKey,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey || '');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSaveApiKey(apiKey.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Key className="w-6 h-6 text-primary" />
            設定
          </DialogTitle>
          <DialogDescription>
            OpenAI APIキーを入力してください。ブラウザのローカルストレージに安全に保存されます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-foreground">
              OpenAI APIキー
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-muted border-border"
            />
            <p className="text-xs text-muted-foreground">
              APIキーは{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Platform
              </a>{' '}
              で取得できます
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm text-foreground">💡 ヒント</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• APIキーは安全に管理してください</li>
              <li>• 使用量に応じて課金されます</li>
              <li>• 動画1本あたり約$0.40〜$1.80の費用がかかります</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!apiKey.trim()} className="gradient-primary">
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
