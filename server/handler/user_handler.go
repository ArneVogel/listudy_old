package handler

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"../utils"
	"github.com/labstack/echo"
)

type UserHandler utils.Handler

func (h *UserHandler) UserGETHandler(c echo.Context) error {
	r := c.Request()
	urlString := r.URL.String()
	userProfile := userFromURL(urlString)

	b := utils.ClaimsForRender(c.Cookies())
	b["userProfile"] = userProfile

	study_ids, study_titles := studiesFromUser(b["name"].(string), h.DB)
	b["study_ids"] = study_ids
	b["study_titles"] = study_titles
	return c.Render(http.StatusOK, "user.html", b)
}

func userFromURL(url string) string {
	split := strings.Split(url, "/")
	return split[len(split)-1]
}

func studiesFromUser(user string, db *sql.DB) ([]string, []string) {
	var studies []string
	var titles []string
	var study string
	var title string

	stmt, err := db.Prepare("select s.id, s.title from study as s join user as u on s.user_id == u.id where u.name = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	rows, err := stmt.Query(user)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		rows.Scan(&study, &title)
		studies = append(studies, study)
		titles = append(titles, title)
	}

	return studies, titles
}
