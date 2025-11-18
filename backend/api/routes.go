package api

import (
	"fmt"
	"net/http"
	"vapcoin-backend/blockchain"
	"vapcoin-backend/db"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/login", login)
	r.GET("/balance/:id", getBalance)
	r.POST("/transfer", transfer)
	r.GET("/history/:id", getHistory)
	r.GET("/transactions", getAllTransactions)
	r.POST("/mint", mint)
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

	// In a real app, generate JWT here. For MVP, just return user info
	c.JSON(http.StatusOK, gin.H{
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

	result, err := blockchain.Contract.EvaluateTransaction("GetHistory", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"history": string(result)})
}

func getAllTransactions(c *gin.Context) {
	result, err := blockchain.Contract.EvaluateTransaction("GetAllTransactions")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transactions": string(result)})
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
