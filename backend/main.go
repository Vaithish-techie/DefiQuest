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
type HTTPError struct { Code int `json:"-"`; Reason string `json:"reason"`; Message string `json:"message"` }
type FlexibleID string
func (fid *FlexibleID) UnmarshalJSON(data []byte) error { var s string; if err := json.Unmarshal(data, &s); err == nil { *fid = FlexibleID(s); return nil }; var i int; if err := json.Unmarshal(data, &i); err == nil { *fid = FlexibleID(strconv.Itoa(i)); return nil }; return fmt.Errorf("ID must be string or int") }
type AIQuiz struct { Topic string `json:"topic"`; Questions []Question `json:"questions"` }
type Question struct { ID FlexibleID `json:"id"`; Text string `json:"text"`; Choices []string `json:"choices"`; CorrectIdx int `json:"correct_index"` }
type GenerateQuizRequest struct { QuestID string `json:"questId"`; NumQuestions int `json:"num_questions"` }
type SubmitQuizRequest struct { UserAddress string `json:"userAddress"`; QuestID string `json:"questId"`; Questions []Question `json:"questions"`; Answers map[string]int `json:"answers"` }
type Profile struct { XP int `json:"xp"`; Badges []Badge `json:"badges"`; AIText string `json:"ai_feedback"`; Streak int `json:"streak"`; CompletedQuests map[string]time.Time `json:"completed_quests"` }
type Badge struct { TokenID string `json:"token_id"`; Name string `json:"name"`; ImageURL string `json:"image_url"` }
type QuestResource struct { Title string `json:"title"`; URL string `json:"url"` }
type RoadmapQuest struct { ID string `json:"id"`; Title string `json:"title"`; Category string `json:"category"`; Description string `json:"description"`; Introduction string `json:"introduction"`; XP int `json:"xp"`; PrerequisiteIDs []string `json:"prerequisites"`; Resources []QuestResource `json:"resources"` }

// NEW: Structs for advanced analytics
type QuizAttempt struct { QuestID string `json:"questId"`; Score string `json:"score"`; Passed bool `json:"passed"`; Timestamp time.Time `json:"timestamp"` }
type CategoryPerformance struct { Category string `json:"category"`; AverageScore float64 `json:"average_score"`; QuestsAttempted int `json:"quests_attempted"` }
type ProfileAnalytics struct { PerformanceByCategory []CategoryPerformance `json:"performance_by_category"`; MostChallengingQuest *RoadmapQuest `json:"most_challenging_quest"` }
type ProfileResponse struct { Profile Profile `json:"profile"`; Analytics ProfileAnalytics `json:"analytics"` }

