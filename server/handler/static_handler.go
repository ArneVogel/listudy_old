package handler

import (
	"net/http"
	"strings"

	"../utils"
	"github.com/labstack/echo"
)

func StaticPageHandler(c echo.Context) error {
	claims := utils.ClaimsForRender(c.Cookies())

	page := pageFromURL(c.Request().URL.String())
	return c.Render(http.StatusOK, page+".html", claims)
}

func pageFromURL(url string) string {
	url = strings.Split(url, "?")[0]
	split := strings.Split(url, "/")
	return split[len(split)-1]
}
