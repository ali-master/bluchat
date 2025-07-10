<div align="center">
  <img src="./assets/logo.svg" alt="BluChat Logo" width="120" />

  <h1>BluChat</h1>
  <p><strong>🔗 Secure Offline Bluetooth Messaging</strong></p>

  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-features">Features</a> •
    <a href="#-roadmap">Roadmap</a> •
    <a href="#-contributing">Contributing</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/PWA-Ready-blue?style=flat-square" alt="PWA Ready" />
    <img src="https://img.shields.io/badge/Offline-First-green?style=flat-square" alt="Offline First" />
    <img src="https://img.shields.io/badge/Bluetooth-Mesh-purple?style=flat-square" alt="Bluetooth Mesh" />
    <img src="https://img.shields.io/badge/E2E-Encrypted-red?style=flat-square" alt="End-to-End Encrypted" />
  </p>
</div>

---

**BluChat** is a revolutionary Progressive Web App that enables secure, offline messaging through Bluetooth mesh networking. When the internet fails, BluChat keeps you connected with your peers through encrypted, peer-to-peer communication.

## ✨ Why BluChat?

In our hyper-connected world, we often forget that connectivity isn't guaranteed. Natural disasters, network outages, or simply being in remote areas can cut us off from traditional messaging platforms. BluChat solves this by creating a resilient communication network that works entirely offline.

### 🌟 Key Highlights

- **🔄 Offline-First**: Works without internet connection
- **🔐 End-to-End Encryption**: Messages secured with TweetNaCl cryptography
- **📡 Bluetooth Mesh**: Multi-hop message routing through peer network
- **⚡ Progressive Web App**: Install like a native app, works everywhere
- **🌐 Cross-Platform**: Works on desktop, mobile, and tablets
- **🔒 Privacy-Focused**: No servers, no data collection, no tracking

## 🚀 Quick Start

### Prerequisites

- Modern web browser with Bluetooth support (Chrome, Edge, Opera)
- Bluetooth-enabled device
- HTTPS connection (required for Web Bluetooth API)

### Installation

1. **Visit the App**: Navigate to the BluChat URL in your browser
2. **Install PWA**: Click "Install" when prompted, or use your browser's install option
3. **Enable Bluetooth**: Grant Bluetooth permissions when requested
4. **Start Chatting**: Create or join channels and start messaging!

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ali-master/bluchat.git
cd bluchat

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## 🔧 Features

### Core Messaging
- **Multi-Channel Support**: Create and join different conversation channels
- **Real-Time Messaging**: Instant message delivery between connected peers
- **Message Persistence**: Offline storage using IndexedDB
- **Channel Security**: Password-protected private channels

### Security & Privacy
- **End-to-End Encryption**: All messages encrypted with industry-standard cryptography
- **Perfect Forward Secrecy**: Unique keys for each session
- **No Central Server**: Completely decentralized architecture
- **Local Data Only**: All data stored locally on your device

### Connectivity
- **Bluetooth Low Energy**: Efficient power consumption
- **Mesh Networking**: Messages route through multiple peers
- **Auto-Discovery**: Automatic peer detection and connection
- **Connection Management**: Smart reconnection and peer management

### User Experience
- **Modern UI**: Clean, responsive interface built with shadcn/ui
- **Dark/Light Mode**: Automatic theme switching
- **Mobile-First**: Optimized for touch devices
- **Offline Indicators**: Clear connection status feedback

## 🗺️ Roadmap

### ✅ Completed Features

- [x] **Core Infrastructure**
  - [x] Progressive Web App setup with service workers
  - [x] Bluetooth Web API integration
  - [x] React + TypeScript foundation
  - [x] Zustand state management

- [x] **Messaging System**
  - [x] Real-time peer-to-peer messaging
  - [x] Multi-channel support
  - [x] Message persistence with IndexedDB
  - [x] Message routing with TTL (Time-To-Live)

- [x] **Security**
  - [x] End-to-end encryption with TweetNaCl
  - [x] Key derivation with Scrypt
  - [x] Message signing and verification
  - [x] Channel password protection

