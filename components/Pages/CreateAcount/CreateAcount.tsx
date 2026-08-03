"use client";

import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { IconBrandGoogle, IconBrandTwitterFilled, IconBrandFacebookFilled } from "@tabler/icons-react";
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/api/authApi';
import { normalizeApiError } from '@/src/api/apiError';
import { useAuth } from '@/src/auth/useAuth';

type RegistrationStep = 'details' | 'otp';

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
        promo_code: '',
        agree: false
    });
    const [otpData, setOtpData] = useState({
        otpCode: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [step, setStep] = useState<RegistrationStep>('details');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const router = useRouter();
    const { login } = useAuth();

    // 2. Dynamically capture keystrokes and checkbox selections
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setOtpData((prev) => ({ ...prev, [name]: value }));
    };

    // 3. Dispatch the complete payload to your Backend API
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        setMessage({ type: '', text: '' });

        if (!formData.agree) {
            setMessage({ type: 'error', text: 'You must accept the Terms and Conditions.' });
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.register({
                firstName: formData.first_name,
                surname: formData.last_name,
                username: formData.username,
                phoneNumber: formData.phone_number,
                email: formData.email,
                dob: formData.birth_date,
                nin: formData.national_nin,
                promoCode: formData.promo_code
            });

            const promoText = response.promoMessage
                ? ` ${response.promoMessage}`
                : '';
            setMessage({
                type: 'success',
                text: `${response.message || 'Account created successfully. Enter the OTP sent to your phone and create a password.'}${promoText}`
            });
            setStep('otp');

        } catch (error) {
            const apiError = normalizeApiError(error);
            const firstError = apiError.details?.[0];
            setMessage({ 
                type: 'error', 
                text: firstError || apiError.message || 'Registration failed. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        setMessage({ type: '', text: '' });

        if (otpData.newPassword !== otpData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.verifyOtpAndSetPassword({
                PhoneNumber: formData.phone_number,
                OtpCode: otpData.otpCode,
                NewPassword: otpData.newPassword,
                ConfirmPassword: otpData.confirmPassword,
            });

            if (!response.success) {
                throw new Error(response.message || 'OTP verification failed.');
            }

            await login({
                username: formData.phone_number,
                password: otpData.newPassword,
                rememberMe: true,
            });

            setMessage({ type: 'success', text: 'Registration complete. Redirecting to dashboard...' });
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (error) {
            const apiError = normalizeApiError(error);
            setMessage({
                type: 'error',
                text: apiError.details?.[0] || apiError.message || 'OTP verification failed. Please try again.'
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
                                            {step === 'details' ? (
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
                                                <div className="mb-5 mb-md-6">
                                                    <input
                                                        className="n11-bg"
                                                        name="promo_code"
                                                        placeholder="Promo Code (optional)"
                                                        type="text"
                                                        value={formData.promo_code}
                                                        onChange={handleChange}
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
                                            ) : (
                                            <form onSubmit={handleOtpSubmit}>
                                                <div className="mb-5 mb-md-6">
                                                    <input
                                                        className="n11-bg"
                                                        name="otpCode"
                                                        placeholder="OTP Code"
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={otpData.otpCode}
                                                        onChange={handleOtpChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input
                                                        className="n11-bg"
                                                        name="newPassword"
                                                        placeholder="Create Password"
                                                        type="password"
                                                        value={otpData.newPassword}
                                                        onChange={handleOtpChange}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-5 mb-md-6">
                                                    <input
                                                        className="n11-bg"
                                                        name="confirmPassword"
                                                        placeholder="Confirm Password"
                                                        type="password"
                                                        value={otpData.confirmPassword}
                                                        onChange={handleOtpChange}
                                                        required
                                                    />
                                                </div>
                                                <button
                                                    className="cmn-btn px-5 py-3 mb-6 w-100"
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Verifying...' : 'Verify OTP & Login'}
                                                </button>
                                                <button
                                                    className="cmn-btn second-alt px-5 py-3 mb-6 w-100"
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => setStep('details')}
                                                >
                                                    Back
                                                </button>
                                            </form>
                                            )}
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
