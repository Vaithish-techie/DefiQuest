package blockchain

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/big" // Make sure 'math/big' is imported
	"os"
	"path/filepath"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type Network int

const (
	NetworkEthereum Network = iota
	NetworkBlockDAG
)

type DeploymentInfo struct {
	ContractAddress string `json:"contractAddress"`
}

type BlockchainService struct {
	ethClient       *ethclient.Client
	blockdagClient  *ethclient.Client
	ethContract     *BadgeNFT
	blockdagContract*BadgeNFT
	auth            *bind.TransactOpts
}

func Initialize() (*BlockchainService, error) {
	privateKeyHex := os.Getenv("BACKEND_WALLET_PRIVATE_KEY")
	if privateKeyHex == "" {
		return nil, fmt.Errorf("BACKEND_WALLET_PRIVATE_KEY not set in .env")
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %v", err)
	}

	ethRPC := os.Getenv("ETHEREUM_SEPOLIA_RPC_URL")
	blockdagRPC := os.Getenv("BLOCKDAG_TESTNET_RPC_URL")

	ethClient, err := ethclient.Dial(ethRPC)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum client: %v", err)
	}

	blockdagClient, err := ethclient.Dial(blockdagRPC)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BlockDAG client: %v", err)
	}

	ethDeployment, err := loadDeploymentInfo("sepolia.json")
	if err != nil { return nil, err }
	blockdagDeployment, err := loadDeploymentInfo("blockdag_testnet.json")
	if err != nil { return nil, err }
	
	ethContract, err := NewBadgeNFT(common.HexToAddress(ethDeployment.ContractAddress), ethClient)
	if err != nil { return nil, err }
	blockdagContract, err := NewBadgeNFT(common.HexToAddress(blockdagDeployment.ContractAddress), blockdagClient)
	if err != nil { return nil, err }

	publicKey := privateKey.Public()
    publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
    if !ok {
        return nil, fmt.Errorf("error casting public key to ECDSA")
    }
    fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	
	nonce, err := ethClient.PendingNonceAt(context.Background(), fromAddress)
    if err != nil { return nil, err }

	gasPrice, err := ethClient.SuggestGasPrice(context.Background())
    if err != nil { return nil, err }

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(11155111)) // Sepolia Chain ID
    if err != nil { return nil, err }
	auth.Nonce = big.NewInt(int64(nonce))
    auth.Value = big.NewInt(0)     // in wei
    auth.GasLimit = uint64(300000) // in units
    auth.GasPrice = gasPrice

	return &BlockchainService{
		ethClient:       ethClient,
		blockdagClient:  blockdagClient,
		ethContract:     ethContract,
		blockdagContract:blockdagContract,
		auth:            auth,
	}, nil
}
func (s *BlockchainService) MintBadgeNFT(toAddress, tokenURI string, network Network) (string, error) {
	var contract *BadgeNFT
	var client *ethclient.Client
	var chainId int64

	switch network {
	case NetworkEthereum:
		contract = s.ethContract
		client = s.ethClient
		chainId = 11155111 // Sepolia
	case NetworkBlockDAG:
		contract = s.blockdagContract
		client = s.blockdagClient
		chainId = 1043 // BlockDAG Testnet
	default:
		return "", fmt.Errorf("unsupported network")
	}

	auth, err := s.getAuthForChain(client, chainId)
	if err != nil { return "", err }

	// --- THE FIX ---
	// Convert integer constants to *big.Int before passing them to the contract function.
	questId := big.NewInt(0) // For now, we pass a questId of 0
	rarity := uint8(0)       // Common rarity

	tx, err := contract.MintBadge(auth, common.HexToAddress(toAddress), questId, tokenURI, rarity)
	if err != nil {
		return "", fmt.Errorf("failed to submit mint transaction: %v", err)
	}

	return tx.Hash().Hex(), nil
}

func (s *BlockchainService) getAuthForChain(client *ethclient.Client, chainID int64) (*bind.TransactOpts, error) {
    privateKey, err := crypto.HexToECDSA(os.Getenv("BACKEND_WALLET_PRIVATE_KEY"))
    if err != nil { return nil, err }
    
    fromAddress := crypto.PubkeyToAddress(*privateKey.Public().(*ecdsa.PublicKey))
    
    nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
    if err != nil { return nil, err }
    
    gasPrice, err := client.SuggestGasPrice(context.Background())
    if err != nil { return nil, err }
    
    auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(chainID))
    if err != nil { return nil, err }
    
    auth.Nonce = big.NewInt(int64(nonce))
    auth.Value = big.NewInt(0)
    auth.GasLimit = uint64(300000)
    auth.GasPrice = gasPrice
    
    return auth, nil
}


func loadDeploymentInfo(filename string) (*DeploymentInfo, error) {
	// Assumes deployments are in a folder relative to the service file
	path := filepath.Join("..", "deployments", filename)
	file, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("could not read deployment file %s: %v", path, err)
	}
	var info DeploymentInfo
	if err := json.Unmarshal(file, &info); err != nil {
		return nil, fmt.Errorf("could not parse deployment file %s: %v", path, err)
	}
	return &info, nil
}
