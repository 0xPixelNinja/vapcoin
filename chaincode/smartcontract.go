package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing the VapCoin
type SmartContract struct {
	contractapi.Contract
}

// UserWallet describes the wallet structure
type UserWallet struct {
	ID      string  `json:"id"`
	Balance float64 `json:"balance"`
	Type    string  `json:"type"` // "student", "merchant", "admin"
}

// TransactionRecord describes a transaction
type TransactionRecord struct {
	TxID      string  `json:"txId"`
	From      string  `json:"from"`
	To        string  `json:"to"`
	Amount    float64 `json:"amount"`
	Timestamp int64   `json:"timestamp"`
	Type      string  `json:"type"` // "mint", "transfer"
}

// InitLedger adds a base set of wallets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	wallets := []UserWallet{
		{ID: "admin", Balance: 1000000, Type: "admin"},
		{ID: "student1", Balance: 100, Type: "student"},
		{ID: "merchant1", Balance: 0, Type: "merchant"},
	}

	for _, wallet := range wallets {
		walletJSON, err := json.Marshal(wallet)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(wallet.ID, walletJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state. %v", err)
		}
	}

	return nil
}

// Mint creates new coins and adds them to the admin wallet
func (s *SmartContract) Mint(ctx contractapi.TransactionContextInterface, amount float64) error {
	// In a real scenario, we would check the client's identity to ensure they are an admin.
	// For this MVP, we will assume the caller is authorized or check the ID passed.
	// However, Fabric CA identity check is better.
	// For simplicity in MVP, we'll just add to the 'admin' wallet.

	walletJSON, err := ctx.GetStub().GetState("admin")
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if walletJSON == nil {
		return fmt.Errorf("the wallet %s does not exist", "admin")
	}

	var wallet UserWallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return err
	}

	wallet.Balance += amount

	walletJSON, err = json.Marshal(wallet)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("admin", walletJSON)
}

// Transfer moves coins from one wallet to another
func (s *SmartContract) Transfer(ctx contractapi.TransactionContextInterface, fromID string, toID string, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("transfer amount must be positive")
	}

	// Get Sender
	fromWalletJSON, err := ctx.GetStub().GetState(fromID)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if fromWalletJSON == nil {
		return fmt.Errorf("sender wallet %s does not exist", fromID)
	}

	var fromWallet UserWallet
	err = json.Unmarshal(fromWalletJSON, &fromWallet)
	if err != nil {
		return err
	}

	if fromWallet.Balance < amount {
		return fmt.Errorf("insufficient funds")
	}

	// Get Receiver
	toWalletJSON, err := ctx.GetStub().GetState(toID)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if toWalletJSON == nil {
		return fmt.Errorf("receiver wallet %s does not exist", toID)
	}

	var toWallet UserWallet
	err = json.Unmarshal(toWalletJSON, &toWallet)
	if err != nil {
		return err
	}

	// Perform Transfer
	fromWallet.Balance -= amount
	toWallet.Balance += amount

	// Update State
	fromWalletJSON, _ = json.Marshal(fromWallet)
	toWalletJSON, _ = json.Marshal(toWallet)

	err = ctx.GetStub().PutState(fromID, fromWalletJSON)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(toID, toWalletJSON)
	if err != nil {
		return err
	}

	// Record Transaction History
	txID := ctx.GetStub().GetTxID()
	timestamp, _ := ctx.GetStub().GetTxTimestamp()

	record := TransactionRecord{
		TxID:      txID,
		From:      fromID,
		To:        toID,
		Amount:    amount,
		Timestamp: timestamp.Seconds,
		Type:      "transfer",
	}

	recordJSON, _ := json.Marshal(record)
	// We use a composite key to store history easily queryable if needed,
	// or just rely on Fabric's built-in history for the key.
	// For MVP, let's just emit an event or rely on GetHistoryForKey.
	// But storing a record is good for the "Block Explorer" if we query by range.

	// Let's create a composite key for the transaction to store it as a separate state object
	// Key: "TX" + TxID
	return ctx.GetStub().PutState("TX_"+txID, recordJSON)
}

// GetBalance returns the balance of a wallet
func (s *SmartContract) GetBalance(ctx contractapi.TransactionContextInterface, id string) (float64, error) {
	walletJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return 0, fmt.Errorf("failed to read from world state: %v", err)
	}
	if walletJSON == nil {
		return 0, fmt.Errorf("the wallet %s does not exist", id)
	}

	var wallet UserWallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return 0, err
	}

	return wallet.Balance, nil
}

// GetHistory returns the transaction history for a specific asset (wallet)
// Note: This uses Fabric's history query which returns modifications to a key
func (s *SmartContract) GetHistory(ctx contractapi.TransactionContextInterface, id string) ([]string, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []string
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// response.Value is the value of the key at that point in time
		// response.TxId is the transaction ID
		// response.Timestamp is the timestamp

		history = append(history, fmt.Sprintf("TxID: %s, Value: %s", response.TxId, string(response.Value)))
	}

	return history, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating vapcoin chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting vapcoin chaincode: %s", err.Error())
	}
}
