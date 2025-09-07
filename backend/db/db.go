package db

import (
	"database/sql"
	"fmt"
)

var DB *sql.DB

func InitDB(connString string) error {
	if connString == "" {
		fmt.Println("No DB connection string provided. Running with mock data.")
		return nil
	}
	db, err := sql.Open("postgres", connString)
	if err != nil {
		return err
	}
	err = db.Ping()
	if err != nil {
		return err
	}
	DB = db
	fmt.Println("Connected to the database successfully.")
	return nil
}
