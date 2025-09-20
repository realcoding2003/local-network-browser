const net = require('net');
const os = require('os');

// 현재 네트워크의 IP 주소 가져오기
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const isWindows = process.platform === 'win32';

  // 윈도우에서는 이더넷과 Wi-Fi 인터페이스를 우선 확인
  const priorityNames = isWindows
    ? ['Ethernet', 'Wi-Fi', 'WiFi', '이더넷', 'Local Area Connection']
    : [];

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
  // 윈도우에서는 타임아웃을 더 길게 설정
  const isWindows = process.platform === 'win32';
  const actualTimeout = timeout || (isWindows ? 1000 : 500);
  const localIP = getLocalIP();
  if (!localIP) {
    console.error('No network interface found');
    return null;
  }

  const subnet = getNetworkSubnet(localIP.address, localIP.netmask);
  console.log(`Scanning network ${localIP.name}: ${subnet}.x for port ${port} (timeout: ${actualTimeout}ms)`);

  // localhost 먼저 체크
  const localhostResult = await checkPort('localhost', port, actualTimeout);
  if (localhostResult.open) {
    console.log(`Found server at localhost:${port}`);
    return `http://localhost:${port}`;
  }

  // 네트워크의 모든 IP 스캔 (1-254)
  const scanPromises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;
    scanPromises.push(
      checkPort(ip, port, actualTimeout).then(result => {
        if (result.open) {
          console.log(`Found server at ${ip}:${port}`);
          return `http://${ip}:${port}`;
        }
        return null;
      })
    );

    // 배치로 처리 (윈도우는 25개씩, 다른 OS는 50개씩)
    const batchSize = isWindows ? 25 : 50;
    if (scanPromises.length >= batchSize || i === 254) {
      const results = await Promise.all(scanPromises);
      const found = results.find(url => url !== null);
      if (found) {
        return found; // 서버를 찾으면 즉시 반환
      }
      scanPromises.length = 0;
    }
  }

  console.log(`No server found on port ${port}`);
  return null;
}

module.exports = {
  findServer,
  checkServerHealth,
  getLocalIP
};