# Deployment and Firebase setup

1. Create a Firebase project. Enable Email/Password and Google providers under Authentication.
2. Create Firestore and Storage. Add the frontend `VITE_FIREBASE_*` values to `frontend/.env`.
3. Deploy `firestore.rules` and `storage.rules` from the repository. Create indexes for `orders(customerId,createdAt desc)` and `orders(shopId,createdAt desc)` when Firebase requests them.
4. Create a Firebase service account for the backend. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and the escaped `FIREBASE_PRIVATE_KEY` in `server/.env`.
5. Add Razorpay keys only to `server/.env`; expose only the returned key ID to the checkout client. The backend verification endpoint must run before an order is marked paid.
6. Use Leaflet/OpenStreetMap while developing. For a production map SLA, replace the map adapter with Google Maps/MapLibre and set its provider key.
7. Deploy `frontend` to Vercel with `VITE_API_URL` pointing to Render. Deploy `server` to Render with its environment variables and start command `npm start`.

`VITE_DEMO_MODE` is intentionally false by default. Without Firebase, auth and storage show actionable configuration errors instead of silently pretending data is persisted.
