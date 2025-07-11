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
    <a href="./README-fa.md">🇮🇷 فارسی</a> •
    <a href="./README.md">🇺🇸 English</a>
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
  - [x] Multi-channel support with hashtag naming
  - [x] Message persistence with IndexedDB
  - [x] TTL-based message routing and auto-relay
  - [x] Message fragmentation for large content
  - [x] LZ4 compression optimization

- [x] **Security & Cryptography**
  - [x] X25519 key exchange protocol
  - [x] Ed25519 digital signatures
  - [x] End-to-end encryption with TweetNaCl
  - [x] Scrypt-based key derivation for channels
  - [x] Perfect Forward Secrecy implementation
  - [x] Message signing and verification

- [x] **Bluetooth Mesh Networking**
  - [x] Dual central/peripheral mode support
  - [x] Mesh topology with routing tables
  - [x] Multi-hop message forwarding
  - [x] Duplicate prevention with message ID tracking
  - [x] Network discovery and peer announcements
  - [x] Dynamic UUID generation and management system
  - [x] Persistent UUID storage with sharing capabilities
  - [x] Proper Bluetooth service identification

- [x] **Privacy Features**
  - [x] Ephemeral identity rotation (2-hour cycles)
  - [x] Cover traffic generation
  - [x] Timing randomization
  - [x] Message padding for uniform sizes
  - [x] Anonymity set management

- [x] **Channel Management**
  - [x] State machine (Discovery → Join → Auth → Active)
  - [x] Hashtag-based channel naming (#channelname)
  - [x] Owner privileges and access control
  - [x] Password-protected private channels
  - [x] Automatic channel discovery

- [x] **User Interface**
  - [x] Modern responsive design
  - [x] shadcn/ui component library
  - [x] Dark/light theme toggle with persistence
  - [x] Mobile-optimized interface
  - [x] Real-time connection status indicators
  - [x] Confirm dialogs replacing browser prompts

- [x] **Protocol & Performance**
  - [x] Optimized binary packet structure (32-byte header)
  - [x] Efficient message encoding with relative timestamps
  - [x] Smart compression (only when beneficial)
  - [x] Battery-aware operation patterns
  - [x] Advanced background scanning optimization with Battery API
  - [x] Service Worker mesh coordination with cross-tab communication
  - [x] Predictive mesh health monitoring and auto-recovery
  - [x] Intelligent scan frequency and power adaptation

- [x] **Developer Experience**
  - [x] TypeScript strict mode
  - [x] ESLint + Prettier configuration
  - [x] Vite build system with HMR
  - [x] Modular service architecture

### 🔄 In Progress

- [ ] **Web Platform Enhancements**
  - [ ] Complete message fragment reassembly logic
  - [ ] WebRTC fallback for connectivity

### 🚀 Upcoming Features

- [ ] **Advanced Messaging**
  - [ ] File sharing with automatic fragmentation
  - [ ] Voice message recording and playback
  - [ ] Message reactions and threaded replies
  - [ ] Full-text message search
  - [ ] Message backup/export with encryption

- [ ] **Network Features**
  - [ ] Wi-Fi Direct integration for higher bandwidth
  - [ ] Hybrid mesh (Bluetooth + Wi-Fi + WebRTC)
  - [ ] Bridge mode for connecting separate mesh networks
  - [ ] Real-time network topology visualization
  - [ ] Mesh health monitoring and diagnostics

- [ ] **User Experience**
  - [ ] Customizable user profiles with avatars
  - [ ] Smart notifications with privacy preservation
  - [ ] Typing indicators with timing obfuscation
  - [ ] Read receipts with optional anonymity
  - [ ] Advanced contact and peer management

- [ ] **Native Applications**
  - [ ] Electron desktop app with full BLE support
  - [ ] React Native mobile app for true mesh networking
  - [ ] Browser extension for web integration
  - [ ] Command-line interface for server deployments

- [ ] **Developer Platform**
  - [ ] Plugin system for custom features
  - [ ] REST API for third-party integrations
  - [ ] Custom encryption protocol support
  - [ ] Comprehensive network diagnostics toolkit

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

## ⚠️ Web Platform Limitations

While BluChat implements the full BitChat protocol specification, the web platform has inherent constraints:

- **🚫 True BLE Advertising**: Web Bluetooth API doesn't support peripheral mode - limits mesh networking capabilities
- **⏱️ Background Scanning**: Browser security policies restrict continuous background scanning 
- **🧩 Fragment Reassembly**: Basic framework implemented, full message reassembly logic needs completion
- **⚡ Native Performance**: Web implementation has overhead compared to native BLE stack

**💡 For Production Use**: Consider native mobile/desktop implementations for optimal mesh networking performance.

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
