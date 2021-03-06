package handler

import (
	"errors"
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

	stmt, err := h.DB.Prepare("select password from user where name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var passwordHash string

	stmt.QueryRow(username).Scan(&passwordHash)

	// Throws unauthorized error
	if !utils.CheckPasswordHash(password, passwordHash) {
		return echo.ErrUnauthorized
	}

	// Create token
	token := jwt.New(jwt.SigningMethodHS256)

	// Set claims
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = username
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
	return c.Redirect(303, utils.Env("root_url"))
}

func LoginGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "login.html", utils.ClaimsForRender(c.Cookies()))
}

func LogoutHandler(c echo.Context) error {
	cookie := new(http.Cookie)
	cookie.Name = "jwt"
	cookie.Value = ""
	c.SetCookie(cookie)
	return c.Redirect(303, utils.Env("root_url"))
}

func (h *AuthHandler) RegisterPOSTHandler(c echo.Context) error {
	username := database.EscapeString(c.FormValue("username"))
	password := database.EscapeString(c.FormValue("password"))

	if username == "" {
		return errors.New("Please only use alphanumerical characters in the username.")
	}

	if database.UserExists(username, h.DB) {
		return errors.New("That user already exists.")
	}

	if password == "" {
		return errors.New("You must enter a password.")
	}
	if len(username) >= 20 {
		return errors.New("The username may not be longer than 20 characters.")
	} else if len(username) <= 2 {
		return errors.New("The username may not be shorter than 3 characters.")
	}

	hash, _ := utils.Hash(password)

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err := tx.Prepare("insert into user(name, title, password) values(?, ?, ?)")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(username, "", hash)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	// Create token
	token := jwt.New(jwt.SigningMethodHS256)

	// Set claims
	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = username
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

	return c.Redirect(303, utils.Env("root_url")+"thanks-for-registering")
}

func RegisterGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "register.html", utils.ClaimsForRender(c.Cookies()))
}
