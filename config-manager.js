const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// 데이터 저장 경로
const getDataPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'discovered-servers.json');
};

// 발견된 서버 저장
async function saveDiscoveredServers(servers) {
  try {
    const dataPath = getDataPath();
    const dataToSave = {
      lastUpdated: new Date().toISOString(),
      servers: servers.map(server => ({
        host: server.host,
        port: server.port,
        url: server.url,
        title: server.title,
        appName: server.appName,
        icon: server.icon,
        hostname: server.hostname,
        lastSeen: server.lastSeen,
        online: server.online
      }))
    };

    await fs.writeFile(dataPath, JSON.stringify(dataToSave, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save discovered servers:', error);
    return { success: false, error: error.message };
  }
}

// 저장된 서버 로드
async function loadDiscoveredServers() {
  try {
    const dataPath = getDataPath();

    // 파일이 없으면 빈 배열 반환
    try {
      await fs.access(dataPath);
    } catch {
      return [];
    }

    const data = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(data);

    // 30일 이상 오래된 오프라인 서버는 필터링
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filteredServers = parsed.servers.filter(server => {
      if (!server.online && server.lastSeen) {
        const lastSeenDate = new Date(server.lastSeen);
        return lastSeenDate > thirtyDaysAgo;
      }
      return true;
    });

    return filteredServers;
  } catch (error) {
    console.error('Failed to load discovered servers:', error);
    return [];
  }
}

// 특정 서버 업데이트
async function updateDiscoveredServer(serverInfo) {
  try {
    const servers = await loadDiscoveredServers();
    const index = servers.findIndex(s =>
      s.host === serverInfo.host && s.port === serverInfo.port
    );

    if (index !== -1) {
      servers[index] = {
        ...servers[index],
        ...serverInfo,
        lastUpdated: new Date().toISOString()
      };
    } else {
      servers.push({
        ...serverInfo,
        lastUpdated: new Date().toISOString()
      });
    }

    await saveDiscoveredServers(servers);
    return { success: true };
  } catch (error) {
    console.error('Failed to update server:', error);
    return { success: false, error: error.message };
  }
}

// 서버 즐겨찾기 관리
async function toggleFavorite(serverInfo) {
  try {
    const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
    let favorites = [];

    try {
      const data = await fs.readFile(favoritesPath, 'utf8');
      favorites = JSON.parse(data);
    } catch {
      // 파일이 없으면 새로 생성
    }

    const key = `${serverInfo.host}:${serverInfo.port}`;
    const index = favorites.findIndex(f => `${f.host}:${f.port}` === key);

    if (index !== -1) {
      // 이미 즐겨찾기에 있으면 제거
      favorites.splice(index, 1);
    } else {
      // 즐겨찾기에 추가
      favorites.push({
        host: serverInfo.host,
        port: serverInfo.port,
        url: serverInfo.url,
        title: serverInfo.title,
        appName: serverInfo.appName,
        icon: serverInfo.icon,
        addedAt: new Date().toISOString()
      });
    }

    await fs.writeFile(favoritesPath, JSON.stringify(favorites, null, 2), 'utf8');
    return { success: true, isFavorite: index === -1 };
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return { success: false, error: error.message };
  }
}

// 즐겨찾기 로드
async function loadFavorites() {
  try {
    const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');
    const data = await fs.readFile(favoritesPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 서버 히스토리 저장
async function addToHistory(serverInfo) {
  try {
    const historyPath = path.join(app.getPath('userData'), 'history.json');
    let history = [];

    try {
      const data = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(data);
    } catch {
      // 파일이 없으면 새로 생성
    }

    // 중복 제거 (같은 서버의 이전 항목 제거)
    history = history.filter(h =>
      !(h.host === serverInfo.host && h.port === serverInfo.port)
    );

    // 새 항목을 맨 앞에 추가
    history.unshift({
      ...serverInfo,
      accessedAt: new Date().toISOString()
    });

    // 최대 50개 항목만 유지
    history = history.slice(0, 50);

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to add to history:', error);
    return { success: false, error: error.message };
  }
}

// 히스토리 로드
async function loadHistory() {
  try {
    const historyPath = path.join(app.getPath('userData'), 'history.json');
    const data = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 설정 저장
async function saveUserSettings(settings) {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'user-settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return { success: false, error: error.message };
  }
}

// 설정 로드
async function loadUserSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'user-settings.json');
    const data = await fs.readFile(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch {
    // 기본 설정 반환
    return {
      theme: 'light',
      autoScan: true,
      scanInterval: 30000,
      compactView: false,
      showOffline: true
    };
  }
}

module.exports = {
  saveDiscoveredServers,
  loadDiscoveredServers,
  updateDiscoveredServer,
  toggleFavorite,
  loadFavorites,
  addToHistory,
  loadHistory,
  saveUserSettings,
  loadUserSettings
};