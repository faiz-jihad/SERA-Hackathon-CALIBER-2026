# SERA — Production Deployment Guide

---

## 1. Containerized Deployment with Docker & Docker Compose

SERA includes full multi-container **Docker Compose** orchestration for rapid enterprise deployment.

### 1.1 `docker-compose.yml` Architecture

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: sera-postgres
    restart: always
    environment:
      POSTGRES_USER: sera_user
      POSTGRES_PASSWORD: sera_secure_password
      POSTGRES_DB: sera_db
    ports:
      - "5432:5432"
    volumes:
      - sera_pgdata:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sera-backend
    restart: always
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://sera_user:sera_secure_password@db:5432/sera_db
      HOST: 0.0.0.0
      PORT: 8000
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sera-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  sera_pgdata:
```

### 1.2 Running the Production Stack
```bash
cd sera
docker-compose up --build -d
```
Access the application at `http://<server-ip>`.

---

## 2. Nginx Reverse Proxy Configuration

For production bare-metal or cloud VM deployments, configure Nginx as the TLS/HTTPS terminating reverse proxy:

```nginx
server {
    listen 80;
    server_name sera.plant05.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sera.plant05.internal;

    ssl_certificate /etc/ssl/certs/sera.crt;
    ssl_certificate_key /etc/ssl/private/sera.key;

    # Frontend Static Distribution
    location / {
        root /var/www/sera-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Gateway Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```
