import React, { useState, useEffect } from 'react'; // <-- useState, useEffect import karanna
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import { Analytics } from "@vercel/analytics/react";
import { HandmadeRoutes } from './pages/HandmadeRoutes';
import { PackingRoutes } from './pages/PackingRoutes';
import FactoryRouter from './pages/FactoryRouter';

const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String) {
  // ... (Kalin thibba code ekama)
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

export default function App() {
  // 1. Button eka pennanawada nadda kiyala control karanna state ekak
  const [showNotificationBtn, setShowNotificationBtn] = useState(false);

  // 2. App eka load weddi permission eka check kireema
  useEffect(() => {
    if ('Notification' in window) {
      // Permission eka 'default' nam vitharak button eka pennanna (Kalin allow/block karala natham)
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

        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/notifications/subscribe`, {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'content-type': 'application/json' }
        });

        toast.success("Notifications Enabled Successfully!");

        // 3. Success unata passe button eka hide karanna
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

      {/* 4. State eka true nam vitharak button eka pennanna */}
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

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          {HandmadeRoutes()}
          {PackingRoutes()}
          {FactoryRouter()}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}