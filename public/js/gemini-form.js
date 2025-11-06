// Minimal client script for sending a prompt to /api/gemini and showing response
console.log('gemini-form.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  // Handler for legacy standalone AI form (if present)
  const aiSubmit = document.getElementById('gemini-submit');
  const aiTextarea = document.getElementById('gemini-prompt');
  const aiResult = document.getElementById('gemini-result');

  if (aiSubmit && aiTextarea && aiResult) {
    aiSubmit.addEventListener('click', async () => {
      const prompt = (aiTextarea.value || '').trim();
      console.log('gemini-form submit prompt:', prompt);
      if (!prompt) {
        aiResult.innerHTML = '<p style="color:crimson">質問を入力してください。</p>';
        return;
      }
      aiSubmit.disabled = true;
      const prev = aiSubmit.textContent;
      aiSubmit.textContent = '送信中...';
      aiResult.innerHTML = '<p>応答を取得しています...</p>';

      const bodyText = (document.querySelector('.body') || {}).textContent || '';
      const payload = { prompt: `Content:\n${bodyText}\n\nQuestion:\n${prompt}` };

      // FIXME:
      // error handling
      try {
        const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Network response was ' + resp.status);
        const json = await resp.json();
        const txt = (json && json.responseText) ? String(json.responseText) : (json && json.error) ? String(json.error) : 'No response';
        aiResult.innerHTML = '<div>' + txt.replace(/\n/g, '<br>') + '</div>';
      } catch (err) {
        console.error('gemini-form error:', err);
        aiResult.innerHTML = '<p style="color:crimson">エラー: ' + (err && err.message) + '</p>';
      } finally {
        aiSubmit.disabled = false;
        aiSubmit.textContent = prev || '送信';
      }
    });
  }

  // New behavior: when the page has a submit-answers button, collect all question inputs
  // and POST an assembled prompt to /api/gemini. Display response in #form-result.
  const submitAnswers = document.getElementById('submit-answers');
  const formResult = document.getElementById('form-result');

  if (submitAnswers && formResult) {
    submitAnswers.addEventListener('click', async () => {
      submitAnswers.disabled = true;
      const prev = submitAnswers.textContent;
      submitAnswers.textContent = '送信中...';
      formResult.innerHTML = '<p>AI に送信しています...</p>';

      try {
        // gather all textareas whose id starts with 'q_'
        const qEls = Array.from(document.querySelectorAll('textarea[id^="q_"]'));
        const answers = qEls.map((ta, idx) => ({ id: ta.id.replace(/^q_/, ''), text: (ta.value || '').trim() }));

        // build prompt: include article body and the collected answers
        const bodyText = (document.querySelector('.body') || {}).textContent || '';
        let prompt = `Article:\n${bodyText}\n\nAnswers:\n`;
        if (answers.length === 0) {
          prompt += '(回答はありません)';
        } else {
          prompt += answers.map(a => `- ${a.id}: ${a.text}`).join('\n');
        }

        console.log('submit-answers prompt:', prompt);

        const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        if (!resp.ok) throw new Error('Network response was ' + resp.status);
        const json = await resp.json();
        const txt = (json && json.responseText) ? String(json.responseText) : (json && json.error) ? String(json.error) : 'No response';
        formResult.innerHTML = '<div>' + txt.replace(/\n/g, '<br>') + '</div>';

      } catch (err) {
        console.error('submit-answers error:', err);
        formResult.innerHTML = '<p style="color:crimson">エラー: ' + (err && err.message) + '</p>';
      } finally {
        submitAnswers.disabled = false;
        submitAnswers.textContent = prev || '回答を送信する';
      }
    });
  }
});