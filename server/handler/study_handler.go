package handler

import (
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"

	"../database"
	"../utils"
	"github.com/labstack/echo"
)

type StudyHandler utils.Handler

func CreateStudyGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "create_study.html", utils.ClaimsForRender(c.Cookies()))
}

func (h *StudyHandler) GetStudyHandler(c echo.Context) error {
	b := utils.ClaimsForRender(c.Cookies())
	studyID := studyIDFromURL(c.Request().URL.String())

	stmt, err := h.DB.Prepare("select s.title, u.name, s.orientation from study s join user u on s.user_id == u.id where s.id == ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var title string
	var user string
	var orientation string

	stmt.QueryRow(studyID).Scan(&title, &user, &orientation)

	b["study_title"] = title
	b["creator"] = user
	b["study_id"] = studyID
	b["orientation"] = orientation

	content, err := ioutil.ReadFile(utils.Env("pgn_folder") + studyID + ".pgn")
	if err != nil {
		log.Fatal(err)
	}

	b["pgn"] = string(content)

	return c.Render(http.StatusOK, "study.html", b)

}

//creates a study with a random name, the pgn is saved in .env pgn_folder
func (h *StudyHandler) CreateStudyPOSTHandler(c echo.Context) error {

	title := database.EscapeStringWithSpaces(c.FormValue("title"))
	orientation := c.FormValue("orientation")
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
	stmt, err := tx.Prepare("insert into study(id, user_id, title, orientation) values(?, ?, ?, ?)")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, user_id, title, orientation)
	if err != nil {
		log.Fatal(err)
	}
	tx.Commit()

	return c.Redirect(303, "http://localhost:8000")
}

func studyIDFromURL(url string) string {
	split := strings.Split(url, "/")
	return split[len(split)-1]
}
