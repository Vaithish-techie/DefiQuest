package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gofr.dev/pkg/gofr"
	gofrHTTP "gofr.dev/pkg/gofr/http"

	"github.com/Vaithish-techie/DefiQuest/backend/blockchain"
)

// --- Struct Definitions ---
type HTTPError struct {
	Code    int    `json:"-"`
	Reason  string `json:"reason"`
	Message string `json:"message"`
}
type FlexibleID string

func (fid *FlexibleID) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*fid = FlexibleID(s)
		return nil
	}
	var i int
	if err := json.Unmarshal(data, &i); err == nil {
		*fid = FlexibleID(strconv.Itoa(i))
		return nil
	}
	return fmt.Errorf("ID must be a string or an integer")
}

type AIQuiz struct {
	Topic     string     `json:"topic"`
	Questions []Question `json:"questions"`
}
type Question struct {
	ID         FlexibleID `json:"id"`
	Text       string     `json:"text"`
	Choices    []string   `json:"choices"`
	CorrectIdx int        `json:"correct_index"`
}
type GenerateQuizRequest struct {
	QuestID string `json:"questId"`
}
type SubmitQuizRequest struct {
	UserAddress string         `json:"userAddress"`
	QuestID     string         `json:"questId"`
	Answers     map[string]int `json:"answers"`
}
type Profile struct {
	XP              int                  `json:"xp"`
	Badges          []Badge              `json:"badges"`
	AIText          string               `json:"ai_feedback"`
	Streak          int                  `json:"streak"`
	CompletedQuests map[string]time.Time `json:"completed_quests"`
}
type Badge struct {
	TokenID  string `json:"token_id"`
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
}

// --- Roadmap Data Structures ---
type RoadmapQuest struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	XP              int      `json:"xp"`
	PrerequisiteIDs []string `json:"prerequisites"`
}

var defiRoadmap = []RoadmapQuest{
	{ID: "intro-blockchain", Title: "What is a Blockchain?", Description: "Learn the fundamentals of distributed ledger technology.", XP: 50, PrerequisiteIDs: []string{}},
	{ID: "intro-defi", Title: "Introduction to DeFi", Description: "Discover the world of decentralized finance and its core principles.", XP: 100, PrerequisiteIDs: []string{"intro-blockchain"}},
	{ID: "intro-wallets", Title: "Crypto Wallets", Description: "Understand how to securely store and manage your digital assets.", XP: 100, PrerequisiteIDs: []string{"intro-blockchain"}},
	{ID: "intro-nfts", Title: "NFTs & Digital Ownership", Description: "Explore the basics of Non-Fungible Tokens.", XP: 100, PrerequisiteIDs: []string{"intro-wallets"}},
	{ID: "intermediate-swapping", Title: "Token Swapping", Description: "Learn how to use Decentralized Exchanges (DEXes) like Uniswap.", XP: 150, PrerequisiteIDs: []string{"intro-defi", "intro-wallets"}},
	{ID: "intermediate-yield", Title: "Yield Farming Basics", Description: "Discover how to earn passive income with your crypto assets.", XP: 200, PrerequisiteIDs: []string{"intermediate-swapping"}},
	{ID: "advanced-daos", Title: "Intro to DAOs", Description: "Understand how Decentralized Autonomous Organizations are governed.", XP: 250, PrerequisiteIDs: []string{"intermediate-swapping"}},
	{ID: "advanced-blockdag", Title: "The Rise of BlockDAG", Description: "Learn about the next evolution of blockchain architecture.", XP: 300, PrerequisiteIDs: []string{"intermediate-yield"}},
}

var userCompletions = make(map[string]map[string]time.Time)
var generatedQuizzes = make(map[string]*AIQuiz) // Store quizzes by questID for validation
var blockchainService *blockchain.BlockchainService

// --- Utility Functions ---
func (e *HTTPError) Error() string { return e.Message }
func newHTTPError(code int, reason string) error {
	return &HTTPError{Code: code, Reason: reason, Message: reason}
}
func findQuestByID(questID string) (*RoadmapQuest, bool) {
	for i := range defiRoadmap {
		if defiRoadmap[i].ID == questID {
			return &defiRoadmap[i], true
		}
	}
	return nil, false
}
func extractJSON(raw string) (string, error) {
	startIndex := strings.Index(raw, "{")
	endIndex := strings.LastIndex(raw, "}")
	if startIndex == -1 || endIndex == -1 || endIndex < startIndex {
		return "", fmt.Errorf("could not find valid JSON object in response")
	}
	return raw[startIndex : endIndex+1], nil
}

