#!/bin/bash

set -e

# Use double slash to prevent Git Bash path conversion
CC_NAME="vapcoin"
CC_VERSION="1.1"
CC_SEQUENCE="2"
CC_SRC_PATH="//opt/gopath/src/github.com/chaincode"

echo "Packaging new chaincode version ${CC_VERSION}..."
docker exec cli peer lifecycle chaincode package ${CC_NAME}_${CC_VERSION}.tar.gz --path ${CC_SRC_PATH} --lang golang --label ${CC_NAME}_${CC_VERSION}

echo "Installing new chaincode..."
docker exec cli peer lifecycle chaincode install ${CC_NAME}_${CC_VERSION}.tar.gz

echo "Querying installed chaincode..."
docker exec cli peer lifecycle chaincode queryinstalled >&log.txt
cat log.txt
PACKAGE_ID=$(sed -n "/${CC_NAME}_${CC_VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)

if [ -z "$PACKAGE_ID" ]; then
    echo "Error: Package ID not found. Chaincode installation might have failed."
    exit 1
fi

echo "Package ID: ${PACKAGE_ID}"

echo "Approving chaincode definition for version ${CC_VERSION}..."
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Checking commit readiness..."
docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --output json

echo "Committing chaincode definition..."
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

echo "Chaincode upgraded successfully to version ${CC_VERSION}!"

echo "Running ReindexHistory to migrate old data..."
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n ${CC_NAME} --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"function":"ReindexHistory","Args":[]}'

echo "Migration complete."
