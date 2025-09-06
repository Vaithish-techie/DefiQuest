# DeFiQuest 🎓

**Educational DeFi Platform with Blockchain-Based Achievement NFTs**

A comprehensive educational platform that gamifies DeFi learning through interactive quests, habit tracking, and blockchain-verified achievements. Built for the Ethereum and BlockDAG hackathon tracks.

---

## 🌟 Overview

DeFiQuest transforms DeFi education into an engaging journey where users complete quests, build learning habits, and earn NFT badges as proof of their achievements. The platform integrates AI-powered learning assessment with blockchain-verified credentials.

### **Key Features**
- 📚 **Interactive Learning Quests** - Educational content with progression tracking
- 🎯 **Habit Building System** - Daily learning goals and streak tracking  
- 🤖 **AI-Powered Assessment** - Intelligent progress evaluation and personalized feedback
- 🏆 **NFT Achievement Badges** - Blockchain-verified learning credentials
- 🔗 **Multi-Network Support** - Deployed on Ethereum and BlockDAG networks
- 💰 **Wallet Integration** - MetaMask authentication and transaction signing

---

## 🏗️ Architecture

```
DeFiQuest/
├── frontend/          # Vanilla JS SPA with MetaMask integration
├── backend/           # Go/Fiber REST API with blockchain integration  
├── ai_server/         # Python/FastAPI AI assessment service
├── contracts/         # Solidity smart contracts (ERC721 NFT badges)
├── scripts/           # Deployment and utility scripts
├── test/              # Smart contract test suite
└── docs/              # Project documentation
```

### **Technology Stack**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, MetaMask SDK
- **Backend:** Go, Fiber, go-ethereum client, PostgreSQL
- **AI Service:** Python, FastAPI, Machine Learning models
- **Blockchain:** Solidity, Hardhat, OpenZeppelin, Infura
- **Networks:** Ethereum Sepolia, BlockDAG Testnet

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ and npm
- Go 1.19+
- Python 3.8+
- MetaMask browser extension

### **1. Environment Setup**
```bash
# Clone and configure
git clone <repository-url>
cd DefiQuest
cp .env.example .env
# Edit .env with your configuration
```

### **2. Deploy Smart Contracts**
```bash
npm install
npm run deploy:sepolia     # Ethereum testnet
npm run deploy:blockdag    # BlockDAG testnet
```

### **3. Start Services**
```bash
# Backend (Terminal 1)
cd backend && go mod tidy && go run main.go

# AI Service (Terminal 2)  
cd ai_server && uvicorn app:app --reload --port 5001

# Frontend (Terminal 3)
cd frontend && python3 -m http.server 8000
```

### **4. Access Application**
- Open http://localhost:8000
- Connect MetaMask wallet
- Start your DeFi learning journey!

---

## 🎯 Hackathon Compliance

### **Ethereum Track ✅**
- [x] ERC721 NFT smart contracts deployed
- [x] MetaMask wallet integration
- [x] Real blockchain transactions
- [x] Gas-optimized contract design
- [x] Etherscan verification

### **BlockDAG Track ✅**
- [x] EVM-compatible smart contracts
- [x] Multi-network deployment support
- [x] Cross-chain ready architecture
- [x] Bridge-compatible design

---

## 📋 Team Responsibilities

### **Blockchain Integration** (Your Component)
- ✅ Smart contract development and deployment
- ✅ MetaMask integration and wallet authentication
- ✅ Multi-network support (Ethereum + BlockDAG)
- ✅ NFT minting and badge system implementation

### **Backend Development**
- API endpoints for user management and quest tracking
- Database integration and data persistence
- Blockchain service integration
- Authentication and authorization

### **Frontend Development**  
- User interface and experience design
- Quest progression and gamification features
- Real-time progress tracking
- Responsive design implementation

### **AI/ML Integration**
- Learning assessment algorithms
- Progress analysis and recommendations
- Adaptive difficulty adjustment
- Personalized learning paths

---

## 🔧 Development

### **Smart Contract Testing**
```bash
npm test                    # Run test suite
npm run compile            # Compile contracts
npm run node               # Start local blockchain
```

### **Network Configuration**
- **Sepolia Testnet:** Chain ID 11155111
- **BlockDAG Testnet:** Chain ID [TBD]
- **Localhost:** Chain ID 31337

### **Contract Addresses**
- **Ethereum Sepolia:** `0xD297B2852aD94B0256a840b631B1cCf0E2154541`
- **BlockDAG Testnet:** [Pending deployment]

---

## 📚 Documentation

- [Blockchain Integration Guide](docs/BLOCKCHAIN_INTEGRATION.md)
- [Quick Start Guide](docs/README_QUICKSTART.md)
- [API Documentation](docs/API.md) *(Coming Soon)*
- [Smart Contract Documentation](docs/CONTRACTS.md) *(Coming Soon)*

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 Hackathon Achievements

- 🥇 **Complete Multi-Chain Integration** - Ethereum & BlockDAG support
- 🎨 **Innovative NFT Use Case** - Educational achievement verification
- 🤖 **AI-Enhanced Learning** - Personalized educational experience
- 🔒 **Production-Ready Security** - Comprehensive testing and validation
- 📱 **Seamless UX** - Intuitive wallet integration and quest progression

---

**Built with ❤️ for the DeFi education community**