package database

import (
	"database/sql"
	"log"
	"os"
	"regexp"

	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

func Create_db() {
	db, err := sql.Open("sqlite3", DB_name())
	if err != nil {
		log.Fatal(err)
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
			pgn text not null, 
			title text not null,
			foreign key(user_id) references user(id) 
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
			foreign key(user_id) references user(id), 
			foreign key(study_id) references study(id)
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
			foreign key(user_id) references user(id), 
			foreign key(study_id) references study(id)
		);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Printf("%q: %s", err, sqlStmt)
	}
}

func DB_exists() bool {
	return file_exists(DB_name())
}

func file_exists(f string) bool {
	_, err := os.Stat(f)
	if os.IsNotExist(err) {
		return false
	}
	return err == nil
}

func DB_name() string {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("error loading .env file")
	}
	return os.Getenv("database_name")
}

func EscapeString(s string) string {
	reg, err := regexp.Compile("[^a-zA-Z0-9]+")
	if err != nil {
		log.Fatal(err)
	}
	return reg.ReplaceAllString(s, "")
}

func UserExists(user string, db *sql.DB) bool {

	stmt, err := db.Prepare("select id from user where name = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var id int = 0
	stmt.QueryRow(user).Scan(&id)

	return id != 0
}

//assumes user exists
func UserIdFromName(user string, db *sql.DB) int {
	stmt, err := db.Prepare("select id from user where name = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var id int = 0
	stmt.QueryRow(user).Scan(&id)

	return id

}
