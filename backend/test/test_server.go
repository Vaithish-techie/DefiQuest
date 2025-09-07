package main

import (
	"fmt"

	"gofr.dev/pkg/gofr"
)

func main() {
	app := gofr.New()

	app.GET("/api/health", func(ctx *gofr.Context) (interface{}, error) {
		return map[string]string{
			"status": "healthy",
		}, nil
	})

	fmt.Println("✅ Test Server running on http://localhost:8000")
	app.Run()
}
