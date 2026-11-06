import React from 'react';

export default function AdminOnly({ children }) {
    const currentUserRole = localStorage.getItem('userRole') || localStorage.getItem('role');

    // Role එක Admin හෝ Developer නම් විතරක් ඇතුළේ තියෙන දේවල් පෙන්වනවා
    if (currentUserRole === 'Admin' || currentUserRole === 'Developer') {
        return <>{children}</>;
    }

    return null;
}