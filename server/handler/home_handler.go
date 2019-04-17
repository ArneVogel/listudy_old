package handler

import (
	"net/http"

	"../database"
	"../utils"
	"github.com/labstack/echo"
)

type HomeHandler utils.Handler

func (h *HomeHandler) HomepageHandler(c echo.Context) error {
	studies, counts, names, titles := database.TopStudies(20, h.DB)
	claims := utils.ClaimsForRender(c.Cookies())
	claims["studies"] = studies
	claims["counts"] = counts
	claims["names"] = names
	claims["titles"] = titles
	return c.Render(http.StatusOK, "home.html", claims)
}
