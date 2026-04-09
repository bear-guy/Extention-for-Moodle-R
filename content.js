// 拡張機能が有効な場合のみ処理を実行する
chrome.storage.local.get({ isEnabled: true }, (data) => {
  if (data.isEnabled) {
    document.body.classList.add('moodle-ext-enabled');
    initExtension();
  }
});

const initExtension = () => {
  const fixMoodleLayout = () => {
    // 1. ページ全体を広くするためにbodyのクラスをいじる
    document.body.classList.remove('limitedwidth');

    const timetable = document.querySelector('.block_rutime_table');
    const timeline = document.querySelector('.block_timeline');
    const mainRegion = document.querySelector('#block-region-content');

    // 2. 横並びコンテナの作成と移動
    if (timetable && timeline && mainRegion && !document.querySelector('.custom-layout-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-layout-wrapper';
      
      mainRegion.insertBefore(wrapper, mainRegion.firstChild);
      wrapper.appendChild(timeline);
      wrapper.appendChild(timetable);
    }

    // 3. 時間割の文字加工（6文字消して16文字表示）
    const table = document.querySelector('.timetable-table table');
    if (table) {
      // 土曜日以降を隠す
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells.length > 6) {
          for (let i = 6; i < row.cells.length; i++) {
            row.cells[i].style.display = 'none';
          }
        }
      });

      // 授業名カット
      const courseLinks = table.querySelectorAll('td a'); 
      courseLinks.forEach(link => {
        const text = link.innerText.trim();
        if (link.dataset.processed === "true") return;

        link.title = text;
        const newText = text.substring(6, 6 + 16);
        link.innerText = text.length > 22 ? newText + '…' : newText;
        link.dataset.processed = "true";
      });
    }
  };

  // 監視設定（Moodleは後から要素が増えるので多めに監視）
  const observer = new MutationObserver(fixMoodleLayout);
  observer.observe(document.body, { childList: true, subtree: true });
  fixMoodleLayout();
};