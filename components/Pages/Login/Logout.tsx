"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/auth/useAuth';

export default function LogoutButton() {
    const router = useRouter();
    const { logout } = useAuth();
    const [loggingOut, setLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);

        try {
            await logout();
        } catch (error) {
            console.warn("Backend confirmation skipped or unreachable during sign-out:", error);
        } finally {
            // Force a clean state reset and push back to login route
            router.replace('/login');
            setLoggingOut(false);
        }
    };

    return (
        <button 
            onClick={handleLogout} 
            disabled={loggingOut}
            className="btn btn-outline-danger py-2 px-4 rounded-8 fw-bold d-flex align-items-center gap-2">
            <span>{loggingOut ? 'Logging Out...' : 'Log Out'}</span>
        </button>
    );
}
