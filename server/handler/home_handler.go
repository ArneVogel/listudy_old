package handler

import (
	"net/http"

	"../utils"
	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo"
)

func HomeHandler(c echo.Context) error {
	var claims jwt.MapClaims = nil
	if utils.JWTCookieExists(c.Cookies()) {
		cookie, _ := c.Cookie("jwt")
		claims = utils.GetClaims(cookie.Value)
	} else {
		claims = utils.EmptyClaim()
	}

	return c.Render(http.StatusOK, "home.html", map[string]interface{}{
		"name":     claims["username"],
		"title":    claims["title"],
		"loggedin": claims["loggedin"],
	})
}
