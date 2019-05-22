package handler

import (
	"bytes"
	"errors"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"../database"
	"../utils"
	"github.com/labstack/echo"
)

type StudyHandler utils.Handler

func CreateStudyGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "create_study.html", utils.ClaimsForRender(c.Cookies()))
}

func StudyTutorialHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "study_tutorial.html", utils.ClaimsForRender(c.Cookies()))
}

func (h *StudyHandler) GetStudyHandler(c echo.Context) error {
	b := utils.ClaimsForRender(c.Cookies())
	studyID := studyIDFromURL(c.Request().URL.String())

	stmt, err := h.DB.Prepare("select s.title, u.name, s.orientation, s.description from study s join user u on s.user_id == u.id where s.id == ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var title string
	var user string
	var orientation string
	var description string
	stmt.QueryRow(studyID).Scan(&title, &user, &orientation, &description)

	var progress string
	stmt, err = h.DB.Prepare("select r.repetition from study s join user u join repetition r where u.id == s.user_id AND u.id = r.user_id and s.id = r.study_id AND u.id = ? AND s.id = ?;")
	stmt.QueryRow(database.UserIdFromName(b["name"].(string), h.DB), studyID).Scan(&progress)

	b["study_title"] = title
	b["creator"] = user
	b["study_id"] = studyID
	b["orientation"] = orientation
	b["progress"] = progress
	b["description"] = description
	b["voted"] = database.UserVotedStudy(b["name"].(string), studyID, h.DB)

	content, err := ioutil.ReadFile(utils.Env("pgn_folder") + studyID + ".pgn")
	if err != nil {
		log.Println(err)
	}

	b["pgn"] = string(content)

	return c.Render(http.StatusOK, "study.html", b)
}

func (h *StudyHandler) DeleteStudy(c echo.Context) error {
	claims := utils.ClaimsForRender(c.Cookies())
	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}

	studyID := studyIDFromURL(c.Request().URL.String())

	//make sure the logged in "name" is the creator of the study (user)
	stmt, err := h.DB.Prepare("select u.name from study s join user u on s.user_id == u.id where s.id == ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var user string
	stmt.QueryRow(studyID).Scan(&user)

	if user != name {
		return echo.ErrUnauthorized
	}

	//delete the study
	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err = tx.Prepare("DELETE from study WHERE id = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(studyID)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.Redirect(303, utils.Env("root_url")+"user/"+name)
}

func (h *StudyHandler) SaveProgress(c echo.Context) error {
	progress := database.EscapeStringProgress(c.FormValue("progress"))
	claims := utils.ClaimsForRender(c.Cookies())
	studyID := studyIDFromURL(c.Request().URL.String())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err := tx.Prepare("INSERT OR REPLACE into repetition(user_id, study_id, repetition) values(?, ?, ?)")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(database.UserIdFromName(name, h.DB), studyID, progress)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.JSON(200, "ok")
}

func (h *StudyHandler) FavoriteStudy(c echo.Context) error {
	claims := utils.ClaimsForRender(c.Cookies())
	studyID := studyIDFromURL(c.Request().URL.String())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err := tx.Prepare("INSERT OR REPLACE into vote(user_id, study_id) values(?, ?)")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(database.UserIdFromName(name, h.DB), studyID)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.JSON(200, "ok")
}

//creates a study with a random name, the pgn is saved in .env pgn_folder
func (h *StudyHandler) CreateStudyPOSTHandler(c echo.Context) error {

	title := database.EscapeStringWithSpaces(c.FormValue("title"))
	description := database.EscapeStringDescription(c.FormValue("description"))
	if len([]rune(title)) <= 0 {
		return errors.New("Title cannot be empty")
	}
	orientation := c.FormValue("orientation")

	//7 random characters a-zA-Z0-9
	id := utils.Salt(7)
	claims := utils.ClaimsForRender(c.Cookies())

	name := claims["name"].(string)
	loggedin := claims["loggedin"].(bool)

	if !database.UserExists(name, h.DB) || !loggedin {
		return echo.ErrUnauthorized
	}
	//user_id := 1

	dst, err := os.Create(utils.Env("pgn_folder") + id + ".pgn")
	if err != nil {
		return err
	}
	defer dst.Close()

	buf := bytes.NewBuffer(nil)

	file, err := c.FormFile("pgn")
	url := c.FormValue("study_link")
	var final_pgn string

	//hasnt uploaded a file or given a link to a lichess study
	if err != nil && url == "" {
		return err
	} else if err == nil {
		// in this branch the content of the uploaded file is processed
		limit, _ := strconv.ParseInt(utils.Env("max_file_size"), 10, 64)
		if file.Size >= limit {
			return errors.New("The file is too big, maximum file size limit: " + strconv.FormatInt(limit/1000000, 10) + "MB")
		}

		//TODO figure out what windows sends as mime type
		//if file.Header["Content-Type"][0] != "application/vnd.chess-pgn" {
		//	return errors.New("Please only upload pgn files")
		//}

		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		io.Copy(buf, src)

		final_pgn = escapeString(string(buf.Bytes()))
	} else if url != "" {
		// here the provided lichess study url is processed

		// make sure this is a lichess study link
		if !strings.HasPrefix(url, "https://lichess.org/study") || strings.HasSuffix(url, "/") {
			return errors.New("Please provide a valid study url like: https://lichess.org/study/lbFL4z6j")
		}

		// download the pgn from lichess
		resp, err := http.Get(url + ".pgn")
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return errors.New("Lichess returned status: " + resp.Status)
		}

		io.Copy(buf, resp.Body)
		final_pgn = escapeString(string(buf.Bytes()))
	} else {
		return errors.New("upload a pgn or provide a link to a lichess study")
	}
	// Copy
	if _, err = io.Copy(dst, strings.NewReader(final_pgn)); err != nil {
		return err
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Println(err)
	}
	stmt, err := tx.Prepare("insert into study(id, user_id, title, orientation, description) values(?, ?, ?, ?, ?)")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, database.UserIdFromName(name, h.DB), title, orientation, description)
	if err != nil {
		log.Println(err)
	}
	tx.Commit()

	return c.Redirect(303, utils.Env("root_url")+"study/"+id)
}

func studyIDFromURL(url string) string {
	url = strings.Split(url, "?")[0]
	split := strings.Split(url, "/")
	return split[len(split)-1]
}

//TODO toughen this up
func escapeString(s string) string {
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s

}
