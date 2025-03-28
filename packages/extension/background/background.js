// 監聽插件安裝事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('LLM 網頁助手已安裝');
  
  // 初始化側邊欄狀態
  chrome.storage.local.set({sidebarExpanded: false});
});

// 處理來自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToBackend') {
    // 在實際應用中，這裡會發送請求到後端
    console.log('收到發送到後端的請求:', message.data);
    
    // 模擬異步操作
    setTimeout(() => {
      sendResponse({
        success: true,
        data: {
          answer: '這是來自模擬後端的回應。在實際實現中，這將是 LLM 的回答。'
        }
      });
    }, 1000);
    
    // 返回 true 表示我們將異步發送回應
    return true;
  }
});

// 處理標籤頁更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 當頁面完全加載時，可以在這裡執行一些初始化操作
    console.log(`頁面加載完成: ${tab.url}`);
  }
});

// 當用戶點擊擴展圖標時
chrome.action.onClicked.addListener(function(tab) {
  // 向當前標籤頁注入內容腳本（如果尚未注入）
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    function: () => {
      // 檢查側邊欄是否已存在
      if (!document.getElementById('llm-sidebar-container')) {
        // 如果側邊欄不存在，創建它
        chrome.runtime.sendMessage({action: 'injectSidebar'});
      } else {
        // 如果側邊欄已存在，切換它的可見性
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
    }
  });
});

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 處理截圖請求
  if (request.action === 'captureTab') {
    // 獲取當前活動標籤頁的ID
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        sendResponse({error: '無法獲取當前標籤頁'});
        return;
      }
      
      // 使用 Chrome API 截取當前標籤頁的截圖
      chrome.tabs.captureVisibleTab(
        tabs[0].windowId,
        {format: 'jpeg', quality: 80},
        function(dataUrl) {
          if (chrome.runtime.lastError) {
            sendResponse({error: chrome.runtime.lastError.message});
          } else {
            sendResponse({screenshot: dataUrl});
          }
        }
      );
    });
    
    // 返回 true 表示將異步發送響應
    return true;
  }
  
  // 處理注入側邊欄請求
  if (request.action === 'injectSidebar') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'createSidebar'});
      }
    });
  }
});

// 當擴展安裝或更新時
chrome.runtime.onInstalled.addListener(function() {
  console.log('LLM 網頁助手已安裝/更新');
}); 