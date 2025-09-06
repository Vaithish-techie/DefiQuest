# Quick Start Guide

## 🚀 Deploy Smart Contracts

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your private keys and RPC URLs
```

### 3. Deploy to Testnet
```bash
# Ethereum Sepolia
npm run deploy:sepolia

# BlockDAG Testnet  
npm run deploy:blockdag

# Local Development
npm run node  # Keep running in one terminal
npm run deploy:localhost  # In another terminal
```

## 🔧 Start Backend Services

### 1. Start Blockchain Service
```bash
cd backend
go mod tidy
go run main.go
```

### 2. Start AI Service  
```bash
cd ai_server
# Activate virtual environment if exists
source bin/activate  # On Windows: bin\activate.bat
uvicorn app:app --reload --port 5001
```

### 3. Serve Frontend
```bash
cd frontend  
python3 -m http.server 8000
# Or use any static file server
```

## 🧪 Test the Integration

1. **Open**: http://localhost:8000
2. **Connect**: MetaMask wallet
3. **Switch**: To correct network (Sepolia/BlockDAG/Localhost)
4. **Complete**: A quiz or habit quest
5. **Verify**: NFT minted in your wallet

## 🛠️ Development Workflow

### Run Tests
```bash
npx hardhat test
```

### Compile Contracts
```bash
npm run compile
```

### Verify Contracts (Testnet only)
```bash
npx hardhat verify CONTRACT_ADDRESS --network sepolia
```

## 📋 Environment Variables Needed

### Smart Contract Deployment
- `PRIVATE_KEY`: Your wallet private key
- `SEPOLIA_RPC_URL`: Ethereum testnet RPC  
- `BLOCKDAG_RPC_URL`: BlockDAG testnet RPC
- `ETHERSCAN_API_KEY`: For contract verification

### Backend Service
- `BADGE_NFT_CONTRACT_ADDRESS`: Deployed contract address
- `ETHEREUM_RPC_URL`: Network RPC URL
- `BACKEND_PRIVATE_KEY`: Backend service wallet

## 🏆 Hackathon Submission Checklist

- [ ] Smart contracts deployed on Ethereum ✅
- [ ] Smart contracts deployed on BlockDAG ✅  
- [ ] MetaMask integration working ✅
- [ ] NFT minting functional ✅
- [ ] Multi-network support ✅
- [ ] Educational content integration ✅
- [ ] User authentication with wallet ✅

## 📞 Need Help?

Check `BLOCKCHAIN_INTEGRATION.md` for detailed documentation or contact the blockchain team lead.