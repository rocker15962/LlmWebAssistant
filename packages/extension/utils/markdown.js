/**
 * 簡單的 Markdown 解析器
 * 支持標題、代碼塊、粗體、斜體等基本格式
 */

// 解析 Markdown 文本
function parseMarkdown(text) {
  if (!text) return '';
  
  // 保存代碼塊
  const codeBlocks = [];
  let codeBlockCount = 0;
  
  // 處理代碼塊 (```code```)
  text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
    const placeholder = `__CODE_BLOCK_${codeBlockCount}__`;
    codeBlocks.push(code);
    codeBlockCount++;
    return placeholder;
  });
  
  // 處理行內代碼 (`code`)
  const inlineCodeBlocks = [];
  let inlineCodeCount = 0;
  
  text = text.replace(/`([^`]+)`/g, function(match, code) {
    const placeholder = `__INLINE_CODE_${inlineCodeCount}__`;
    inlineCodeBlocks.push(code);
    inlineCodeCount++;
    return placeholder;
  });
  
  // 處理標題 (# Heading)
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  text = text.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  text = text.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  
  // 處理粗體 (**text**)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 處理斜體 (*text*)
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // 處理段落和換行
  text = text.replace(/\n\n/g, '</p><p>');
  
  // 包裝在段落標籤中
  text = '<p>' + text + '</p>';
  
  // 修復嵌套的段落標籤
  text = text.replace(/<p><h([1-6])>/g, '<h$1>');
  text = text.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
  text = text.replace(/<p><pre>/g, '<pre>');
  text = text.replace(/<\/pre><\/p>/g, '</pre>');
  
  // 恢復代碼塊
  for (let i = 0; i < codeBlockCount; i++) {
    const placeholder = `__CODE_BLOCK_${i}__`;
    // 對代碼塊內容進行 HTML 轉義
    const escapedCode = escapeHtml(codeBlocks[i]);
    text = text.replace(placeholder, `<pre><code>${escapedCode}</code></pre>`);
  }
  
  // 恢復行內代碼
  for (let i = 0; i < inlineCodeCount; i++) {
    const placeholder = `__INLINE_CODE_${i}__`;
    // 對行內代碼內容進行 HTML 轉義
    const escapedCode = escapeHtml(inlineCodeBlocks[i]);
    text = text.replace(placeholder, `<code>${escapedCode}</code>`);
  }
  
  return text;
}

/**
 * 轉義 HTML 特殊字符
 * @param {string} html - 需要轉義的 HTML 字符串
 * @returns {string} - 轉義後的字符串
 */
function escapeHtml(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 導出函數
export { parseMarkdown };
