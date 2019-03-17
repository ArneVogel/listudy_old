package utils

import (
	"crypto/sha256"
	"math/rand"
	"strings"
	"time"
)

func Hash(password string, salt string) string {
	passwordSalted := []byte(password + salt)

	h := sha256.New()
	h.Write(passwordSalted)

	return string(h.Sum(nil))
}

func Salt(n int) string {
	rand.Seed(time.Now().UnixNano())
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
		"abcdefghijklmnopqrstuvwxyz" +
		"0123456789")
	var b strings.Builder
	for i := 0; i < n; i++ {
		b.WriteRune(chars[rand.Intn(len(chars))])
	}
	return b.String()
}

func PasswordEqualsHash(password string, salt string, hashedPassword string) bool {
	return Hash(password, salt) == hashedPassword
}
