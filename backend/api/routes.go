package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"vapcoin-backend/blockchain"
	"vapcoin-backend/db"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Public Routes
	r.POST("/login", login)
	r.POST("/register", register)
	r.GET("/transaction/:txId", getTransaction)

	// Protected Routes
	protected := r.Group("/")
	protected.Use(AuthMiddleware())
	{
		protected.GET("/balance/:id", getBalance)
		protected.POST("/transfer", transfer)
		protected.GET("/history/:id", getHistory)
		protected.GET("/transactions", getAllTransactions)
		protected.POST("/mint", mint)
		protected.GET("/backup", backup)
		protected.POST("/restore", restore)
	}
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if user exists
	var existingUser db.User
	if result := db.DB.Where("username = ?", req.Username).First(&existingUser); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Create Wallet on Blockchain
	_, err := blockchain.Contract.SubmitTransaction("CreateWallet", req.Username, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create wallet on blockchain: " + err.Error()})
		return
	}

	// Create User in DB
	newUser := db.User{
		Username: req.Username,
		Password: req.Password, // In real app, hash this!
		Role:     req.Role,
		WalletID: req.Username,
	}

	if result := db.DB.Create(&newUser); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user in database"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully"})
}

func backup(c *gin.Context) {
	var users []db.User
	if result := db.DB.Find(&users); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func restore(c *gin.Context) {
	var users []db.User
	if err := c.BindJSON(&users); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	successCount := 0
	for _, user := range users {
		// 1. Restore to DB
		var existingUser db.User
		if result := db.DB.Where("username = ?", user.Username).First(&existingUser); result.Error != nil {
			// User doesn't exist, create
			// Reset ID to 0 to let DB assign new ID or keep it if we want to preserve (usually let DB handle)
			user.ID = 0
			if err := db.DB.Create(&user).Error; err != nil {
				fmt.Printf("Failed to restore user %s: %v\n", user.Username, err)
				continue
			}
		}

		// 2. Ensure Wallet Exists on Chain
		// We try to create it. If it exists, chaincode returns error, which we can ignore or handle.
		// Or we can check balance first.
		_, err := blockchain.Contract.EvaluateTransaction("GetBalance", user.WalletID)
		if err != nil {
			// Wallet likely doesn't exist (or other error). Try creating.
			_, err := blockchain.Contract.SubmitTransaction("CreateWallet", user.WalletID, user.Role)
			if err != nil {
				fmt.Printf("Failed to restore wallet for %s: %v\n", user.Username, err)
			}
		}
		successCount++
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Restored %d users", successCount)})
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user db.User
	result := db.DB.Where("username = ? AND password = ?", req.Username, req.Password).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT
	token, err := GenerateToken(user.Username, user.Role, user.WalletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    token,
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
		"walletId": user.WalletID,
	})
}

func getBalance(c *gin.Context) {
	id := c.Param("id")

	// Call Blockchain
	result, err := blockchain.Contract.EvaluateTransaction("GetBalance", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"balance": string(result)})
}

type TransferRequest struct {
	From   string  `json:"from"`
	To     string  `json:"to"`
	Amount float64 `json:"amount"`
}

func transfer(c *gin.Context) {
	var req TransferRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	result, err := blockchain.Contract.SubmitTransaction("Transfer", req.From, req.To, fmt.Sprintf("%f", req.Amount))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"txId": string(result)})
}

func getHistory(c *gin.Context) {
	id := c.Param("id")
	pageSizeStr := c.DefaultQuery("pageSize", "10")
	bookmark := c.DefaultQuery("bookmark", "")

	result, err := blockchain.Contract.EvaluateTransaction("GetPaginatedTransactions", pageSizeStr, bookmark, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(result, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse chaincode response"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func getAllTransactions(c *gin.Context) {
	pageSizeStr := c.DefaultQuery("pageSize", "10")
	bookmark := c.DefaultQuery("bookmark", "")

	result, err := blockchain.Contract.EvaluateTransaction("GetPaginatedTransactions", pageSizeStr, bookmark, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(result, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse chaincode response"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func getTransaction(c *gin.Context) {
	txId := c.Param("txId")

	result, err := blockchain.Contract.EvaluateTransaction("GetTransaction", txId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	var record map[string]interface{}
	if err := json.Unmarshal(result, &record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse transaction record"})
		return
	}

	c.JSON(http.StatusOK, record)
}

func mint(c *gin.Context) {
	type MintRequest struct {
		Amount float64 `json:"amount"`
	}
	var req MintRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	result, err := blockchain.Contract.SubmitTransaction("Mint", fmt.Sprintf("%f", req.Amount))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"result": string(result)})
}
