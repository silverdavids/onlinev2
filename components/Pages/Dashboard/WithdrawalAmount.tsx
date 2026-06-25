"use client";

import React, { useState } from 'react';
import { amountData } from '@/public/data/dashBoard';
import axios from 'axios';

// Helper function to extract digits only
const getCleanAmount = (value: any): string => {
    return String(value || '').replace(/[^0-9]/g, '');
};

export default function WithdrawalAmount() {
    // 1. Core State Setup
    const initialAmount = amountData[0] ? getCleanAmount(amountData[0].amount) : '';
    
    const [activeItem, setActiveItem] = useState<any>(amountData[0]);
    const [formData, setFormData] = useState({
        phone_number: '',
        withdrawal_amount: initialAmount 
    });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', text: '' });

    // Computed dynamic numerical amount
    const finalAmount = getCleanAmount(formData.withdrawal_amount);

    // 2. Event Handlers
    const handleCardClick = (item: any) => {
        const cleanAmount = getCleanAmount(item.amount);
        setActiveItem(item);
        setFormData((prev) => ({
            ...prev,
            withdrawal_amount: cleanAmount
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'withdrawal_amount') {
            const strippedValue = getCleanAmount(value);
            setFormData((prev) => ({ ...prev, [name]: strippedValue }));

            // Manage active card outline highlights based on state value matches
            const matchingPackage = amountData.find(
                (item: any) => getCleanAmount(item.amount) === strippedValue
            );
            setActiveItem(matchingPackage || null);
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const getItemStyle = (item: any) => {
        return {
            border: `1px solid ${activeItem?.id === item.id ? '#35C31E' : '#2C3655'}`,
            cursor: 'pointer'
        };
    };

    // 3. Axios API Post Execution
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFeedback({ type: '', text: '' });

        const cleanIntegerAmount = parseInt(finalAmount, 10);

        // Validation Rules: Min UGX 1,000 | Max UGX 3,000,000 per transaction
        if (isNaN(cleanIntegerAmount) || cleanIntegerAmount < 1000) {
            setFeedback({
                type: 'error',
                text: 'Please enter a valid amount above UGX 1,000.'
            });
            setLoading(false);
            return;
        }

        if (cleanIntegerAmount > 3000000) {
            setFeedback({
                type: 'error',
                text: 'The maximum limit per individual transaction is UGX 3,000,000.'
            });
            setLoading(false);
            return;
        }

        if (cleanIntegerAmount > 10000000) {
            setFeedback({
                type: 'error',
                text: 'Your entry exceeds the maximum daily mobile money allowance of UGX 10,000,000.'
            });
            setLoading(false);
            return;
        }

        // 4. Debugging Output
        console.log("Submitting Clean withdrawal Payload:", {
            amount: cleanIntegerAmount,
            phone_number: formData.phone_number
        });

        try {
            const response = await axios.post('https://smart-bet/v1/mobile-money/withdraw', {
                amount: cleanIntegerAmount, // Sends strict integer data (e.g., 5000)
                phone_number: formData.phone_number
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            setFeedback({ 
                type: 'success', 
                text: response.data.message || 'Withdrawal processing initiated! Check your handset.' 
            });
            
        } catch (error: any) {
            setFeedback({ 
                type: 'error', 
                text: error.response?.data?.message || 'Transaction initialization failed. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8">
                
                {/* Package Quick-Selection Items */}
                <div className="pay_method__paymethod-alitem mb-5 mb-md-6">
                    <div className="pay_method__paymethod-items d-flex align-items-center gap-4 gap-sm-5 gap-md-6">
                        {amountData.map((singleData: any) => (
                            <div 
                                key={singleData.id}
                                onClick={() => handleCardClick(singleData)}
                                style={getItemStyle(singleData)}
                                className="pay_method__paymethod-item amount-active p-2 rounded-3 cpoint">
                                <div className="py-3 px-5 px-md-6 n11-bg rounded-3">
                                    <span className="fs-ten fw-bold mb-2">{singleData.amount}</span>
                                    <span className="fs-seven d-block">{singleData.bonus}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-end mb-6 mb-md-8">
                    <span>Min UGX 1,000 | Max UGX 3,000,000 per transaction &amp; 10,000,000 per 24 hrs</span>
                </div>

                <div className="pay_method__paymethod-title mb-5 mb-md-6">
                    <h5 className="n10-color">Enter your Mobile Money details</h5>
                </div>

                {/* Status Alerts Area */}
                {feedback.text && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontWeight: '600',
                        backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
                        color: feedback.type === 'success' ? '#155724' : '#721c24',
                        border: `1px solid ${feedback.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                    }}>
                        {feedback.text}
                    </div>
                )}

                {/* Form Elements */}
                <div className="pay_method__formarea">
                    <form onSubmit={handleSubmit}>
                        <div className="d-flex align-items-center flex-wrap flex-md-nowrap gap-5 gap-md-6 mb-5">
                            <div className="d-flex w-100 p1-bg ps-3 rounded-8 align-items-center">
                                <i className="ti ti-device-mobile fs-five me-2"></i>
                                <input 
                                    className="w-100"
                                    type="tel" 
                                    name="phone_number" 
                                    placeholder="Phone number (e.g., 077xxxxxxx)" 
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="d-flex w-100 p1-bg rounded-8">
                                <input 
                                    type="text" 
                                    name="withdrawal_amount"
                                    placeholder="Enter Amount" 
                                    value={formData.withdrawal_amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between mb-7 mb-md-10">
                            <span>Withdraw Total:</span>
                            <span className="fw-bold fs-four text-success">
                                UGX {finalAmount ? parseInt(finalAmount, 10).toLocaleString() : '0'}
                            </span>
                        </div>

                        <button 
                            type="submit"
                            className="py-4 px-5 n11-bg rounded-2 w-100 fw-bold"
                            disabled={loading}>
                            {loading ? 'Processing Withdrawal...' : `Withdraw UGX ${finalAmount ? parseInt(finalAmount, 10).toLocaleString() : '0'}`}
                        </button>
                        
                        <div className="text-center mt-4">
                            <span>Your withdrawal limit on month: UGX 10,000,000</span>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}