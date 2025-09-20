const { contextBridge, ipcRenderer } = require('electron');

// Renderer 프로세스에 최소한의 API만 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 스캔 및 연결
  scanAndConnect: () => ipcRenderer.invoke('scan-and-connect'),
  retryScan: () => ipcRenderer.invoke('retry-scan'),

  // 설정
  getConfig: () => ipcRenderer.invoke('get-config'),

  // 서버 저장/로드
  getSavedServer: () => ipcRenderer.invoke('get-saved-server'),
  saveServer: (url) => ipcRenderer.invoke('save-server', url),

  // 플랫폼 정보
  platform: process.platform
});