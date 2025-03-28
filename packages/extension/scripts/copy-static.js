const fs = require('fs');
const path = require('path');

// 要複製的檔案和目錄
const filesToCopy = [
  { src: 'manifest.json', dest: 'dist/manifest.json' },
  { src: 'popup/popup.html', dest: 'dist/popup/popup.html' },
  { src: 'popup/popup.css', dest: 'dist/popup/popup.css' },
  { src: 'sidebar/sidebar.html', dest: 'dist/sidebar/sidebar.html' },
  { src: 'content/sidebar.css', dest: 'dist/content/sidebar.css' }
];

// 要複製的目錄
const dirsToCopy = [
  { src: 'assets', dest: 'dist/assets' }
];

// 確保目標目錄存在
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// 複製檔案
filesToCopy.forEach(file => {
  const srcPath = path.resolve(__dirname, '..', file.src);
  const destPath = path.resolve(__dirname, '..', file.dest);
  
  if (fs.existsSync(srcPath)) {
    ensureDirectoryExistence(destPath);
    fs.copyFileSync(srcPath, destPath);
    console.log(`已複製: ${file.src} -> ${file.dest}`);
  } else {
    console.warn(`找不到檔案: ${file.src}`);
  }
});

// 複製目錄
dirsToCopy.forEach(dir => {
  const srcPath = path.resolve(__dirname, '..', dir.src);
  const destPath = path.resolve(__dirname, '..', dir.dest);
  
  if (fs.existsSync(srcPath)) {
    // 創建目標目錄
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    // 複製目錄內容
    copyDir(srcPath, destPath);
    console.log(`已複製目錄: ${dir.src} -> ${dir.dest}`);
  } else {
    console.warn(`找不到目錄: ${dir.src}`);
  }
});

// 複製目錄的輔助函數
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

console.log('所有靜態檔案複製完成！'); 