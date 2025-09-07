package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// BlockchainService handles interactions with deployed smart contracts
type BlockchainService struct {
	ethereumClient *ethclient.Client
	blockdagClient *ethclient.Client
	privateKey     *ecdsa.PrivateKey
	fromAddress    common.Address
	contractABI    abi.ABI

	// Contract addresses
	sepoliaContractAddr  common.Address
	blockdagContractAddr common.Address
}

// Network represents different blockchain networks
type Network string

const (
	NetworkEthereum Network = "ethereum"
	NetworkBlockDAG Network = "blockdag"
)

// Initialize creates a new blockchain service with the configured networks
func Initialize() (*BlockchainService, error) {
	log.Println("🔗 Initializing blockchain service...")

	// Load private key from environment
	privateKeyHex := os.Getenv("PRIVATE_KEY")
	if privateKeyHex == "" {
		return nil, fmt.Errorf("PRIVATE_KEY environment variable not set")
	}

	// Remove 0x prefix if present
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("error casting public key to ECDSA")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	log.Printf("🔑 Wallet address: %s", fromAddress.Hex())

	// Connect to Ethereum Sepolia
	ethereumRPC := os.Getenv("SEPOLIA_RPC_URL")
	if ethereumRPC == "" {
		ethereumRPC = "https://sepolia.infura.io/v3/" + os.Getenv("INFURA_API_KEY")
	}

	ethereumClient, err := ethclient.Dial(ethereumRPC)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum Sepolia: %w", err)
	}

	// Connect to BlockDAG
	blockdagRPC := os.Getenv("BLOCKDAG_RPC_URL")
	if blockdagRPC == "" {
		blockdagRPC = "https://rpc.primordial.bdagscan.com"
	}

	blockdagClient, err := ethclient.Dial(blockdagRPC)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BlockDAG: %w", err)
	}

	// Load contract addresses from environment variables
	sepoliaContractEnv := os.Getenv("SEPOLIA_CONTRACT_ADDRESS")
	if sepoliaContractEnv == "" {
		sepoliaContractEnv = "0x4e5D385670953F3388C2a13dE561F092F18BbaF8" // Actual deployed address from sepolia.json
	}
	sepoliaAddr := common.HexToAddress(sepoliaContractEnv)

	blockdagContractEnv := os.Getenv("BLOCKDAG_CONTRACT_ADDRESS")
	if blockdagContractEnv == "" {
		blockdagContractEnv = "0xD7259B9414dD7EFb5dBC214b5670b3d59dfcE773" // Actual deployed address from blockdag_testnet.json
	}
	blockdagAddr := common.HexToAddress(blockdagContractEnv)

	// Load contract ABI (BadgeNFT contract)
	contractABI, err := abi.JSON(strings.NewReader(BadgeNFTABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse contract ABI: %w", err)
	}

	service := &BlockchainService{
		ethereumClient:       ethereumClient,
		blockdagClient:       blockdagClient,
		privateKey:           privateKey,
		fromAddress:          fromAddress,
		contractABI:          contractABI,
		sepoliaContractAddr:  sepoliaAddr,
		blockdagContractAddr: blockdagAddr,
	}

	log.Println("✅ Blockchain service initialized successfully")
	return service, nil
}

// MintBadgeNFT mints an NFT badge to a user's wallet on the specified network
func (bs *BlockchainService) MintBadgeNFT(userAddress, questTitle string, network Network) (string, error) {
	log.Printf("🎨 Minting NFT badge for user %s on %s network", userAddress, network)

	var client *ethclient.Client
	var contractAddr common.Address

	switch network {
	case NetworkEthereum:
		client = bs.ethereumClient
		contractAddr = bs.sepoliaContractAddr
	case NetworkBlockDAG:
		client = bs.blockdagClient
		contractAddr = bs.blockdagContractAddr
	default:
		return "", fmt.Errorf("unsupported network: %s", network)
	}

	// Get network info for transaction parameters
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Create auth transactor
	auth, err := bind.NewKeyedTransactorWithChainID(bs.privateKey, chainID)
	if err != nil {
		return "", fmt.Errorf("failed to create auth: %w", err)
	}

	// Get current nonce
	nonce, err := client.PendingNonceAt(context.Background(), bs.fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// Get gas price
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %w", err)
	}

	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(300000) // Estimate for NFT minting
	auth.GasPrice = gasPrice

	// Generate quest ID, token URI, and rarity
	questId := hashQuestTitle(questTitle)
	tokenURI := generateTokenURI(questTitle)
	rarity := determineBadgeRarity(questTitle)

	log.Printf("📤 Preparing mint transaction on %s...", network)
	log.Printf("🎯 Target Address: %s", userAddress)
	log.Printf("🔗 Network: %s", network)
	log.Printf("📄 Contract: %s", contractAddr.Hex())
	log.Printf("🏆 Quest: %s (ID: %d, Rarity: %d)", questTitle, questId, rarity)
	log.Printf("💰 Gas Limit: %d, Gas Price: %s", auth.GasLimit, gasPrice.String())

	// Pack the function call data
	userAddr := common.HexToAddress(userAddress)
	questIdBig := big.NewInt(questId)
	rarityUint8 := uint8(rarity)

	data, err := bs.contractABI.Pack("mintBadge", userAddr, questIdBig, tokenURI, rarityUint8)
	if err != nil {
		return "", fmt.Errorf("failed to pack function call: %w", err)
	}

	// Create the transaction
	tx := &types.Transaction{}
	tx = types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		GasPrice: gasPrice,
		Gas:      auth.GasLimit,
		To:       &contractAddr,
		Value:    big.NewInt(0),
		Data:     data,
	})

	// Sign the transaction
	signedTx, err := auth.Signer(bs.fromAddress, tx)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send the transaction
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	txHash := signedTx.Hash().Hex()
	log.Printf("📦 Transaction sent: %s", txHash)
	log.Printf("⏳ Waiting for confirmation...")

	// Wait for the transaction to be mined (with timeout)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	receipt, err := bind.WaitMined(ctx, client, signedTx)
	if err != nil {
		log.Printf("⚠️ Transaction may still be pending: %v", err)
		return txHash, nil // Return tx hash even if we can't wait for confirmation
	}

	if receipt.Status == 1 {
		log.Printf("✅ NFT Badge minted successfully for quest: %s", questTitle)
		log.Printf("🎉 Block: %d, Gas Used: %d", receipt.BlockNumber.Uint64(), receipt.GasUsed)
	} else {
		log.Printf("❌ Transaction failed - receipt status: %d", receipt.Status)
		return txHash, fmt.Errorf("transaction failed with status %d", receipt.Status)
	}

	return txHash, nil
}

