"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        const token = localStorage.getItem('auth_token');

        try {
            // Inform the remote auth server to terminate the session context
            await axios.post('https://smart-bet/v1/logout', {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
        } catch (error) {
            console.warn("Backend confirmation skipped or unreachable during sign-out:", error);
        } finally {
            // Destroy all locally saved tokens and identities
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_profile');

            // Force a clean state reset and push back to login route
            router.replace('/login');
        }
    };

    return (
        <button 
            onClick={handleLogout} 
            className="btn btn-outline-danger py-2 px-4 rounded-8 fw-bold d-flex align-items-center gap-2">
            <span>Log Out</span>
        </button>
    );
}