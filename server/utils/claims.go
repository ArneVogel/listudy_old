package utils

import (
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
)

func EmptyClaim() jwt.MapClaims {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = ""
	claims["loggedin"] = false
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix()
	return claims
}

func ClaimsForRender(cookies []*http.Cookie) map[string]interface{} {

	var claims jwt.MapClaims = nil
	if JWTCookieExists(cookies) {
		cookie := getCookieValue(cookies, "jwt")
		claims = GetClaims(cookie)
	} else {
		claims = EmptyClaim()
	}
	return map[string]interface{}{
		"name":     claims["username"],
		"loggedin": claims["loggedin"],
		"root_url": Env("root_url"),
	}
}

//Assumes a cookie with the name exists
func getCookieValue(cookies []*http.Cookie, name string) string {
	value := ""
	for _, cookie := range cookies {
		if cookie.Name == name {
			value = cookie.Value
		}
	}
	return value
}
