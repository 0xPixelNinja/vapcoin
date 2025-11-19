# VapCoin Production Deployment Guide

This guide describes how to deploy the VapCoin stack (Blockchain, Backend, Frontend, Database) to a Linux VPS with SSL enabled.

## Prerequisites

- A Linux VPS (Ubuntu 20.04/22.04 recommended).
- Domain name pointing to the VPS IP (e.g., `vapcoin.rkr.cx`).
- Docker and Docker Compose installed.
- Ports 80, 443, 7050, 7051, 7054 open (70xx for Fabric, 80/443 for Web).

## 1. Initial Setup

Clone the repository to your VPS:

```bash
git clone https://github.com/0xPixelNinja/vapcoin vapcoin
cd vapcoin
```

## 2. Start the Blockchain Network

The Hyperledger Fabric network must be running before the application starts.

```bash
cd network
# Start the network (Orderer, Peer, CA)
./start.sh

# Deploy the Smart Contract
./deploy_chaincode.sh
```

Ensure the network is running:
```bash
docker ps
# You should see peer0.org1.example.com, orderer.example.com, etc.
```

## 3. SSL Certificate Setup (Host Nginx)

Since you are running Nginx on the host, you should use your existing Certbot setup to generate certificates for `vapcoin.rkr.cx`.

```bash
sudo certbot certonly --nginx -d vapcoin.rkr.cx
```

## 4. Deploy the Application Stack

Now we can start the Backend, Frontend, and Database. We have configured them to listen on `127.0.0.1` ports 12001 and 12000, so they won't conflict with your host Nginx.

```bash
cd ../deployment
docker-compose -f docker-compose.prod.yaml up -d --build
```

## 5. Configure Host Nginx

1.  Copy the example configuration to your Nginx sites directory:
    ```bash
    sudo cp nginx_host_example.conf /etc/nginx/sites-available/vapcoin.rkr.cx
    ```
2.  Edit the file to ensure the SSL paths match your system:
    ```bash
    sudo nano /etc/nginx/sites-available/vapcoin.rkr.cx
    ```
3.  Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/vapcoin.rkr.cx /etc/nginx/sites-enabled/
    ```
4.  Test and Reload Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

## 6. Verification

1.  **Frontend**: Visit `https://vapcoin.rkr.cx`. You should see the login page.
2.  **Backend API**: Visit `https://vapcoin.rkr.cx/api/transaction/test`. You should get a 404 or 401 (since it's protected or invalid ID), but it confirms the API is reachable.
3.  **Logs**: Check logs if something goes wrong.
    ```bash
    docker-compose -f docker-compose.prod.yaml logs -f backend
    ```

## 7. Maintenance

-   **Renew SSL**: Your host system's Certbot should handle this automatically.
-   **Update App**:
    ```bash
    git pull
    docker-compose -f docker-compose.prod.yaml up -d --build
    ```
-   **Backup DB**:
    ```bash
    docker exec -t vapcoin-db pg_dumpall -c -U postgres > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql
    ```