// --- Middleware & Init ---
func init() {
	_, b, _, _ := runtime.Caller(0)
	basepath := filepath.Dir(b)
	if err := godotenv.Load(filepath.Join(basepath, ".env")); err != nil {
		log.Println("⚠️ No .env file found, using system environment variables")
	} else {
		log.Println("✅ .env loaded successfully")
	}
}

func corsMiddleware() gofrHTTP.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "http://localhost:3000" || origin == "http://localhost:5500" || origin == "http://127.0.0.1:5500" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// --- API Handlers ---
func GetRoadmap(ctx *gofr.Context) (interface{}, error) {
	return defiRoadmap, nil
}

func GenerateQuiz(ctx *gofr.Context) (interface{}, error) {
	var req GenerateQuizRequest
	if err := ctx.Bind(&req); err != nil {
		return nil, newHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	quest, ok := findQuestByID(req.QuestID)
	if !ok {
		return nil, newHTTPError(http.StatusNotFound, "Quest not found")
	}
	fmt.Printf("🧠 Generating quiz for quest: %s\n", quest.Title)
	quiz, err := generateAIQuiz(quest.Title, 3)
	if err != nil {
		log.Printf("❌ Error generating AI quiz: %v", err)
		return nil, newHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Store the quiz for later validation
	generatedQuizzes[req.QuestID] = quiz

	return quiz, nil
}

func SubmitQuiz(ctx *gofr.Context) (interface{}, error) {
	var req SubmitQuizRequest
	if err := ctx.Bind(&req); err != nil {
		return nil, newHTTPError(http.StatusBadRequest, "Invalid request body")
	}
	quest, ok := findQuestByID(req.QuestID)
	if !ok {
		return nil, newHTTPError(http.StatusNotFound, "Quest not found")
	}

	// Get the stored quiz for validation
	storedQuiz, exists := generatedQuizzes[req.QuestID]
	if !exists {
		return nil, newHTTPError(http.StatusBadRequest, "Quiz not found. Please generate a new quiz.")
	}

	analysis, err := analyzeAIQuizAnswers(storedQuiz, req.Answers)
	if err != nil {
		return nil, newHTTPError(http.StatusInternalServerError, err.Error())
	}

	if allOk, ok := analysis["all_correct"].(bool); ok && allOk {
		if userCompletions[req.UserAddress] == nil {
			userCompletions[req.UserAddress] = make(map[string]time.Time)
		}
		userCompletions[req.UserAddress][req.QuestID] = time.Now()

		// Clean up the stored quiz after successful completion
		delete(generatedQuizzes, req.QuestID)

		go mintNFTBadge(req.UserAddress, quest.Title)
	}
	analysis["xp_earned"] = quest.XP
	return analysis, nil
}

func GetProfile(ctx *gofr.Context) (interface{}, error) {
	address := ctx.Param("address")
	if address == "" {
		return nil, newHTTPError(http.StatusBadRequest, "address query parameter is required")
	}
	completedQuests := userCompletions[address]
	if completedQuests == nil {
		completedQuests = make(map[string]time.Time)
	}
	totalXP := 0
	var completedTopics []string
	for questID := range completedQuests {
		if quest, ok := findQuestByID(questID); ok {
			totalXP += quest.XP
			completedTopics = append(completedTopics, quest.Title)
		}
	}

	// Get real NFT balances from blockchain
	var ethereumNFTs, blockdagNFTs int64
	if blockchainService != nil {
		if count, err := blockchainService.CheckNFTBalance(address, blockchain.NetworkEthereum); err == nil {
			ethereumNFTs = count
		}
		if count, err := blockchainService.CheckNFTBalance(address, blockchain.NetworkBlockDAG); err == nil {
			blockdagNFTs = count
		}
	}

	profile := Profile{
		XP:              totalXP,
		Badges:          generateBadges(len(completedQuests), completedTopics),
		AIText:          getAIFeedback(address, len(completedQuests), completedTopics),
		Streak:          calculateStreak(completedQuests),
		CompletedQuests: completedQuests,
	}

	// Add blockchain NFT data to response
	profileData := map[string]interface{}{
		"profile": profile,
		"nft_balances": map[string]int64{
			"ethereum": ethereumNFTs,
			"blockdag": blockdagNFTs,
		},
	}

	return profileData, nil
}

func CheckNFTBalance(ctx *gofr.Context) (interface{}, error) {
	address := ctx.Param("address")
	network := ctx.Param("network")

	if address == "" || network == "" {
		return nil, newHTTPError(http.StatusBadRequest, "address and network parameters are required")
	}

	if blockchainService == nil {
		return nil, newHTTPError(http.StatusServiceUnavailable, "blockchain service not available")
	}

	var networkType blockchain.Network
	switch strings.ToLower(network) {
	case "ethereum", "sepolia":
		networkType = blockchain.NetworkEthereum
	case "blockdag", "primordial":
		networkType = blockchain.NetworkBlockDAG
	default:
		return nil, newHTTPError(http.StatusBadRequest, "unsupported network: use 'ethereum' or 'blockdag'")
	}

	balance, err := blockchainService.CheckNFTBalance(address, networkType)
	if err != nil {
		return nil, newHTTPError(http.StatusInternalServerError, fmt.Sprintf("failed to check balance: %v", err))
	}

	return map[string]interface{}{
		"address": address,
		"network": network,
		"balance": balance,
	}, nil
}
func generateAIQuiz(topic string, numQuestions int) (*AIQuiz, error) {
	apiKey := os.Getenv("PERPLEXITY_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("PERPLEXITY_API_KEY not set")
	}
	prompt := fmt.Sprintf("Return JSON with this exact schema: {\"topic\":\"%s\",\"questions\":[{\"id\":\"1\",\"text\":\"...\",\"choices\":[\"...\"],\"correct_index\":0}]} Generate %d questions about %s.", topic, numQuestions, topic)
	reqBody := map[string]interface{}{
		"model": "sonar-pro",
		"messages": []map[string]string{
			{"role": "system", "content": "You are a helpful assistant. ONLY output valid JSON. Do not include any markdown or explanatory text."},
			{"role": "user", "content": prompt},
		},
	}
	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "https://api.perplexity.ai/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("error unmarshalling AI shell: %w", err)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("invalid AI response: no choices returned")
	}
	cleanJSON, err := extractJSON(result.Choices[0].Message.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to extract JSON from AI content: %w. Raw content: %s", err, result.Choices[0].Message.Content)
	}
	var quizData AIQuiz
	if err := json.Unmarshal([]byte(cleanJSON), &quizData); err != nil {
		return nil, fmt.Errorf("AI returned invalid JSON after cleaning: %w. Cleaned content: %s", err, cleanJSON)
	}
	quizData.Topic = topic
	for i := range quizData.Questions {
		if quizData.Questions[i].ID == "" {
			quizData.Questions[i].ID = FlexibleID(fmt.Sprintf("%d", i+1))
		}
	}
	return &quizData, nil
}
func analyzeAIQuizAnswers(quiz *AIQuiz, answers map[string]int) (map[string]interface{}, error) {
	correctAnswers := 0
	totalQuestions := len(quiz.Questions)

	// Validate each answer
	for _, question := range quiz.Questions {
		questionID := string(question.ID)
		userAnswer, exists := answers[questionID]

		if exists && userAnswer == question.CorrectIdx {
			correctAnswers++
		}
	}

	allCorrect := correctAnswers == totalQuestions
	successRate := float64(correctAnswers) / float64(totalQuestions) * 100

	var feedback string
	switch {
	case allCorrect:
		feedback = fmt.Sprintf("Perfect! You got all %d questions correct! 🎉", totalQuestions)
	case successRate >= 80:
		feedback = fmt.Sprintf("Great job! You got %d out of %d questions correct (%.0f%%).", correctAnswers, totalQuestions, successRate)
	case successRate >= 60:
		feedback = fmt.Sprintf("Good effort! You got %d out of %d questions correct (%.0f%%). Review the topic and try again.", correctAnswers, totalQuestions, successRate)
	default:
		feedback = fmt.Sprintf("You got %d out of %d questions correct (%.0f%%). Study the material more and try again.", correctAnswers, totalQuestions, successRate)
	}

	return map[string]interface{}{
		"success":       allCorrect,
		"all_correct":   allCorrect,
		"correct_count": correctAnswers,
		"total_count":   totalQuestions,
		"success_rate":  successRate,
		"feedback":      feedback,
	}, nil
}
func getAIFeedback(userID string, count int, topics []string) string {
	switch {
	case count == 0:
		return "Welcome to the DeFi Roadmap! Complete your first quest to begin."
	case count < 3:
		return "You're making great progress! Keep exploring the roadmap."
	case count < 6:
		return "Excellent work! You've mastered the fundamentals. Advanced topics await!"
	default:
		return "You are a true DeFi expert! Congratulations on completing the roadmap."
	}
}
func calculateStreak(completions map[string]time.Time) int {
	if len(completions) == 0 {
		return 0
	}
	days := make(map[string]bool)
	for _, t := range completions {
		days[t.Format("2006-01-02")] = true
	}
	streak := 0
	for i := 0; ; i++ {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		if !days[date] {
			break
		}
		streak++
	}
	return streak
}
func generateBadges(count int, topics []string) []Badge {
	badges := []Badge{}
	if count >= 1 {
		badges = append(badges, Badge{"1", "DeFi Explorer", "/badges/explorer.png"})
	}
	if count >= 4 {
		badges = append(badges, Badge{"2", "Topic Juggler", "/badges/juggler.png"})
	}
	if count >= 8 {
		badges = append(badges, Badge{"3", "Roadmap Champion", "/badges/champion.png"})
	}
	for _, topic := range topics {
		if strings.Contains(topic, "Yield Farming") {
			badges = append(badges, Badge{"4", "Master Farmer", "/badges/farmer.png"})
		}
		if strings.Contains(topic, "NFTs") {
			badges = append(badges, Badge{"5", "NFT Connoisseur", "/badges/nft.png"})
		}
	}
	return badges
}
func mintNFTBadge(userAddress string, topic string) {
	log.Printf("🎨 Starting NFT badge minting for user %s on topic %s", userAddress, topic)

	if blockchainService == nil {
		log.Printf("❌ Blockchain service not initialized, cannot mint NFT")
		return
	}

	// Mint on Ethereum Sepolia first
	ethereumTxHash, err := blockchainService.MintBadgeNFT(userAddress, topic, blockchain.NetworkEthereum)
	if err != nil {
		log.Printf("❌ Failed to mint NFT on Ethereum: %v", err)
	} else {
		log.Printf("✅ NFT minted on Ethereum Sepolia - TX: %s", ethereumTxHash)
	}

	// Mint on BlockDAG as well for dual-chain compliance
	blockdagTxHash, err := blockchainService.MintBadgeNFT(userAddress, topic, blockchain.NetworkBlockDAG)
	if err != nil {
		log.Printf("❌ Failed to mint NFT on BlockDAG: %v", err)
	} else {
		log.Printf("✅ NFT minted on BlockDAG Primordial - TX: %s", blockdagTxHash)
	}

	log.Printf("🏆 Badge minting completed for user %s on topic %s", userAddress, topic)
}

// --- Main Application ---
func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️  Warning: Could not load .env file: %v", err)
		log.Println("🔧 Continuing with system environment variables...")
	} else {
		log.Println("✅ Successfully loaded .env file")
	}

	app := gofr.New()
	log.Println("🚀 Starting DeFiQuest Learning Roadmap Backend on port 8000...")

	// Initialize blockchain service
	var err error
	blockchainService, err = blockchain.Initialize()
	if err != nil {
		log.Printf("⚠️  Failed to initialize blockchain service: %v", err)
		log.Println("🔧 The application will continue in simulation mode. Please check your blockchain configuration.")
	} else {
		log.Println("✅ Blockchain service initialized successfully")
	}

	app.UseMiddleware(corsMiddleware())
	app.GET("/api/roadmap", GetRoadmap)
	app.POST("/api/quests/generate", GenerateQuiz)
	app.POST("/api/quests/submit", SubmitQuiz)
	app.GET("/api/profile", GetProfile)
	app.GET("/api/nft/balance/:address/:network", CheckNFTBalance)
	app.GET("/api/health", func(ctx *gofr.Context) (interface{}, error) {
		return map[string]interface{}{
			"status":             "healthy",
			"blockchain_enabled": blockchainService != nil,
		}, nil
	})
	fmt.Println("✅ DeFiQuest Backend running on http://localhost:8000")
	app.Run()
}
