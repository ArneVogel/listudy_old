package main

import (
	"database/sql"
	"errors"
	"html/template"
	"io"
	"log"
	"os"
	"time"

	"./database"
	"./handler"
	"./utils"
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

	db, err := sql.Open("sqlite3", utils.Env("database_name")+"?_foreign_keys=true")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	//echo instance
	e := echo.New()
	e.Debug = true

	//logger
	logTo := os.Stdout
	dt := time.Now()
	dateFormatString := "2006-01-02" // YYYY-MM-DD
	date := dt.Format(dateFormatString)

	//if in the .env something not equal to stdout is given log to the file instead
	if utils.Env("log_prefix") != "stdout" || utils.Env("log_suffix") != "stdout" {
		logTo, _ = os.OpenFile(utils.Env("log_prefix")+date+utils.Env("log_suffix"), os.O_RDWR|os.O_APPEND|os.O_CREATE, 0660)

		//check if the date has changed and update the log output file accordingly
		ticker := time.NewTicker(60 * time.Second)
		go func() {
			for {
				select {
				case <-ticker.C:
					dt := time.Now()
					if dt.Format(dateFormatString) != date {
						date = dt.Format(dateFormatString)
						logTo, _ = os.OpenFile(utils.Env("log_prefix")+date+utils.Env("log_suffix"), os.O_RDWR|os.O_APPEND|os.O_CREATE, 0660)
						e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
							Format: `{"time":"${time_rfc3339}", "method":"${method}", "uri":"${uri}", "status":${status}, "referer":"${referer}"}` + "\n",
							Output: logTo,
						}))

					}
				}
			}
		}()

	}
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Format: `{"time":"${time_rfc3339}", "method":"${method}", "uri":"${uri}", "status":${status}, "referer":"${referer}"}` + "\n",
		Output: logTo,
	}))

	//serve the static data
	e.Static("/static", "static")

	//templates
	templates := make(map[string]*template.Template)
	templates["home.html"] = template.Must(template.ParseFiles("view/home.html", "view/base.html"))
	templates["login.html"] = template.Must(template.ParseFiles("view/login.html", "view/base.html"))
	templates["register.html"] = template.Must(template.ParseFiles("view/register.html", "view/base.html"))
	templates["user.html"] = template.Must(template.ParseFiles("view/user.html", "view/base.html"))
	templates["create_study.html"] = template.Must(template.ParseFiles("view/create_study.html", "view/base.html"))
	templates["study.html"] = template.Must(template.ParseFiles("view/study.html", "view/base.html"))
	templates["settings.html"] = template.Must(template.ParseFiles("view/settings.html", "view/base.html"))
	templates["studies.html"] = template.Must(template.ParseFiles("view/studies.html", "view/base.html"))

	static_pages := []string{"privacy", "tos", "thanks-for-registering"}
	for _, v := range static_pages {
		templates[v+".html"] = template.Must(template.ParseFiles("view/"+v+".html", "view/base.html"))
		e.GET("/"+v, handler.StaticPageHandler)
	}

	e.Renderer = &TemplateRegistry{
		templates: templates,
	}

	e.GET("/login", handler.LoginGETHandler)
	e.GET("/logout", handler.LogoutHandler)
	e.GET("/create-study", handler.CreateStudyGETHandler)
	e.GET("/register", handler.RegisterGETHandler)
	e.GET("/settings", handler.SettingsGETHandler)

	// for making the db connection avaliable in the handler
	ah := &handler.AuthHandler{DB: db}
	sh := &handler.StudyHandler{DB: db}
	uh := &handler.UserHandler{DB: db}
	hh := &handler.HomeHandler{DB: db}
	seh := &handler.SettingsHandler{DB: db}
	sdh := &handler.StudiesHandler{DB: db}

	e.GET("/", hh.HomepageHandler)
	e.POST("/", hh.HomepageHandler)

	e.POST("/register", ah.RegisterPOSTHandler)
	e.POST("/login", ah.LoginPOSTHandler)

	e.POST("/create-study", sh.CreateStudyPOSTHandler)
	e.POST("/study/progress/*", sh.SaveProgress)
	e.POST("/study/favorite/*", sh.FavoriteStudy)
	e.GET("/study/*", sh.GetStudyHandler)
	e.POST("/delete-study/*", sh.DeleteStudy)

	e.GET("/user/*", uh.UserGETHandler)

	e.GET("studies", sdh.StudiesGETHandler)

	e.POST("/change-password", seh.ChangePasswordHandler)
	e.POST("/delete-account", seh.DeleteAccount)

	e.Logger.Fatal(e.Start(":" + utils.Env("port")))
}
