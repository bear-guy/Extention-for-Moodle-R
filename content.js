// 拡張機能が有効な場合のみ処理を実行する
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

chrome.storage.local.get({ isEnabled: true, isDarkMode: prefersDark, isSkipHomeEnabled: false, isStaffMode: false, isSyllabusEnabled: true }, (data) => {
  // ホームスキップが有効な場合の処理
  if (data.isSkipHomeEnabled && window.location.hostname.includes('lms.ritsumei.ac.jp')) {
    if (window.location.pathname === '/' || window.location.pathname === '/index.php') {
      window.location.replace('https://lms.ritsumei.ac.jp/my/');
      return; // リダイレクト処理に入るため以降の処理は実行しない
    }
    document.body.classList.add('moodle-ext-skip-home');
  }

  if (data.isEnabled) {
    document.body.classList.add('moodle-ext-enabled');
    initExtension(data.isStaffMode, data.isSyllabusEnabled);
  }
  if (data.isDarkMode) {
    document.body.classList.add('dark-mode');
  }
});

const initExtension = (isStaffMode, isSyllabusEnabled) => {
  // 拡張機能内の画像をCSSで参照するためのスタイルを動的に注入
  if (!document.getElementById('moodle-ext-dynamic-style')) {
    const style = document.createElement('style');
    style.id = 'moodle-ext-dynamic-style';
    style.textContent = `
      body.dark-mode img[src*="/monologo"] {
        filter: invert(1) brightness(1.5) !important;
      }
      
      /* ダークモード時のシラバスボタンのスタイル */
      body.dark-mode .custom-syllabus-link {
        background-color: #2c2c2c !important;
        color: #e0e0e0 !important;
        border-color: #555 !important;
      }
      body.dark-mode .custom-syllabus-link:hover {
        background-color: #3a3a3a !important;
        color: #ffffff !important;
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

  // リンク定義
  const studentLinks = [
    { name: 'Student Portal', url: 'https://sp.ritsumei.ac.jp/studentportal' },
    { name: 'Campus Web', url: 'https://cw.ritsumei.ac.jp/campusweb/login.html' }
  ];

  const staffLinks = [
    { name: '教職員ポータル', url: 'https://ritsumei365.sharepoint.com/sites/portal/' },
    { name: '教務支援', url: 'https://www.ritsumei.ac.jp/staff-all/academic-affairs/' },
    { name: '教員ポータル', url: 'https://www.ritsumei.ac.jp/faculty-portal/' },
    { name: 'Respon', url: 'https://ritsumei.respon.jp/t/' },
    { name: '休補講・教室変更', url: 'https://www.ritsumei.ac.jp/pathways-future/course/cancel.html/' },
    { name: '打刻', url: 'https://ritsumei-cws.company.works-hi.com/self-workflow/cws/srwtimerec' },
    { name: 'manaba+R', url: 'https://ct.ritsumei.ac.jp/ct/' }
  ];

  const currentLinks = isStaffMode ? staffLinks : studentLinks;

  // カスタムリンクの追加
  const addCustomLinks = () => {
    // ヘッダーのナビゲーションメニューに追加（「Intelliboard」の後ろ）
    const navbar = document.querySelector('ul.navbar-nav.more-nav');
    if (navbar && !document.querySelector('.custom-nav-link')) {
      const navItems = Array.from(navbar.querySelectorAll('li.nav-item'));
      const targetItem = navItems.find(li => li.textContent.includes('Intelliboard')) || navItems[navItems.length - 1];

      if (targetItem) {
        currentLinks.slice().reverse().forEach(link => {
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
        currentLinks.slice().reverse().forEach(link => {
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

  // 既存のリンク集などから重複するリンクを非表示にする
  const hideDuplicateLinks = () => {
    let duplicateKeywords = [];
    let duplicateUrls = [];

    if (isStaffMode) {
      // 教職員モードで非表示にする重複リンク
      duplicateKeywords = ['休補講・教室変更', '教職員ポータル', '教務支援', '教員ポータル', 'Respon', '打刻', 'manaba+R'];
      duplicateUrls = ['course/cancel.html', 'kyu-hoko', 'sharepoint.com/sites/portal', 'academic-affairs', 'faculty-portal', 'ritsumei.respon.jp', 'ritsumei-cws', 'ct.ritsumei.ac.jp/ct/'];
    } else {
      // 学生モードで非表示にする重複リンク
      duplicateKeywords = ['Student Portal', 'STUDENT PORTAL', 'Campus Web'];
      duplicateUrls = ['sp.ritsumei.ac.jp/studentportal', 'www.ritsumei.ac.jp/rsp', 'cw.ritsumei.ac.jp/campusweb'];
    }

    document.querySelectorAll('a').forEach(a => {
      // 拡張機能自身が追加したリンクは除外
      if (a.closest('.custom-nav-link') || a.classList.contains('custom-drawer-link')) return;

      const href = a.href || '';
      const text = a.textContent.trim();
      
      const isMatch = duplicateUrls.some(url => href.includes(url)) || 
                      duplicateKeywords.some(kw => text.includes(kw));

      if (isMatch) {
        const li = a.closest('li');
        // ドロップダウンメニューの親要素（リンク集など）を誤って消さないようにする
        if (li && !li.classList.contains('dropdown') && !li.classList.contains('nav-item')) {
          li.style.display = 'none';
        } else {
          a.style.display = 'none';
          // brタグ等で区切られている場合の改行を消す
          let next = a.nextSibling;
          while (next && next.nodeType === Node.TEXT_NODE && next.textContent.trim() === '') {
            next = next.nextSibling;
          }
          if (next && next.nodeName === 'BR') {
            next.style.display = 'none';
          }
        }
      }
    });
  };

  // シラバスサイトの自動入力処理
  const autoFillSyllabusSearch = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('coursecode');
    if (!courseCode) return;

    // 「授業コード・科目名・教員名・関連する単語」などのプレースホルダーを持つ検索ボックスを探す
    const searchInput = document.querySelector('input[placeholder*="授業コード"], input[placeholder*="科目名"]');
    if (searchInput && !searchInput.dataset.autoFilled) {
      searchInput.dataset.autoFilled = "true";
      
      // フォーカスを当ててからexecCommandを使うことで、SPA(LWC等)に実際のユーザー入力として認識させる
      searchInput.focus();
      
      if (!document.execCommand('insertText', false, courseCode)) {
        // execCommandが失敗した場合のフォールバック
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(searchInput, courseCode);
        searchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
      
      // 入力状態を確定させるためにフォーカスを外すイベントを発火
      searchInput.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
      
        // --- 検索結果の監視と自動遷移 ---
        let hasClickedResult = false;
        const checkResultsAndClick = (obs) => {
          if (hasClickedResult) return false;
          const contentArea = document.querySelector('.siteforceContentArea') || document.body;
          
          // 検索結果の行やカードと思われる要素を幅広く探す
          const resultRows = contentArea.querySelectorAll(
            'table.slds-table tbody tr, ' +
            'table tbody tr, ' +
            '.forceCommunitySearchRecordList .slds-item, ' +
            'force-search-results-item, ' +
            'article.slds-card, ' +
            '.search-result-item'
          );

          // 有効なリンクを含むデータ行だけを抽出
          const dataRows = Array.from(resultRows).filter(row => {
            const a = row.querySelector('a[href]');
            return a && !a.href.includes('javascript:');
          });

          if (dataRows.length > 0) {
            if (dataRows.length === 1) { // 1件だけヒットした場合
              const link = dataRows[0].querySelector('a[href]');
              if (link && link.offsetParent !== null) { // 画面に表示されているならクリック
                hasClickedResult = true;
                link.target = '_self'; // 新しいタブで開く設定を強制的に上書きして同じタブで開く
                link.click();
                if (obs) obs.disconnect(); // 監視終了
                return true;
              }
            }
          } 
          // 行が特定できなくても、授業コードが含まれる領域にあるリンクを探すフォールバック
          else {
            const allLinks = Array.from(contentArea.querySelectorAll('a[href]')).filter(a => {
              return a.offsetParent !== null && !a.href.includes('javascript:') && !a.href.includes('#');
            });

            // 親要素のテキストに「授業コード」が含まれるリンクを抽出
            const searchResultLinks = allLinks.filter(a => {
              const textContext = (a.closest('tr, article, li') || a.parentElement || a).textContent;
              return textContext.includes(courseCode);
            });

            if (searchResultLinks.length > 0) {
              const uniqueUrls = new Set(searchResultLinks.map(a => a.href.split('?')[0]));
              if (uniqueUrls.size === 1) { // 遷移先が1種類だけならクリック
                hasClickedResult = true;
                const link = searchResultLinks[0];
                link.target = '_self'; // 新しいタブで開く設定を強制的に上書き
                link.click();
                if (obs) obs.disconnect(); // 監視終了
                return true;
              }
            }
          }
          return false;
        };

        // DOMの変更を監視して結果が出たかチェックする
        const observer = new MutationObserver((mutations, obs) => {
          checkResultsAndClick(obs);
        });

        // 検索ボタン押下後、画面のDOM変化の監視を開始
        observer.observe(document.body, { childList: true, subtree: true });

        // もしすでに結果が出ている場合に備えて一度チェック
        checkResultsAndClick(observer);

        // 10秒経っても結果が出なければ監視を終了（無限ループ防止）
        setTimeout(() => observer.disconnect(), 10000);

        // --- 検索実行処理（ラグ対策で複数回即時トリガー） ---
        const triggerSearch = () => {
          if (hasClickedResult) return; // すでに結果が出ていれば中止
          const enterEventInit = { bubbles: true, cancelable: true, composed: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13, charCode: 13 };
          searchInput.dispatchEvent(new KeyboardEvent('keydown', enterEventInit));
          searchInput.dispatchEvent(new KeyboardEvent('keypress', enterEventInit));
          searchInput.dispatchEvent(new KeyboardEvent('keyup', enterEventInit));
          
          let searchBtn = document.querySelector('button[title="検索"], button[aria-label="検索"], button[type="submit"]');
          if (!searchBtn && searchInput.parentElement) searchBtn = searchInput.parentElement.querySelector('button');
          if (!searchBtn && searchInput.closest('form')) searchBtn = searchInput.closest('form').querySelector('button');
          if (!searchBtn) searchBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim().includes('検索'));

          if (searchBtn) {
            searchBtn.click();
          } else if (searchInput.closest('form')) {
            searchInput.closest('form').submit();
          }
        };

        triggerSearch(); // 待機せず即実行
        setTimeout(triggerSearch, 50);  // 念のため50ms後
        setTimeout(triggerSearch, 150); // 念のため150ms後
        setTimeout(triggerSearch, 300); // 念のため300ms後
    }
  };

  // シラバス詳細ページから情報を取得して保存する処理
  const extractAndSaveSyllabusData = () => {
    if (!isSyllabusEnabled) return; // 設定がオフなら実行しない

    // 既に取得済みならスキップ（負荷軽減・無限ループ防止）
    if (document.body.dataset.syllabusExtracted === "true") return;
    // 既に待機タイマーが動いていればスキップ
    if (window.syllabusExtractInterval) return;

    // SPAの非同期レンダリングを待つために1秒ごとにチェック
    window.syllabusExtractInterval = setInterval(() => {
      if (document.body.dataset.syllabusExtracted === "true") {
        clearInterval(window.syllabusExtractInterval);
        window.syllabusExtractInterval = null;
        return;
      }

      // 「授業科目名」のテーブルセルがあるか確認
      const courseNameEl = document.querySelector('td[data-label="授業科目名"]');
      if (!courseNameEl) return; // まだロードされていない

      // 詳細ページ特有の項目（授業施設など）があるか確認し、検索結果一覧ページでの誤作動を防ぐ
      const labels = Array.from(document.querySelectorAll('span.slds-form-element__label'));
      const isDetailPage = labels.some(el => el.textContent.includes('授業施設') || el.textContent.includes('キャンパス'));
      if (!isDetailPage) return;

      // 授業コードを取得 (例: "54571:社会と福祉(GV)" から "54571" を抽出)
      const courseCodeMatch = courseNameEl.textContent.match(/\d{5,}/);
      if (!courseCodeMatch) return;
      const courseCode = courseCodeMatch[0];

      // 属性「data-label」を目印にして各項目をピンポイントで取得
      const scheduleEl = document.querySelector('td[data-label="開講曜日・時限"]');
      const teacherEl = document.querySelector('td[data-label="全担当教員"]');
      const creditsEl = document.querySelector('td[data-label="単位数"]');

      // 「授業施設」は少し別の構造に入っているので、ラベルの隣から取得
      let room = "不明";
      const roomLabel = labels.find(el => el.textContent.includes('授業施設'));
      if (roomLabel && roomLabel.nextElementSibling) {
        room = roomLabel.nextElementSibling.textContent.trim();
      }

      const syllabusData = {
        schedule: scheduleEl ? scheduleEl.textContent.trim() : "不明",
        teacher: teacherEl ? teacherEl.textContent.trim() : "不明",
        credits: creditsEl ? creditsEl.textContent.trim() : "不明",
        room: room || "不明"
      };

      const storageKey = `syllabus_${courseCode}`;
      
      // すでに保存されているか確認する
      chrome.storage.local.get([storageKey], (result) => {
        if (result[storageKey]) {
          // すでにデータがある場合は保存とアラートをスキップ
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          window.syllabusExtractInterval = null;
          return;
        }

        // 初めて取得した時だけ保存してアラートを出す
        chrome.storage.local.set({ [storageKey]: syllabusData }, () => {
          console.log(`[Extension-for-Moodle-R] シラバス情報を保存しました: ${courseCode}`, syllabusData);
          document.body.dataset.syllabusExtracted = "true";
          clearInterval(window.syllabusExtractInterval);
          window.syllabusExtractInterval = null;
          
          alert(`【Extension for Moodle+R】\nシラバス情報（${courseCode}）を取得・保存しました。\nMoodleの授業ページに戻って更新してください。`);
        });
      });
    }, 1000);
  };

  // シラバスリンクの追加とシラバス情報の表示
  const addSyllabusLinkAndInfo = () => {
    // コースページかどうかの判定 (course/view.php)
    if (!window.location.pathname.includes('/course/view.php')) return;

    // ヘッダーの幅制限を解除し、下のメインコンテンツと横位置を揃える
    const pageHeader = document.querySelector('#page-header');
    if (pageHeader) {
      pageHeader.classList.remove('header-maxwidth');
      pageHeader.style.maxWidth = '100%';

      const alignContainer = pageHeader.querySelector('.w-100 > .d-flex.align-items-center') || pageHeader;
      if (alignContainer) {
        alignContainer.style.boxSizing = 'border-box';

        // 画面の再描画やサイズ変更に常に追従して幅をピッタリ合わせる
        const syncWidth = () => {
          const targetContent = document.querySelector('.course-content') || document.querySelector('#region-main');
          if (targetContent && pageHeader) {
            const targetRect = targetContent.getBoundingClientRect();
            const headerRect = pageHeader.getBoundingClientRect();
            const paddingLeft = targetRect.left - headerRect.left;
            const paddingRight = headerRect.right - targetRect.right;
            if (paddingLeft >= 0) alignContainer.style.paddingLeft = `${paddingLeft}px`;
            if (paddingRight >= 0) alignContainer.style.paddingRight = `${paddingRight}px`;
          }
        };
        syncWidth(); // 呼ばれるたびに位置を合わせる
        if (!alignContainer.dataset.resizeSynced) {
          alignContainer.dataset.resizeSynced = 'true';
          window.addEventListener('resize', syncWidth);
        }
      }
    }

    // 長すぎるタイトルが右側の要素を押しつぶさないように、親要素の幅の縮小を許可する
    const titleContainer = document.querySelector('.page-context-header');
    if (titleContainer && titleContainer.parentElement) {
      titleContainer.parentElement.style.minWidth = '0'; // 縮小を許可してタイトルの自然な改行を促す
    }

    // 授業コードをタイトルから取得 (例: "54571" などの先頭5桁の数字)
    let courseCode = '';
    // Moodleのページによってクラス名が異なるため、複数を指定
    const titleEl = document.querySelector('.page-header-headings h1, .page-context-header h1, h1');
    if (titleEl) {
      const match = titleEl.textContent.trim().match(/\d{5,}/); // 先頭に限らず5桁以上の数字を探す
      if (match) {
        courseCode = match[0];
      }
    }

    // シラバスリンクの追加
    const headerContainer = document.querySelector('.header-actions-container');
    if (headerContainer && !document.querySelector('.custom-syllabus-link')) {
      const syllabusBtn = document.createElement('a');
      syllabusBtn.href = courseCode ? `https://syllabus.ritsumei.ac.jp/syllabus/s/?coursecode=${courseCode}` : 'https://syllabus.ritsumei.ac.jp/syllabus/s/';
      syllabusBtn.target = '_blank'; // Moodleからシラバスを開くときは新しいタブにする
      syllabusBtn.className = 'btn btn-secondary custom-syllabus-link';
      syllabusBtn.textContent = 'シラバス';
      syllabusBtn.style.flexShrink = '0'; // ボタンが縮まないようにする
      syllabusBtn.style.whiteSpace = 'nowrap'; // ボタン内の文字を改行させない
      headerContainer.prepend(syllabusBtn);
    }

    if (!isSyllabusEnabled) return; // 設定がオフならシラバス情報の取得・表示は行わない

    // シラバス情報（曜日・教室など）の表示
    if (courseCode && headerContainer && !document.querySelector('.syllabus-info-container')) {
      // 重複実行を防ぐためのプレースホルダーを挿入
      const placeholder = document.createElement('div');
      placeholder.className = 'syllabus-info-container d-none';
      headerContainer.parentNode.insertBefore(placeholder, headerContainer);

      const storageKey = `syllabus_${courseCode}`;
      chrome.storage.local.get([storageKey], (result) => {
        const data = result[storageKey];
        if (data) {
          const infoContainer = document.querySelector('.syllabus-info-container');
          if (infoContainer) {
            // ヘッダーの右寄り(ms-auto)に並べるためマージンを調整し、シラバスボタンの左側に配置します
            infoContainer.className = 'syllabus-info-container ms-auto me-3 p-2 border rounded d-flex align-items-center';
            if (document.body.classList.contains('dark-mode')) {
              infoContainer.style.backgroundColor = '#2c2c2c';
              infoContainer.style.color = '#e0e0e0';
              infoContainer.style.borderColor = '#444';
            } else {
              infoContainer.style.backgroundColor = '#ffffff';
              infoContainer.style.color = '#212529';
              infoContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
            infoContainer.style.fontSize = '0.9rem';
            infoContainer.style.fontWeight = 'bold'; // 文字を太くして視認性アップ
            infoContainer.style.gap = '15px';
            infoContainer.style.flexShrink = '0'; // 幅が狭くなってもコンテナを縮ませない
            infoContainer.style.whiteSpace = 'nowrap'; // 取得した情報の文字を改行させない
            infoContainer.innerHTML = `
              <div><strong>開講曜日・時限:</strong> ${data.schedule}</div>
              <div><strong>担当教員:</strong> ${data.teacher}</div>
              <div><strong>単位:</strong> ${data.credits}</div>
              <div><strong>教室:</strong> ${data.room}</div>
            `;
          }
        }
      });
    }
  };

  // 監視設定（Moodleは後から要素が増えるので多めに監視）
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    // URLが変わった（シラバス内で別ページに遷移した等）場合は取得フラグをリセットする
    if (lastUrl !== location.href) {
      lastUrl = location.href;
      document.body.dataset.syllabusExtracted = "false";
      clearInterval(window.syllabusExtractInterval);
      window.syllabusExtractInterval = null;
    }

    if (window.location.hostname.includes('lms.ritsumei.ac.jp')) {
      fixMoodleLayout();
      addCustomLinks();
      hideDuplicateLinks();
      addSyllabusLinkAndInfo();
    } else if (window.location.hostname.includes('syllabus.ritsumei.ac.jp')) {
      autoFillSyllabusSearch();
      extractAndSaveSyllabusData();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  if (window.location.hostname.includes('lms.ritsumei.ac.jp')) {
    fixMoodleLayout();
    addCustomLinks();
    hideDuplicateLinks();
    addSyllabusLinkAndInfo();
  } else if (window.location.hostname.includes('syllabus.ritsumei.ac.jp')) {
    autoFillSyllabusSearch();
    extractAndSaveSyllabusData();
  }
};