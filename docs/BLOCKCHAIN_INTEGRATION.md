# DeFiQuest Blockchain Integration Documentation

## Overview

DeFiQuest is now integrated with blockchain functionality supporting both Ethereum and BlockDAG networks. This document provides deployment and usage instructions for the blockchain features.

## Smart Contract Deployment

### Prerequisites

1. Install Node.js and npm
2. Install Hardhat dependencies:
```bash
npm install
```

3. Configure environment variables by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```

4. Fill in the required values in `.env`:
```
PRIVATE_KEY=your_deployer_wallet_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
BLOCKDAG_RPC_URL=https://testnet-rpc.blockdag.org
```

### Deploy to Ethereum Sepolia Testnet

```bash
npm run deploy:sepolia
```

### Deploy to BlockDAG Testnet

```bash
npm run deploy:blockdag
```

### Deploy to Local Development

```bash
# Start local blockchain
npm run node

# In another terminal, deploy
npm run deploy:localhost
```

## Backend Integration

### Environment Setup

Add these variables to your backend environment:

```
BADGE_NFT_CONTRACT_ADDRESS=deployed_contract_address_here
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
BLOCKDAG_RPC_URL=https://testnet-rpc.blockdag.org
BACKEND_PRIVATE_KEY=your_backend_service_private_key
```

### Install Go Dependencies

```bash
cd backend
go mod tidy
```

### Start Backend

```bash
go run main.go
```

## Frontend Integration

### MetaMask Setup

The frontend now supports:
- MetaMask wallet connection
- Network switching (Ethereum, Sepolia, BlockDAG)
- Real wallet authentication with signature verification
- Automatic network detection

### Features

1. **Wallet Connection**: Users can connect via MetaMask or manual entry
2. **Network Support**: Automatic switching between supported networks
3. **Authentication**: Cryptographic signature-based login
4. **NFT Integration**: Real-time NFT minting for quest completions

## Smart Contract Features

### BadgeNFT Contract

- **ERC721 Compliant**: Standard NFT functionality
- **Rarity System**: Common, Rare, Epic, Legendary badges
- **Quest Integration**: Automatic badge minting on quest completion
- **Batch Operations**: Efficient batch minting for multiple users
- **Access Control**: Only authorized minters can create badges
- **User Tracking**: Easy retrieval of user's badge collection

### Key Functions

```solidity
// Mint a badge for quest completion
function mintBadge(address to, uint256 questId, string memory tokenURI, BadgeRarity rarity)

// Get all badges owned by a user
function getUserBadges(address user) returns (uint256[] memory)

// Batch mint for multiple users
function batchMintBadges(address[] recipients, uint256[] questIds, string[] tokenURIs, BadgeRarity[] rarities)
```

## Hackathon Requirements Compliance

### Ethereum Track ✅
- Smart contracts deployed on Ethereum network
- ERC721 NFT standard implementation
- MetaMask integration for user interaction
- Gas-optimized contracts with proper security measures

### BlockDAG Track ✅
- BlockDAG network compatibility
- EVM-compatible smart contracts
- Bridge functionality preparation
- Multi-network deployment support

## NFT Minting Process

1. User completes a quest (quiz, habit, video)
2. Backend validates quest completion
3. Quest completion triggers NFT mint request
4. Blockchain service queues the mint operation
5. Smart contract mints badge with appropriate rarity
6. User receives NFT in their wallet
7. Badge appears in user's profile

## Rarity System

- **Common (0)**: Basic quests (XP < 30)
- **Rare (1)**: Intermediate quests (XP 30-49)
- **Epic (2)**: Advanced quests (XP 50-69)
- **Legendary (3)**: Expert quests (XP ≥ 70)

## Security Features

- **Private Key Management**: Secure backend wallet for minting
- **Signature Verification**: Cryptographic authentication
- **Rate Limiting**: Prevents spam minting
- **Access Control**: Role-based permissions in smart contracts
- **Reentrancy Protection**: Safe contract interactions

## Testing

### Smart Contract Tests

```bash
npx hardhat test
```

### Frontend Testing

1. Start local blockchain: `npm run node`
2. Deploy contracts: `npm run deploy:localhost`
3. Start backend: `cd backend && go run main.go`
4. Start AI service: `cd ai_server && uvicorn app:app --reload --port 5001`
5. Serve frontend: `cd frontend && python3 -m http.server 8000`

## Troubleshooting

### Common Issues

1. **MetaMask Not Detected**: Ensure MetaMask is installed and enabled
2. **Wrong Network**: Use the network selector to switch to supported networks
3. **Transaction Failures**: Check gas fees and wallet balance
4. **Contract Not Found**: Verify contract addresses in environment variables

### Network Issues

- **Ethereum**: Use Sepolia testnet for development
- **BlockDAG**: Ensure correct RPC URL and chain ID
- **Local**: Start Hardhat node before deploying

## Next Steps for Team

### Backend Team
- Integrate real database for persistent storage
- Add transaction monitoring and status tracking
- Implement retry mechanisms for failed transactions
- Add webhook notifications for successful mints

### Frontend Team
- Enhance wallet connection UX
- Add transaction status indicators
- Implement badge gallery with rarity filters
- Add sharing functionality for achievements

### Blockchain Team (Your Focus)
- Generate Go bindings for the smart contract
- Implement bridge functionality for cross-chain support
- Add staking mechanisms for DeFi learning incentives
- Optimize gas usage and implement meta-transactions

## Resource Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [MetaMask Developer Docs](https://docs.metamask.io/guide/)
- [Ethereum Go Client](https://geth.ethereum.org/docs/dapp/native-bindings)
- [BlockDAG Documentation](https://blockdag.org/docs) (Update with actual URL)

## Contact

For blockchain-related questions and support, contact the blockchain integration team lead.