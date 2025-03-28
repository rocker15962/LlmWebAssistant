import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background/background.js'),
        contentScript: resolve(__dirname, 'content/contentScript.js'),
        popup: resolve(__dirname, 'popup/popup.js'),
        sidebar: resolve(__dirname, 'sidebar/sidebar.js'),
        api: resolve(__dirname, 'utils/api.js'),
        markdown: resolve(__dirname, 'utils/markdown.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const id = chunkInfo.facadeModuleId;
          if (!id) return '[name].js';
          
          // 從模組 ID 中提取相對路徑
          const relativePath = id.replace(__dirname + '/', '');
          // 保留原始目錄結構
          return relativePath;
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
}); 