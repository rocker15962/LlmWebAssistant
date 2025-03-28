// 導入 API 模組
import { askLLM } from '../utils/api.js';
// 導入 Markdown 解析器
import { parseMarkdown } from '../utils/markdown.js';

document.addEventListener('DOMContentLoaded', function() {
  const questionInput = document.getElementById('question');
  const simpleBtn = document.getElementById('simpleBtn');
  const detailBtn = document.getElementById('detailBtn');
  const loadingContainer = document.getElementById('loadingContainer');
  const responseContainer = document.getElementById('responseContainer');
  const responseContent = document.getElementById('responseContent');
  const tokenInfo = document.getElementById('tokenInfo');
  const toggleButton = document.getElementById('toggleButton');

  if (!tokenInfo) {
    console.error('找不到 tokenInfo 元素!');
  } else {
    console.log('tokenInfo 元素已找到');
  }

  // 初始隱藏回應容器
  responseContainer.style.display = 'none';
  
  // 自動調整文本區域高度
  questionInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });
  
  // 切換側邊欄
  toggleButton.addEventListener('click', function() {
    // 發送消息到 content script 來切換側邊欄
    window.parent.postMessage({ action: 'toggleSidebar' }, '*');
  });
  
  // 處理簡單回答按鈕點擊
  simpleBtn.addEventListener('click', function() {
    handleSubmit(true);
  });
  
  // 處理詳細回答按鈕點擊
  detailBtn.addEventListener('click', function() {
    handleSubmit(false);
  });
  
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
    
    // 獲取選擇的模式
    const selectedMode = document.getElementById('answerMode').value;
    
    // 顯示載入中
    loadingContainer.style.display = 'flex';
    responseContainer.style.display = 'none';
    tokenInfo.textContent = '';
    simpleBtn.disabled = true;
    detailBtn.disabled = true;
    
    try {
      // 發送消息到 content script 獲取當前頁面信息
      window.parent.postMessage({ 
        action: 'getPageInfo',
        mode: selectedMode
      }, '*');
      
      // 監聽來自 content script 的回應
      window.addEventListener('message', async function pageInfoHandler(event) {
        if (event.data && event.data.action === 'pageInfoResponse') {
          // 移除事件監聽器，避免重複處理
          window.removeEventListener('message', pageInfoHandler);
          
          const { url, title, screenshot, pageContent, originalContent } = event.data;
          let useWebSearch = false;
          
          if (selectedMode === 'search') {
            useWebSearch = true;
          }
          
          // 如果有原始內容和優化內容，計算節省的 token 數量
          if (originalContent && pageContent) {
            const originalTokens = estimateTokens(originalContent);
            const optimizedTokens = estimateTokens(pageContent);
            const savedTokens = originalTokens - optimizedTokens;
            const savedPercentage = Math.round((savedTokens / originalTokens) * 100);
            
            console.log(`內容優化: 從 ${originalTokens} tokens 減少到 ${optimizedTokens} tokens (節省 ${savedPercentage}%)`);
            
            // 在 UI 中顯示優化信息
            const optimizationInfo = document.createElement('div');
            optimizationInfo.className = 'optimization-info';
            optimizationInfo.innerHTML = `
              <p>內容優化: 從 ${originalTokens} tokens 減少到 ${optimizedTokens} tokens</p>
              <p>節省了 ${savedTokens} tokens (${savedPercentage}%)</p>
            `;
            
            // 將優化信息添加到載入容器中
            loadingContainer.appendChild(optimizationInfo);
          }
          
          // 準備發送到後端的數據
          const requestData = {
            question,
            url,
            title,
            screenshot,
            pageContent,
            useWebSearch,
            isSimple
          };
          
          // 使用 API 模組發送請求
          const response = await askLLM(requestData);
          
          // 調試信息
          console.log('API 回應:', response);
          console.log('Token 使用量:', response.usage);
          
          // 顯示回應
          responseContent.innerHTML = parseMarkdown(response.answer);
          
          // 顯示 token 使用量信息
          if (response.usage && response.usage.promptTokens !== undefined) {
            console.log('顯示 token 信息');
            tokenInfo.textContent = `輸入: ${response.usage.promptTokens} tokens | 輸出: ${response.usage.completionTokens} tokens | 總計: ${response.usage.totalTokens} tokens`;
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
      });
    } catch (error) {
      console.error('處理請求時出錯:', error);
      responseContent.innerHTML = '<p>處理您的請求時發生錯誤，請稍後再試。</p>';
      responseContainer.style.display = 'block';
      
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
}); 