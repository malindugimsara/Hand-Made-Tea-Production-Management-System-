import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Check if authentication token exists in localStorage
    const token = localStorage.getItem('token');

    // If token is missing, redirect to login page ("/")
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // If token exists, render nested outlet routes
    return <Outlet />;
};

export default ProtectedRoute;