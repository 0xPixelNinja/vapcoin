#!/bin/bash

docker-compose down --volumes --remove-orphans
rm -rf channel-artifacts
rm -rf crypto-config
