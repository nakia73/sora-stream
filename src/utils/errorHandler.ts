export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'VideoGenerationError';
  }
}

export function handleApiError(response: Response, error: any): never {
  console.error('❌ APIエラー詳細:', {
    status: response.status,
    statusText: response.statusText,
    errorCode: error?.error?.code || error?.error?.type,
    errorMessage: error?.error?.message,
    fullError: error,
  });

  const errorCode = error?.error?.code || error?.error?.type || 'unknown';
  const errorMessage = error?.error?.message || '動画生成リクエストに失敗しました';

  // エラータイプに応じた詳細メッセージ
  let detailedMessage = errorMessage;
  
  if (errorCode === 'billing_hard_limit_reached') {
    detailedMessage = '❌ OpenAIの課金制限に達しています。\n\nOpenAIダッシュボードで課金設定を確認してください:\nhttps://platform.openai.com/settings/organization/billing';
  } else if (response.status === 403) {
    if (errorMessage.includes('organization must be verified')) {
      detailedMessage = '❌ OpenAI組織の認証が必要です。\n\n以下のURLから組織認証を行ってください:\nhttps://platform.openai.com/settings/organization/general\n\n認証後、反映まで最大15分かかる場合があります。';
    } else {
      detailedMessage = `❌ アクセスが拒否されました。\n\n${errorMessage}\n\nAPIキーの権限を確認してください。`;
    }
  } else if (response.status === 401) {
    detailedMessage = '❌ APIキーが無効です。\n\n設定画面から正しいAPIキーを入力してください。';
  } else if (response.status === 429) {
    detailedMessage = '❌ レート制限に達しました。\n\nしばらく待ってから再度お試しください。';
  } else if (response.status === 400) {
    detailedMessage = `❌ リクエストが不正です。\n\n${errorMessage}\n\nプロンプトや設定を確認してください。`;
  } else if (response.status >= 500) {
    detailedMessage = `❌ OpenAIサーバーエラーが発生しました。\n\n${errorMessage}\n\nしばらく待ってから再度お試しください。`;
  }

  throw new VideoGenerationError(detailedMessage, errorCode, response.status);
}

export function handleImageConversionError(error: unknown): never {
  console.error('❌ 画像変換エラー:', error);
  const message = error instanceof Error ? error.message : '画像の処理に失敗しました';
  throw new VideoGenerationError(`画像変換エラー: ${message}`, 'image_conversion_failed');
}

export function handleNetworkError(error: unknown, context: string): never {
  console.error(`❌ ネットワークエラー (${context}):`, error);
  const message = error instanceof Error ? error.message : '不明なエラー';
  throw new VideoGenerationError(
    `${context}中にネットワークエラーが発生しました: ${message}`,
    'network_error'
  );
}

export function validateBase64Image(base64Data: string): void {
  if (!base64Data || base64Data.trim() === '') {
    throw new VideoGenerationError('Base64データが空です', 'empty_base64');
  }
  
  // Base64形式の基本的な検証
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Pattern.test(base64Data)) {
    throw new VideoGenerationError('無効なBase64形式です', 'invalid_base64_format');
  }
}
