document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');

  // 保存されている状態を取得 (デフォルトは true で有効)
  chrome.storage.local.get({ isEnabled: true }, (data) => {
    toggle.checked = data.isEnabled;
  });

  // トグル切り替え時の処理
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    chrome.storage.local.set({ isEnabled: isEnabled }, () => {
      // Moodle のタブをリロードして変更を反映
      chrome.tabs.query({ url: "*://lms.ritsumei.ac.jp/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.reload(tab.id));
      });
    });
  });
});