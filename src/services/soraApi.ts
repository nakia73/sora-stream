import { GenerationOptions, VideoGenerationResponse, SoraApiError } from '@/types/video';
import { handleApiError, handleImageConversionError, validateBase64Image } from '@/utils/errorHandler';

const API_BASE_URL = 'https://api.openai.com/v1';

function base64ToFile(base64String: string, filename: string = 'reference.png'): File {
  try {
    console.log('🖼️ Base64→File変換開始:', {
      base64Length: base64String.length,
      base64Preview: base64String.substring(0, 100),
    });

    // data:image/png;base64,... の形式から base64 部分を抽出
    const base64Data = base64String.split(',')[1];
    
    // バリデーション
    validateBase64Image(base64Data);
    
    console.log('📊 Base64データ抽出成功:', {
      base64Length: base64Data.length,
      estimatedSize: Math.round(base64Data.length * 0.75) + ' bytes',
    });

    // Base64をバイナリデコード
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('✅ バイナリ変換完了:', bytes.length + ' bytes');

    // Blobを作成
    const blob = new Blob([bytes], { type: 'image/png' });
    const file = new File([blob], filename, { type: 'image/png' });

    console.log('📷 File作成成功:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    return file;
  } catch (error) {
    handleImageConversionError(error);
  }
}

function buildFormData(
  prompt: string,
  options: GenerationOptions,
  referenceImage?: string | null
): FormData {
  console.log('🏗️ buildFormData開始:', {
    model: options.model,
    promptLength: prompt.length,
    size: options.size,
    seconds: options.seconds,
    hasReferenceImage: !!referenceImage,
    referenceImageLength: referenceImage?.length,
    referenceImageType: typeof referenceImage,
    referenceImagePreview: referenceImage ? referenceImage.substring(0, 80) + '...' : null,
    timestamp: new Date().toISOString(),
  });

  const formData = new FormData();
  formData.append('model', options.model);
  formData.append('prompt', prompt);
  formData.append('size', options.size);
  formData.append('seconds', options.seconds);

  console.log('✅ 基本パラメータをFormDataに追加完了');

  // 参照画像がある場合は追加
  if (referenceImage && referenceImage.trim() !== '') {
    try {
      const file = base64ToFile(referenceImage, 'reference.png');
      formData.append('input_reference', file);

      console.log('📷 参照画像をFormDataに追加:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // FormDataの内容を確認（デバッグ用）
      const formDataEntries: string[] = [];
      formData.forEach((value, key) => {
        if (value instanceof File) {
          formDataEntries.push(`${key}: File(name=${value.name}, size=${value.size}, type=${value.type})`);
        } else {
          formDataEntries.push(`${key}: ${value}`);
        }
      });
      console.log('📦 FormData内容:', formDataEntries);
    } catch (error) {
      console.error('❌ 参照画像の追加に失敗:', error);
      throw error;
    }
  } else {
    console.log('ℹ️ 参照画像なし - テキストのみで生成');
  }

  return formData;
}

export async function generateVideo(
  apiKey: string,
  prompt: string,
  options: GenerationOptions,
  referenceImage?: string | null
): Promise<VideoGenerationResponse> {
  console.log('🎬 generateVideo API呼び出し:', {
    promptLength: prompt.length,
    hasReferenceImage: !!referenceImage,
    model: options.model,
  });

  try {
    const formData = buildFormData(prompt, options, referenceImage);

    console.log('🚀 APIリクエスト送信中...');

    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    let data: VideoGenerationResponse | SoraApiError;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textError = await response.text();
        console.error('❌ 非JSONレスポンス:', textError);
        throw new Error(`予期しないレスポンス形式 (${response.status}: ${response.statusText})`);
      }
    } catch (parseError) {
      console.error('❌ レスポンスのパースに失敗:', parseError);
      throw new Error(`レスポンス解析エラー (${response.status}: ${response.statusText})`);
    }

    if (!response.ok) {
      handleApiError(response, data);
    }

    const videoData = data as VideoGenerationResponse;
    
    console.log('🎬 動画生成開始 - APIレスポンス:', JSON.stringify(videoData, null, 2));

    // 参照画像の検証
    if (referenceImage && !videoData.input_reference) {
      console.warn('⚠️ 参照画像を送信したがAPIレスポンスに含まれていません');
    } else if (referenceImage) {
      console.log('✅ 参照画像がAPIに正しく受理されました');
    }

    return videoData;
  } catch (error) {
    if (error instanceof Error && error.name === 'VideoGenerationError') {
      throw error;
    }
    console.error('❌ 動画生成API呼び出しエラー:', error);
    throw new Error(error instanceof Error ? error.message : '動画生成に失敗しました');
  }
}

export async function getVideoStatus(
  apiKey: string,
  videoId: string
): Promise<VideoGenerationResponse> {
  try {
    console.log('📡 動画ステータス確認:', videoId);

    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      let errorMsg = 'ステータス確認に失敗しました';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || errorMsg;
        console.error('❌ ステータス確認エラー:', errorData);
      } catch {
        console.error('❌ ステータス確認エラー: HTTP', response.status);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('📹 動画ステータスレスポンス:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ ステータス確認API呼び出しエラー:', error);
    throw new Error(error instanceof Error ? error.message : 'ステータス確認に失敗しました');
  }
}

export async function getVideoContent(
  apiKey: string,
  videoId: string
): Promise<Blob> {
  try {
    console.log('📥 動画コンテンツ取得開始:', videoId);

    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/content`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error('❌ 動画コンテンツ取得失敗:', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`動画コンテンツ取得失敗: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    
    console.log('✅ 動画コンテンツ取得成功:', {
      blobSize: blob.size,
      blobType: blob.type,
    });

    return blob;
  } catch (error) {
    console.error('❌ 動画コンテンツ取得API呼び出しエラー:', error);
    throw new Error(error instanceof Error ? error.message : '動画コンテンツの取得に失敗しました');
  }
}
