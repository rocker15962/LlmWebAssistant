/**
 * 截圖工具 - 用於獲取和保存截圖
 */

// 保存截圖到本地
export function saveScreenshot(screenshot, url) {
  try {
    // 創建一個唯一的文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = new URL(url).hostname;
    const filename = `screenshot_${domain}_${timestamp}.jpg`;
    
    // 將 base64 數據轉換為 Blob
    const byteString = atob(screenshot.split(',')[1]);
    const mimeString = screenshot.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    
    // 創建下載鏈接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    // 觸發下載
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 釋放 URL 對象
    URL.revokeObjectURL(link.href);
    
    return { success: true, filename };
  } catch (error) {
    console.error('保存截圖失敗:', error);
    return { success: false, error: error.message };
  }
}

// 分析截圖品質
export function analyzeScreenshot(screenshot) {
  try {
    // 獲取截圖大小
    const size = screenshot.length;
    const sizeInKB = size / 1024;
    const sizeInMB = sizeInKB / 1024;
    
    // 檢查截圖格式
    let format = 'unknown';
    if (screenshot.startsWith('data:image/jpeg')) {
      format = 'JPEG';
    } else if (screenshot.startsWith('data:image/png')) {
      format = 'PNG';
    } else if (screenshot.startsWith('data:image/webp')) {
      format = 'WebP';
    }
    
    // 創建一個臨時圖像來獲取尺寸
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        const width = img.width;
        const height = img.height;
        const aspectRatio = (width / height).toFixed(2);
        
        // 估計品質
        let quality = 'unknown';
        if (format === 'JPEG') {
          // JPEG 品質估計 (粗略)
          if (sizeInKB / (width * height / 1000) < 0.5) {
            quality = '低';
          } else if (sizeInKB / (width * height / 1000) < 1.5) {
            quality = '中';
          } else {
            quality = '高';
          }
        }
        
        resolve({
          format,
          size: {
            bytes: size,
            kilobytes: sizeInKB.toFixed(2),
            megabytes: sizeInMB.toFixed(2)
          },
          dimensions: {
            width,
            height,
            aspectRatio
          },
          estimatedQuality: quality
        });
      };
      
      img.onerror = function() {
        resolve({
          format,
          size: {
            bytes: size,
            kilobytes: sizeInKB.toFixed(2),
            megabytes: sizeInMB.toFixed(2)
          },
          dimensions: {
            width: 'unknown',
            height: 'unknown',
            aspectRatio: 'unknown'
          },
          estimatedQuality: 'unknown',
          error: '無法載入圖像以分析尺寸'
        });
      };
      
      img.src = screenshot;
    });
  } catch (error) {
    console.error('分析截圖失敗:', error);
    return Promise.resolve({
      error: error.message
    });
  }
} 