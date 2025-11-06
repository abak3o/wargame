  // --- データ読み込みとカード生成 ---
const DATA_ENDPOINT = '/data/operate.json';

document.addEventListener('DOMContentLoaded', () => {
  
  async function loadAndRenderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;

    try {
      const res = await fetch(DATA_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const data = await res.json();

      container.innerHTML = '';

      // data は配列 OR オブジェクトのどちらかであり得る
      const entries = Array.isArray(data) ? data : Object.entries(data).map(([k, v]) => Object.assign({ id: k }, v));
      entries.forEach((item) => {
        // is_published が真のものだけを表示
        const published = item.is_published === 1 || item.is_published === true || item.isPublished === true;
        if (!published) return;

        const idForUrl = item.id || item.slug || item.external_id;


        const a = document.createElement('a');
        a.href = `/operate/${encodeURIComponent(String(idForUrl || ''))}`;
        a.className = 'card';

        const h3 = document.createElement('h3');
        h3.textContent = item.title || (item.slug || item.id || 'No title');

        const p = document.createElement('p');
        p.className = 'author';
        p.textContent = item.author || '';

        const excerpt = document.createElement('div');
        excerpt.className = 'excerpt';
        // body/html/markdown からプレーンテキストの抜粋を作る
        let raw = '';
        if (item.body_markdown) raw = String(item.body_markdown);
        else if (item.body_text) raw = String(item.body_text);
        else raw = String(item.body || '');
        const tmp = document.createElement('div');
        // Markdown をそのまま入れてもテキストになるように setText
        tmp.textContent = raw;
        const txt = (tmp.textContent || tmp.innerText || '').trim();
        excerpt.textContent = txt.length > 120 ? txt.slice(0, 120) + '…' : txt;

        a.appendChild(h3);
        a.appendChild(p);
        a.appendChild(excerpt);

        container.appendChild(a);
      });
    } catch (err) {
      console.error('カードの読み込みに失敗しました:', err);
      container.innerHTML = '<p>投稿を読み込めませんでした。</p>';
    }
  }

  // ページ読み込み時にカードを描画
  loadAndRenderCards();
});
