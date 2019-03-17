package utils

import (
	"time"

	"github.com/dgrijalva/jwt-go"
)

func EmptyClaim() jwt.MapClaims {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = ""
	claims["title"] = ""
	claims["loggedin"] = false
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix()
	return claims
}
