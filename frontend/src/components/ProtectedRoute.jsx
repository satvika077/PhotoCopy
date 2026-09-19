import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export function ProtectedRoute({ role }) { const { user, profile, loading } = useAuth(); const location = useLocation(); if (loading) return <div className="screen-state">Loading your workspace…</div>; if (!user) return <Navigate to="/login" state={{ from: location }} replace />; if (role && profile?.role !== role) return <Navigate to={profile?.role === 'shop_owner' ? '/owner' : '/dashboard'} replace />; return <Outlet />; }
