package utils

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func Env(env string) string {
	err := godotenv.Load()
	if err != nil {
		log.Println("error loading .env file")
	}
	return os.Getenv(env)
}
