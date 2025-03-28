// 創建側邊欄元素
function createSidebar() {
  // 檢查是否已經存在側邊欄
  if (document.getElementById('llm-sidebar-container')) {
    return;
  }
  
  // 創建側邊欄容器
  const sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'llm-sidebar-container';
  
  // 創建 iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'llm-sidebar-iframe';
  iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
  
  // 創建切換按鈕
  const toggleButton = document.createElement('div');
  toggleButton.id = 'llm-sidebar-toggle';
  toggleButton.innerHTML = '<span class="material-icons">chevron_left</span>';
  
  // 添加 Material Icons 字體
  const iconLink = document.createElement('link');
  iconLink.rel = 'stylesheet';
  iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(iconLink);
  
  // 添加元素到頁面
  sidebarContainer.appendChild(iframe);
  document.body.appendChild(sidebarContainer);
  document.body.appendChild(toggleButton);
  
  // 添加切換事件
  toggleButton.addEventListener('click', toggleSidebar);
  
  // 從存儲中獲取側邊欄狀態
  chrome.storage.local.get(['sidebarExpanded'], function(result) {
    if (result.sidebarExpanded) {
      sidebarContainer.classList.add('expanded');
      toggleButton.classList.add('expanded');
    }
  });
}

// 切換側邊欄
function toggleSidebar() {
  const sidebarContainer = document.getElementById('llm-sidebar-container');
  const toggleButton = document.getElementById('llm-sidebar-toggle');
  
  if (sidebarContainer.classList.contains('expanded')) {
    sidebarContainer.classList.remove('expanded');
    toggleButton.classList.remove('expanded');
    chrome.storage.local.set({sidebarExpanded: false});
  } else {
    sidebarContainer.classList.add('expanded');
    toggleButton.classList.add('expanded');
    chrome.storage.local.set({sidebarExpanded: true});
  }
}

// 獲取頁面內容並優化
function getPageContent() {
  // 原始內容
  const originalContent = extractPageContent();
  
  // 優化內容
  const optimizedContent = optimizeContent(originalContent);
  
  // 返回兩種版本的內容，以便比較
  return {
    original: originalContent,
    optimized: optimizedContent
  };
}

// 提取頁面原始內容
function extractPageContent() {
  const title = document.title;
  
  // 獲取所有標題
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => ({
      level: parseInt(h.tagName.substring(1)),
      text: h.textContent.trim()
    }))
    .filter(h => h.text);
  
  // 獲取所有段落
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.textContent.trim())
    .filter(p => p);
  
  // 獲取所有鏈接
  const links = Array.from(document.querySelectorAll('a'))
    .map(a => ({
      text: a.textContent.trim(),
      href: a.href
    }))
    .filter(link => link.text && link.href);
  
  // 獲取所有圖像
  const images = Array.from(document.querySelectorAll('img'))
    .map(img => ({
      alt: img.alt,
      src: img.src
    }))
    .filter(img => img.src);
  
  // 獲取所有列表
  const lists = Array.from(document.querySelectorAll('ul, ol'))
    .map(list => ({
      type: list.tagName.toLowerCase(),
      items: Array.from(list.querySelectorAll('li'))
        .map(li => li.textContent.trim())
        .filter(item => item)
    }))
    .filter(list => list.items.length > 0);
  
  // 獲取所有表格
  const tables = Array.from(document.querySelectorAll('table'))
    .map(table => {
      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.textContent.trim());
      
      const rows = Array.from(table.querySelectorAll('tr'))
        .map(tr => Array.from(tr.querySelectorAll('td'))
          .map(td => td.textContent.trim())
        )
        .filter(row => row.length > 0);
      
      return { headers, rows };
    })
    .filter(table => table.rows.length > 0);
  
  // 獲取所有代碼塊
  const codeBlocks = Array.from(document.querySelectorAll('pre, code'))
    .map(code => code.textContent.trim())
    .filter(code => code);
  
  // 獲取所有引用
  const quotes = Array.from(document.querySelectorAll('blockquote, q, cite'))
    .map(quote => quote.textContent.trim())
    .filter(quote => quote);
  
  // 獲取整個頁面的文本
  const bodyText = document.body.textContent.trim();
  
  // 返回結構化的頁面內容
  return {
    title,
    headings,
    paragraphs,
    links,
    images,
    lists,
    tables,
    codeBlocks,
    quotes,
    bodyText
  };
}

// 優化內容，刪減不必要的部分
function optimizeContent(content) {
  // 創建一個深拷貝，避免修改原始內容
  const optimized = JSON.parse(JSON.stringify(content));
  
  // 1. 過濾廣告和促銷內容
  optimized.paragraphs = filterAdvertisements(optimized.paragraphs);
  optimized.lists = optimized.lists.map(list => {
    list.items = filterAdvertisements(list.items);
    return list;
  }).filter(list => list.items.length > 0);
  
  // 2. 過濾用戶界面元素
  optimized.links = filterUIElements(optimized.links);
  
  // 3. 過濾重複內容
  optimized.paragraphs = removeDuplicates(optimized.paragraphs);
  optimized.lists = optimized.lists.map(list => {
    list.items = removeDuplicates(list.items);
    return list;
  }).filter(list => list.items.length > 0);
  
  // 4. 過濾低價值文本
  optimized.paragraphs = filterLowValueText(optimized.paragraphs);
  optimized.links = filterLowValueLinks(optimized.links);
  optimized.lists = optimized.lists.map(list => {
    list.items = filterLowValueText(list.items);
    return list;
  }).filter(list => list.items.length > 0);
  
  // 5. 重新計算 bodyText
  optimized.bodyText = [
    ...optimized.headings.map(h => h.text),
    ...optimized.paragraphs,
    ...optimized.lists.flatMap(list => list.items),
    ...optimized.codeBlocks,
    ...optimized.quotes
  ].join('\n\n');
  
  return optimized;
}

