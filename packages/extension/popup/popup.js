// 導入 API 模組
import { askLLM } from '../utils/api.js';

document.addEventListener('DOMContentLoaded', function() {
  const questionInput = document.getElementById('question');
  const submitBtn = document.getElementById('submitBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const responseContainer = document.getElementById('responseContainer');
  const responseContent = document.getElementById('responseContent');
  const tokenInfo = document.getElementById('tokenInfo');

  // 初始隱藏回應容器
  responseContainer.style.display = 'none';
  
  // 自動調整文本區域高度
  questionInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
  
  submitBtn.addEventListener('click', async function() {
    const question = questionInput.value.trim();
    
    if (!question) {
      // 顯示錯誤提示
      questionInput.classList.add('error');
      setTimeout(() => {
        questionInput.classList.remove('error');
      }, 2000);
      return;
    }
    
    // 獲取選擇的模式
    const selectedMode = document.querySelector('input[name="answerMode"]:checked').value;
    
    // 顯示載入中
    loadingContainer.style.display = 'flex';
    responseContainer.style.display = 'none';
    tokenInfo.textContent = '';
    submitBtn.disabled = true;
    
    try {
      // 獲取當前活動標籤頁
      // 注意：在獨立視窗模式下，我們需要獲取用戶當前瀏覽的標籤頁，而不是擴展視窗的標籤頁
      const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true});
      const tab = tabs[0]; // 獲取用戶當前瀏覽的標籤頁
      
      let screenshot = null;
      let pageContent = null;
      let useWebSearch = false;
      
      // 根據選擇的模式決定使用哪種方法
      switch (selectedMode) {
        case 'screenshot':
          // 看圖回答：當前畫面截圖做回答
          try {
            // 使用 chrome.tabs.captureVisibleTab 獲取截圖
            const result = await chrome.tabs.captureVisibleTab(tab.windowId, {format: 'jpeg', quality: 50});
            
            // 確保截圖是 base64 格式
            screenshot = result;
          } catch (error) {
            console.error('截圖失敗:', error);
            // 如果 chrome.tabs.captureVisibleTab 失敗，嘗試使用備用方法
            try {
              screenshot = await captureScreenshot();
            } catch (backupError) {
              console.error('備用截圖方法也失敗:', backupError);
            }
          }
          break;
          
        case 'content':
          // 資訊整理：搜集此網頁資訊做回答
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
            pageContent = response.content;
          } catch (error) {
            console.error('獲取網頁內容失敗:', error);
          }
          break;
          
        case 'search':
          // 外部搜尋：搜尋網路資訊做回答
          useWebSearch = true;
          break;
      }
      
      // 在發送請求前檢查截圖大小
      console.log(`截圖大小: ${screenshot.length} 字節`);
      
      // 如果截圖太大，可以嘗試壓縮
      if (screenshot.length > 5 * 1024 * 1024) { // 5MB
        console.log("截圖太大，嘗試壓縮...");
        // 壓縮代碼...
      }
      
      // 準備發送到後端的數據
      const requestData = {
        question,
        url: tab.url,
        title: tab.title,
        screenshot: screenshot,
        pageContent: pageContent,
        useWebSearch: useWebSearch
      };
      
      // 使用 API 模組發送請求
      const response = await askLLM(requestData);
      
      // 顯示回應
      responseContent.textContent = response.answer;
      
      // 顯示 token 使用量信息
      if (response.promptTokens !== undefined && response.completionTokens !== undefined) {
        tokenInfo.textContent = `輸入: ${response.promptTokens} tokens | 輸出: ${response.completionTokens} tokens | 總計: ${response.totalTokens} tokens`;
      }
      
      responseContainer.style.display = 'block';
    } catch (error) {
      console.error('處理請求時出錯:', error);
      responseContent.textContent = '處理您的請求時發生錯誤，請稍後再試。';
      responseContainer.style.display = 'block';
    } finally {
      // 隱藏載入中
      loadingContainer.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  // 添加關閉按鈕事件處理
  const closeButton = document.getElementById('closeButton');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      window.close();
    });
  }
});

// 獲取截圖的函數
async function captureScreenshot() {
  console.log("開始獲取截圖...");
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 }, (dataUrl) => {
      if (dataUrl) {
        console.log(`成功獲取截圖，大小: ${dataUrl.length} 字節`);
        console.log(`截圖前綴: ${dataUrl.substring(0, 30)}...`);
      } else {
        console.error("獲取截圖失敗，dataUrl 為空");
      }
      resolve(dataUrl || "");
    });
  });
}

// 在 content script 中添加以下代碼
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "captureScreenshot") {
    try {
      html2canvas(document.body).then(canvas => {
        const screenshot = canvas.toDataURL('image/jpeg', 0.5);
        sendResponse({screenshot: screenshot});
      });
      return true; // 保持消息通道開放
    } catch (error) {
      console.error("截圖失敗:", error);
      sendResponse({error: error.message});
    }
  }
});

// 發送請求到後端
async function askQuestion(question, useWebSearch, isSimple) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const screenshot = await captureScreenshot();
    const pageContent = await getPageContent();
    
    const response = await fetch('https://llmwebassistant.onrender.com/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question,
        url: tab.url,
        title: tab.title,
        screenshot: screenshot,  // 確保這裡有截圖數據
        pageContent: pageContent,
        useWebSearch: useWebSearch,
        isSimple: isSimple
      }),
    });
    
    // 處理響應...
  } catch (error) {
    console.error('Error:', error);
  }
} 