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
git clone <your-repo-url> vapcoin
cd vapcoin
```

## 2. Start the Blockchain Network

The Hyperledger Fabric network must be running before the application starts.

```bash
cd network
chmod +x *.sh

# 1. Generate Crypto Material & Artifacts (Important for fresh install)
./generate.sh

# 2. Start the network (Orderer, Peer, CA)
./start.sh

# 3. Deploy the Smart Contract
./deploy_chaincode.sh
```

Ensure the network is running:
```bash
docker ps
# You should see peer0.org1.example.com, orderer.example.com, etc.
```

## 3. Deploy the Application Stack

Now we can start the Backend, Frontend, and Database. We have configured them to listen on `127.0.0.1` ports 12001 and 12000, so they won't conflict with your host Nginx.

```bash
cd ../deployment
docker-compose -f docker-compose.prod.yaml up -d --build
```

## 4. Configure Host Nginx (HTTP First)

1.  Copy the example configuration to your Nginx sites directory:
    ```bash
    sudo cp nginx_host_example.conf /etc/nginx/sites-available/vapcoin.rkr.cx
    ```
2.  Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/vapcoin.rkr.cx /etc/nginx/sites-enabled/
    ```
3.  Test and Reload Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

## 5. Enable SSL with Certbot

Run Certbot to automatically configure SSL and redirects for your new site.

```bash
sudo certbot --nginx -d vapcoin.rkr.cx
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

## 8. Troubleshooting & Reset

If the network fails to start or you need a clean slate:

```bash
# 1. Stop the App Stack
cd deployment
docker-compose -f docker-compose.prod.yaml down -v

# 2. Stop the Network
cd ../network
./teardown.sh

# 3. Restart from Step 2
```
