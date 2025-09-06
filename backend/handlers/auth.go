package handlers

import (
    "math/rand"
    "strconv"
    "time"

    "github.com/gofiber/fiber/v2"
)

var nonceStore = make(map[string]string)

func GetNonce(c *fiber.Ctx) error {
    type req struct {
        Address string `json:"address"`
    }
    var body req
    if err := c.BodyParser(&body); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }
    nonce := generateNonce()
    nonceStore[body.Address] = nonce
    return c.JSON(fiber.Map{"nonce": nonce})
}

func VerifySignature(c *fiber.Ctx) error {
    type req struct {
        Address   string `json:"address"`
        Signature string `json:"signature"`
    }
    var body req
    if err := c.BodyParser(&body); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }
    if _, ok := nonceStore[body.Address]; !ok {
        return c.Status(400).JSON(fiber.Map{"error": "Nonce not found"})
    }
    // For demo, skip signature verification.
    token := "dummy-jwt-" + body.Address
    return c.JSON(fiber.Map{"token": token})
}

func generateNonce() string {
    rand.Seed(time.Now().UnixNano())
    return strconv.Itoa(100000 + rand.Intn(900000))
}
