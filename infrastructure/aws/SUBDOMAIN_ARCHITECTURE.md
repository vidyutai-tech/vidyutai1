# Subdomain Architecture Documentation

## 🏗️ Architecture Overview

The VidyutAI application is deployed with **three separate subdomains** for better separation of concerns and scalability:

```
┌─────────────────────────────────────────────────────────┐
│                    EC2 Instance                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Nginx Reverse Proxy                 │  │
│  │  (Ports 80/443 - SSL Termination)                │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│        ┌─────────────────┼─────────────────┐            │
│        │                 │                 │            │
│  ┌─────▼─────┐   ┌──────▼──────┐   ┌─────▼─────┐      │
│  │ Frontend  │   │   Backend   │   │ AI Service │      │
│  │ Container │   │  Container  │   │ Container  │      │
│  │  Port 80  │   │  Port 3000  │   │ Port 8000  │      │
│  └───────────┘   └─────────────┘   └────────────┘      │
└─────────────────────────────────────────────────────────┘
         │                 │                 │
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
    │ spel.   │      │ api-be.   │    │ api-      │
    │ vidyutai│      │ vidyutai  │    │ python-be │
    │ .in     │      │ .in       │    │ .vidyutai │
    │         │      │           │    │ .in       │
    └─────────┘      └───────────┘    └───────────┘
```

## 🌐 Subdomain Configuration

### 1. Frontend: `spel.vidyutai.in`
- **Purpose:** React application (user interface)
- **Service:** Frontend Docker container (port 8080 internal)
- **Nginx:** Routes all traffic to frontend container
- **SSL:** HTTPS enabled

### 2. Backend API: `api-be.vidyutai.in`
- **Purpose:** Node.js/Express backend API
- **Service:** Backend Docker container (port 3000 internal)
- **Nginx:** Routes all traffic to backend container
- **Endpoints:** `/api/v1/*`, `/socket.io/*` (WebSocket)
- **SSL:** HTTPS enabled

### 3. AI Service API: `api-python-be.vidyutai.in`
- **Purpose:** Python FastAPI AI/ML service
- **Service:** AI Service Docker container (port 8000 internal)
- **Nginx:** Routes all traffic to AI service container
- **Endpoints:** `/api/v1/*` (AI predictions, forecasting, optimization)
- **SSL:** HTTPS enabled

## 📋 DNS Configuration

All three subdomains must point to the same EC2 instance IP:

```
A Record: spel.vidyutai.in        → YOUR_EC2_IP
A Record: api-be.vidyutai.in      → YOUR_EC2_IP
A Record: api-python-be.vidyutai.in → YOUR_EC2_IP
```

## 🔒 SSL Certificate

A single SSL certificate covers all three subdomains:
- `spel.vidyutai.in`
- `www.spel.vidyutai.in`
- `api-be.vidyutai.in`
- `api-python-be.vidyutai.in`

Certificate is obtained via Let's Encrypt and stored in:
- `/etc/letsencrypt/live/spel.vidyutai.in/`
- Copied to: `infrastructure/nginx/ssl/`

## 🔧 Environment Variables

### Frontend (Build-time)
```bash
VITE_API_BASE_URL=https://api-be.vidyutai.in/api/v1
VITE_AI_BASE_URL=https://api-python-be.vidyutai.in
VITE_WS_URL=wss://api-be.vidyutai.in
```

### Backend
```bash
CORS_ORIGIN=https://spel.vidyutai.in,https://api-be.vidyutai.in,https://api-python-be.vidyutai.in
AI_SERVICE_URL=http://ai-service:8000  # Internal Docker network
```

## 🔄 Request Flow

### Frontend Request Flow
```
User Browser
  ↓
https://spel.vidyutai.in
  ↓
Nginx (SSL Termination)
  ↓
Frontend Container (Port 8080)
  ↓
React App loads
  ↓
API calls to: https://api-be.vidyutai.in/api/v1/*
  ↓
Nginx routes to Backend Container (Port 3000)
```

### Backend API Request Flow
```
Frontend/Client
  ↓
https://api-be.vidyutai.in/api/v1/sites
  ↓
Nginx (SSL Termination)
  ↓
Backend Container (Port 3000)
  ↓
Express.js handles request
```

### AI Service Request Flow
```
Backend/Client
  ↓
https://api-python-be.vidyutai.in/api/v1/predictions
  ↓
Nginx (SSL Termination)
  ↓
AI Service Container (Port 8000)
  ↓
FastAPI handles request
```

## 🚀 Deployment Steps

1. **Configure DNS** - Point all three subdomains to EC2 IP
2. **Get SSL Certificate** - Run certbot for all subdomains
3. **Update Environment Variables** - Set correct URLs in docker-compose
4. **Build & Deploy** - Run deployment script

## 📝 Nginx Configuration

The `nginx.prod.conf` file contains three separate `server` blocks:

1. **Server Block 1:** `spel.vidyutai.in` → Frontend
2. **Server Block 2:** `api-be.vidyutai.in` → Backend
3. **Server Block 3:** `api-python-be.vidyutai.in` → AI Service

Each server block:
- Listens on port 443 (HTTPS)
- Uses the same SSL certificate
- Routes to appropriate Docker container
- Includes security headers

## ✅ Benefits of This Architecture

1. **Separation of Concerns:** Each service has its own domain
2. **Scalability:** Can scale services independently
3. **Security:** Better isolation and CORS control
4. **Monitoring:** Easier to monitor each service separately
5. **CDN Ready:** Can add CDN for frontend independently
6. **Load Balancing:** Can add load balancers per service

## 🔍 Verification

After deployment, verify all subdomains:

```bash
# Frontend
curl -I https://spel.vidyutai.in

# Backend
curl -I https://api-be.vidyutai.in/api/v1/health

# AI Service
curl -I https://api-python-be.vidyutai.in/health
```

## 🆘 Troubleshooting

### DNS Issues
- Verify all three A records point to EC2 IP
- Wait 5-30 minutes for DNS propagation
- Check: `dig spel.vidyutai.in`, `dig api-be.vidyutai.in`, `dig api-python-be.vidyutai.in`

### SSL Certificate Issues
- Ensure all domains are in certificate: `sudo certbot certificates`
- Verify DNS is configured before getting certificate
- Check certificate includes all subdomains

### CORS Issues
- Verify `CORS_ORIGIN` in backend includes all subdomains
- Check browser console for CORS errors
- Ensure frontend uses correct API URLs

### Routing Issues
- Check Nginx logs: `docker logs vidyutai-nginx`
- Verify Nginx config: `docker exec vidyutai-nginx nginx -t`
- Check container health: `docker ps`

