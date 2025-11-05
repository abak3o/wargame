// This file handles all requests to /operate/[something]
// e.g., /operate/123 or /operate/hello

export async function onRequest(context) {
  // 1. context.params から [id] の部分を取得します
  //    ファイル名が [id].js なので、context.params.id に値が入ります
  const { id } = context.params;

  // 2. 返却するHTMLを生成します
  //    ブラウザで見やすいように、簡単なHTMLでラップします。
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <title>Dynamic Page</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- /public/style.css を読み込みます -->
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <main>
          <h1>動的ページ</h1>
          <p>URLから取得したIDは...</p>
          
          <!-- 3. 取得したIDを <p> タグで出力します -->
          <p class="dynamic-id">${id}</p>
          
          <a href="/">ホームに戻る</a>
        </main>
      </body>
    </html>
  `;

  // 4. HTMLとしてレスポンスを返します
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}
