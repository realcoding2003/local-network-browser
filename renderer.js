// DOM 요소
const elements = {
  statusTitle: document.getElementById('status-title'),
  statusMessage: document.getElementById('status-message'),
  scanPort: document.getElementById('scan-port'),
  errorPanel: document.getElementById('error-panel'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),
  progressBar: document.getElementById('progress-bar'),
  networkStatus: document.getElementById('network-status')
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await initialize();
});

async function initialize() {
  try {
    // 설정 로드
    const config = await window.electronAPI.getConfig();
    document.title = `${config.appName} - Loading...`;
    elements.scanPort.textContent = config.scanPort || '8800';

    // 저장된 서버 체크
    const savedServer = await window.electronAPI.getSavedServer();
    if (savedServer && savedServer.url) {
      elements.statusMessage.textContent = `Checking saved server: ${savedServer.url}`;
    }

    // 네트워크 정보 표시
    elements.networkStatus.textContent = `Platform: ${window.electronAPI.platform}`;

    // 프로그레스 바 애니메이션
    animateProgress();

    // 자동 스캔 시작 (1초 후)
    setTimeout(() => {
      startScan();
    }, 1000);

  } catch (error) {
    console.error('Initialization failed:', error);
    showError('Initialization failed');
  }
}

async function startScan() {
  elements.statusTitle.textContent = 'Scanning Network...';
  elements.errorPanel.classList.add('hidden');

  try {
    const result = await window.electronAPI.scanAndConnect();

    if (result.success) {
      // 서버를 찾았고 연결됨
      elements.statusTitle.textContent = 'Server Found!';
      elements.statusMessage.textContent = `Connecting to ${result.url}`;

      // URL 저장
      await window.electronAPI.saveServer(result.url);

      // 성공 표시 (실제로는 main.js에서 페이지가 이미 전환됨)
      setTimeout(() => {
        elements.progressBar.style.width = '100%';
      }, 500);

    } else {
      // 서버를 찾지 못함
      showError(result.message || 'No server found');
    }

  } catch (error) {
    console.error('Scan failed:', error);
    showError('Scan failed: ' + error.message);
  }
}

function showError(message) {
  elements.statusTitle.textContent = 'Server Not Found';
  elements.statusMessage.textContent = 'Unable to locate server';
  elements.errorMessage.textContent = message;
  elements.errorPanel.classList.remove('hidden');
  elements.progressBar.style.width = '0%';
}

// 재시도 버튼 이벤트
elements.retryBtn.addEventListener('click', async () => {
  elements.errorPanel.classList.add('hidden');
  animateProgress();
  await startScan();
});

// 프로그레스 바 애니메이션
function animateProgress() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 2;
    elements.progressBar.style.width = `${Math.min(progress, 90)}%`;

    if (progress >= 90) {
      clearInterval(interval);
    }
  }, 100);
}