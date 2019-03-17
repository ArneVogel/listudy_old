package handler

import (
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

	return c.Render(http.StatusOK, "user.html", b)
}

func userFromURL(url string) string {
	split := strings.Split(url, "/")
	return split[len(split)-1]
}
