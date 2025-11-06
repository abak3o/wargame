// このファイルは /public フォルダに置き、
// template.html から <script src="/client-script.js"></script> で読み込みます。
// このファイルに 'export' という単語は出てきません。

console.log('client-script.js が正しく読み込まれました。');

document.addEventListener('DOMContentLoaded', () => {
  
  // --- Gemini フォーム処理 ---
  const submitButton = document.getElementById('gemini-submit');
  const promptTextarea = document.getElementById('gemini-prompt');
  const resultDiv = document.getElementById('gemini-result');

  if (submitButton) {
    submitButton.addEventListener('click', async () => {
      const prompt = promptTextarea.value;
      // 入力内容をコンソールに出力
      console.log('Geminiフォーム送信内容:', prompt);
      if (!prompt) {
        resultDiv.innerHTML = "<p style='color: red;'>プロンプトを入力してください。</p>";
        return;
      }

      // FIXME:
      // 入力テキストを加工
      const processedPrompt = `以下の内容について、分かりやすく説明してください：\n\n${prompt}`;
      console.log('加工後の送信内容:', processedPrompt);

      // ボタンを無効化し、ローディング表示
      submitButton.disabled = true;
      submitButton.textContent = '送信中...';
      resultDiv.innerHTML = '<p>Geminiが応答を生成しています...</p>';

      try {
        // 1. ★重要★
        //    /functions/api/gemini.js が提供する「APIエンドポイント」を呼び出す
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: processedPrompt }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`APIエラー: ${errorText}`);
        }

        const data = await response.json();
        
        // 2. サーバーから返ってきた結果をHTMLとして表示
        let html = data.responseText;
        html = html.replace(/\n/g, '<br>'); // 改行を<br>に
        resultDiv.innerHTML = html;

      } catch (e) {
        resultDiv.innerHTML = `<p style='color: red;'>エラー: ${e.message}</p>`;
      
      } finally {
        // ボタンを再度有効化
        submitButton.disabled = false;
        submitButton.textContent = 'Geminiに送信';
      }
    });
  }
});

