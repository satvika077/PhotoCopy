import { useEffect, useState } from 'react';
import { listenToUserOrders } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
export function useOrders() { const { user, firebaseEnabled } = useAuth(); const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(Boolean(user)); useEffect(() => { if (!user || !firebaseEnabled) { setOrders([]); setLoading(false); return undefined; } return listenToUserOrders(user.uid, (next) => { setOrders(next); setLoading(false); }); }, [user, firebaseEnabled]); return { orders, loading }; }
