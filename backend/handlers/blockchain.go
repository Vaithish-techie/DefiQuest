package handlers

import (
    "context"
    "crypto/ecdsa"
    "fmt"
    "log"
    "math/big"
    "os"
    "time"

    "github.com/ethereum/go-ethereum/accounts/abi/bind"
    "github.com/ethereum/go-ethereum/common"
    "github.com/ethereum/go-ethereum/crypto"
    "github.com/ethereum/go-ethereum/ethclient"
)

// Contract addresses (to be set after deployment)
var (
    BadgeNFTAddress = common.HexToAddress(os.Getenv("BADGE_NFT_CONTRACT_ADDRESS"))
    EthereumRPC     = os.Getenv("ETHEREUM_RPC_URL")
    BlockDAGRPC     = os.Getenv("BLOCKDAG_RPC_URL")
    PrivateKey      = os.Getenv("BACKEND_PRIVATE_KEY")
)

type BlockchainService struct {
    ethClient     *ethclient.Client
    blockdagClient *ethclient.Client
    auth          *bind.TransactOpts
    contractAddr  common.Address
}

func NewBlockchainService() (*BlockchainService, error) {
    // Connect to Ethereum
    ethClient, err := ethclient.Dial(EthereumRPC)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to Ethereum: %v", err)
    }

    // Connect to BlockDAG (if available)
    var blockdagClient *ethclient.Client
    if BlockDAGRPC != "" {
        blockdagClient, err = ethclient.Dial(BlockDAGRPC)
        if err != nil {
            log.Printf("Failed to connect to BlockDAG: %v", err)
        }
    }

    // Setup private key for transactions
    privateKey, err := crypto.HexToECDSA(PrivateKey)
    if err != nil {
        return nil, fmt.Errorf("invalid private key: %v", err)
    }

    publicKey := privateKey.Public()
    publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
    if !ok {
        return nil, fmt.Errorf("cannot assert type: publicKey is not of type *ecdsa.PublicKey")
    }

    fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
    
    // Get network ID
    networkID, err := ethClient.NetworkID(context.Background())
    if err != nil {
        return nil, fmt.Errorf("failed to get network ID: %v", err)
    }

    // Setup auth for transactions
    auth, err := bind.NewKeyedTransactorWithChainID(privateKey, networkID)
    if err != nil {
        return nil, fmt.Errorf("failed to create auth: %v", err)
    }

    auth.Value = big.NewInt(0) // in wei
    auth.GasPrice, err = ethClient.SuggestGasPrice(context.Background())
    if err != nil {
        return nil, fmt.Errorf("failed to suggest gas price: %v", err)
    }

    log.Printf("Blockchain service initialized with address: %s", fromAddress.Hex())

    return &BlockchainService{
        ethClient:     ethClient,
        blockdagClient: blockdagClient,
        auth:          auth,
        contractAddr:  BadgeNFTAddress,
    }, nil
}

func (bs *BlockchainService) MintBadgeNFT(userAddress, questID string, tokenURI string, rarity int) (string, error) {
    // This is a placeholder for actual NFT minting
    // You would need to generate Go bindings from your Solidity contract
    // using: abigen --sol BadgeNFT.sol --pkg contracts --out BadgeNFT.go
    
    log.Printf("Minting NFT for user %s, quest %s, URI: %s, rarity: %d", 
        userAddress, questID, tokenURI, rarity)

    // Simulate minting delay
    time.Sleep(2 * time.Second)

    // Return mock transaction hash
    return "0x123abc456def789...mocktxhash", nil
}

func (bs *BlockchainService) GetUserBadges(userAddress string) ([]Badge, error) {
    // This would query the contract for user's NFTs
    // For now, return mock data
    
    log.Printf("Fetching badges for user: %s", userAddress)
    
    mockBadges := []Badge{
        {
            TokenID:  "1",
            Name:     "DeFi Beginner",
            ImageURL: "https://example.com/badge1.png",
        },
        {
            TokenID:  "2", 
            Name:     "Quiz Master",
            ImageURL: "https://example.com/badge2.png",
        },
    }
    
    return mockBadges, nil
}

func (bs *BlockchainService) Close() {
    if bs.ethClient != nil {
        bs.ethClient.Close()
    }
    if bs.blockdagClient != nil {
        bs.blockdagClient.Close()
    }
}

// Background service to handle NFT minting queue
type NFTMintRequest struct {
    UserAddress string
    QuestID     int
    TokenURI    string
    Rarity      int
}

var mintQueue = make(chan NFTMintRequest, 100)
var blockchainService *BlockchainService

func InitBlockchainService() error {
    var err error
    blockchainService, err = NewBlockchainService()
    if err != nil {
        return err
    }

    // Start background worker for NFT minting
    go nftMintWorker()
    
    return nil
}

func nftMintWorker() {
    for request := range mintQueue {
        txHash, err := blockchainService.MintBadgeNFT(
            request.UserAddress,
            fmt.Sprintf("%d", request.QuestID),
            request.TokenURI,
            request.Rarity,
        )
        
        if err != nil {
            log.Printf("Failed to mint NFT for user %s: %v", request.UserAddress, err)
            continue
        }
        
        log.Printf("Successfully minted NFT for user %s. TX: %s", request.UserAddress, txHash)
        
        // Here you could update a database with the transaction hash
        // and notify the user of successful minting
    }
}

func QueueNFTMint(userAddress string, questID int, tokenURI string, rarity int) {
    select {
    case mintQueue <- NFTMintRequest{
        UserAddress: userAddress,
        QuestID:     questID,
        TokenURI:    tokenURI,
        Rarity:      rarity,
    }:
        log.Printf("Queued NFT mint for user %s, quest %d", userAddress, questID)
    default:
        log.Printf("NFT mint queue full, dropping request for user %s", userAddress)
    }
}