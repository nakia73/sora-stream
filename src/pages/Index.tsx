import { useState } from 'react';
import { Settings, Film, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { SettingsModal } from '@/components/SettingsModal';
import { VideoPlayer } from '@/components/VideoPlayer';
import { GenerationOptions } from '@/components/GenerationOptions';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { apiKey, video, saveApiKey, generateVideo, downloadVideo, resetVideo, updateOptions } =
    useVideoGeneration();

  const handleGenerate = () => {
    if (!apiKey) {
      toast.error('APIキーを設定してください');
      setSettingsOpen(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error('プロンプトを入力してください');
      return;
    }

    if (prompt.length > 500) {
      toast.error('プロンプトは500文字以内にしてください');
      return;
    }

    generateVideo(prompt, video.options);
  };

  const handleNewGeneration = () => {
    resetVideo();
    setPrompt('');
  };

  const isGenerating = video.status === 'queued' || video.status === 'in_progress';
  const isCompleted = video.status === 'completed';

  const getStatusText = () => {
    switch (video.status) {
      case 'idle':
        return '待機中';
      case 'queued':
        return 'キューに追加済み';
      case 'in_progress':
        return '生成中...';
      case 'completed':
        return '完了';
      case 'failed':
        return '失敗';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sora 2 動画生成
            </h1>
            <p className="text-muted-foreground">
              テキストから動画を生成する AI アプリケーション
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="border-border hover:bg-muted"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Content */}
        <Card className="p-6 space-y-6 bg-card border-border shadow-lg">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              プロンプト
            </label>
            <Textarea
              placeholder="生成したい動画の内容を詳しく説明してください..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              rows={4}
              className="bg-muted border-border resize-none"
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>最大500文字</span>
              <span>{prompt.length}/500</span>
            </div>
          </div>

          {/* Generation Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">生成オプション</label>
            <GenerationOptions
              options={video.options}
              onChange={updateOptions}
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={isCompleted ? handleNewGeneration : handleGenerate}
            disabled={isGenerating || (!isCompleted && !prompt.trim())}
            className="w-full gradient-primary gap-2 text-lg py-6"
            size="lg"
          >
            <Film className="w-5 h-5" />
            {isGenerating ? '生成中...' : isCompleted ? '新しい動画を生成' : '動画を生成'}
          </Button>

          {/* Status Display */}
          {video.status !== 'idle' && !isCompleted && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">生成状態</span>
                <span className="text-sm text-muted-foreground">{getStatusText()}</span>
              </div>
              <div className="space-y-2">
                <Progress value={video.progress} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">
                  {video.progress}%
                </div>
              </div>
              {video.status === 'failed' && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive mt-0.5">⚠️</div>
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-medium text-destructive">
                        動画生成に失敗しました
                      </div>
                      <div className="text-xs text-muted-foreground">
                        エラーの詳細はトースト通知をご確認ください。
                        問題が解決しない場合は、APIキーや課金設定を確認してください。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Preview */}
          {isCompleted && video.videoUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" />
                  プレビュー
                </span>
                <span className="text-xs text-muted-foreground">✅ 生成完了</span>
              </div>
              <VideoPlayer videoUrl={video.videoUrl} onDownload={downloadVideo} />
            </div>
          )}
        </Card>

        {/* Info Card */}
        {!apiKey && (
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium text-sm">はじめに</h3>
                <p className="text-sm text-muted-foreground">
                  動画を生成するには、まず OpenAI API キーを設定してください。
                  右上の設定ボタンから入力できます。
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentApiKey={apiKey}
        onSaveApiKey={saveApiKey}
      />
    </div>
  );
};

export default Index;
