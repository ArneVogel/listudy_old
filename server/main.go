package main

import (
	"database/sql"
	"errors"
	"html/template"
	"io"
	"log"

	"./database"
	"./handler"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
)

// Define the template registry struct
type TemplateRegistry struct {
	templates map[string]*template.Template
}

// Implement e.Renderer interface
func (t *TemplateRegistry) Render(w io.Writer, name string, data interface{}, c echo.Context) error {
	tmpl, ok := t.templates[name]
	if !ok {
		err := errors.New("Template not found -> " + name)
		return err
	}
	return tmpl.ExecuteTemplate(w, "base.html", data)
}

func main() {
	if !database.DB_exists() {
		database.Create_db()
	}

	db, err := sql.Open("sqlite3", database.DB_name())
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	//echo instance
	e := echo.New()
	e.Debug = true

	//logger
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: "method=${method}, uri=${uri}, status=${status}, referer=${referer}\n",
	}))

	//serve the static data
	e.Static("/static", "static")

	//templates
	templates := make(map[string]*template.Template)
	templates["home.html"] = template.Must(template.ParseFiles("view/home.html", "view/base.html"))
	templates["login.html"] = template.Must(template.ParseFiles("view/login.html", "view/base.html"))
	templates["register.html"] = template.Must(template.ParseFiles("view/register.html", "view/base.html"))

	e.Renderer = &TemplateRegistry{
		templates: templates,
	}

	e.GET("/", handler.HomeHandler)
	e.POST("/", handler.HomeHandler)
	e.GET("/login", handler.LoginGETHandler)
	e.GET("/logout", handler.LogoutHandler)
	e.GET("/register", handler.RegisterGETHandler)

	h := &handler.AuthHandler{DB: db}
	e.POST("/register", h.RegisterPOSTHandler)
	e.POST("/login", h.LoginPOSTHandler)
	e.Logger.Fatal(e.Start(":8000"))
}
