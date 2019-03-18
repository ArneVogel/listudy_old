package handler

import (
	"io"
	"log"
	"net/http"
	"os"

	"../database"
	"../utils"
	"github.com/labstack/echo"
)

//id text, pgn text, title text

type StudyHandler utils.Handler

func CreateStudyGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "create_study.html", utils.ClaimsForRender(c.Cookies()))
}

func (h *StudyHandler) CreateStudyPOSTHandler(c echo.Context) error {

	title := database.EscapeStringWithSpaces(c.FormValue("title"))
	id := utils.Salt(7)
	claims := utils.ClaimsForRender(c.Cookies())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}
	user_id := 1

	file, err := c.FormFile("pgn")
	if err != nil {
		return err
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(utils.Env("pgn_folder") + id + ".pgn")
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Fatal(err)
	}
	stmt, err := tx.Prepare("insert into study(id, user_id, title) values(?, ?, ?)")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, user_id, title)
	if err != nil {
		log.Fatal(err)
	}
	tx.Commit()

	return c.Redirect(303, "http://localhost:8000")
}
