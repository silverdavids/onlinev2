"use client";

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { IconBrandGoogle, IconBrandTwitterFilled, IconBrandFacebookFilled } from "@tabler/icons-react";
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Login() {
    // 1. Manage form fields, loading indicators, and explicit server feedback messages
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const router = useRouter();

    // 2. Track input value updates dynamically
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // 3. Dispatch user credentials via Axios
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ type: '', message: '' }); // Reset message feedback at start

        // 4. Debugging Output
        console.log("Submitting Login Payload:", {
            username: formData.username,
            password: formData.password
        });

        try {
            // Replace with your local or production API endpoint URL string
            const response = await axios.post('https://smart-bet/v1/login', {
                username: formData.username,
                password: formData.password,
            }, {
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json' 
                }
            });

            // Extract payload data returned from your server
            const data = response.data;

            // Save authorization tokens and basic user indicators locally
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                // Optional: cache a stringified user profile if returned
                if (data.user) {
                    localStorage.setItem('user_profile', JSON.stringify(data.user));
                }
            }

            setFeedback({ 
                type: 'success', 
                message: data.message || 'Login successful! Redirecting to dashboard...' 
            });

            setTimeout(() => {
                router.push('/dashboard'); 
            }, 1500);

        } catch (error: any) {
            // Intercept corporate/backend validation structures or bad codes (401, 422)
            const errorDetails = error.response?.data?.errors;
            const firstFieldError = errorDetails ? Object.values(errorDetails)[0][0] : null;
            
            setFeedback({ 
                type: 'error', 
                message: firstFieldError || error.response?.data?.message || 'Invalid mobile number or password.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="login_section pt-120 p3-bg">
            <div className="container-fluid">
                <div className="row justify-content-between align-items-center">
                    <div className="col-6">
                        <div className="login_section__thumb d-none d-lg-block">
                            <Image className="w-100" width={720} height={900} src="/images/login.jpg" alt="Image" />
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-5">
                        <div className="login_section__loginarea">
                            <div className="row justify-content-start">
                                <div className="col-xxl-10">
                                    <div className="pb-10 pt-8 mb-7 mt-12 mt-lg-0 px-4 px-sm-10">
                                        <h3 className="mb-6 mb-md-8">Login</h3>
                                        <p className="mb-10 mb-md-15">Welcome back! Please sign in to your account below.</p>
                                        
                                        {/* Dynamic UI Status Alert Box */}
                                        {feedback.message && (
                                            <div 
                                                className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} mb-4`} 
                                                role="alert"
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '6px',
                                                    fontWeight: '600',
                                                    backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
                                                    color: feedback.type === 'success' ? '#155724' : '#721c24',
                                                    border: `1px solid ${feedback.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                                                }}
                                            >
                                                {feedback.message}
                                            </div>
                                        )}

                                        <div className="login_section__form">
                                            <form onSubmit={handleSubmit}>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="username" 
                                                        placeholder="Mobile number"
                                                        type="text" 
                                                        id="Input" 
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="password" 
                                                        placeholder="Password"
                                                        type="password" 
                                                        id="Input-Password" 
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <button 
                                                    className="cmn-btn px-5 py-3 mb-6 w-100" 
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Verifying...' : 'Login Now'}
                                                </button>
                                            </form>
                                        </div>
                                        <div className="login_section__socialmedia text-center mb-6">
                                            <span className="mb-6">Or continue with</span>
                                            <div className="login_section__social d-center gap-3">
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5"><IconBrandFacebookFilled className="ti ti-brand-facebook-filled fs-four" /></Link>
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5"><IconBrandTwitterFilled className="ti ti-brand-twitter-filled fs-four" /></Link>
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5"><IconBrandGoogle className="ti ti-brand-google fs-four fw-bold" /></Link>
                                            </div>
                                        </div>
                                        <span className="d-center gap-1">Create your account? <Link className="g1-color" href="/create-account">Sign Up Now</Link></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}