# Deployment Guide

## Docker Compose (Recommended for local/VPS)

### docker-compose.yml

```yaml
version: '3.9'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

### backend/Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### frontend/Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### frontend/nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Critical for SSE:
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Railway (One-click cloud deploy)

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Add a Redis service
3. Deploy `backend/` as a Python service with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Deploy `frontend/` as a static site (or Node service)
5. Set env variables: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `REDIS_URL`

---

## Render

### Backend (Web Service)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment:** Add `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`

### Frontend (Static Site)
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment:** `VITE_API_URL=https://your-backend.onrender.com/api/v1`

---

## Production Considerations

### SSE & Proxies
SSE requires specific proxy settings to avoid buffering. Always set:
- `X-Accel-Buffering: no`
- `proxy_buffering off` (nginx)
- Timeout > 5 minutes for deep research jobs

### Scaling
For high traffic, replace the in-memory job store with Redis:
```python
# In orchestrator.py, swap:
_jobs: dict[str, ResearchJob] = {}
# with Redis-backed store using redis-py
```

### Rate Limiting
Add rate limiting to avoid API cost spikes:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/research")
@limiter.limit("10/minute")
async def start_research(...):
```
