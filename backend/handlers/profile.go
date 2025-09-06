package handlers

import (
    "bytes"
    "encoding/json"
    "io/ioutil"
    "net/http"
    "github.com/gofiber/fiber/v2"
    "time"
    "log"
)

type Badge struct {
    TokenID  string `json:"token_id"`
    Name     string `json:"name"`
    ImageURL string `json:"image_url"`
}

type Profile struct {
    XP        int     `json:"xp"`
    Badges    []Badge `json:"badges"`
    AIText    string  `json:"ai_feedback"`
    Streak    int     `json:"streak"`
    Completed int     `json:"completed_quests"`
}

// Safe call to AI microservice with error handling
func getAIAnalysis(userID string, actions []map[string]interface{}) (string, error) {
    payload := map[string]interface{}{
        "user_id": userID,
        "actions": actions,
    }
    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        return "", err
    }

    resp, err := http.Post("http://localhost:5001/analyze", "application/json", bytes.NewBuffer(payloadBytes))
    if err != nil {
        log.Printf("AI microservice POST failed: %v", err)
        return "", err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := ioutil.ReadAll(resp.Body)
        log.Printf("AI microservice returned status %d: %s", resp.StatusCode, string(body))
        return "", fiber.NewError(fiber.StatusBadGateway, "AI service error")
    }

    bodyBytes, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }

    var aiResp map[string]interface{}
    if err := json.Unmarshal(bodyBytes, &aiResp); err != nil {
        return "", err
    }

    aiFeedback, ok := aiResp["ai_feedback"].(string)
    if !ok {
        return "", nil // AI feedback missing but not erroring out
    }
    return aiFeedback, nil
}

func GetProfile(c *fiber.Ctx) error {
    address := c.Params("address")
    completions := userCompletions[address]
    actions := []map[string]interface{}{}
    for questID, t := range completions {
        actions = append(actions, map[string]interface{}{
            "quest_id":  questID,
            "timestamp": t.String(),
        })
    }

    aiFeedback, err := getAIAnalysis(address, actions)
    if err != nil {
        // Log but continue with empty feedback
        log.Printf("AI analysis error for user %s: %v", address, err)
        aiFeedback = "AI feedback unavailable currently."
    }

    profile := Profile{
        XP:        len(completions) * 20,
        Badges:    []Badge{{TokenID: "1", Name: "Welcome Badge", ImageURL: "/badge1.png"}},
        AIText:    aiFeedback,
        Streak:    calculateStreak(completions),
        Completed: len(completions),
    }

    return c.JSON(profile)
}

func calculateStreak(completions map[int]time.Time) int {
    dayMap := map[string]bool{}
    for _, t := range completions {
        key := t.Format("2006-01-02")
        dayMap[key] = true
    }
    streak := 0
    for i := 0; ; i++ {
        day := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
        if !dayMap[day] {
            break
        }
        streak++
    }
    return streak
}