// CheckNFTBalance checks how many NFTs a user owns on a specific network
func (bs *BlockchainService) CheckNFTBalance(userAddress string, network Network) (int64, error) {
	var client *ethclient.Client
	var contractAddr common.Address

	switch network {
	case NetworkEthereum:
		client = bs.ethereumClient
		contractAddr = bs.sepoliaContractAddr
	case NetworkBlockDAG:
		client = bs.blockdagClient
		contractAddr = bs.blockdagContractAddr
	default:
		return 0, fmt.Errorf("unsupported network: %s", network)
	}

	// Pack the function call for getUserBadgeCount
	data, err := bs.contractABI.Pack("getUserBadgeCount", common.HexToAddress(userAddress))
	if err != nil {
		return 0, fmt.Errorf("failed to pack function call: %w", err)
	}

	// Create proper CallMsg
	callMsg := ethereum.CallMsg{
		To:   &contractAddr,
		Data: data,
	}

	// Call the contract
	result, err := client.CallContract(context.Background(), callMsg, nil)
	if err != nil {
		return 0, fmt.Errorf("contract call failed: %w", err)
	}

	// Unpack the result
	var count *big.Int
	err = bs.contractABI.UnpackIntoInterface(&count, "getUserBadgeCount", result)
	if err != nil {
		return 0, fmt.Errorf("failed to unpack result: %w", err)
	}

	return count.Int64(), nil
}

// Helper functions
func generateTokenURI(questTitle string) string {
	// In production, this would generate IPFS URIs or proper metadata URIs
	return fmt.Sprintf("https://defiquest.com/metadata/%s", strings.ReplaceAll(questTitle, " ", "-"))
}

func determineBadgeRarity(questTitle string) uint8 {
	// Determine rarity based on quest complexity
	if strings.Contains(strings.ToLower(questTitle), "advanced") || strings.Contains(strings.ToLower(questTitle), "blockdag") {
		return 3 // LEGENDARY
	} else if strings.Contains(strings.ToLower(questTitle), "intermediate") {
		return 2 // EPIC
	} else if strings.Contains(strings.ToLower(questTitle), "intro") {
		return 1 // RARE
	}
	return 0 // COMMON
}

func hashQuestTitle(title string) int64 {
	// Simple hash function for quest titles
	hash := int64(0)
	for _, char := range title {
		hash = hash*31 + int64(char)
	}
	if hash < 0 {
		hash = -hash
	}
	return hash % 1000000 // Keep it reasonable
}

// BadgeNFTABI contains the ABI for the BadgeNFT contract
const BadgeNFTABI = `[
	{
		"inputs": [
			{"internalType": "address", "name": "to", "type": "address"},
			{"internalType": "uint256", "name": "questId", "type": "uint256"},
			{"internalType": "string", "name": "tokenURI", "type": "string"},
			{"internalType": "uint8", "name": "rarity", "type": "uint8"}
		],
		"name": "mintBadge",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{"internalType": "address", "name": "user", "type": "address"}
		],
		"name": "getUserBadgeCount",
		"outputs": [
			{"internalType": "uint256", "name": "", "type": "uint256"}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{"internalType": "address", "name": "user", "type": "address"}
		],
		"name": "getUserBadges",
		"outputs": [
			{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
		],
		"stateMutability": "view",
		"type": "function"
	}
]`
