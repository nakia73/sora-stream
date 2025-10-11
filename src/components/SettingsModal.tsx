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
import { Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSaveApiKey(apiKey.trim());
      onOpenChange(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('APIキーを入力してください');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      // OpenAI APIのモデル一覧エンドポイントでテスト（軽量なリクエスト）
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message || 'APIキーの検証に失敗しました';
        
        let detailedMessage = errorMessage;
        if (response.status === 401) {
          detailedMessage = 'APIキーが無効です。正しいAPIキーを入力してください。';
        } else if (response.status === 403) {
          detailedMessage = 'アクセスが拒否されました。組織の認証状態を確認してください。';
        } else if (response.status === 429) {
          detailedMessage = 'レート制限に達しました。しばらく待ってから再度お試しください。';
        }
        
        setTestStatus('error');
        setTestMessage(detailedMessage);
        toast.error(detailedMessage);
        return;
      }

      const data = await response.json();
      
      // Sora2モデルが利用可能かチェック
      const hasSora2 = data.data?.some((model: any) => 
        model.id === 'sora-2' || model.id === 'sora-2-pro'
      );

      if (hasSora2) {
        setTestStatus('success');
        setTestMessage('✅ APIキーは有効です。Sora2モデルが利用可能です。');
        toast.success('APIキーのテストに成功しました！');
      } else {
        setTestStatus('success');
        setTestMessage('✅ APIキーは有効ですが、Sora2モデルへのアクセスが確認できませんでした。');
        toast.warning('APIキーは有効ですが、Sora2モデルが見つかりません');
      }
    } catch (error) {
      console.error('APIテストエラー:', error);
      setTestStatus('error');
      setTestMessage('ネットワークエラーが発生しました');
      toast.error('APIテストに失敗しました');
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

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestApiKey}
              disabled={!apiKey.trim() || testStatus === 'testing'}
              className="w-full"
            >
              {testStatus === 'testing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  テスト中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  APIキーをテスト
                </>
              )}
            </Button>

            {testStatus === 'success' && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-600 dark:text-green-400">{testMessage}</p>
                </div>
              </div>
            )}

            {testStatus === 'error' && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">{testMessage}</p>
                </div>
              </div>
            )}
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
