const net = require('net');
const os = require('os');

// 현재 네트워크의 IP 주소 가져오기
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const platform = process.platform;

  console.log(`Platform: ${platform}`);
  console.log(`Available interfaces: ${Object.keys(interfaces).join(', ')}`);

  // 플랫폼별 우선순위 인터페이스
  let priorityNames = [];
  if (platform === 'win32') {
    priorityNames = ['Ethernet', 'Wi-Fi', 'WiFi', '이더넷', 'Local Area Connection'];
  } else if (platform === 'darwin') {
    // macOS 인터페이스
    priorityNames = ['en0', 'en1', 'en2', 'en3', 'en4', 'en5'];
  } else {
    // Linux
    priorityNames = ['eth0', 'eth1', 'wlan0', 'wlan1', 'enp0s3'];
  }

  // 우선순위 인터페이스 먼저 확인
  for (const priorityName of priorityNames) {
    if (interfaces[priorityName]) {
      for (const iface of interfaces[priorityName]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`Using priority interface: ${priorityName} (${iface.address})`);
          return {
            address: iface.address,
            netmask: iface.netmask,
            name: priorityName
          };
        }
      }
    }
  }

  // 일반적인 방법으로 찾기
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // 가상 인터페이스 제외
        if (!name.includes('VMware') && !name.includes('VirtualBox') && !name.includes('Hyper-V')) {
          console.log(`Using interface: ${name} (${iface.address})`);
          return {
            address: iface.address,
            netmask: iface.netmask,
            name: name
          };
        }
      }
    }
  }

  return null;
}

// 네트워크 대역 계산
function getNetworkSubnet(ip, netmask) {
  const ipParts = ip.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  const network = ipParts.map((part, i) => part & maskParts[i]);
  return `${network[0]}.${network[1]}.${network[2]}`;
}

// 포트 체크
async function checkPort(host, port, timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ host, port, open: false });
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ host, port, open: true });
    });

    socket.on('error', () => {
      clearTimeout(timer);
      resolve({ host, port, open: false });
    });

    socket.connect(port, host);
  });
}

// HTTP 서버 정보 가져오기
async function getHTTPServerInfo(host, port, appConfig = null) {
  return new Promise((resolve) => {
    const url = `http://${host}:${port}`;
    const options = {
      timeout: 2000,
      headers: {
        'User-Agent': 'Local-Network-Browser/1.0'
      }
    };

    http.get(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
        if (data.length > 5000) {
          res.destroy();
        }
      });

      res.on('end', () => {
        const title = extractTitle(data) || `Server at port ${port}`;
        const serverHeader = res.headers['server'] || '';

        // 앱 설정에서 매칭되는 앱 찾기
        const matchedApp = appConfig || { name: title, icon: '🖥️' };

        resolve({
          host,
          port,
          url,
          title,
          status: res.statusCode,
          online: true,
          server: serverHeader,
          appName: matchedApp.name,
          icon: matchedApp.icon,
          lastSeen: new Date().toISOString()
        });
      });
    }).on('error', (error) => {
      // 서버는 실행 중이지만 HTTP가 아닐 수 있음
      const matchedApp = appConfig || { name: `Service on port ${port}`, icon: '🔌' };

      resolve({
        host,
        port,
        url: `http://${host}:${port}`,
        title: matchedApp.name,
        status: 0,
        online: true,
        appName: matchedApp.name,
        icon: matchedApp.icon,
        error: error.message,
        lastSeen: new Date().toISOString()
      });
    });
  });
}

// HTML 타이틀 추출
function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"');
  }
  return null;
}

// 호스트네임 가져오기
async function getHostname(ip) {
  try {
    const hostnames = await dns.reverse(ip);
    return hostnames[0] || ip;
  } catch {
    return ip;
  }
}

// 서버 헬스체크
async function checkServerHealth(host, port) {
  const result = await checkPort(host, port, 300);
  return result.open;
}

// 단일 서버 찾기 (특정 포트만 스캔)
async function findServer(port, timeout = null) {
  // 플랫폼별 타임아웃 설정
  const platform = process.platform;
  let actualTimeout;
  if (timeout) {
    actualTimeout = timeout;
  } else if (platform === 'win32') {
    actualTimeout = 1000;
  } else if (platform === 'darwin') {
    actualTimeout = 750;  // macOS용 타임아웃
  } else {
    actualTimeout = 500;
  }

  console.log(`[Network Scanner] Starting scan on ${platform} with timeout ${actualTimeout}ms`);

  const localIP = getLocalIP();
  if (!localIP) {
    console.error('[Network Scanner] ERROR: No network interface found');
    console.error('[Network Scanner] Available interfaces:', os.networkInterfaces());
    return null;
  }

  const subnet = getNetworkSubnet(localIP.address, localIP.netmask);
  console.log(`[Network Scanner] Scanning network ${localIP.name}: ${subnet}.x for port ${port}`);

  // localhost 먼저 체크
  console.log(`[Network Scanner] Checking localhost:${port}...`);
  const localhostResult = await checkPort('localhost', port, actualTimeout);
  if (localhostResult.open) {
    console.log(`[Network Scanner] ✓ Found server at localhost:${port}`);
    return `http://localhost:${port}`;
  }
  console.log(`[Network Scanner] localhost:${port} - no response`);

  // 127.0.0.1도 체크
  console.log(`[Network Scanner] Checking 127.0.0.1:${port}...`);
  const loopbackResult = await checkPort('127.0.0.1', port, actualTimeout);
  if (loopbackResult.open) {
    console.log(`[Network Scanner] ✓ Found server at 127.0.0.1:${port}`);
    return `http://127.0.0.1:${port}`;
  }

  // 네트워크의 모든 IP 스캔 (1-254)
  console.log(`[Network Scanner] Starting network scan of ${subnet}.1-254...`);
  const scanPromises = [];
  let scannedCount = 0;

  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;
    scanPromises.push(
      checkPort(ip, port, actualTimeout).then(result => {
        scannedCount++;
        if (scannedCount % 10 === 0) {
          console.log(`[Network Scanner] Progress: ${scannedCount}/254 IPs scanned`);
        }
        if (result.open) {
          console.log(`[Network Scanner] ✓ Found server at ${ip}:${port}`);
          return `http://${ip}:${port}`;
        }
        return null;
      })
    );

    // 배치로 처리 (플랫폼별로 다르게)
    const batchSize = platform === 'win32' ? 25 : (platform === 'darwin' ? 30 : 50);
    if (scanPromises.length >= batchSize || i === 254) {
      const results = await Promise.all(scanPromises);
      const found = results.find(url => url !== null);
      if (found) {
        return found; // 서버를 찾으면 즉시 반환
      }
      scanPromises.length = 0;
    }
  }

  console.log(`[Network Scanner] ✗ No server found on port ${port} after scanning 254 IPs`);
  return null;
}

module.exports = {
  findServer,
  checkServerHealth,
  getLocalIP
};