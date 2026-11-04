import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // 💡 Local Storage එකේ Token එකක් තියෙනවද කියලා බලනවා
    const token = localStorage.getItem('token');

    // Token එකක් නැත්නම් කෙලින්ම Login page ("/") එකට හරවලා යවනවා
    if (!token) {
        return <Navigate to="/" replace />;
    }

    // Token එක තියෙනවා නම් විතරක් අදාළ පිටුවට (Outlet) යන්න දෙනවා
    return <Outlet />;
};

export default ProtectedRoute;