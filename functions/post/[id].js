// ハンドラをクラスとして定義します。
// これはドキュメントの "Element Handlers" セクションに基づいています。
class PostContentHandler {
  constructor(postData) {
    this.postData = postData;
  }

  // element(element) メソッドがセレクタにマッチした要素を処理します。
  element(element) {
    // ドキュメントの "Element" > "Properties" > "tagName" に基づいています。
    switch (element.tagName) {
      case 'title':
        // ドキュメントの "Element" > "Methods" > "setInnerContent"
        element.setInnerContent(this.postData.title);
        break;
      case 'h1':
        // id="post-title" にマッチ
        element.setInnerContent(this.postData.title);
        break;
      case 'span':
        // id="post-author" にマッチ
        element.setInnerContent(this.postData.author);
        break;
      case 'div':
        // id="post-body" にマッチ
        // ドキュメントの "Global types" > "ContentOptions" に基づき、
        // { html: true } を設定して、文字列をHTMLとして扱います。
        element.setInnerContent(this.postData.body, { html: true });
        break;
    }
  }
}

// メインの処理 (リクエストハンドラ)
export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id; // URLから [id] (例: "1" や "hello") を取得

  try {
    // --- 将来 D1 に置き換わる部分 (ここから) ---
    // 1. /public/data/data.json を内部的にフェッチ
    const dataUrl = new URL(request.url).origin + "/data/data.json";
    const dataResponse = await env.ASSETS.fetch(dataUrl);
    
    if (!dataResponse.ok) {
      throw new Error("Failed to fetch data.json");
    }
    
    const allPosts = await dataResponse.json();
    const postData = allPosts[id]; // IDに対応する投稿データを取得
    // --- 将来 D1 に置き換わる部分 (ここまで) ---
    // ※ D1なら: const postData = await env.DB.prepare("...").bind(id).first();

    if (!postData) {
      return new Response("Post not found", { status: 404 });
    }

    // 2. /public/template.html を内部的にフェッチ
    const templateUrl = new URL(request.url).origin + "/template.html";
    const templateResponse = await env.ASSETS.fetch(templateUrl);

    // 3. HTMLRewriter をセットアップ
    //    ドキュメントの "Constructor" および "Selectors" セクションに基づいています。
    const rewriter = new HTMLRewriter()
      .on("title", new PostContentHandler(postData))
      .on("h1#post-title", new PostContentHandler(postData))
      .on("span#post-author", new PostContentHandler(postData))
      .on("div#post-body", new PostContentHandler(postData));

    // 4. テンプレートを書き換えながら、レスポンスをストリーミング
    return rewriter.transform(templateResponse);

  } catch (e) {
    console.error(e);
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. ブラウザ (client-script.js) からのプロンプトを受け取る
  let prompt;
  try {
    const requestBody = await request.json();
    prompt = requestBody.prompt;
  } catch (e) {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!prompt) {
    return new Response("Prompt is required", { status: 400 });
  }

  // 2. Cloudflareの環境変数から安全にAPIキーを取得
  // ※ ローカル開発: wrangler secret put GEMINI_API_KEY
  // ※ 本番: Pagesダッシュボードで設定
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  // 3. Gemini APIにリクエストを（サーバーサイドから）送信
  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API Error:", errorText);
      return new Response(`Gemini API error: ${errorText}`, { status: geminiResponse.status });
    }

    const result = await geminiResponse.json();
    
    // 4. Geminiの回答を抽出し、ブラウザに返す
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return new Response("No content returned from Gemini", { status: 500 });
    }
    
    return Response.json({ responseText: text });

  } catch (e) {
    return new Response(`Error processing request: ${e.message}`, { status: 500 });
  }
}
