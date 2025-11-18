#!/bin/bash

# Bring up the network
docker-compose up -d

# Wait for nodes to start
echo "Waiting for nodes to start..."
sleep 10

# Create Channel
echo "Creating channel..."
docker exec cli peer channel create -o orderer.example.com:7050 -c mychannel -f //opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --outputBlock //opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/mychannel.block --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Join Peer to Channel
echo "Joining peer to channel..."
docker exec cli peer channel join -b //opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/mychannel.block

# Update Anchor Peers
echo "Updating anchor peers..."
docker exec cli peer channel update -o orderer.example.com:7050 -c mychannel -f //opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx --tls --cafile //opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
