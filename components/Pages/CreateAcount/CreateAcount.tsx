"use client";

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import axios from 'axios'
import { IconBrandGoogle, IconBrandTwitterFilled, IconBrandFacebookFilled } from "@tabler/icons-react";

export default function CreateAccount() {
    // 1. Initialize form state with all structural fields matching input names
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        phone_number: '',
        email: '',
        birth_date: '',
        national_nin: '',
        agree: false
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 2. Dynamically capture keystrokes and checkbox selections
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // 3. Dispatch the complete payload to your Backend API
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Console log data in browser
        console.log("Form Data Submitted:", formData);

        if (!formData.agree) {
            setMessage({ type: 'error', text: 'You must accept the Terms and Conditions.' });
            return;
        }

        setLoading(true);

        try {
            // Sends the entire updated state model downstream
            const response = await axios.post('https://smart-bet/v1/register', {
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username,
                phone_number: formData.phone_number,
                email: formData.email,
                birth_date: formData.birth_date, // Formatted as YYYY-MM-DD naturally by type="date"
                national_nin: formData.national_nin
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            setMessage({ type: 'success', text: response.data.message || 'Account created successfully!' });
            
            // Reset form fields on success
            setFormData({ 
                first_name: '', 
                last_name: '', 
                username: '', 
                phone_number: '', 
                email: '', 
                birth_date: '', 
                national_nin: '', 
                agree: false 
            });

        } catch (error) {
            const errorDetails = error.response?.data?.errors;
            const firstError = errorDetails ? Object.values(errorDetails)[0][0] : null;
            setMessage({ 
                type: 'error', 
                text: firstError || error.response?.data?.message || 'Registration failed. Please try again.' 
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
                            <Image className="w-100" width={720} height={900} src="/images/create-acount.webp" alt="Image" />
                        </div>
                    </div>
                    <div className="col-lg-6 col-xl-5">
                        <div className="login_section__loginarea">
                            <div className="row justify-content-start">
                                <div className="col-xxl-10">
                                    <div className="pb-10 pt-8 mb-7 mt-12 mt-lg-0 px-4 px-sm-10">
                                        <h3 className="mb-6 mb-md-8">Create new account.</h3>
                                        <p className="mb-10 mb-md-15">Fill out your details below to register with us.</p>
                                        
                                        {/* Dynamic UI Feedback Banner */}
                                        {message.text && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: '6px',
                                                marginBottom: '20px',
                                                fontWeight: '600',
                                                backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                                                color: message.type === 'success' ? '#155724' : '#721c24',
                                                border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                                            }}>
                                                {message.text}
                                            </div>
                                        )}

                                        <div className="login_section__form">
                                            <form onSubmit={handleSubmit}>
                                                 <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="first_name" 
                                                        placeholder="First Name"
                                                        type="text" 
                                                        value={formData.first_name}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="last_name" 
                                                        placeholder="Last Name"
                                                        type="text" 
                                                        value={formData.last_name}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="username" 
                                                        placeholder="Username"
                                                        type="text" 
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="phone_number" 
                                                        placeholder="Phone Number (e.g., +256xxxxxxxxx)"
                                                        type="tel" 
                                                        value={formData.phone_number}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="email" 
                                                        placeholder="Email Address"
                                                        type="email" 
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                {/* Functional Datepicker Input Field */}
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg w-100" 
                                                        name="birth_date" 
                                                        type="date"
                                                        value={formData.birth_date}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input 
                                                        className="n11-bg" 
                                                        name="national_nin" 
                                                        placeholder="NIN Number"
                                                        type="text" 
                                                        value={formData.national_nin}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="d-flex align-items-center flex-wrap flex-sm-nowrap gap-2 mb-6">
                                                    <input 
                                                        type="checkbox" 
                                                        name="agree"
                                                        checked={formData.agree}
                                                        onChange={handleChange}
                                                    />
                                                    <span>I have read and accepted the general <Link href="#">Terms and Conditions.</Link> and confirm I am older than 18 years. </span>
                                                </div>
                                                <button 
                                                    className="cmn-btn px-5 py-3 mb-6 w-100" 
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Processing...' : 'Confirm Registration'}
                                                </button>
                                            </form>
                                        </div>
                                        <div className="login_section__socialmedia text-center mb-6">
                                            <span className="mb-6">Or continue with</span>
                                            <div className="login_section__social d-center gap-3">
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5">
                                                    <IconBrandFacebookFilled className="ti ti-brand-facebook-filled fs-four" />
                                                </Link>
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5">
                                                    <IconBrandTwitterFilled className="ti ti-brand-twitter-filled fs-four" />
                                                </Link>
                                                <Link href="#" className="n11-bg px-3 py-2 rounded-5">
                                                    <IconBrandGoogle className="ti ti-brand-google fs-four fw-bold " />
                                                </Link>
                                            </div>
                                        </div>
                                        <span className="d-center gap-1">Already a member? <Link className="g1-color" href="/login">Login</Link></span>
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