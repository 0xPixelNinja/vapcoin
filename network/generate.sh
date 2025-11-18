#!/bin/bash

export FABRIC_CFG_PATH=${PWD}

# Remove previous crypto material and artifacts
rm -rf crypto-config
rm -rf channel-artifacts
mkdir channel-artifacts

# Generate Crypto Material
echo "Generating crypto material..."
docker run --rm -v "/$(pwd)":/data hyperledger/fabric-tools:2.5 cryptogen generate --config=//data/crypto-config.yaml --output=//data/crypto-config

# Generate Genesis Block
echo "Generating genesis block..."
docker run --rm -v "/$(pwd)":/data -e FABRIC_CFG_PATH=//data hyperledger/fabric-tools:2.5 configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock //data/channel-artifacts/genesis.block

# Generate Channel Transaction
echo "Generating channel transaction..."
docker run --rm -v "/$(pwd)":/data -e FABRIC_CFG_PATH=//data hyperledger/fabric-tools:2.5 configtxgen -profile TwoOrgsChannel -outputCreateChannelTx //data/channel-artifacts/channel.tx -channelID mychannel

# Generate Anchor Peer Update
echo "Generating anchor peer update..."
docker run --rm -v "/$(pwd)":/data -e FABRIC_CFG_PATH=//data hyperledger/fabric-tools:2.5 configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate //data/channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
