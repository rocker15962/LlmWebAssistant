/**
 * LLM 網頁助手 API 工具
 * 處理與後端服務的所有通信
 */

// 後端 API 基礎 URL
const API_BASE_URL = 'https://llmwebassistant.onrender.com/api';

// API 端點
const ENDPOINTS = {
  ASK: '/ask',
  HEALTH: '/health'
};

/**
 * 發送問題到 LLM
 * @param {Object} data - 請求數據
 * @param {string} data.question - 用戶問題
 * @param {string} data.url - 當前頁面 URL
 * @param {string} data.title - 當前頁面標題
 * @param {string|null} data.screenshot - 頁面截圖 (base64)
 * @param {string|null} data.pageContent - 頁面內容
 * @param {boolean} data.useWebSearch - 是否使用網絡搜索
 * @param {boolean} data.isSimple - 是否使用簡單回答模式
 * @returns {Promise<Object>} - LLM 回應
 */
async function askLLM(data) {
  try {
    // 確保截圖格式正確
    if (data.screenshot) {
      // 確保截圖有正確的 MIME 類型前綴
      if (!data.screenshot.startsWith('data:image/')) {
        if (data.screenshot.startsWith('data:')) {
          // 已有 data: 前綴但缺少 MIME 類型
          data.screenshot = data.screenshot.replace('data:', 'data:image/jpeg;base64,');
        } else {
          // 完全沒有前綴
          data.screenshot = `data:image/jpeg;base64,${data.screenshot}`;
        }
      }
    }
    
    // 發送 API 請求
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.ASK}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: data.question,
        url: data.url,
        title: data.title,
        screenshot: data.screenshot || null,
        pageContent: data.pageContent || null,
        useWebSearch: data.useWebSearch || false,
        isSimple: data.isSimple || false
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 檢查回應格式
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 確保返回完整的響應，包括 token 使用量
    return {
      answer: result.answer || '',
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0
      }
    };
  } catch (error) {
    console.error('API 請求失敗:', error);
    throw error;
  }
}

/**
 * 檢查 API 健康狀態
 * @returns {Promise<boolean>} - API 是否正常運行
 */
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.HEALTH}`);
    return response.ok;
  } catch (error) {
    console.error('API 健康檢查失敗:', error);
    return false;
  }
}

/**
 * 模擬 API 回應
 * @param {Object} data - 請求數據
 * @returns {Object} - 模擬的回應
 */
function simulateResponse(data) {
  // 根據問題生成模擬回應
  let answer = '';
  
  // 如果是簡單回答模式，生成更簡短的回答
  if (data.isSimple) {
    if (data.question.toLowerCase().includes('這個網頁是什麼')) {
      answer = `這是 "${data.title}" 網頁，網址: ${data.url}`;
    } else if (data.question.toLowerCase().includes('摘要')) {
      answer = `"${data.title}" 摘要: `;
      if (data.pageContent) {
        const contentObj = JSON.parse(data.pageContent);
        if (contentObj.paragraphs.length > 0) {
          answer += contentObj.paragraphs[0].substring(0, 100) + '...';
        } else {
          answer += contentObj.bodyText.substring(0, 100) + '...';
        }
      } else {
        answer += '無法生成摘要，未提供網頁內容。';
      }
    } else {
      answer = `問題: ${data.question}\n\n`;
      answer += `正在瀏覽: "${data.title}"`;
      if (data.screenshot) {
        answer += '\n已收到截圖。';
      }
      if (data.pageContent) {
        answer += '\n已分析網頁內容。';
      }
    }
    
    return { answer };
  }
  
  if (data.question.toLowerCase().includes('這個網頁是什麼')) {
    answer = `這是一個名為 "${data.title}" 的網頁，網址是 ${data.url}。`;
    if (data.pageContent) {
      const contentObj = JSON.parse(data.pageContent);
      answer += `\n\n根據網頁內容，這似乎是一個${contentObj.paragraphs.length > 10 ? '內容豐富的' : '簡單的'}頁面。`;
      
      if (contentObj.headings.length > 0) {
        answer += `\n\n頁面包含以下主要標題：\n- ${contentObj.headings.slice(0, 3).join('\n- ')}`;
        if (contentObj.headings.length > 3) {
          answer += `\n- ...等${contentObj.headings.length}個標題`;
        }
      }
    }
  } else if (data.question.toLowerCase().includes('摘要')) {
    answer = `網頁 "${data.title}" 的摘要：\n\n`;
    if (data.pageContent) {
      const contentObj = JSON.parse(data.pageContent);
      // 模擬摘要生成
      if (contentObj.paragraphs.length > 0) {
        const firstParagraphs = contentObj.paragraphs.slice(0, 2).join(' ');
        answer += firstParagraphs.length > 200 
          ? firstParagraphs.substring(0, 200) + '...' 
          : firstParagraphs;
      } else {
        answer += contentObj.bodyText.substring(0, 200) + '...';
      }
    } else {
      answer += '無法生成摘要，因為沒有提供網頁內容。';
    }
  } else {
    answer = `您的問題是：${data.question}\n\n`;
    answer += `我看到您正在瀏覽 "${data.title}"。`;
    if (data.screenshot) {
      answer += '\n\n我已收到您的截圖，可以看到頁面的視覺內容。';
    }
    if (data.pageContent) {
      const contentObj = JSON.parse(data.pageContent);
      answer += '\n\n根據網頁內容，我可以看到：';
      
      if (contentObj.headings.length > 0) {
        answer += `\n- 頁面有 ${contentObj.headings.length} 個標題`;
      }
      
      if (contentObj.paragraphs.length > 0) {
        answer += `\n- 頁面有 ${contentObj.paragraphs.length} 個段落`;
      }
      
      if (contentObj.links.length > 0) {
        answer += `\n- 頁面有 ${contentObj.links.length} 個連結`;
      }
      
      answer += '\n\n這只是模擬數據。在實際實現中，LLM 將分析網頁內容並提供相關回答。';
    }
  }
  
  return { answer };
}

// 導出 API 函數
export { askLLM, checkAPIHealth };
