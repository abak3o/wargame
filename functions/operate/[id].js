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
      questions = Array.isArray(q) ? q : Object.values(q || {});
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

  const html = template
    ? renderTemplate(template, article, filtered || [])
    : buildPageHtml(article, filtered || []);

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

// Render template with placeholders
function renderTemplate(template, article, questions) {
  const questionsHtml = buildQuestionsListHtml(questions);
  const initialAnswer = buildInitialAnswerText(questions);

  return template
    .replace(/\{\{TITLE\}\}/g, escapeHtml(article.title || "No Title"))
    .replace(/\{\{AUTHOR\}\}/g, escapeHtml(article.author || "Unknown"))
    .replace(/\{\{BODY\}\}/g, article.body || "")
    .replace(/\{\{QUESTIONS\}\}/g, questionsHtml)
    .replace(/\{\{INITIAL_ANSWER\}\}/g, initialAnswer);
}

// Build questions list HTML (without answer textareas)
function buildQuestionsListHtml(questions) {
  if (!questions || questions.length === 0) {
    return "<p>設問はありません。</p>";
  }

  return questions
    .map(
      (q) => `
      <div class="question-item" data-qid="${escapeHtml(q.id)}">
        <h3>問題 ${escapeHtml(q.question_number || "")}</h3>
        <div class="question-content">${escapeHtml(q.content || "")}</div>
      </div>
    `
    )
    .join("\n");
}

// Build initial answer text with question templates
function buildInitialAnswerText(questions) {
  if (!questions || questions.length === 0) {
    return "";
  }

  return questions
    .map((q) => {
      const qNum = q.question_number || "";
      return `【${qNum}】\n\n`;
    })
    .join("\n");
}

// Build questions HTML (for fallback)
function buildQuestionsHtml(questions) {
  if (!questions || questions.length === 0) {
    return "<p>設問はありません。</p>";
  }

  return questions
    .map(
      (q) => `
      <section class="question" data-qid="${escapeHtml(q.id)}">
        <h3>問題 ${escapeHtml(q.question_number || "")}</h3>
        <div class="question-content">${escapeHtml(q.content || "")}</div>
        <label for="q_${escapeHtml(q.id)}" class="sr-only">回答欄</label>
        <textarea 
          id="q_${escapeHtml(q.id)}" 
          placeholder="こちらに回答を入力してください..."
          aria-label="問題${escapeHtml(q.question_number || "")}の回答"
        ></textarea>
      </section>
    `
    )
    .join("\n");
}

// Fallback: build HTML inline if template is not available
function buildPageHtml(article, questions) {
  const qsHtml = buildQuestionsHtml(questions);

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
    ${qsHtml}

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
