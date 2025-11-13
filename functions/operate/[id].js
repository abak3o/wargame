// Minimal, robust renderer for /operate/[id]
// - Loads HTML template from /templates/operate.html
// - Fetches data from /data/operate.json and /data/operate_questions.json
// - Falls back to sample data if files are unavailable
export async function onRequest(context) {
  const { id } = context.params || {};
  const origin = new URL(context.request.url).origin;

  // Try to load dataset; if unavailable, fall back to sample
  let article = null;
  let questions = [];
  let template = null;

  try {
    const [opRes, qRes, templateRes] = await Promise.all([
      fetch(new URL("/data/operate.json", origin)).catch(() => null),
      fetch(new URL("/data/operate_questions.json", origin)).catch(() => null),
      fetch(new URL("/templates/operate.html", origin)).catch(() => null),
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
      // 新しい構造: { "1": {...}, "2": {...} }
      questions = q;
    }

    if (templateRes && templateRes.ok) {
      template = await templateRes.text();
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

  // Get questions for this operate_id
  const operateQuestions =
    questions && questions[String(article.id)]
      ? questions[String(article.id)]
      : null;

  const html = template
    ? renderTemplate(template, article, operateQuestions)
    : buildPageHtml(article, operateQuestions);

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

// Escape HTML and convert newlines to <br>
function escapeHtmlWithBreaks(s) {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

// Render template with placeholders
function renderTemplate(template, article, questionData) {
  const questionsHtml = questionData
    ? escapeHtmlWithBreaks(questionData.content || "")
    : "<p>設問はありません。</p>";
  const initialAnswer = questionData ? questionData.answer_template || "" : "";

  return template
    .replace(/\{\{TITLE\}\}/g, escapeHtml(article.title || "No Title"))
    .replace(/\{\{AUTHOR\}\}/g, escapeHtml(article.author || "Unknown"))
    .replace(/\{\{BODY\}\}/g, article.body || "")
    .replace(/\{\{QUESTIONS\}\}/g, questionsHtml)
    .replace(/\{\{INITIAL_ANSWER\}\}/g, initialAnswer);
}

// These functions are kept for backward compatibility but simplified for new structure

// Fallback: build HTML inline if template is not available
function buildPageHtml(article, questionData) {
  const qsHtml = questionData
    ? escapeHtmlWithBreaks(questionData.content || "")
    : "<p>設問はありません。</p>";
  const initialAnswer = questionData ? questionData.answer_template || "" : "";

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title || "No Title")}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/operate.css">
</head>
<body>
  <main class="article-container">
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta">作成者: ${escapeHtml(article.author)}</div>
    <article class="body">${article.body || ""}</article>

    <h2>設問</h2>
    <div class="questions-list">
      <div class="question-content">${qsHtml}</div>
    </div>

    <h2>回答欄</h2>
    <div class="answer-section">
      <label for="answer-area" class="sr-only">全問題の回答</label>
      <textarea 
        id="answer-area" 
        placeholder="こちらに全ての問題の回答を入力してください..."
        aria-label="全問題の回答欄"
      >${initialAnswer}</textarea>
    </div>

    <div class="submit-section">
      <p><button id="submit-answers">回答を送信する</button></p>
      <div id="form-result" aria-live="polite"></div>
    </div>

    <p><a href="/">ホームへ戻る</a></p>
  </main>
  <script src="/js/gemini-form.js"></script>
</body>
</html>`;

  return html;
}
