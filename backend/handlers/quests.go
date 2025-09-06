package handlers

import (
    "fmt"
    "github.com/gofiber/fiber/v2"
    "strconv"
    "time"
)

// Quest Types and Structs

type QuestType string

const (
    QuestQuiz  QuestType = "quiz"
    QuestHabit QuestType = "habit"
    QuestVideo QuestType = "video"
)

type Question struct {
    ID         int      `json:"id"`
    Text       string   `json:"text"`
    Type       string   `json:"type"`
    Choices    []string `json:"choices"`
    CorrectIdx int      `json:"correct_index"`
}

type Quest struct {
    ID          int        `json:"id"`
    Title       string     `json:"title"`
    Description string     `json:"description"`
    Type        QuestType  `json:"type"`
    XPReward    int        `json:"xp_reward"`
    Questions   []Question `json:"questions,omitempty"`
}

var quests = []Quest{
    {
        ID:          1,
        Title:       "DeFi Basics Quiz",
        Description: "Test your knowledge on DeFi fundamentals.",
        Type:        QuestQuiz,
        XPReward:    50,
        Questions: []Question{
            {ID: 1, Text: "What does DeFi stand for?", Type: "multiple-choice", Choices: []string{"Decentralized Finance", "Defined Finance", "Deleted Finance"}, CorrectIdx: 0},
            {ID: 2, Text: "Which blockchain is most popular for DeFi?", Type: "multiple-choice", Choices: []string{"Ethereum", "Bitcoin", "Ripple"}, CorrectIdx: 0},
            {ID: 3, Text: "What is a smart contract?", Type: "multiple-choice", Choices: []string{"Code on blockchain", "Legal contract", "Crypto wallet"}, CorrectIdx: 0},
        },
    },
    {
        ID:          2,
        Title:       "Daily Learning Habit",
        Description: "Spend 30 minutes learning DeFi every day.",
        Type:        QuestHabit,
        XPReward:    20,
    },
    {
        ID:          3,
        Title:       "Watch 'Intro to DeFi' Video",
        Description: "Watch a 10-minute introduction to decentralized finance.",
        Type:        QuestVideo,
        XPReward:    40,
    },
    {
        ID:          4,
        Title:       "Advanced DeFi Quiz",
        Description: "Challenge yourself with advanced questions.",
        Type:        QuestQuiz,
        XPReward:    70,
        Questions: []Question{
            {ID: 4, Text: "What defines a liquidity pool?", Type: "multiple-choice", Choices: []string{"Smart contract with pooled assets", "A blockchain node", "Crypto wallet"}, CorrectIdx: 0},
            {ID: 5, Text: "Yield farming provides?", Type: "multiple-choice", Choices: []string{"Interest income", "Legal advice", "Crypto mining"}, CorrectIdx: 0},
            {ID: 6, Text: "Which token standard is commonly used for DeFi?", Type: "multiple-choice", Choices: []string{"ERC-20", "ERC-721", "BTC"}, CorrectIdx: 0},
        },
    },
}

type CompleteQuestRequest struct {
    UserAddress string         `json:"userAddress"`
    Answers     map[int]int    `json:"answers,omitempty"`
    Proof       map[string]any `json:"proof,omitempty"`
}

func ListQuests(c *fiber.Ctx) error {
    return c.JSON(quests)
}

func GetQuest(c *fiber.Ctx) error {
    idStr := c.Params("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "Invalid quest id")
    }
    for _, q := range quests {
        if q.ID == id {
            return c.JSON(q)
        }
    }
    return fiber.NewError(fiber.StatusNotFound, "Quest not found")
}

func CompleteQuest(c *fiber.Ctx) error {
    idStr := c.Params("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "Invalid quest id")
    }

    var req CompleteQuestRequest
    if err := c.BodyParser(&req); err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "Request invalid")
    }

    var quest *Quest
    for _, q := range quests {
        if q.ID == id {
            quest = &q
            break
        }
    }
    if quest == nil {
        return fiber.NewError(fiber.StatusNotFound, "Quest not found")
    }

    // Validate quiz answers if it's a quiz quest
    if quest.Type == QuestQuiz {
        correct := 0
        for _, question := range quest.Questions {
            ans, ok := req.Answers[question.ID]
            if ok && ans == question.CorrectIdx {
                correct++
            }
        }
        if correct != len(quest.Questions) {
            return fiber.NewError(fiber.StatusBadRequest, "Not all answers correct")
        }
    }

    // Record completion
    mu.Lock()
    if userCompletions[req.UserAddress] == nil {
        userCompletions[req.UserAddress] = make(map[int]time.Time)
    }
    userCompletions[req.UserAddress][id] = time.Now()
    mu.Unlock()

    // Queue NFT minting
    tokenURI := fmt.Sprintf("https://defiquest.com/metadata/%d", id)
    rarity := 0 // Common badge
    if quest.XPReward >= 70 {
        rarity = 3 // Legendary
    } else if quest.XPReward >= 50 {
        rarity = 2 // Epic
    } else if quest.XPReward >= 30 {
        rarity = 1 // Rare
    }

    QueueNFTMint(req.UserAddress, id, tokenURI, rarity)

    return c.JSON(fiber.Map{
        "message":  "Quest completed successfully! NFT badge will be minted shortly.",
        "quest_id": id,
        "xp_earned": quest.XPReward,
        "badge_rarity": []string{"Common", "Rare", "Epic", "Legendary"}[rarity],
    })
}

func mintNFTForUser(userAddr string, questID int) {
    // This function is now replaced by the blockchain service
    // Keeping for backward compatibility but it's deprecated
    time.Sleep(time.Second)
    println("Legacy mint function called for user:", userAddr, "quest:", questID)
}