var defiRoadmap = []RoadmapQuest{
    {ID: "intro-blockchain", Title: "What is a Blockchain?", Category: "Fundamentals", Description: "Learn the core concepts of distributed ledger technology.", Introduction: "A blockchain is a decentralized, distributed, and oftentimes public, digital ledger consisting of records called blocks that is used to record transactions across many computers so that any involved block cannot be altered retroactively, without the alteration of all subsequent blocks.", XP: 50, PrerequisiteIDs: []string{}, Resources: []QuestResource{{Title: "Blockchain Explained by Investopedia", URL: "https://www.investopedia.com/terms/b/blockchain.asp"}}},
    {ID: "intro-defi", Title: "Introduction to DeFi", Category: "Fundamentals", Description: "Discover the world of decentralized finance.", Introduction: "Decentralized Finance (DeFi) is a blockchain-based form of finance that does not rely on central financial intermediaries such as brokerages, exchanges, or banks to offer traditional financial instruments, and instead utilizes smart contracts on blockchains.", XP: 100, PrerequisiteIDs: []string{"intro-blockchain"}, Resources: []QuestResource{{Title: "DeFi Explained by Coinbase", URL: "https://www.coinbase.com/learn/crypto-basics/what-is-defi"}}},
    {ID: "intro-wallets", Title: "Crypto Wallets", Category: "Fundamentals", Description: "Understand how to securely store and manage assets.", Introduction: "A crypto wallet is a device, physical medium, program or a service which stores the public and/or private keys for cryptocurrency transactions. In addition to this basic function of storing the keys, a cryptocurrency wallet more often also offers the functionality of encrypting and/or signing information.", XP: 100, PrerequisiteIDs: []string{"intro-blockchain"}, Resources: []QuestResource{{Title: "Guide to Crypto Wallets by a16z", URL: "https://a16zcrypto.com/posts/article/a-simple-guide-to-crypto-wallets/"}}},
    {ID: "intermediate-nfts", Title: "NFTs & Digital Ownership", Category: "Intermediate", Description: "Explore the basics of Non-Fungible Tokens.", Introduction: "A non-fungible token (NFT) is a unique and non-interchangeable unit of data stored on a digital ledger (blockchain). NFTs can be used to represent easily-reproducible items such as photos, videos, audio, and other types of digital files as unique items.", XP: 100, PrerequisiteIDs: []string{"intro-wallets"}, Resources: []QuestResource{{Title: "NFTs, Explained by a16z", URL: "https://a16z.com/2021/09/21/nfts-and-a-thousand-true-fans/"}}},
    {ID: "intermediate-swapping", Title: "Token Swapping & DEXes", Category: "Intermediate", Description: "Learn to use Decentralized Exchanges.", Introduction: "A decentralized exchange (DEX) is a peer-to-peer marketplace where transactions occur directly between crypto traders. DEXs are non-custodial, meaning a user remains in control of their private keys when transacting on a DEX platform.", XP: 150, PrerequisiteIDs: []string{"intro-defi", "intro-wallets"}, Resources: []QuestResource{{Title: "What is a DEX? by Gemini", URL: "https://www.gemini.com/cryptopedia/decentralized-exchange-crypto-dex"}}},
    {ID: "advanced-yield", Title: "Yield Farming Basics", Category: "Advanced", Description: "Earn passive income with your crypto assets.", Introduction: "Yield farming, also referred to as liquidity mining, is a way to generate rewards with cryptocurrency holdings. In simple terms, it means locking up cryptocurrencies and getting rewards.", XP: 200, PrerequisiteIDs: []string{"intermediate-swapping"}, Resources: []QuestResource{{Title: "Yield Farming Guide by Chainlink", URL: "https://chain.link/education/yield-farming"}}},
    {ID: "advanced-daos", Title: "Intro to DAOs", Category: "Advanced", Description: "Understand Decentralized Autonomous Organizations.", Introduction: "A decentralized autonomous organization (DAO) is an organization represented by rules encoded as a computer program that is transparent, controlled by the organization members and not influenced by a central government.", XP: 250, PrerequisiteIDs: []string{"intermediate-swapping"}, Resources: []QuestResource{{Title: "DAOs Explained by Aragon", URL: "https://aragon.org/dao"}}},
    {ID: "expert-blockdag", Title: "The Rise of BlockDAG", Category: "Expert", Description: "Learn the next evolution of blockchain architecture.", Introduction: "BlockDAG (Block-Directed Acyclic Graph) is a distributed ledger technology that improves on blockchain by allowing blocks to be added in parallel, leading to higher transaction throughput and scalability.", XP: 300, PrerequisiteIDs: []string{"advanced-yield"}, Resources: []QuestResource{{Title: "BlockDAG Technology Explained", URL: "https://blockdag.network/learn"}}},
}
var userCompletions = make(map[string]map[string]time.Time)
var userQuizAttempts = make(map[string][]QuizAttempt) // NEW: Store all quiz attempts for analytics

func (e *HTTPError) Error() string { return e.Message }
func newHTTPError(code int, reason string) error { return &HTTPError{Code: code, Reason: reason, Message: reason} }
func findQuestByID(questID string) (*RoadmapQuest, bool) { for i := range defiRoadmap { if defiRoadmap[i].ID == questID { return &defiRoadmap[i], true } }; return nil, false }
func extractJSON(raw string) (string, error) { startIndex := strings.Index(raw, "{"); endIndex := strings.LastIndex(raw, "}"); if startIndex == -1 || endIndex == -1 || endIndex < startIndex { return "", fmt.Errorf("could not find valid JSON object") }; return raw[startIndex : endIndex+1], nil }

