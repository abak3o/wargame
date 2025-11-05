document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('dynamic-input');
  const button = document.getElementById('go-button');

  if (button) {
    button.addEventListener('click', () => {
      const id = input.value.trim(); // .trim() で前後の空白を除去
      if (id) {
        // 動的なFunctionのURLへ移動
        // encodeURIComponent を使って、 / や ? などの特殊文字を安全にURLに含められるようにします
        window.location.href = `/operate/${encodeURIComponent(id)}`;
      } else {
        // window.alertの代わりにカスタムアラート風にします
        input.placeholder = 'IDを入力してください';
        input.focus();
      }
    });
  }

  // Enterキーでもボタンが押されるように
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // フォームの送信を防ぐ
        button.click();
      }
    });
  }
});