- [x] **User Interface**
  - [x] Modern responsive design
  - [x] shadcn/ui component library
  - [x] Dark/light theme support
  - [x] Mobile-optimized interface
  - [x] Connection status indicators

- [x] **Developer Experience**
  - [x] TypeScript strict mode
  - [x] ESLint + Prettier configuration
  - [x] Vite build system
  - [x] Hot module replacement

### 🔄 In Progress

- [ ] **Enhanced Security**
  - [ ] Perfect Forward Secrecy implementation
  - [ ] Key rotation mechanisms
  - [ ] Secure peer authentication

- [ ] **Performance Optimization**
  - [ ] Message compression
  - [ ] Efficient routing algorithms
  - [ ] Battery optimization

### 🚀 Upcoming Features

- [ ] **Advanced Messaging**
  - [ ] File sharing support
  - [ ] Voice messages
  - [ ] Message reactions and replies
  - [ ] Message search functionality
  - [ ] Message backup/export

- [ ] **Network Features**
  - [ ] Wi-Fi Direct support
  - [ ] Hybrid mesh networking (Bluetooth + Wi-Fi)
  - [ ] Bridge mode (connect multiple mesh networks)
  - [ ] Network topology visualization

- [ ] **User Experience**
  - [ ] User profiles and avatars
  - [ ] Message notifications
  - [ ] Typing indicators
  - [ ] Message read receipts
  - [ ] Contact management

- [ ] **Developer Features**
  - [ ] Plugin system
  - [ ] API for third-party integrations
  - [ ] Custom encryption protocols
  - [ ] Network diagnostics tools

- [ ] **Platform Support**
  - [ ] Electron desktop app
  - [ ] React Native mobile app
  - [ ] Browser extension
  - [ ] Command-line interface

### 🎯 Long-term Vision

- [ ] **Enterprise Features**
  - [ ] Organization management
  - [ ] Admin controls and moderation
  - [ ] Compliance and audit logs
  - [ ] Integration with enterprise systems

- [ ] **Research & Innovation**
  - [ ] Quantum-resistant cryptography
  - [ ] AI-powered spam detection
  - [ ] Advanced mesh routing protocols
  - [ ] Emergency communication modes

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: Zustand
- **UI Components**: shadcn/ui, Tailwind CSS
- **Cryptography**: TweetNaCl, Scrypt-JS
- **Storage**: IndexedDB
- **Connectivity**: Web Bluetooth API
- **PWA**: Workbox, Service Workers

## 📱 Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|---------|-------|
| Chrome | ✅ | ✅ | Full support |
| Edge | ✅ | ✅ | Full support |
| Opera | ✅ | ✅ | Full support |
| Safari | ❌ | ❌ | No Web Bluetooth support |
| Firefox | ❌ | ❌ | No Web Bluetooth support |

## 🔒 Security

BluChat takes security seriously:

- **No Data Collection**: We don't collect, store, or analyze any user data
- **Local Storage**: All data remains on your device
- **Open Source**: Code is publicly auditable
- **Standard Cryptography**: Uses well-established encryption libraries
- **Regular Updates**: Security patches and improvements

## 🤝 Contributing

We welcome contributions from the community! Whether you're interested in:

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🔒 Security audits

Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

### Development Guidelines

1. **Code Quality**: Follow TypeScript best practices
2. **Testing**: Write tests for new features
3. **Documentation**: Update docs for user-facing changes
4. **Security**: Consider security implications of all changes

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

BluChat is inspired by the [BitChat](https://github.com/jackjackbits/bitchat) project and built upon the shoulders of many open-source projects:

- [TweetNaCl](https://tweetnacl.js.org/) for cryptography
- [React](https://react.dev/) for the UI framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Zustand](https://zustand-demo.pmnd.rs/) for state management

---

<div align="center">

**Built with ❤️ by [Ali Torki](https://github.com/ali-master) for a more connected world**

[🌟 Star us on GitHub](https://github.com/ali-master/bluchat) • [🐛 Report Issues](https://github.com/ali-master/bluchat/issues) • [💬 Join Community](https://github.com/ali-master/bluchat/discussions)

</div>
