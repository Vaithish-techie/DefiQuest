package handlers

import (
    "github.com/gofiber/fiber/v2"
    "time"
)

type ProductivitySummary struct {
    TotalCompleted int `json:"total_completed"`
    CurrentStreak  int `json:"current_streak"`
}

func GetProductivity(c *fiber.Ctx) error {
    userAddr := c.Params("address")

    mu.Lock()
    completions := userCompletions[userAddr]
    mu.Unlock()

    if len(completions) == 0 {
        return c.JSON(ProductivitySummary{0, 0})
    }

    completedDays := map[string]bool{}
    for _, t := range completions {
        completedDays[t.Format("2006-01-02")] = true
    }

    streak := 0
    today := time.Now()
    for i := 0; ; i++ {
        day := today.AddDate(0, 0, -i).Format("2006-01-02")
        if !completedDays[day] {
            break
        }
        streak++
    }

    return c.JSON(ProductivitySummary{
        TotalCompleted: len(completions),
        CurrentStreak:  streak,
    })
}
