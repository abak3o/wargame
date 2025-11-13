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
    const requestData = await context.request.json().catch(() => ({}));
    const userPrompt = requestData.prompt || '';

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiKey = context.env && context.env.GEMINI_API_KEY;

    // If no API key, return a simple, deterministic echo so local development works.
    if (!apiKey) {
      const resp = { responseText: `（ローカルモード）受け取ったプロンプト: ${userPrompt}` };
      return new Response(JSON.stringify(resp), { headers: { 'Content-Type': 'application/json' } });
    }

    // If API key exists, attempt to call Gemini (keep payload minimal). If that fails, return error.
    const modelName = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const apiResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] })
    });

    if (!apiResp.ok) {
      const t = await apiResp.text();
      throw new Error('Gemini API error: ' + t);
    }

    const json = await apiResp.json();
    const text = ((json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text) || '').toString();
    return new Response(JSON.stringify({ responseText: text }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('api/gemini error:', err && err.message);
    return new Response(JSON.stringify({ error: err && err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}