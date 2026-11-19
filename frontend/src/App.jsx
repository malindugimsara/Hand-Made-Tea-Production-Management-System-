import React, { useState, useEffect, Suspense, lazy } from 'react'; 
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Analytics } from "@vercel/analytics/react";
import LoadingSpinner from './components/LoadingSpinner';
import { HandmadeRoutes } from './pages/HandmadeRoutes';
import { PackingRoutes } from './pages/PackingRoutes';
import FactoryRouter from './pages/FactoryRouter';
import LocalSaleRouter from './pages/LocalSaleRouter';
import ManufacturerRouter from './pages/ManufacturerRouter';
import api from './services/api';

// Route-based Code Splitting (Lazy-loaded chunks)
const Login = lazy(() => import('./pages/Login'));
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'));
const DeveloperSection = lazy(() => import('./pages/systerm update/DeveloperSection'));
const SystemUpdates = lazy(() => import('./pages/systerm update/SystemUpdates'));
const SystemBackup = lazy(() => import('./pages/systerm update/SystemBackup'));

const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const DeveloperRoute = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole') || localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'Developer') {
    toast.error("Access Denied. Restricted to Developers only.");
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default function App() {
  const [showNotificationBtn, setShowNotificationBtn] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotificationBtn(true);
      }
    }
  }, []);

  const subscribeToNotifications = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const register = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        const userRole = localStorage.getItem('userRole') || 'Unknown';

        const payload = {
          ...subscription.toJSON(), 
          role: userRole,           
          section: "Packing"        
        };

        await api.post('/api/notifications/subscribe', payload);

        toast.success("Notifications Enabled Successfully!");
        setShowNotificationBtn(false);

      } catch (error) {
        console.error('Subscription error:', error);
        toast.error("Cannot subscribe to notifications");
      }
    } else {
      toast.error("Service Worker not supported in this browser.");
    }
  };

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Analytics />

      {showNotificationBtn && (
        <button
          onClick={subscribeToNotifications}
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
            padding: '10px 15px', backgroundColor: '#10b981', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          🔔 Enable Notifications
        </button>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Login />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/settings" element={<AdminSettings />} />
            
            {/* Developer Only Routes */}
            <Route element={<DeveloperRoute />}>
              <Route path="/developer-section" element={<DeveloperSection />} />
              <Route path="/system-updates" element={<SystemUpdates />} />
              <Route path="/system-backup" element={<SystemBackup />} />
            </Route>
            
            {HandmadeRoutes()}
            {PackingRoutes()}
            {FactoryRouter()}
            {LocalSaleRouter()}
            {ManufacturerRouter()}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
