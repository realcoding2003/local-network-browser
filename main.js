const { app, BrowserWindow, BrowserView, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let config = {};
let serverUrl = null;

function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load config:', error);
    config = {
      appName: 'Local Network Browser',
      scanPort: 8800
    };
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: config.appName || 'Local Network Browser',
    autoHideMenuBar: true,  // 메뉴바 자동 숨김 (Alt 키로 토글 가능)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'build/icon.png'),
    backgroundColor: '#ffffff'
  });

  // 저장된 서버가 있는지 먼저 확인
  const savedServer = await getSavedServerInternal();
  if (savedServer && savedServer.url) {
    // 저장된 서버가 있으면 헬스체크
    const scanner = require('./network-scanner');
    const url = new URL(savedServer.url);
    const isOnline = await scanner.checkServerHealth(url.hostname, url.port || 80);

    if (isOnline) {
      // BrowserView를 사용하여 서버 콘텐츠 로드
      console.log(`Directly connecting to saved server: ${savedServer.url}`);
      loadServerInBrowserView(savedServer.url);
    } else {
      // 서버가 죽어있으면 스캔 페이지로
      mainWindow.loadFile('index.html');
    }
  } else {
    // 저장된 서버가 없으면 스캔 페이지로
    mainWindow.loadFile('index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// BrowserView로 서버 로드
function loadServerInBrowserView(serverUrl) {
  // 기존 view가 있으면 제거
  if (mainWindow.getBrowserView()) {
    mainWindow.removeBrowserView(mainWindow.getBrowserView());
  }

  // 새 BrowserView 생성
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      webSecurity: false,  // 파일 업로드를 위해 필요
      partition: 'persist:main'  // 세션 유지
    }
  });

  mainWindow.setBrowserView(view);

  // 창 크기에 맞춰 BrowserView 크기 설정
  const { width, height } = mainWindow.getBounds();
  view.setBounds({ x: 0, y: 0, width, height });
  view.setAutoResize({ width: true, height: true });

  // 서버 URL 로드
  view.webContents.loadURL(serverUrl);

  // 파일 다운로드 처리
  view.webContents.session.on('will-download', (event, item, webContents) => {
    const downloadsPath = app.getPath('downloads');
    item.setSavePath(path.join(downloadsPath, item.getFilename()));
  });

  // 새 창 열기 처리
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('192.168')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 권한 처리
  view.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write'];
    callback(allowedPermissions.includes(permission));
  });

  // 개발자 도구 (디버깅용) - 프로덕션에서는 비활성화
  // view.webContents.openDevTools();

  // 콘솔 메시지 로깅
  view.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[BrowserView Console]: ${message}`);
  });

  // 파일 업로드 이벤트 모니터링
  view.webContents.on('did-finish-load', () => {
    console.log('Page loaded, injecting debug code...');

    view.webContents.executeJavaScript(`
      console.log('Debug code injected');

      // 파일 입력 모니터링
      document.addEventListener('change', function(e) {
        if (e.target.type === 'file') {
          console.log('File selected:', e.target.files[0]);
          console.log('File input name:', e.target.name);
          console.log('File size:', e.target.files[0]?.size);
          console.log('File type:', e.target.files[0]?.type);
        }
      }, true);

      // Form submit 모니터링
      document.addEventListener('submit', function(e) {
        console.log('Form submitted:', e.target);
        const formData = new FormData(e.target);
        for (let [key, value] of formData.entries()) {
          console.log('FormData:', key, value);
        }
      }, true);

      // XMLHttpRequest 모니터링
      const originalXHRSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function(data) {
        console.log('XHR Send to:', this._url || 'unknown');
        if (data instanceof FormData) {
          console.log('Sending FormData');
          // FormData 내용 확인
          for (let [key, value] of data.entries()) {
            if (value instanceof File) {
              console.log('FormData file:', key, value.name, value.size, value.type);
            } else {
              console.log('FormData field:', key, value);
            }
          }
        }

        // 에러 처리 추가
        this.addEventListener('error', function() {
          console.error('XHR Error:', this.status, this.statusText);
        });

        this.addEventListener('load', function() {
          if (this.status >= 400) {
            console.error('XHR Response Error:', this.status, this.responseText);
          } else {
            console.log('XHR Success:', this.status);
          }
        });

        return originalXHRSend.call(this, data);
      };

      // XHR open 모니터링
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        console.log('XHR Open:', method, url);
        return originalXHROpen.apply(this, arguments);
      };

      // Fetch API 모니터링
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        console.log('Fetch:', url, options?.method || 'GET');
        if (options?.body instanceof FormData) {
          console.log('Fetch with FormData');
        }
        return originalFetch.apply(this, arguments);
      };

      console.log('File inputs found:', document.querySelectorAll('input[type="file"]').length);
    `).catch(err => console.error('Failed to inject debug code:', err));
  });

  // 네트워크 요청 모니터링
  view.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (details.method === 'POST' || details.uploadData) {
      console.log(`[Network] ${details.method} ${details.url}`);
      if (details.uploadData) {
        const totalSize = details.uploadData.map(d => d.bytes?.length || 0).reduce((a, b) => a + b, 0);
        console.log('[Network] Upload data size:', totalSize, 'bytes');

        // 업로드 데이터 상세 정보
        details.uploadData.forEach((data, index) => {
          if (data.bytes) {
            console.log(`[Network] Upload part ${index}: ${data.bytes.length} bytes`);
            // 처음 100바이트만 출력 (디버깅용)
            const preview = Buffer.from(data.bytes).toString('utf8', 0, Math.min(100, data.bytes.length));
            console.log(`[Network] Preview: ${preview}...`);
          }
          if (data.file) {
            console.log(`[Network] File: ${data.file}`);
          }
        });
      }
    }
    callback({});
  });

  // Response 모니터링 추가
  view.webContents.session.webRequest.onCompleted((details) => {
    if (details.method === 'POST' && details.statusCode >= 400) {
      console.log(`[Network] Error Response: ${details.statusCode} ${details.statusLine}`);
    }
  });

  // 에러 처리
  view.webContents.on('crashed', (event, killed) => {
    console.error('WebContents crashed:', killed);
  });
}

// 네트워크 스캔 및 서버 찾기
ipcMain.handle('scan-and-connect', async () => {
  const scanner = require('./network-scanner');
  const port = config.scanPort || 8800;

  try {
    // 서버 찾기 (단일 포트만 스캔)
    const foundServer = await scanner.findServer(port);

    if (foundServer) {
      serverUrl = foundServer;

      // BrowserView로 서버 로드
      loadServerInBrowserView(foundServer);

      return { success: true, url: foundServer };
    } else {
      return { success: false, message: `No server found on port ${port}` };
    }
  } catch (error) {
    console.error('Scan failed:', error);
    return { success: false, error: error.message };
  }
});

// 설정 가져오기
ipcMain.handle('get-config', () => {
  return config;
});

// 재시도
ipcMain.handle('retry-scan', async () => {
  // 로딩 페이지로 돌아가기
  mainWindow.loadFile('index.html');

  // 다시 스캔 시작
  return await ipcMain._events['scan-and-connect'][0]();
});

// 저장된 서버 URL 가져오기 (내부 사용)
async function getSavedServerInternal() {
  try {
    const savedPath = path.join(app.getPath('userData'), 'saved-server.json');
    if (fs.existsSync(savedPath)) {
      const data = fs.readFileSync(savedPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load saved server:', error);
  }
  return null;
}

// 저장된 서버 URL 가져오기 (IPC)
ipcMain.handle('get-saved-server', () => {
  return getSavedServerInternal();
});

// 서버 URL 저장
ipcMain.handle('save-server', (event, url) => {
  try {
    const savedPath = path.join(app.getPath('userData'), 'saved-server.json');
    fs.writeFileSync(savedPath, JSON.stringify({
      url: url,
      lastSeen: new Date().toISOString()
    }), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save server:', error);
    return { success: false };
  }
});

app.whenReady().then(async () => {
  loadConfig();
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});