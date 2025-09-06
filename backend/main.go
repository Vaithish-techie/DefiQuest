package main

import (
    "log"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"

    "github.com/Vaithish-techie/DefiQuest/backend/db"
    "github.com/Vaithish-techie/DefiQuest/backend/handlers"
)

func main() {
    app := fiber.New(fiber.Config{
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            code := fiber.StatusInternalServerError
            msg := "Internal Server Error"
            if e, ok := err.(*fiber.Error); ok {
                code = e.Code
                msg = e.Message
            }
            c.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSONCharsetUTF8)
            return c.Status(code).JSON(fiber.Map{
                "error":   true,
                "message": msg,
            })
        },
    })

    app.Use(cors.New(cors.Config{
        AllowOrigins:     "http://localhost:8000",
        AllowCredentials: true,
        AllowHeaders:     "Origin, Content-Type, Accept",
    }))

    // Initialize database
    err := db.InitDB("")
    if err != nil {
        log.Fatalf("Database connection failed: %v", err)
    }

    // Initialize blockchain service
    err = handlers.InitBlockchainService()
    if err != nil {
        log.Printf("Warning: Blockchain service initialization failed: %v", err)
        log.Println("NFT minting will be simulated instead of using real blockchain")
    } else {
        log.Println("Blockchain service initialized successfully")
    }

    // Authentication routes
    app.Post("/api/auth/nonce", handlers.GetNonce)
    app.Post("/api/auth/verify", handlers.VerifySignature)

    // Quest routes
    app.Get("/api/quests", handlers.ListQuests)
    app.Get("/api/quest/:id", handlers.GetQuest)
    app.Post("/api/quest/:id/complete", handlers.CompleteQuest)

    // User routes
    app.Get("/api/user/:address/profile", handlers.GetProfile)
    app.Get("/api/user/:address/productivity", handlers.GetProductivity)

    log.Println("DeFiQuest backend server starting on :8081")
    log.Fatal(app.Listen(":8081"))
}
