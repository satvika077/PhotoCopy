# QuickPrint

Production-oriented printing and Xerox booking platform for students and local print shops.

## Architecture
- `frontend`: React + Vite + Tailwind-style design tokens, React Router, Firebase Auth/Firestore/Storage adapters, Leaflet map, role-protected customer/shop-owner workspaces.
- `server`: Express API with modular routes, Firebase Admin verification hooks, Razorpay payment service structure, validation and centralized errors.
- Firebase is the source of truth when configured. The clearly labelled `VITE_DEMO_MODE=true` mode is only for local UI demonstrations without credentials.

## Features
Landing page, email/password and Google auth, role-based routing, document upload to Firebase Storage, configurable pricing, nearby shops/map, multi-step ordering, Razorpay order/verification endpoints, realtime Firestore order listeners, order history, reviews, notifications, customer dashboard, shop-owner dashboard, pricing/shop management, responsive accessibility states.

## Setup

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

See `docs/SETUP.md` for Firebase, Storage, Firestore rules, Maps, Razorpay, Vercel and Render setup.

Never commit `.env` or Firebase Admin private keys.
