// LLM 網頁助手 Background Script

// 監聽插件安裝事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('LLM 網頁助手已安裝');
  
  // 初始化側邊欄狀態
  chrome.storage.local.set({sidebarExpanded: false});
});

// 監聽擴展圖標點擊事件
chrome.action.onClicked.addListener((tab) => {
  // 檢查當前頁面是否已經打開側邊欄
  chrome.tabs.sendMessage(tab.id, { action: "checkSidebar" }, (response) => {
    if (chrome.runtime.lastError) {
      // 如果發生錯誤，可能是因為 content script 尚未載入
      // 嘗試注入 content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/contentScript.js"]
      }).then(() => {
        // 注入成功後，打開側邊欄
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
        }, 100);
      }).catch(err => {
        console.error("無法注入 content script:", err);
      });
    } else {
      // 如果沒有錯誤，直接切換側邊欄
      chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
    }
  });
});

// 監聽來自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 處理擴展信息請求
  if (request.action === "getExtensionInfo") {
    sendResponse({
      version: chrome.runtime.getManifest().version,
      name: chrome.runtime.getManifest().name
    });
    return true;
  }
  
  // 處理截圖請求
  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId, 
      { format: "jpeg", quality: 70 }, 
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("截圖失敗:", chrome.runtime.lastError);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ screenshot: dataUrl });
        }
      }
    );
    return true; // 保持消息通道開啟
  }
  
  // 處理注入側邊欄請求
  if (request.action === 'injectSidebar') {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'createSidebar'});
      }
    });
  }
  
  return true;
});

// 處理標籤頁更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 當頁面完全加載時，可以在這裡執行一些初始化操作
    console.log(`頁面加載完成: ${tab.url}`);
  }
});

console.log('LLM 網頁助手 Background Script 已載入'); 