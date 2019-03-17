package utils

import (
	"net/http"

	"github.com/dgrijalva/jwt-go"
)

func GetClaims(cookie string) jwt.MapClaims {
	token, _ := jwt.Parse(cookie, func(token *jwt.Token) (interface{}, error) {
		return []byte("secret"), nil
	})
	return token.Claims.(jwt.MapClaims)
}

func JWTCookieExists(cookies []*http.Cookie) bool {
	for _, cookie := range cookies {
		if cookie.Name == "jwt" {
			return cookie.Value != ""
		}
	}
	return false
}
