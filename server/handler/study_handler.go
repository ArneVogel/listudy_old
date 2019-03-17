package handler

import (
	"bytes"
	"io"
	"log"
	"net/http"

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

	title := database.EscapeString(c.FormValue("title"))
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

	buffer := bytes.NewBuffer(make([]byte, 0))

	if _, err = io.Copy(buffer, src); err != nil {
		return err
	}

	pgn := buffer.String()

	tx, err := h.DB.Begin()
	if err != nil {
		log.Fatal(err)
	}
	stmt, err := tx.Prepare("insert into study(id, user_id, pgn, title) values(?, ?, ?, ?)")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, user_id, pgn, title)
	if err != nil {
		log.Fatal(err)
	}
	tx.Commit()

	return c.Redirect(303, "http://localhost:8000")
}
