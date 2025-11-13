// Minimal, robust renderer for /operate/[id]
// - Tries to fetch /data/operate.json and /data/operate_questions.json from the static origin.
// - If those are missing, falls back to a tiny sample article so the function never fails at build time.
// TODO:
// css を書く
export async function onRequest(context) {
  const { id } = context.params || {};
  const origin = new URL(context.request.url).origin;

  // Try to load dataset; if unavailable, fall back to sample
  let article = null;
  let questions = [];

  try {
    const [opRes, qRes] = await Promise.all([
      fetch(new URL("/data/operate.json", origin)).catch(() => null),
      fetch(new URL("/data/operate_questions.json", origin)).catch(() => null),
    ]);

    if (opRes && opRes.ok) {
      const operates = await opRes.json();
      const arr = Array.isArray(operates)
        ? operates
        : Object.values(operates || {});
      article =
        arr.find(
          (a) => String(a.id) === String(id) || String(a.slug) === String(id)
        ) ||
        arr[0] ||
        null;
    }

    if (qRes && qRes.ok) {
      const q = await qRes.json();
      questions = Array.isArray(q) ? q : Object.values(q || {});
    }
  } catch (e) {
    // ignore, we'll provide fallback
    console.error("データ読み込み時の警告:", e && e.message);
  }

  if (!article) {
    article = {
      id: id || "1",
      title: `Operate ${id || "sample"}`,
      body: `これはサンプル記事です。ID=${
        id || "sample"
      } の内容がここに表示されます。`,
      author: "system",
      is_published: true,
    };
  }

  // filter questions to only those that match this article's id/slug/external id
  const keys = [
    article && article.id,
    article && article.slug,
    article && article.external_id,
  ]
    .filter(Boolean)
    .map(String);
  const filtered = (questions || []).filter((q) => {
    const qOperateId = q && q.operate_id != null ? String(q.operate_id) : null;
    const qExternal =
      q && q.operate_external_id != null ? String(q.operate_external_id) : null;
    return (
      (qOperateId && keys.includes(qOperateId)) ||
      (qExternal && keys.includes(qExternal))
    );
  });

  const html = buildPageHtml(article, filtered || []);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPageHtml(article, questions) {
  const qsHtml = (questions || []).length
    ? (questions || [])
        .map(
          (q) => `
      <section class="question" data-qid="${escapeHtml(q.id)}">
        <h3>${escapeHtml(q.title || "問")}</h3>
        <div>${escapeHtml(q.content || "")}</div>
        <textarea id="q_${escapeHtml(q.id)}" rows="4"></textarea>
      </section>
    `
        )
        .join("\n")
    : "<p>設問はありません。</p>";

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title || "No Title")}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main class="article-container">
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta">作成者: ${escapeHtml(article.author)}</div>
    <article class="body">${escapeHtml(article.body)}</article>

    <h2>設問</h2>
    ${qsHtml}

    <div class="submit-section">
      <p><button id="submit-answers">回答を送信する</button></p>
      <div id="form-result" aria-live="polite">ここに送信結果が表示されます</div>
    </div>

    <p><a href="/">ホームへ戻る</a></p>
  </main>
  <script src="/js/gemini-form.js"></script>
</body>
</html>`;

  return html;
}
