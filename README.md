# Local Network Browser

로컬 네트워크에서 자동으로 서버를 탐색하고 연결하는 데스크톱 애플리케이션

## 개요

Local Network Browser는 로컬 서버 기반 제품을 사용자 친화적인 데스크톱 애플리케이션으로 패키징하는 도구입니다. 복잡한 URL 입력 없이 자동으로 네트워크를 스캔하여 서버를 찾아 연결합니다.

## 주요 기능

- 🔍 **자동 네트워크 스캔**: 로컬 네트워크에서 지정된 포트의 서버 자동 탐색
- 🖥️ **크로스 플랫폼**: macOS(Intel/Apple Silicon Universal Binary), Windows 지원
- ⚡ **빠른 연결**: 이전 연결 정보 저장으로 빠른 재연결
- 🎨 **커스터마이징**: config.json을 통한 브랜딩 설정
- 🔒 **보안**: Context Isolation 활성화로 보안 강화

## 시스템 요구사항

### macOS
- macOS 10.12 이상
- Intel 또는 Apple Silicon 프로세서

### Windows
- Windows 10 이상
- x64 아키텍처

### 개발 환경
- Node.js 16.0 이상
- npm 7.0 이상

## 설치 및 실행

### 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/kevinpark/local-network-browser.git

# 프로젝트 디렉토리로 이동
cd local-network-browser

# 의존성 설치
npm install
```

### 개발 모드 실행

```bash
npm start
```

### 빌드

```bash
# macOS용 빌드 (Universal Binary - Intel + Apple Silicon)
npm run build-mac

# Windows용 빌드
npm run build-win

# 모든 플랫폼 빌드
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다:
- macOS: `PlanBank-1.0.0-universal.dmg`
- Windows: `PlanBank.exe`

## 설정

`config.json` 파일을 수정하여 애플리케이션을 커스터마이징할 수 있습니다:

```json
{
  "appName": "PlanBank",
  "scanPort": 8800
}
```

- `appName`: 애플리케이션 타이틀바에 표시될 이름
- `scanPort`: 스캔할 서버 포트 번호


## 프로젝트 구조

```
├── main.js              # Electron 메인 프로세스
├── preload.js           # 프리로드 스크립트 (보안)
├── renderer.js          # UI 렌더러 프로세스
├── network-scanner.js   # 네트워크 스캔 모듈
├── index.html           # 로딩 화면 UI
├── style.css           # 스타일시트
├── config.json         # 애플리케이션 설정
└── build/              # 빌드 리소스
    ├── icon.png        # 앱 아이콘
    └── entitlements.mac.plist  # macOS 권한 설정
```

## 기술 스택

- **Electron**: 크로스 플랫폼 데스크톱 앱 프레임워크
- **Node.js**: 네트워크 스캔 및 백엔드 로직
- **electron-builder**: 앱 패키징 및 배포


## 문제 해결

### 네트워크 스캔이 실패하는 경우
- 방화벽 설정 확인
- 서버가 지정된 포트에서 실행 중인지 확인
- 같은 네트워크에 연결되어 있는지 확인

### macOS에서 "개발자를 확인할 수 없음" 오류
```bash
# 터미널에서 실행
xattr -cr /Applications/PlanBank.app
```

### Windows에서 "Windows가 PC를 보호했습니다" 경고
"추가 정보" → "실행" 클릭

## 라이선스

Copyright © 2025 Kevin Park (박경종). All rights reserved.

이 소프트웨어는 저작권자의 명시적인 허가 없이 사용, 복제, 수정, 배포할 수 없습니다.

## 문의

Kevin Park - kevinpark@okyc.kr

