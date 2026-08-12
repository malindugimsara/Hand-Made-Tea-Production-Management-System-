import React from 'react';

export default function AdminOnly({ children }) {
    const currentUserRole = localStorage.getItem('userRole') || localStorage.getItem('role');

    // Role එක Admin නම් විතරක් ඇතුළේ තියෙන දේවල් පෙන්වනවා
    if (currentUserRole === 'Admin') {
        return <>{children}</>;
    }

    // නැත්නම් මුකුත් පෙන්වන්නේ නෑ
    return null;
}