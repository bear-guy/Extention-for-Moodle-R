// 拡張機能が有効な場合のみ処理を実行する
chrome.storage.local.get({ isEnabled: true, isDarkMode: false, isSkipHomeEnabled: false }, (data) => {
  // ホームスキップが有効な場合の処理
  if (data.isSkipHomeEnabled) {
    if (window.location.pathname === '/' || window.location.pathname === '/index.php') {
      window.location.replace('https://lms.ritsumei.ac.jp/my/');
      return; // リダイレクト処理に入るため以降の処理は実行しない
    }
    document.body.classList.add('moodle-ext-skip-home');
  }

  if (data.isEnabled) {
    document.body.classList.add('moodle-ext-enabled');
    initExtension();
  }
  if (data.isDarkMode) {
    document.body.classList.add('dark-mode');
  }
});

const initExtension = () => {
  // 拡張機能内の画像をCSSで参照するためのスタイルを動的に注入
  if (!document.getElementById('moodle-ext-dynamic-style')) {
    const style = document.createElement('style');
    style.id = 'moodle-ext-dynamic-style';
    style.textContent = `
      body.dark-mode img[src*="/monologo"] {
        filter: invert(1) brightness(1.5) !important;
      }
    `;
    document.head.appendChild(style);
  }

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
        
        // 授業名が6文字以下の場合は削らずにそのまま表示し、見えなくなるのを防ぐ
        if (text.length > 6) {
          const newText = text.substring(6, 22);
          link.innerText = text.length > 22 ? newText + '…' : newText;
        }
        
        link.dataset.processed = "true";
      });
    }
  };

  // カスタムリンク（Student Portal / Campus Web）の追加
  const addCustomLinks = () => {
    const links = [
      { name: 'Student Portal', url: 'https://sp.ritsumei.ac.jp/studentportal' },
      { name: 'Campus Web', url: 'https://cw.ritsumei.ac.jp/campusweb/login.html' }
    ];

    // ヘッダーのナビゲーションメニューに追加（「Intelliboard」の後ろ）
    const navbar = document.querySelector('ul.navbar-nav.more-nav');
    if (navbar && !document.querySelector('.custom-nav-link')) {
      const navItems = Array.from(navbar.querySelectorAll('li.nav-item'));
      const targetItem = navItems.find(li => li.textContent.includes('Intelliboard')) || navItems[navItems.length - 1];

      if (targetItem) {
        links.slice().reverse().forEach(link => {
          const li = document.createElement('li');
          li.className = 'nav-item custom-nav-link';
          li.setAttribute('role', 'none');
          li.innerHTML = `<a role="menuitem" class="nav-link" href="${link.url}" target="_blank" tabindex="-1">${link.name}</a>`;
          targetItem.after(li);
        });
      }
    }

    // 左サイドバー(ドロワー)のメニューに追加（「Intelliboard」の後ろ）
    const drawerList = document.querySelector('.drawercontent .list-group');
    if (drawerList && !document.querySelector('.custom-drawer-link')) {
      const listItems = Array.from(drawerList.children);
      let targetLink = listItems.find(el => el.textContent.includes('Intelliboard') && el.tagName === 'A');
      
      if (targetLink && targetLink.nextElementSibling && targetLink.nextElementSibling.tagName === 'DIV') {
        targetLink = targetLink.nextElementSibling;
      } else if (!targetLink && listItems.length > 0) {
        targetLink = listItems[listItems.length - 1]; // Intelliboardが見つからない場合は最後に追加
      }

      if (targetLink) {
        links.slice().reverse().forEach(link => {
          const a = document.createElement('a');
          a.className = 'list-group-item list-group-item-action custom-drawer-link';
          a.href = link.url;
          a.target = '_blank';
          a.textContent = link.name;
          targetLink.after(a);
        });
      }
    }
  };

  // 監視設定（Moodleは後から要素が増えるので多めに監視）
  const observer = new MutationObserver(() => {
    fixMoodleLayout();
    addCustomLinks();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  fixMoodleLayout();
  addCustomLinks();
};