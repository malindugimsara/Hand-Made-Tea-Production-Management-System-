import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import { Analytics } from "@vercel/analytics/react";
import { HandmadeRoutes } from './pages/HandmadeRoutes';
import { PackingRoutes } from './pages/PackingRoutes';


const ProtectedRoute = () => {
  // දැන් අපි බලන්නේ token එක නෙමෙයි, userRole එක localStorage එකේ තියෙනවාද කියලයි
  const userRole = localStorage.getItem('userRole');
  
  // userRole එකක් තියෙනවා නම් ඇතුළට යන්න දෙනවා, නැත්නම් login පිටුවට හරවලා යවනවා
  return userRole ? <Outlet /> : <Navigate to="/" replace />; 
  // සටහන: ඔබගේ login පිටුව තියෙන්නේ '/' වල නම් to="/" ලෙස දෙන්න. එය '/login' නම් to="/login" ලෙස දෙන්න.
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