package db

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type User struct {
	gorm.Model
	Username string `gorm:"uniqueIndex"`
	Password string
	Role     string // "student", "merchant", "admin"
	WalletID string `gorm:"uniqueIndex"`
}

func Init() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Default for local development if not set
		dsn = "host=localhost user=postgres password=postgres dbname=vapcoin port=5432 sslmode=disable"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		// For MVP, we might want to continue even if DB fails initially (e.g. if container starting)
		// But usually we should fail.
		return
	}

	// Auto Migrate
	err = DB.AutoMigrate(&User{})
	if err != nil {
		log.Printf("Failed to migrate database: %v", err)
	}

	// Seed default users if empty
	seedUsers()
}

func seedUsers() {
	var count int64
	DB.Model(&User{}).Count(&count)
	if count == 0 {
		users := []User{
			{Username: "admin", Password: "password", Role: "admin", WalletID: "admin"},
			{Username: "student1", Password: "password", Role: "student", WalletID: "student1"},
			{Username: "merchant1", Password: "password", Role: "merchant", WalletID: "merchant1"},
		}
		DB.Create(&users)
		fmt.Println("Seeded default users")
	}
}