// 過濾廣告和促銷內容
function filterAdvertisements(textArray) {
  const adKeywords = [
    '廣告', '贊助', '促銷', '限時', '優惠', '折扣', '特價', '立即購買', '立即訂閱',
    'ad', 'advertisement', 'sponsor', 'promotion', 'discount', 'offer', 'sale',
    'buy now', 'subscribe now', 'limited time', 'special offer'
  ];
  
  return textArray.filter(text => {
    const lowerText = text.toLowerCase();
    return !adKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  });
}

// 過濾用戶界面元素
function filterUIElements(links) {
  const uiKeywords = [
    '登入', '登錄', '註冊', '搜索', '搜尋', '分享', '語言', '設置', '設定',
    'login', 'sign in', 'register', 'search', 'share', 'language', 'settings'
  ];
  
  return links.filter(link => {
    const lowerText = link.text.toLowerCase();
    return !uiKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  });
}

// 移除重複內容
function removeDuplicates(textArray) {
  const seen = new Set();
  return textArray.filter(text => {
    // 忽略短文本的重複（可能是按鈕或標籤）
    if (text.length < 20) return true;
    
    const normalized = text.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// 過濾低價值文本
function filterLowValueText(textArray) {
  const lowValueKeywords = [
    '版權', '隱私', '條款', '使用條款', '閱讀更多', '點擊這裡', '了解更多',
    'copyright', 'privacy', 'terms', 'read more', 'click here', 'learn more'
  ];
  
  return textArray.filter(text => {
    // 保留長文本，即使包含低價值關鍵詞
    if (text.length > 100) return true;
    
    const lowerText = text.toLowerCase();
    return !lowValueKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  });
}

// 過濾低價值鏈接
function filterLowValueLinks(links) {
  const lowValueKeywords = [
    '版權', '隱私', '條款', '使用條款', '閱讀更多', '點擊這裡', '了解更多',
    'copyright', 'privacy', 'terms', 'read more', 'click here', 'learn more'
  ];
  
  return links.filter(link => {
    const lowerText = link.text.toLowerCase();
    return !lowValueKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  });
}

// 獲取截圖 - 使用 Chrome API 而不是 html2canvas
async function captureScreenshot() {
  try {
    // 向背景腳本發送消息，請求截圖
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({action: 'captureTab'}, response => {
        if (response && response.screenshot) {
          resolve(response.screenshot);
        } else {
          reject(new Error('沒有收到截圖數據'));
        }
      });
    });
  } catch (error) {
    console.error('截圖失敗:', error);
    return null;
  }
}

// 初始化
console.log('LLM 網頁助手內容腳本已加載');

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleSidebar') {
    toggleSidebar();
  } else if (message.action === 'createSidebar') {
    createSidebar();
    // 創建後立即展開側邊欄
    setTimeout(() => {
      const sidebarContainer = document.getElementById('llm-sidebar-container');
      const toggleButton = document.getElementById('llm-sidebar-toggle');
      if (sidebarContainer && toggleButton) {
        sidebarContainer.classList.add('expanded');
        toggleButton.classList.add('expanded');
        chrome.storage.local.set({sidebarExpanded: true});
      }
    }, 100);
  }
});

// 監聽來自 iframe 的消息
window.addEventListener('message', function(event) {
  // 處理來自側邊欄 iframe 的消息
  if (event.data && event.data.action === 'getPageInfo') {
    handleGetPageInfo(event.data.mode);
  } else if (event.data && event.data.action === 'toggleSidebar') {
    toggleSidebar();
  }
});

// 在頁面加載完成後自動創建側邊欄（但不展開）
document.addEventListener('DOMContentLoaded', function() {
  createSidebar();
});

// 如果頁面已經加載完成，立即創建側邊欄
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  createSidebar();
}

// 動態加載腳本
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 處理獲取頁面信息的請求
async function handleGetPageInfo(mode) {
  try {
    const url = window.location.href;
    const title = document.title;
    
    let screenshot = null;
    let pageContent = null;
    let originalContent = null;
    
    // 根據模式獲取不同的頁面信息
    if (mode === 'screenshot' || mode === 'both') {
      screenshot = await captureScreenshot();
    }
    
    if (mode === 'content' || mode === 'both') {
      const content = getPageContent();
      pageContent = JSON.stringify(content.optimized);
      originalContent = JSON.stringify(content.original);
    }
    
    // 發送回應到 iframe
    const iframe = document.getElementById('llm-sidebar-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        action: 'pageInfoResponse',
        url,
        title,
        screenshot,
        pageContent,
        originalContent
      }, '*');
    } else {
      console.error('無法找到側邊欄 iframe 或其內容窗口');
    }
  } catch (error) {
    console.error('處理頁面信息請求時出錯:', error);
    
    // 發送錯誤回應
    const iframe = document.getElementById('llm-sidebar-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        action: 'pageInfoResponse',
        error: error.message
      }, '*');
    }
  }
}

// 初始化
console.log('LLM 網頁助手內容腳本已加載'); 