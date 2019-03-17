package handler

import (
	"net/http"

	"../utils"
	"github.com/labstack/echo"
)

//id text, pgn text, title text

type StudyHandler utils.Handler

func CreateStudyGETHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "create_study.html", utils.ClaimsForRender(c.Cookies()))
}
