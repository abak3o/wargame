document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading and rendering cards...');
  loadAndRenderCards();
})


async function loadAndRenderCards() {
  const DATA_ENDPOINT = '/data/operate.json';
  const container = document.getElementById('cards-container');
  if (!container) return;

  try {
    const res = await fetch(DATA_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();

    container.innerHTML = '';

    const entries = Array.isArray(data) ? data : Object.entries(data).map(([k, v]) => Object.assign({ id: k }, v));

    entries.forEach((item) => {
      const cardElement = createCardElement(item);
      if (cardElement) {
        container.appendChild(cardElement);
      }
    });

  } catch (err) {
    console.error('カードの読み込みに失敗しました:', err);
    container.innerHTML = '<p>投稿を読み込めませんでした。</p>';
  }
}


/**
 * 1つのデータアイテムからカードのDOM要素を生成する
 * @param {object} item - カード1枚分のデータ (例: { id: 1, title: '...' })
 * @returns {HTMLElement|null} - 生成された <a> 要素。非公開の場合は null
 */
function createCardElement(item) {
  const published = item.is_published === 1 || item.is_published === true || item.isPublished === true;
  if (!published) {
    return null;
  }

  const idForUrl = item.id || item.slug || item.external_id;
  const title = item.title || item.slug || item.id || 'No title';
  const author = item.author || '';

  let raw = '';
  if (item.body_markdown) raw = String(item.body_markdown);
  else if (item.body_text) raw = String(item.body_text);
  else raw = String(item.body || '');

  const tmp = document.createElement('div');
  tmp.textContent = raw;
  const txt = (tmp.textContent || tmp.innerText || '').trim();
  const excerptText = txt.length > 120 ? txt.slice(0, 120) + '…' : txt;

  const a = document.createElement('a');
  a.href = `/operate/${encodeURIComponent(String(idForUrl || ''))}`;
  a.className = 'card';

  const h3 = document.createElement('h3');
  h3.textContent = title;

  const p = document.createElement('p');
  p.className = 'author';
  p.textContent = author;

  const excerpt = document.createElement('div');
  excerpt.className = 'excerpt';
  excerpt.textContent = excerptText;

  a.appendChild(h3);
  a.appendChild(p);
  a.appendChild(excerpt);

  return a;
}