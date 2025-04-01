/**
 * LLM 網頁助手調試工具
 * 用於檢查截圖和網頁內容是否成功獲取
 */

/**
 * 檢查數據完整性並顯示調試信息
 * @param {Object} data - 請求數據
 * @returns {Object} - 包含檢查結果的對象
 */
export function checkDataIntegrity(data) {
  const result = {
    hasScreenshot: false,
    hasPageContent: false,
    screenshotSize: 0,
    pageContentSize: 0,
    issues: []
  };

  // 檢查截圖
  if (data.screenshot) {
    result.hasScreenshot = true;
    result.screenshotSize = data.screenshot.length;
    
    // 檢查截圖大小
    if (data.screenshot.length < 1000) {
      result.issues.push('截圖數據異常小，可能未成功獲取');
    } else if (data.screenshot.length > 10 * 1024 * 1024) {
      result.issues.push('截圖數據過大，可能會導致請求失敗');
    }
    
    // 檢查截圖格式
    if (!data.screenshot.startsWith('data:image/')) {
      result.issues.push('截圖格式不正確，缺少正確的 MIME 類型前綴');
    }
  } else {
    result.issues.push('未獲取到截圖數據');
  }

  // 檢查網頁內容
  if (data.pageContent) {
    result.hasPageContent = true;
    result.pageContentSize = data.pageContent.length;
    
    // 檢查網頁內容大小
    if (data.pageContent.length < 100) {
      result.issues.push('網頁內容異常小，可能未成功獲取');
    } else if (data.pageContent.length > 5 * 1024 * 1024) {
      result.issues.push('網頁內容過大，可能會導致請求失敗');
    }
    
    // 嘗試解析 JSON
    try {
      const contentObj = JSON.parse(data.pageContent);
      if (!contentObj.title || !contentObj.paragraphs) {
        result.issues.push('網頁內容結構不完整，缺少必要字段');
      }
    } catch (e) {
      result.issues.push('網頁內容不是有效的 JSON 格式');
    }
  } else {
    result.issues.push('未獲取到網頁內容數據');
  }

  return result;
}

/**
 * 生成調試報告
 * @param {Object} checkResult - 檢查結果
 * @returns {string} - HTML 格式的調試報告
 */
export function generateDebugReport(checkResult) {
  let report = '<div class="debug-report">';
  
  // 截圖狀態
  report += `<div class="debug-item ${checkResult.hasScreenshot ? 'success' : 'error'}">
    <span class="debug-icon">${checkResult.hasScreenshot ? '✓' : '✗'}</span>
    <span class="debug-label">截圖狀態:</span>
    <span class="debug-value">${checkResult.hasScreenshot ? '已獲取' : '未獲取'}</span>
    ${checkResult.hasScreenshot ? `<span class="debug-size">(${formatSize(checkResult.screenshotSize)})</span>` : ''}
  </div>`;
  
  // 網頁內容狀態
  report += `<div class="debug-item ${checkResult.hasPageContent ? 'success' : 'error'}">
    <span class="debug-icon">${checkResult.hasPageContent ? '✓' : '✗'}</span>
    <span class="debug-label">網頁內容:</span>
    <span class="debug-value">${checkResult.hasPageContent ? '已獲取' : '未獲取'}</span>
    ${checkResult.hasPageContent ? `<span class="debug-size">(${formatSize(checkResult.pageContentSize)})</span>` : ''}
  </div>`;
  
  // 問題列表
  if (checkResult.issues.length > 0) {
    report += '<div class="debug-issues"><span class="debug-issues-title">發現問題:</span><ul>';
    checkResult.issues.forEach(issue => {
      report += `<li>${issue}</li>`;
    });
    report += '</ul></div>';
  }
  
  report += '</div>';
  return report;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字節數
 * @returns {string} - 格式化後的大小
 */
function formatSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
} 