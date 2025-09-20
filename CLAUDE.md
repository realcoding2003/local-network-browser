# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
로컬 서버 제품을 위한 브랜딩 패키지 브라우저 - 로컬 네트워크에서 실행되는 서버 제품을 독립 실행형 데스크톱 애플리케이션으로 패키징하는 도구입니다.

**목적**: 로컬 서버 기반 제품을 사용자 친화적인 데스크톱 애플리케이션으로 변환하여, 복잡한 URL 입력 없이 자동으로 서버를 찾아 연결합니다.

**저작권**: Copyright © 2025 Kevin Park (박경종). All rights reserved.

## Development Commands

### Installation
```bash
npm install
```

### Development
```bash
npm start          # Launch Electron app in development mode
```

### Building
```bash
npm run build-mac  # Build for macOS (.dmg)
npm run build-win  # Build for Windows (.exe portable)
npm run build      # Build for all platforms
```

## Architecture

### Core Components
- **main.js**: Electron main process handling window management and IPC
- **preload.js**: Bridge between renderer and main process with security context isolation
- **network-scanner.js**: Network discovery module using Node.js net/http APIs
- **renderer.js**: UI logic and interaction handling
- **index.html/style.css**: User interface

### Key Technical Decisions
- **Security**: contextIsolation enabled, nodeIntegration disabled for security
- **IPC Communication**: Uses invoke/handle pattern for async operations
- **Network Scanning**: 단일 포트만 스캔하여 config.json에 설정된 서버 자동 탐색
- **Configuration**: config.json을 통한 앱 브랜딩 및 포트 설정
- **Windows Support**: 윈도우 환경에 최적화된 네트워크 스캔 로직

### Build Configuration
- Uses electron-builder for cross-platform builds
- Outputs to `dist/` directory
- Mac: Universal binary (x64 + arm64)
- Windows: Portable exe (x64)

## Implementation Status
프로젝트 구현 완료. 모든 핵심 기능이 작동하며, macOS와 Windows용 빌드를 생성할 수 있습니다.

## Configuration
`config.json` 파일을 통해 브랜딩 커스터마이징:
- `appName`: 앱 타이틀바에 표시될 제품명
- `scanPort`: 스캔할 서버 포트 번호