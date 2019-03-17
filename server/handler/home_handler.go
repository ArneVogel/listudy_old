package handler

import (
	"net/http"

	"../utils"
	"github.com/labstack/echo"
)

func HomeHandler(c echo.Context) error {
	return c.Render(http.StatusOK, "home.html", utils.ClaimsForRender(c.Cookies()))
}
