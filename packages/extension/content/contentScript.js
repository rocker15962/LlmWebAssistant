// LLM 網頁助手 Content Script
// 負責在頁面中注入側邊欄並處理與擴展的通信

// 創建側邊欄容器
let sidebarContainer = null;
let sidebarIframe = null;
let isSidebarOpen = false;

// 初始化側邊欄
function initSidebar() {
  if (sidebarContainer) return; // 已經初始化過
  
  // 創建側邊欄容器
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'llm-sidebar-container';
  
  // 創建 iframe
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.id = 'llm-sidebar-iframe';
  sidebarIframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
  
  // 添加到容器
  sidebarContainer.appendChild(sidebarIframe);
  
  // 添加到頁面
  document.body.appendChild(sidebarContainer);
  
  // 設置消息監聽器
  setupMessageListeners();
  
  console.log('LLM 網頁助手側邊欄已初始化');
}

// 切換側邊欄顯示/隱藏
function toggleSidebar() {
  if (!sidebarContainer) {
    initSidebar();
  }
  
  if (isSidebarOpen) {
    sidebarContainer.classList.remove('open');
  } else {
    sidebarContainer.classList.add('open');
  }
  
  isSidebarOpen = !isSidebarOpen;
  console.log(`側邊欄狀態: ${isSidebarOpen ? '開啟' : '關閉'}`);
}

// 設置消息監聽器
function setupMessageListeners() {
  // 監聽來自 iframe 的消息
  window.addEventListener('message', function(event) {
    // 確保消息來自我們的 iframe
    if (event.source !== sidebarIframe.contentWindow) return;
    
    const message = event.data;
    
    if (message.action === 'getPageInfo') {
      handleGetPageInfo(message.mode);
    } else if (message.action === 'toggleSidebar') {
      toggleSidebar();
    }
  });
  
  // 監聽來自擴展的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('收到擴展消息:', request);
    
    if (request.action === 'toggleSidebar') {
      toggleSidebar();
      sendResponse({ success: true });
    } else if (request.action === 'checkSidebar') {
      sendResponse({ exists: !!sidebarContainer });
    }
    
    return true; // 保持消息通道開啟
  });
}

// 處理獲取頁面信息的請求
async function handleGetPageInfo(mode) {
  try {
    console.log(`開始獲取頁面信息，模式: ${mode}`);
    
    // 獲取頁面標題和 URL
    const title = document.title;
    const url = window.location.href;
    
    // 準備回應數據
    const response = {
      action: 'pageInfoResponse',
      title: title,
      url: url
    };
    
    // 根據模式獲取不同的數據
    if (mode === 'content' || mode === 'both') {
      console.log('正在提取頁面內容...');
      // 獲取頁面內容
      response.pageContent = extractPageContent();
      console.log('頁面內容提取完成，長度:', response.pageContent.length);
    }
    
    if (mode === 'screenshot' || mode === 'both') {
      console.log('正在獲取頁面截圖...');
      // 獲取頁面截圖
      response.screenshot = await captureVisibleTab();
      console.log('截圖獲取完成:', response.screenshot ? '成功' : '失敗');
    }
    
    console.log('頁面信息獲取完成，準備發送回應');
    // 發送回應
    sidebarIframe.contentWindow.postMessage(response, '*');
    
  } catch (error) {
    console.error('獲取頁面信息失敗:', error);
    
    // 發送錯誤回應
    sidebarIframe.contentWindow.postMessage({
      action: 'pageInfoResponse',
      error: error.message
    }, '*');
  }
}

// 提取頁面內容
function extractPageContent() {
  try {
    // 獲取頁面主要內容
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent.trim())
      .filter(text => text.length > 0);
    
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 0);
    
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }))
      .filter(link => link.text.length > 0);
    
    const bodyText = document.body.textContent.trim();
    
    // 構建內容對象
    const contentObj = {
      headings,
      paragraphs,
      links,
      bodyText: bodyText.substring(0, 10000) // 限制長度
    };
    
    return JSON.stringify(contentObj);
  } catch (error) {
    console.error('提取頁面內容失敗:', error);
    return JSON.stringify({ error: error.message });
  }
}

// 獲取頁面截圖
async function captureVisibleTab() {
  try {
    // 使用 chrome.tabs.captureVisibleTab 需要在 background script 中執行
    // 這裡我們通過消息請求 background script 獲取截圖
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, response => {
        if (chrome.runtime.lastError) {
          // 如果無法通過 background 獲取，嘗試使用 HTML2Canvas
          console.warn('無法通過 background 獲取截圖，嘗試使用替代方法');
          captureWithHtml2Canvas().then(resolve).catch(reject);
        } else if (response && response.screenshot) {
          resolve(response.screenshot);
        } else {
          captureWithHtml2Canvas().then(resolve).catch(reject);
        }
      });
    });
  } catch (error) {
    console.error('獲取截圖失敗:', error);
    return null;
  }
}

// 使用 HTML2Canvas 獲取截圖（替代方法）
async function captureWithHtml2Canvas() {
  // 這裡應該實現使用 HTML2Canvas 的截圖邏輯
  // 由於需要額外的庫，這裡只返回一個佔位符
  console.warn('HTML2Canvas 截圖功能尚未實現');
  return null;
}

// 在頁面加載完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}

console.log('LLM 網頁助手 Content Script 已載入'); 