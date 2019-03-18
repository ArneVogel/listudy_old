package handler

import (
	"log"
	"net/http"
	"time"

	"../database"
	"../utils"

	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo"
)

type AuthHandler utils.Handler

func (h *AuthHandler) LoginPOSTHandler(c echo.Context) error {
	username := database.EscapeString(c.FormValue("username"))
	password := database.EscapeString(c.FormValue("password"))

	stmt, err := h.DB.Prepare("select password, salt from user where name = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var passwordHash string
	var salt string

	stmt.QueryRow(username).Scan(&passwordHash, &salt)

	// Throws unauthorized error
	if !utils.PasswordEqualsHash(password, salt, passwordHash) {
		return echo.ErrUnauthorized
	}

	// Create token
	token := jwt.New(jwt.SigningMethodHS256)

	// Set claims
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = username
	claims["title"] = "GM"
	claims["loggedin"] = true
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix()

	// Generate encoded token and send it as response.
	t, err := token.SignedString([]byte(utils.Env("secret")))
	if err != nil {
		return err
	}

	cookie := new(http.Cookie)
	cookie.Name = "jwt"
	cookie.Value = t
	cookie.Expires = time.Now().Add(24 * time.Hour)
	c.SetCookie(cookie)
	return c.Redirect(303, "http://localhost:8000")
}

func LoginGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "login.html", utils.ClaimsForRender(c.Cookies()))
}

func LogoutHandler(c echo.Context) error {
	cookie := new(http.Cookie)
	cookie.Name = "jwt"
	cookie.Value = ""
	c.SetCookie(cookie)
	return c.Redirect(303, "http://localhost:8000")
}

func (h *AuthHandler) RegisterPOSTHandler(c echo.Context) error {
	username := database.EscapeString(c.FormValue("username"))
	password := database.EscapeString(c.FormValue("password"))
	salt := utils.Salt(20)

	if database.UserExists(username, h.DB) {
		return echo.ErrUnauthorized
	}

	hash := utils.Hash(password, salt)

	tx, err := h.DB.Begin()
	if err != nil {
		log.Fatal(err)
	}
	stmt, err := tx.Prepare("insert into user(name, title, password, salt) values(?, ?, ?, ?)")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(username, "", hash, salt)
	if err != nil {
		log.Fatal(err)
	}
	tx.Commit()

	return c.Redirect(303, "http://localhost:8000")
}

func RegisterGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "register.html", utils.ClaimsForRender(c.Cookies()))
}
