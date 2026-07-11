"use client"

import React, { useState } from 'react';
import { IconWallet, IconCreditCard, IconCreditCardOff, IconLogout, IconUser, IconSettings, IconBellRinging, IconHistory, } from "@tabler/icons-react";
import { amountData } from '@/public/data/dashBoard';
import DepositCard from './DepositCard';
import DepositAmount from './DepositAmount';
import { Tab } from '@headlessui/react';
import WithdrawalAmount from './WithdrawalAmount';
import Link from 'next/link';
import { dashboardTabs } from '@/public/data/dashTabs';

export default function Dashboard() {
    const [activeItem, setActiveItem] = useState(dashboardTabs[0]);

    const handleClick = (itemName: any) => {
        setActiveItem(itemName);
    };
    const getItemStyle = (itemName: any) => {
        return {
            backgroundColor: activeItem === itemName ? '#0F1B42' : '',
        };
    };

    // Helper function to extract digits only
    const digitsOnly = (value: string): string => {
        return value.replace(/[^0-9]/g, '');
    };

    // --- Transactions State Management ---
    const [transactions] = useState<any[]>([]);
    const [txLoading] = useState<boolean>(false);
    const [txError] = useState<string>('');

    // 1. Isolated state object strictly scoped to this component instance
    const [aboutYouData, setAboutYouData] = useState({
        firstName: '',
        lastName: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        countryCode: '',
        phoneNumber: '',
        address: '',
        gender: '',
        cityRegion: '',
        country: '',
        consentChecked: false
    });

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', text: '' });

    // Dashboard account data integration is deferred; do not use legacy bearer-token calls here.

    // 2. Event handler strictly managing fields inside this form scope
    const handleAboutYouChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setAboutYouData((prev) => ({ ...prev, [name]: checked }));
            return;
        }

        // Apply strict digit validation for numeric-only inputs
        if (['dobDay', 'dobMonth', 'dobYear', 'phoneNumber'].includes(name)) {
            const cleanValue = digitsOnly(value);
            
            // Optional length guards to stop unnecessary characters
            if (name === 'dobDay' && cleanValue.length > 2) return;
            if (name === 'dobMonth' && cleanValue.length > 2) return;
            if (name === 'dobYear' && cleanValue.length > 4) return;
            if (name === 'phoneNumber' && cleanValue.length > 12) return; // e.g. 77XXXXXXX

            setAboutYouData((prev) => ({ ...prev, [name]: cleanValue }));
        } else {
            setAboutYouData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // 3. Isolated form execution handler
    const handleAboutYouSubmit = async (e: React.FormEvent) => {
        // Prevents reloading the page or touching other forms on the DOM
        e.preventDefault();
        e.stopPropagation();

        if (!aboutYouData.consentChecked) {
            setFeedback({
                type: 'error',
                text: 'Please check the consent box to allow data collection for Personal Identity Verification.'
            });
            return;
        }

        setLoading(true);
        setFeedback({ type: '', text: '' });

        setFeedback({
            type: 'error',
            text: 'Profile updates are not connected yet.'
        });
        setLoading(false);
    };

    return (
        <>
            <section className="pay_method pb-120">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-12 gx-0 gx-sm-4">
                            <div className="hero_area__main">
                                <Tab.Group>
                                    <div className="row gy-6 gy-xxl-0 singletab">
                                        <div className="col-xxl-3">
                                            <div className="pay_method__scrol">
                                                <Tab.List
                                                    className="tablinks pay_method__scrollbar p2-bg p-5 p-md-6 rounded-4 d-flex align-items-center justify-content-center flex-xxl-column gap-3 gap-xxl-2">
                                                    {dashboardTabs.map((singleTabs) => (
                                                        <Tab onClick={() => handleClick(singleTabs)}
                                                            style={getItemStyle(singleTabs)} className="nav-links p-3 rounded-3 cpoint d-inline-block outstles" key={singleTabs.id}>
                                                            <span className="tablink d-flex align-items-center gap-2 outstles">
                                                                {singleTabs.icon}
                                                                {singleTabs.tabname}
                                                            </span>
                                                        </Tab>
                                                    ))}

                                                </Tab.List>
                                            </div>
                                        </div>
                                        <div className="col-xxl-9">
                                            <Tab.Panels className="tabcontents">
                                                <Tab.Panel>
                                                    <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                                                        <div
                                                            className="pay_method__paymethod-title d-flex align-items-center gap-3 mb-6 mb-md-8">
                                                            <i className="ti ti-credit-card fs-four g1-color"></i>
                                                            <h5 className="n10-color">Payment methods</h5>
                                                        </div>
                                                        <div className="pay_method__paymethod-alitem">
                                                            <div className="row gx-4 gy-4">
                                                                <DepositCard />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <DepositAmount />
                                                </Tab.Panel>
                                                <Tab.Panel>
                                                    <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8 mb-8 mb-md-10">
                                                        <div
                                                            className="pay_method__paymethod-title d-flex align-items-center gap-3 mb-6 mb-md-8">
                                                            <i className="ti ti-credit-card fs-four g1-color"></i>
                                                            <h5 className="n10-color">Payment methods</h5>
                                                        </div>
                                                        <div className="pay_method__paymethod-alitem">
                                                            <div className="row gx-4 gy-4">
                                                                <DepositCard />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8">
                                                        <div className="pay_method__paymethod-title mb-5 mb-md-6">
                                                            <h5 className="n10-color">Choose or enter your withdrawal amount</h5>
                                                        </div>
                                                        <WithdrawalAmount />
                                                    </div>
                                                </Tab.Panel>
                                                <Tab.Panel>
                                                    <div className="pay_method__tabletwo">
                                                        <div style={{ overflowX: 'auto' }} className="pay_method__table-scrollbar">
                                                            <table className="w-100 text-center p2-bg">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="text-nowrap">Transaction ID</th>
                                                                        <th className="text-nowrap">Date</th>
                                                                        <th className="text-nowrap">Transaction type</th>
                                                                        <th className="text-nowrap">Amount/Balance</th>
                                                                        <th className="text-nowrap">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {txLoading ? (
                                                                        <tr>
                                                                            <td colSpan={5} className="py-5 text-white">
                                                                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                                                Loading account transactions......
                                                                            </td>
                                                                        </tr>
                                                                    ) : txError ? (
                                                                        <tr>
                                                                            <td colSpan={5} className="py-5 text-danger fw-bold">{txError}</td>
                                                                        </tr>
                                                                    ) : transactions.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan={5} className="py-5 text-white-50">No recent transactions found.</td>
                                                                        </tr>
                                                                    ) : (
                                                                        transactions.map((tx: any, index: number) => (
                                                                            <tr key={tx.id || tx.transaction_id || index}>
                                                                                <td className="text-nowrap">{tx.reference || tx.id || tx.transaction_id}</td>
                                                                                <td className="text-nowrap">
                                                                                    {tx.created_at ? new Date(tx.created_at).toLocaleString(undefined, {
                                                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                                                        hour: '2-digit', minute: '2-digit'
                                                                                    }) : 'N/A'}
                                                                                </td>
                                                                                <td className="text-nowrap capitalize">{tx.type || tx.transaction_type || 'Deposit'}</td>
                                                                                <td className="text-nowrap fw-bold">{tx.currency || 'UGX'} {(tx.amount || 0).toLocaleString()}</td>
                                                                                <td className="text-nowrap">
                                                                                    <label className={`fw-bold capitalize ${
                                                                                        tx.status === 'success' || tx.status === 'completed' ? 'g1-color' : 'r1-color'
                                                                                    }`}>
                                                                                        {tx.status || 'Unknown'}
                                                                                    </label>
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                                
                                                                <tr>
                                                                    <td className="text-nowrap">2PQ8B4KYMJ</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">4TQRW5WXF4</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">4TQRW5WXF4</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">VEJP8A5J87</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">JKNFWEJ123</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">NC8S4QJ4K2</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">DGPSN7SRM4</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-nowrap">ZT3FA5D8N7</td>
                                                                    <td className="text-nowrap">23.06.2026, 11:31</td>
                                                                    <td className="text-nowrap">5,591 UGX</td>
                                                                    <td className="text-nowrap">300.00</td>
                                                                    <td className="text-nowrap">
                                                                        <label className="g1-color fw-normal cpoint ">Success</label> &nbsp; | &nbsp;
                                                                        <label className="r1-color fw-normal cpoint">Failed</label>
                                                                    </td>
                                                                </tr>

                                                            </table>
                                                        </div>
                                                    </div>
                                                </Tab.Panel>
                                                <Tab.Panel>
                                                    <div className="pay_method__paymethod p-4 p-lg-6 p2-bg rounded-8">
                                                        <div className="pay_method__paymethod-title mb-5 mb-md-6">
                                                            <h5 className="n10-color">About You</h5>
                                                        </div>
                                                        <div className="pay_method__formarea">
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

                                                            {/* Explicit name attribute provided for clear separation */}
                                                            <form name="aboutyou" onSubmit={handleAboutYouSubmit}>
                                                                <div className="d-flex align-items-center flex-wrap flex-md-nowrap gap-5 gap-md-6 mb-5">
                                                                    <div className="w-100">
                                                                        <label className="mb-3">First Name (Given Name)</label>
                                                                        <input 
                                                                            className="n11-bg rounded-8 w-100" 
                                                                            type="text" 
                                                                            name="firstName"
                                                                            placeholder="First Name"
                                                                            value={aboutYouData.firstName}
                                                                            onChange={handleAboutYouChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="w-100">
                                                                        <label className="mb-3">Last Name</label>
                                                                        <input className="n11-bg rounded-8" type="text"
                                                                            name="lastName"
                                                                            placeholder="Last Name"
                                                                            value={aboutYouData.lastName}
                                                                            onChange={handleAboutYouChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex align-items-center gap-5 gap-md-6 mb-5 flex-wrap flex-md-nowrap">
                                                                    <div className="w-100">
                                                                        <label className="mb-3">Date Of Birth</label>
                                                                        <div className="d-flex align-items-center gap-6 w-100">
                                                                            <div className="d-flex n11-bg rounded-8 w-50">
                                                                                <input type="text" inputMode="numeric" name="dobDay" placeholder="DD" value={aboutYouData.dobDay} onChange={handleAboutYouChange} required />
                                                                            </div>
                                                                            <div className="d-flex n11-bg rounded-8 w-50">
                                                                                <input type="text" name="dobMonth" placeholder="MM" value={aboutYouData.dobMonth} onChange={handleAboutYouChange} required />
                                                                            </div>
                                                                            <div className="d-flex n11-bg rounded-8 w-50">
                                                                                <input type="text" inputMode="numeric" name="dobYear" placeholder="YYYY" value={aboutYouData.dobYear} onChange={handleAboutYouChange} required />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-100">
                                                                        <label className="mb-3">Phone Number</label>
                                                                        <div className="d-flex gap-2">
                                                                            <input 
                                                                                className="w-25 n11-bg rounded-8" 
                                                                                type="text" 
                                                                                name="countryCode"
                                                                                placeholder="+256" 
                                                                                value={aboutYouData.countryCode}
                                                                                onChange={handleAboutYouChange}
                                                                                required
                                                                            />
                                                                            <input 
                                                                                className="n11-bg rounded-8 w-75" 
                                                                                type="tel" 
                                                                                name="phoneNumber"
                                                                                placeholder="XXXXXXXXX" 
                                                                                value={aboutYouData.phoneNumber}
                                                                                onChange={handleAboutYouChange}
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex align-items-center flex-wrap flex-md-nowrap gap-5 gap-md-6 mb-5">
                                                                    <div className="w-100">
                                                                        <label className="mb-3">Address</label>
                                                                        <input 
                                                                            className="n11-bg rounded-8 w-100" 
                                                                            type="text" 
                                                                            name="address"
                                                                            placeholder="Address..." 
                                                                            value={aboutYouData.address}
                                                                            onChange={handleAboutYouChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="w-100">
                                                                        <label className="mb-3 d-block">Gender</label>
                                                                        <select 
                                                                            name="gender"
                                                                            className='n11-bg extrastyle rounded-8 w-100 py-3 pe-5 text-white'
                                                                            value={aboutYouData.gender}
                                                                            onChange={handleAboutYouChange}
                                                                            required>
                                                                            <option value="">Select Gender...</option>
                                                                            <option value="1">Male</option>
                                                                            <option value="2">Female</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex align-items-center flex-wrap flex-md-nowrap gap-5 gap-md-6 mb-5">
                                                                    <div className="w-100">
                                                                        <label className="mb-3">City / Region</label>
                                                                        <input 
                                                                            className="n11-bg rounded-8 w-100" 
                                                                            type="text" 
                                                                            name="cityRegion"
                                                                            placeholder="City / Region..." 
                                                                            value={aboutYouData.cityRegion}
                                                                            onChange={handleAboutYouChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="w-100">
                                                                        <label className="mb-3">Country</label>
                                                                        <input 
                                                                            className="n11-bg rounded-8 w-100" 
                                                                            type="text" 
                                                                            name="country"
                                                                            placeholder="Uganda" 
                                                                            value={aboutYouData.country}
                                                                            onChange={handleAboutYouChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-2 align-items-start align-items-xl-center mb-5">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        id="demoCheckbox" 
                                                                        name="consentChecked"
                                                                        checked={aboutYouData.consentChecked}
                                                                        onChange={handleAboutYouChange}
                                                                    />
                                                                    <label className="fs-seven">I authorize to collect and transmit my personal information for identity verification or <span className="g1-color"> similar uses as defined</span> in order to confirm my ability to use the website.</label>
                                                                </div>
                                                                <button 
                                                                    type="submit" 
                                                                    className="cmn-btn py-3 px-10 fw-bold"
                                                                    disabled={loading}>
                                                                    {loading ? 'Updating user details...' : 'Save'}
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                </Tab.Panel>
                                            </Tab.Panels>
                                        </div>
                                    </div>
                                </Tab.Group>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
