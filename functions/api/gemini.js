// functions/api/gemini.js

/**
 * POST /api/gemini
 *
 * リクエストボディ (JSON):
 * {
 * "prompt": "ユーザーが入力したプロンプト"
 * }
 *
 * レスポンス (JSON):
 * {
 * "responseText": "Gemini からの応答テキスト"
 * }
 */
export async function onRequestPost(context) {
  try {
    // 1. 環境変数 (シークレット) から API キーを取得
    //    'GEMINI_API_KEY' という名前でシークレットを設定する必要があります
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    // 2. フロントエンド (script.js) から送られてきた JSON を取得
    const requestData = await context.request.json();
    const userPrompt = requestData.prompt;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Gemini API (v1beta) にリクエストを送信
    const modelName = "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();

    // 4. Gemini の応答テキストを抽出
    //    (注: Gemini のレスポンス構造は変更される可能性があるため、ドキュメントを確認してください)
    const responseText = geminiData.candidates[0].content.parts[0].text;

    // 5. フロントエンドに JSON 形式で応答を返す
    //    script.js はこの responseText を受け取って表示する
    const responsePayload = {
      responseText: responseText,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// OPTIONS リクエストのハンドリング (CORS 用、ただし Advanced Mode では不要な場合も)
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*', // 本番環境ではドメインを限定
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}