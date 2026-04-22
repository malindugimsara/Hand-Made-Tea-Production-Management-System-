import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import { Analytics } from "@vercel/analytics/react";
import { HandmadeRoutes } from './pages/HandmadeRoutes';
import { PackingRoutes } from './pages/PackingRoutes';


// 🔐 Protected Route
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Analytics />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          {HandmadeRoutes()}
          {PackingRoutes()}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}