func init() { _, b, _, _ := runtime.Caller(0); basepath := filepath.Dir(b); if err := godotenv.Load(filepath.Join(basepath, ".env")); err != nil { log.Println("⚠️ .env not found") } else { log.Println("✅ .env loaded") } }
func corsMiddleware() gofrHTTP.Middleware { return func(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { origin := r.Header.Get("Origin"); if origin == "http://localhost:3000" || origin == "http://localhost:5500" || origin == "http://127.0.0.1:5500" { w.Header().Set("Access-Control-Allow-Origin", origin) }; w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization"); w.Header().Set("Access-Control-Allow-Credentials", "true"); if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }; next.ServeHTTP(w, r) })}}

func GetRoadmap(ctx *gofr.Context) (interface{}, error) { return defiRoadmap, nil }
func GetQuest(ctx *gofr.Context) (interface{}, error) { questID := ctx.PathParam("questId"); quest, ok := findQuestByID(questID); if !ok { return nil, newHTTPError(http.StatusNotFound, "Quest not found") }; return quest, nil }
func GenerateQuiz(ctx *gofr.Context) (interface{}, error) { var req GenerateQuizRequest; if err := ctx.Bind(&req); err != nil { return nil, newHTTPError(http.StatusBadRequest, "Invalid body") }; quest, ok := findQuestByID(req.QuestID); if !ok { return nil, newHTTPError(http.StatusNotFound, "Quest not found") }; fmt.Printf("🧠 Generating %d-question quiz for: %s\n", req.NumQuestions, quest.Title); quiz, err := generateAIQuiz(quest.Title, req.NumQuestions); if err != nil { log.Printf("❌ AI Error: %v", err); return nil, newHTTPError(http.StatusInternalServerError, err.Error()) }; return quiz, nil }

func SubmitQuiz(ctx *gofr.Context) (interface{}, error) {
    var req SubmitQuizRequest
    if err := ctx.Bind(&req); err != nil {
        return nil, newHTTPError(http.StatusBadRequest, "Invalid request body")
    }
    quest, ok := findQuestByID(req.QuestID)
    if !ok {
        return nil, newHTTPError(http.StatusNotFound, "Quest not found in roadmap")
    }

    correctCount := 0
    totalQuestions := len(req.Questions)
    for _, q := range req.Questions {
        userAnswer, userAnswered := req.Answers[string(q.ID)]
        if userAnswered && userAnswer == q.CorrectIdx {
            correctCount++
        }
    }
    
    passed := float64(correctCount) / float64(totalQuestions) >= 0.3
    
    score := fmt.Sprintf("%d/%d", correctCount, totalQuestions)
    attempt := QuizAttempt{QuestID: req.QuestID, Score: score, Passed: passed, Timestamp: time.Now()}
    userQuizAttempts[req.UserAddress] = append(userQuizAttempts[req.UserAddress], attempt)

    if passed {
        if userCompletions[req.UserAddress] == nil {
            userCompletions[req.UserAddress] = make(map[string]time.Time)
        }
        userCompletions[req.UserAddress][req.QuestID] = time.Now()
        go mintNFTBadge(req.UserAddress, quest.Title)
    }
    
    return map[string]interface{}{
        "success":       passed,
        "score":         score,
        "xp_earned":     quest.XP,
        "feedback":      fmt.Sprintf("You scored %d out of %d.", correctCount, totalQuestions),
        "quest_id":      req.QuestID,
        "completed_quests": userCompletions[req.UserAddress],
    }, nil
}
func GetProfile(ctx *gofr.Context) (interface{}, error) { 
    address := ctx.Param("address")
    if address == "" { return nil, newHTTPError(http.StatusBadRequest, "address required") }
    
    completedQuests := userCompletions[address]
    if completedQuests == nil { completedQuests = make(map[string]time.Time) }
    
    totalXP := 0
    var completedTopics []string
    for questID := range completedQuests { 
        if quest, ok := findQuestByID(questID); ok { 
            totalXP += quest.XP
            completedTopics = append(completedTopics, quest.Title) 
        } 
    }
    
    profile := Profile{ 
        XP: totalXP, 
        Badges: generateBadges(len(completedQuests), completedTopics), 
        AIText: getAIFeedback(address, len(completedQuests), completedTopics), 
        Streak: calculateStreak(completedQuests), 
        CompletedQuests: completedQuests,
    }
    
    analytics := calculateAnalytics(userQuizAttempts[address])

    return ProfileResponse{Profile: profile, Analytics: analytics}, nil
}

func calculateAnalytics(attempts []QuizAttempt) ProfileAnalytics {
    if len(attempts) == 0 {
        return ProfileAnalytics{}
    }

    categoryScores := make(map[string][]float64)
    categoryAttempts := make(map[string]int)
    for _, attempt := range attempts {
        if quest, ok := findQuestByID(attempt.QuestID); ok {
            var correct, total float64
            fmt.Sscanf(attempt.Score, "%f/%f", &correct, &total)
            if total > 0 {
                score := (correct / total) * 100
                categoryScores[quest.Category] = append(categoryScores[quest.Category], score)
            }
            categoryAttempts[quest.Category]++
        }
    }
    
    var perfByCategory []CategoryPerformance
    for category, scores := range categoryScores {
        var sum float64
        for _, s := range scores { sum += s }
        avg := sum / float64(len(scores))
        perfByCategory = append(perfByCategory, CategoryPerformance{
            Category: category,
            AverageScore: avg,
            QuestsAttempted: categoryAttempts[category],
        })
    }

    attemptCounts := make(map[string]int)
    for _, attempt := range attempts {
        if !attempt.Passed {
            attemptCounts[attempt.QuestID]++
        }
    }
    
    var maxFails int
    var challengingQuestID string
    for questID, fails := range attemptCounts {
        if fails > maxFails {
            maxFails = fails
            challengingQuestID = questID
        }
    }
    
    var mostChallengingQuest *RoadmapQuest
    if challengingQuest, ok := findQuestByID(challengingQuestID); ok {
        mostChallengingQuest = challengingQuest
    }

    return ProfileAnalytics{
        PerformanceByCategory: perfByCategory,
        MostChallengingQuest: mostChallengingQuest,
    }
}

// THE FIX: Access the first element of the 'Choices' slice.
func generateAIQuiz(topic string, numQuestions int) (*AIQuiz, error) {
    apiKey := os.Getenv("PERPLEXITY_API_KEY")
    if apiKey == "" {
        return nil, fmt.Errorf("API key not set")
    }

    prompt := fmt.Sprintf("Generate a %d-question multiple-choice quiz about '%s'. The response must be a single, valid JSON object with the exact schema: {\"topic\":\"%s\",\"questions\":[{\"id\":\"1\",\"text\":\"...\",\"choices\":[\"...\"],\"correct_index\":0}]}", numQuestions, topic, topic)
    reqBody := map[string]interface{}{
        "model": "sonar-pro",
        "messages": []map[string]string{
            {"role": "system", "content": "You are a helpful assistant that only outputs valid, raw JSON. Do not include markdown, code fences, or any explanatory text."},
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
        return nil, err
    }
    if len(result.Choices) == 0 {
        return nil, fmt.Errorf("no choices returned from API")
    }

    // Correctly access the Content from the first element of the slice
    cleanJSON, err := extractJSON(result.Choices[0].Message.Content)
    if err != nil {
        return nil, fmt.Errorf("could not extract JSON: %w. Raw: %s", err, result.Choices[0].Message.Content)
    }

    var quizData AIQuiz
    if err := json.Unmarshal([]byte(cleanJSON), &quizData); err != nil {
        return nil, fmt.Errorf("could not parse JSON: %w. Cleaned: %s", err, cleanJSON)
    }

    quizData.Topic = topic
    for i := range quizData.Questions {
        if quizData.Questions[i].ID == "" {
            quizData.Questions[i].ID = FlexibleID(fmt.Sprintf("%d", i+1))
        }
    }
    return &quizData, nil
}
func getAIFeedback(userID string, count int, topics []string) string { if count == 0 { return "Welcome to the DeFi Roadmap! Your journey begins with the 'What is a Blockchain?' quest. It's the foundation for everything to come. Good luck!" }; if count < 3 { return "Excellent start! You've grasped the fundamentals. Now that you have a secure foundation, try diving into how to use those assets with quests like 'Token Swapping & DEXes'." }; if count < 6 { return "You're now an intermediate user! You've mastered core concepts like DEXes and NFTs. To level up, explore 'Yield Farming' to put your assets to work, or 'DAOs' to understand the future of governance." }; return "You are a true DeFi expert! You've conquered the entire roadmap. Congratulations!" }
func calculateStreak(completions map[string]time.Time) int { if len(completions) == 0 { return 0 }; days := make(map[string]bool); for _, t := range completions { days[t.Format("2006-01-02")] = true }; streak := 0; for i := 0; ; i++ { date := time.Now().AddDate(0, 0, -i).Format("2006-01-02"); if !days[date] { break }; streak++ }; return streak }
func generateBadges(count int, topics []string) []Badge { badges := []Badge{}; if count >= 1 { badges = append(badges, Badge{"1", "DeFi Explorer", "/badges/explorer.png"}) }; if count >= 4 { badges = append(badges, Badge{"2", "Topic Juggler", "/badges/juggler.png"}) }; if count >= 8 { badges = append(badges, Badge{"3", "Roadmap Champion", "/badges/champion.png"}) }; for _, topic := range topics { if strings.Contains(topic, "Yield Farming") { badges = append(badges, Badge{"4", "Master Farmer", "/badges/farmer.png"}) }; if strings.Contains(topic, "NFTs") { badges = append(badges, Badge{"5", "NFT Connoisseur", "/badges/nft.png"}) } }; return badges }
var blockchainService *blockchain.BlockchainService

func mintNFTBadge(userAddress string, topic string) {
	log.Printf("🎨 Starting REAL NFT badge minting for user %s on topic %s", userAddress, topic)
	if blockchainService == nil {
		log.Printf("❌ Blockchain service not initialized, running in SIMULATION MODE.")
		return
	}

	// Create a generic token URI for the badge
	tokenURI := fmt.Sprintf(`{"name": "DeFiQuest Badge: %s", "description": "Proof of completion for the '%s' quest.", "image": "https://yourapi.com/images/badges/%s.png"}`, topic, topic, strings.ToLower(strings.ReplaceAll(topic, " ", "-")))

	// Mint on Ethereum Sepolia
	ethereumTxHash, err := blockchainService.MintBadgeNFT(userAddress, tokenURI, blockchain.NetworkEthereum)
	if err != nil {
		log.Printf("❌ Failed to mint NFT on Ethereum: %v", err)
	} else {
		log.Printf("✅ NFT minted on Ethereum Sepolia - TX: %s", ethereumTxHash)
	}

	// Mint on BlockDAG Testnet
	blockdagTxHash, err := blockchainService.MintBadgeNFT(userAddress, tokenURI, blockchain.NetworkBlockDAG)
	if err != nil {
		log.Printf("❌ Failed to mint NFT on BlockDAG: %v", err)
	} else {
		log.Printf("✅ NFT minted on BlockDAG Primordial - TX: %s", blockdagTxHash)
	}
}

func main() { app := gofr.New(); log.Println("🚀 Starting DeFiQuest Backend..."); 
var err error
	blockchainService, err = blockchain.Initialize()
	if err != nil {
		log.Printf("⚠️ Failed to initialize blockchain service: %v", err)
		log.Println("🔧 The application will continue in SIMULATION mode.")
	} else {
		log.Println("✅ Blockchain service initialized successfully")
	}
app.UseMiddleware(corsMiddleware()); app.GET("/api/roadmap", GetRoadmap); app.GET("/api/quests/{questId}", GetQuest); app.POST("/api/quests/generate", GenerateQuiz); app.POST("/api/quests/submit", SubmitQuiz);
 app.GET("/api/profile", GetProfile); 
 app.GET("/api/health", func(ctx *gofr.Context) (interface{}, error) {
		return map[string]interface{}{
			"status":             "healthy",
			"blockchain_enabled": blockchainService != nil,
		}, nil
	})
 fmt.Println("✅ DeFiQuest Backend running on http://localhost:8000"); app.Run() }
