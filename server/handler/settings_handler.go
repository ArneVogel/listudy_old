package handler

import (
	"log"
	"net/http"

	"../database"
	"../utils"

	"github.com/labstack/echo"
)

type SettingsHandler utils.Handler

func (h *SettingsHandler) ChangePasswordHandler(c echo.Context) error {
	claims := utils.ClaimsForRender(c.Cookies())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}

	currpass := database.EscapeString(c.FormValue("currpass"))
	newpass := database.EscapeString(c.FormValue("newpass"))

	stmt, err := h.DB.Prepare("select password, salt from user where name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var passwordHash string
	var salt string

	stmt.QueryRow(name).Scan(&passwordHash, &salt)

	// Throws unauthorized error
	if !utils.PasswordEqualsHash(currpass, salt, passwordHash) {
		return echo.ErrUnauthorized
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err = tx.Prepare("UPDATE user SET password = ? WHERE name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	hash := utils.Hash(newpass, salt)
	_, err = stmt.Exec(hash, name)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.Redirect(303, utils.Env("root_url"))
}

func (h *SettingsHandler) DeleteAccount(c echo.Context) error {
	claims := utils.ClaimsForRender(c.Cookies())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err := tx.Prepare("DELETE from user WHERE name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(name)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.Redirect(303, utils.Env("root_url")+"logout")
}

func SettingsGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "settings.html", utils.ClaimsForRender(c.Cookies()))
}
