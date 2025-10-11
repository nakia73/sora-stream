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
  const [apiResponse, setApiResponse] = useState<any>(null);

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
    setTestMessage('実際にSora2 APIを呼び出してテスト中...');
    setApiResponse(null);

    try {
      // 実際にSora2 APIに動画生成リクエストを送る
      const response = await fetch('https://api.openai.com/v1/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'sora-2',
          prompt: 'API test: a simple red circle',
          size: '1280x720',
          seconds: '4',
        }),
      });

      const responseData = await response.json();
      setApiResponse(responseData);

      if (!response.ok) {
        const errorMessage = responseData.error?.message || 'APIリクエストに失敗しました';
        const errorCode = responseData.error?.code || responseData.error?.type || 'unknown';
        
        let detailedMessage = `❌ ${errorMessage}`;
        if (errorCode === 'billing_hard_limit_reached') {
          detailedMessage = '❌ OpenAIの課金制限に達しています。\n\nhttps://platform.openai.com/settings/organization/billing で課金設定を確認してください。';
        } else if (response.status === 403 && errorMessage.includes('organization must be verified')) {
          detailedMessage = '❌ OpenAI組織の認証が必要です。\n\nhttps://platform.openai.com/settings/organization/general\n\n認証後、反映まで最大15分かかる場合があります。';
        } else if (response.status === 401) {
          detailedMessage = '❌ APIキーが無効です。正しいAPIキーを入力してください。';
        } else if (response.status === 429) {
          detailedMessage = '❌ レート制限に達しました。しばらく待ってから再度お試しください。';
        }
        
        setTestStatus('error');
        setTestMessage(detailedMessage);
        toast.error('Sora2 APIテスト失敗', { duration: 5000 });
        return;
      }

      // 成功: video_idが返ってきた
      setTestStatus('success');
      setTestMessage(`✅ Sora2 APIが正常に動作しています！\n\nテスト動画ID: ${responseData.id}\nステータス: ${responseData.status}\n\n実際に動画生成リクエストが受け付けられました。`);
      toast.success('Sora2 APIテスト成功！実際にリクエストが受け付けられました。');
    } catch (error) {
      console.error('APIテストエラー:', error);
      setTestStatus('error');
      setTestMessage('❌ ネットワークエラーが発生しました');
      setApiResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
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
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-600 dark:text-green-400 whitespace-pre-line">{testMessage}</p>
                </div>
                {apiResponse && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-green-600 dark:text-green-400 hover:underline">
                      API応答の詳細を表示
                    </summary>
                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto text-[10px] text-green-600 dark:text-green-400">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {testStatus === 'error' && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive whitespace-pre-line">{testMessage}</p>
                </div>
                {apiResponse && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-destructive hover:underline">
                      エラー応答の詳細を表示
                    </summary>
                    <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto text-[10px] text-destructive">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </details>
                )}
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
