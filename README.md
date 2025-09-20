# Local Network Browser

<p align="center">
  <img src="build/icon.png" alt="Local Network Browser" width="128" height="128">
</p>

<p align="center">
  <strong>Transform your local server into a branded desktop application</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#build">Build</a> •
  <a href="#contributing">Contributing</a>
</p>

## Overview

Local Network Browser is an open-source tool that packages local web servers into standalone desktop applications. It automatically discovers and connects to servers running on your local network, eliminating the need for users to manually enter URLs or configure network settings.

Perfect for developers who want to distribute their web-based applications as native desktop apps without requiring users to have technical knowledge about ports, IP addresses, or web browsers.

## ✨ Features

- 🔍 **Automatic Network Discovery** - Scans all IPs in your local network subnet automatically
- ⚡ **Instant Connection** - Remembers and instantly connects to previously discovered servers
- 🎨 **Custom Branding** - Easy configuration for app name and branding
- 🖥️ **Cross-Platform** - Supports macOS (Intel & Apple Silicon) and Windows
- 🔒 **Secure** - Runs with context isolation and security best practices
- 📦 **Zero Configuration** - Works out of the box with minimal setup

## 📋 Prerequisites

- Node.js 16.0 or higher
- npm 7.0 or higher
- For building: macOS (for Mac builds) or Windows (for Windows builds)

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/kevinpark/local-network-browser.git

# Navigate to project directory
cd local-network-browser

# Install dependencies
npm install
```

## 💻 Usage

### Development Mode

```bash
npm start
```

This will launch the application in development mode with auto-reload enabled.

### Production Build

```bash
# Build for current platform
npm run build

# Build for macOS only
npm run build-mac

# Build for Windows only
npm run build-win
```

Built applications will be available in the `dist/` directory.

## ⚙️ Configuration

Configure your application by editing `config.json`:

```json
{
  "appName": "Your App Name",
  "scanPort": 8080
}
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `appName` | string | Name displayed in the application title bar | "Local Network Browser" |
| `scanPort` | number | Port number to scan for your server | 8800 |

### Advanced Configuration

For production builds, you can customize additional settings in `package.json`:

```json
{
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "Your Product Name"
  }
}
```

## 🏗️ Architecture

```
local-network-browser/
├── main.js              # Electron main process
├── renderer.js          # Frontend logic
├── network-scanner.js   # Network discovery module
├── preload.js          # Bridge between main and renderer
├── index.html          # UI structure
├── style.css           # UI styling
└── config.json         # Application configuration
```

### How It Works

1. **Network Scanning**: The app scans all IP addresses (1-254) in your local subnet
2. **Port Checking**: Tests the configured port on each IP for an active server
3. **Auto-Connection**: When a server is found, automatically loads it in the embedded browser
4. **Session Persistence**: Saves the server URL for instant connection on next launch

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

## 📝 Use Cases

- **Local Development Tools**: Package development servers as desktop apps
- **Enterprise Applications**: Distribute internal web apps without IT configuration
- **IoT Interfaces**: Create desktop clients for IoT device management
- **Educational Software**: Deploy learning platforms that run locally
- **Point of Sale Systems**: Transform web-based POS into desktop applications

## 🛠️ Troubleshooting

### Windows Network Issues

If the app cannot find servers on Windows:
- Ensure Windows Firewall allows the application
- Try running as Administrator
- Check that the server is accessible from a web browser first

### macOS Permission Issues

If prompted for network permissions:
- Go to System Preferences > Security & Privacy
- Allow the application to access local network

## 📄 License

Copyright © 2025 Kevin Park. All rights reserved.

This project is proprietary software. See the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Kevin Park**

- GitHub: [@realcoding2003](https://github.com/realcoding2003)

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Network scanning inspired by local development needs
- Icon and UI design for optimal user experience

---

<p align="center">
  Made with ❤️ for developers who want to simplify local server deployment
</p>
