// 導入 API 模組
import { askLLM } from '../utils/api.js';
// 導入 Markdown 解析器
import { parseMarkdown } from '../utils/markdown.js';
// 導入調試工具
import { checkDataIntegrity } from '../utils/debug.js';
// 導入截圖工具
import { analyzeScreenshot } from '../utils/screenshot.js';

document.addEventListener('DOMContentLoaded', function() {
  const questionInput = document.getElementById('question');
  const simpleBtn = document.getElementById('simpleBtn');
  const detailBtn = document.getElementById('detailBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const responseContainer = document.getElementById('responseContainer');
  const responseContent = document.getElementById('responseContent');
  const tokenInfo = document.getElementById('tokenInfo');
  const toggleButton = document.getElementById('toggleButton');
  const webSearchButton = document.getElementById('webSearchButton');
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debugInfo';
  debugInfo.className = 'debug-info';
  loadingContainer.appendChild(debugInfo);

  if (!tokenInfo) {
    console.error('找不到 tokenInfo 元素!');
  } else {
    console.log('tokenInfo 元素已找到');
  }

  // 初始隱藏回應容器
  responseContainer.style.display = 'none';
  
  // 連網按鈕狀態
  let useWebSearch = false;
  
  // 連網按鈕點擊事件
  webSearchButton.addEventListener('click', function() {
    useWebSearch = !useWebSearch;
    if (useWebSearch) {
      webSearchButton.classList.add('active');
      webSearchButton.title = '已啟用網路搜尋';
    } else {
      webSearchButton.classList.remove('active');
      webSearchButton.title = '已禁用網路搜尋';
    }
  });

  // 切換側邊欄
  toggleButton.addEventListener('click', function() {
    window.parent.postMessage({ action: 'toggleSidebar' }, '*');
  });

  // 簡單回答按鈕點擊事件
  simpleBtn.addEventListener('click', function() {
    handleSubmit(true);
  });

  // 詳細回答按鈕點擊事件
  detailBtn.addEventListener('click', function() {
    handleSubmit(false);
  });

  // 監聽來自 content script 的消息
  window.addEventListener('message', function(event) {
    // 確保消息來自父窗口
    if (event.source !== window.parent) return;
    
    if (event.data.action === 'pageInfoResponse') {
      handlePageInfoResponse(event.data);
    }
  });

  // 處理頁面信息響應
  let currentPageInfo = null;
  
  function handlePageInfoResponse(data) {
    if (data.error) {
      console.error('獲取頁面信息失敗:', data.error);
      debugInfo.innerHTML = `<p class="debug-error">獲取頁面信息失敗: ${data.error}</p>`;
      return;
    }
    
    currentPageInfo = data;
    debugInfo.innerHTML = '頁面數據已獲取，正在處理請求...';
    
    // 檢查數據完整性
    const integrityCheck = checkDataIntegrity(data);
    if (!integrityCheck.valid) {
      debugInfo.innerHTML += `<div class="debug-issues">
        <p class="debug-issues-title">數據完整性問題:</p>
        <ul>
          ${integrityCheck.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>`;
    }
    
    // 如果有截圖，分析截圖
    if (data.screenshot) {
      analyzeScreenshot(data.screenshot).then(analysis => {
        if (analysis.error) {
          console.warn('截圖分析警告:', analysis.error);
        } else {
          console.log('截圖分析:', analysis);
        }
      });
    }
    
    // 發送請求到後端
    sendRequest();
  }
  
  // 處理提交問題
  async function handleSubmit(isSimple) {
    const question = questionInput.value.trim();
    
    if (!question) {
      // 顯示錯誤提示
      questionInput.classList.add('error');
      setTimeout(() => {
        questionInput.classList.remove('error');
      }, 2000);
      return;
    }
    
    // 顯示載入中
    loadingContainer.style.display = 'flex';
    responseContainer.style.display = 'none';
    tokenInfo.textContent = '';
    debugInfo.innerHTML = '正在獲取頁面數據...';
    simpleBtn.disabled = true;
    detailBtn.disabled = true;
    
    try {
      // 發送消息到 content script 獲取當前頁面信息
      window.parent.postMessage({ 
        action: 'getPageInfo',
        mode: 'both'  // 總是同時獲取截圖和網頁內容
      }, '*');
      
      // 保存當前問題和模式
      currentQuestion = question;
      currentIsSimple = isSimple;
    } catch (error) {
      console.error('處理提交時出錯:', error);
      debugInfo.innerHTML = `<p class="debug-error">處理提交時出錯: ${error.message}</p>`;
      
      // 恢復按鈕狀態
      simpleBtn.disabled = false;
      detailBtn.disabled = false;
    }
  }
  
  // 當前問題和模式
  let currentQuestion = '';
  let currentIsSimple = true;
  
  // 發送請求到後端
  async function sendRequest() {
    if (!currentPageInfo) {
      debugInfo.innerHTML = '<p class="debug-error">頁面信息未獲取，無法發送請求</p>';
      return;
    }
    
    try {
      debugInfo.innerHTML = '正在向 LLM 發送請求...';
      
      // 添加調試日誌
      console.log('發送請求到 LLM，參數：', {
        question: currentQuestion,
        url: currentPageInfo.url,
        title: currentPageInfo.title,
        screenshot: currentPageInfo.screenshot ? '截圖已獲取 (長度: ' + currentPageInfo.screenshot.length + ')' : '無截圖',
        pageContent: currentPageInfo.pageContent ? '頁面內容已獲取 (長度: ' + currentPageInfo.pageContent.length + ')' : '無頁面內容',
        useWebSearch: useWebSearch,
        isSimple: currentIsSimple
      });
      
      // 發送請求到後端
      const response = await askLLM({
        question: currentQuestion,
        url: currentPageInfo.url,
        title: currentPageInfo.title,
        screenshot: currentPageInfo.screenshot,
        pageContent: currentPageInfo.pageContent,
        useWebSearch: useWebSearch,
        isSimple: currentIsSimple
      });
      
      // 添加響應日誌
      console.log('收到 LLM 響應：', response);
      
      // 處理響應
      if (response.answer) {
        // 解析 Markdown
        const parsedContent = parseMarkdown(response.answer);
        responseContent.innerHTML = parsedContent;
        
        // 顯示 token 使用量
        if (response.usage && response.usage.totalTokens) {
          tokenInfo.textContent = `Token 使用量: ${response.usage.promptTokens} (提示) + ${response.usage.completionTokens} (回答) = ${response.usage.totalTokens} (總計)`;
          tokenInfo.style.display = 'block';
        } else {
          console.log('沒有 token 信息可顯示');
          tokenInfo.style.display = 'none';
        }
        
        responseContainer.style.display = 'block';
        
        // 隱藏載入中
        loadingContainer.style.display = 'none';
        simpleBtn.disabled = false;
        detailBtn.disabled = false;
      }
    } catch (error) {
      console.error('處理請求時出錯:', error);
      
      // 顯示錯誤信息
      let errorMessage = '處理您的請求時發生錯誤，請稍後再試。';
      
      // 如果有詳細錯誤信息，則顯示
      if (error.message) {
        errorMessage += `<br><br><details>
          <summary>錯誤詳情</summary>
          <pre class="error-details">${error.message}</pre>
        </details>`;
      }
      
      responseContent.innerHTML = `<p class="error-message">${errorMessage}</p>`;
      responseContainer.style.display = 'block';
      
      // 更新調試面板
      updateDebugInfo(`<span class="debug-error">錯誤: ${error.message || error}</span>`);
      
      // 隱藏載入中
      loadingContainer.style.display = 'none';
      simpleBtn.disabled = false;
      detailBtn.disabled = false;
    }
  }

  // 估算文本中的 token 數量（粗略估計）
  function estimateTokens(text) {
    // 一個簡單的估算方法：平均每 4 個字符約為 1 個 token
    return Math.ceil(text.length / 4);
  }

  // 添加調試面板功能
  const debugPanel = document.getElementById('debugPanel');
  const debugContent = document.getElementById('debugContent');
  const toggleDebugButton = document.getElementById('toggleDebug');

  // 添加一個隱藏的按鈕組合來顯示調試面板 (例如: 按 Ctrl+Shift+D)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    }
  });

  // 切換調試面板顯示/隱藏
  toggleDebugButton.addEventListener('click', function() {
    debugPanel.style.display = 'none';
  });

  // 更新調試信息
  function updateDebugInfo(info) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'debug-entry';
    entry.innerHTML = `<span class="debug-time">[${timestamp}]</span> ${info}`;
    debugContent.appendChild(entry);
    debugContent.scrollTop = debugContent.scrollHeight;
  }
}); 