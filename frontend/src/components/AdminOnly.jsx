import React from 'react';

export default function AdminOnly({ children }) {
    const currentUserRole = localStorage.getItem('userRole') || localStorage.getItem('role');

    // Only render children if user role is Admin or Developer
    if (currentUserRole === 'Admin' || currentUserRole === 'Developer') {
        return <>{children}</>;
    }

    return null;
}