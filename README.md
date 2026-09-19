# QuickPrint MVP

A lightweight MVP for the Xerox booking platform that lets users:
- register or log in
- browse nearby xerox shops
- compare price estimates
- place an order
- track order status

This repository contains a simple Node.js + Express backend and a React + Vite frontend.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Data: In-memory store for MVP demo
- Authentication: JWT-based mock auth

## Quick start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API runs at: http://localhost:5000

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

## Demo flow
1. Register a customer account
2. Allow geolocation or use default coordinates
3. Select a nearby shop
4. Fill order requirements and submit
5. View generated order summary and tracking details

## Notes
This is intentionally built as an MVP for demo and hackathon purposes. It uses in-memory data instead of a production database and cloud services.
