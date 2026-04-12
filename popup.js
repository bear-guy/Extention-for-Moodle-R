document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');
  const darkToggle = document.getElementById('darkModeToggle');
  const skipHomeToggle = document.getElementById('skipHomeToggle');
  const staffModeToggle = document.getElementById('staffModeToggle');
  const staffModeWrapper = document.getElementById('staffModeWrapper');

  // 保存されている状態を取得
  chrome.storage.local.get({ isEnabled: true, isDarkMode: false, isSkipHomeEnabled: false, isStaffMode: false }, (data) => {
    toggle.checked = data.isEnabled;
    darkToggle.checked = data.isDarkMode;
    skipHomeToggle.checked = data.isSkipHomeEnabled;
    staffModeToggle.checked = data.isStaffMode;

    // 初期状態の教職員モードの表示を更新
    updateStaffModeUI(data.isEnabled);
  });

  // 教職員モードのUI状態を更新する関数
  const updateStaffModeUI = (isEnabled) => {
    staffModeToggle.disabled = !isEnabled;
    staffModeWrapper.style.opacity = isEnabled ? '1' : '0.4';
  };

  // Moodle のタブをリロードして変更を反映する共通関数
  const reloadTabs = () => {
    chrome.tabs.query({ url: "*://lms.ritsumei.ac.jp/*" }, (tabs) => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  };

  // トグル切り替え時の処理 (レイアウト変更)
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    updateStaffModeUI(isEnabled);

    const updates = { isEnabled: isEnabled };
    // ベターレイアウトがオフになったら、教職員モードも連動してオフにする
    if (!isEnabled && staffModeToggle.checked) {
      staffModeToggle.checked = false;
      updates.isStaffMode = false;
    }
    
    chrome.storage.local.set(updates, reloadTabs);
  });

  // トグル切り替え時の処理 (ダークモード)
  darkToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isDarkMode: darkToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (ホームスキップ)
  skipHomeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isSkipHomeEnabled: skipHomeToggle.checked }, reloadTabs);
  });

  // トグル切り替え時の処理 (教職員モード)
  staffModeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ isStaffMode: staffModeToggle.checked }, reloadTabs);
  });
});