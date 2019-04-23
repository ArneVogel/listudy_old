package handler

import (
	"net/http"

	"../database"
	"../utils"
	"github.com/labstack/echo"
)

type StudiesHandler utils.Handler

func (h *StudiesHandler) StudiesGETHandler(c echo.Context) error {
	var maxResults int = 10;
	info := utils.ClaimsForRender(c.Cookies())
	info["query"] = c.FormValue("query")
	info["sortby"] = c.FormValue("sortby")
	switch info["sortby"] {
		case "newest":
			studies, counts, names, titles := database.NewestStudies(info["query"].(string), maxResults, h.DB)
			info["studies"], info["counts"], info["names"], info["titles"] = studies, counts, names, titles
		case "mostvotes":
			studies, counts, names, titles := database.TopStudies(info["query"].(string), maxResults, h.DB)
			info["studies"], info["counts"], info["names"], info["titles"] = studies, counts, names, titles
		default: // (default is the same as newest, for now)
			studies, counts, names, titles := database.NewestStudies(info["query"].(string), maxResults, h.DB)
			info["studies"], info["counts"], info["names"], info["titles"] = studies, counts, names, titles
	}
	return c.Render(http.StatusOK, "studies.html", info)
}