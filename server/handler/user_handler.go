package handler

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"../database"
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

	//studies created by the user
	study_ids, study_titles := studiesFromUser(userProfile, h.DB)
	b["study_ids"] = study_ids
	b["study_titles"] = study_titles

	b["delete_option"] = userProfile == b["name"].(string)

	//studies favorited by the user
	study_ids, study_titles, study_creator := favoriteStudies(database.UserIdFromName(userProfile, h.DB), h.DB)
	b["favorites_ids"] = study_ids
	b["favorites_titles"] = study_titles
	b["favorites_creator"] = study_creator

	return c.Render(http.StatusOK, "user.html", b)
}

func userFromURL(url string) string {
	url = strings.Split(url, "?")[0]
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
		log.Println(err)
	}
	defer stmt.Close()

	rows, err := stmt.Query(user)
	if err != nil {
		log.Println(err)
	}
	defer rows.Close()

	for rows.Next() {
		rows.Scan(&study, &title)
		studies = append(studies, study)
		titles = append(titles, title)
	}

	return studies, titles
}

func favoriteStudies(user_id int, db *sql.DB) ([]string, []string, []string) {
	stmt, err := db.Prepare("SELECT s.id, s.title, u.name from study s join vote v join user u where s.id = v.study_id and s.user_id = u.id and v.user_id = ? and u.id != ?;")
	if err != nil {
		log.Print(err)
	}
	defer stmt.Close()

	var studyID string
	var title string
	var creator string
	var studies []string
	var titles []string
	var creators []string

	rows, err := stmt.Query(user_id, user_id)
	if err != nil {
		log.Print(err)
	}
	defer rows.Close()

	for rows.Next() {
		rows.Scan(&studyID, &title, &creator)
		studies = append(studies, studyID)
		titles = append(titles, title)
		creators = append(creators, creator)
	}

	return studies, titles, creators
}
