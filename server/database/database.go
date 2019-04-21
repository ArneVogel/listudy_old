package database

import (
	"database/sql"
	"log"
	"os"
	"regexp"

	"../utils"
	_ "github.com/mattn/go-sqlite3"
)

func Create_db() {
	db, err := sql.Open("sqlite3", utils.Env("database_name"))
	if err != nil {
		log.Println(err)
	}
	defer db.Close()

	sqlStmt := `
		create table user (
		id integer not null primary key autoincrement,
		name text unique,
		title text,
		password text,
		salt text,
		created date default CURRENT_DATE
		);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s", err, sqlStmt)
	}
	sqlStmt = `
		create table study(
			id text not null primary key, 
			user_id integer not null, 
			title text not null,
			orientation text not null,
			description text,
			foreign key(user_id) references user(id) on delete cascade
		);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s", err, sqlStmt)
	}
	sqlStmt = `
		create table repetition( 
			id integer not null primary key autoincrement, 
			user_id integer, 
			study_id text, 
			repetition text, 
			foreign key(user_id) references user(id) on delete cascade, 
			foreign key(study_id) references study(id) on delete cascade,
			unique(user_id, study_id)
		);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s", err, sqlStmt)
	}
	sqlStmt = `
		create table vote( 
			id integer not null primary key autoincrement,
			user_id integer, 
			study_id text, 
			foreign key(user_id) references user(id) on delete cascade, 
			foreign key(study_id) references study(id) on delete cascade,
			unique(user_id, study_id)
		);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s", err, sqlStmt)
	}
}

func DB_exists() bool {
	return file_exists(utils.Env("database_name"))
}

func file_exists(f string) bool {
	_, err := os.Stat(f)
	if os.IsNotExist(err) {
		return false
	}
	return err == nil
}

func EscapeString(s string) string {
	reg, err := regexp.Compile("[^a-zA-Z0-9]+")
	if err != nil {
		log.Println(err)
	}
	return reg.ReplaceAllString(s, "")
}

func EscapeStringProgress(s string) string {
	reg, err := regexp.Compile("[^a-zA-Z0-9\\{}:,\"]+")
	if err != nil {
		log.Println(err)
	}
	return reg.ReplaceAllString(s, "")
}

func EscapeStringWithSpaces(s string) string {
	reg, err := regexp.Compile("[^a-zA-Z0-9 ]+")
	if err != nil {
		log.Println(err)
	}
	return reg.ReplaceAllString(s, "")
}

func EscapeStringDescription(s string) string {
	reg, err := regexp.Compile("[^a-zA-Z0-9 \n:/?&.]+")
	if err != nil {
		log.Println(err)
	}
	return reg.ReplaceAllString(s, "")
}

func UserExists(user string, db *sql.DB) bool {

	stmt, err := db.Prepare("select id from user where name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var id int = 0
	stmt.QueryRow(user).Scan(&id)

	return id != 0
}

func UserVotedStudy(user string, study string, db *sql.DB) bool {
	stmt, err := db.Prepare("select v.id from vote v join user u where v.user_id = u.id and v.study_id = ? and u.name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var id int = -1
	stmt.QueryRow(study, user).Scan(&id)

	return id != -1
}

//assumes user exists
func UserIdFromName(user string, db *sql.DB) int {
	stmt, err := db.Prepare("select id from user where name = ?")
	if err != nil {
		log.Println(err)
	}
	defer stmt.Close()

	var id int = 0
	stmt.QueryRow(user).Scan(&id)

	return id

}

func TopStudies(limit int, db *sql.DB) ([]string, []int, []string, []string) {
	stmt, err := db.Prepare("SELECT s.id, count(s.id), u.name, s.title from study s join vote v join user u where s.id = v.study_id and s.user_id = u.id group by s.id order by count(s.id) DESC limit ?;")
	if err != nil {
		log.Print(err)
	}
	defer stmt.Close()

	var studyID string
	var count int
	var userName string
	var title string
	var studies []string
	var counts []int
	var names []string
	var titles []string

	rows, err := stmt.Query(limit)
	if err != nil {
		log.Print(err)
	}
	defer rows.Close()

	for rows.Next() {
		rows.Scan(&studyID, &count, &userName, &title)
		studies = append(studies, studyID)
		counts = append(counts, count)
		names = append(names, userName)
		titles = append(titles, title)
	}

	return studies, counts, names, titles
}
