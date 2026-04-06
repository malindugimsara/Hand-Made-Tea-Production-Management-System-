import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // States for Real Data
    const [glToday, setGlToday] = useState(0);
    const [mtThisWeek, setMtThisWeek] = useState(0);
    const [salesRevenue, setSalesRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Get today's date formatted nicely
    const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Dynamic Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setIsLoading(true);
        try {
            // Fetch all necessary data simultaneously
            const [glRes, prodRes, salesRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`),
                fetch(`${BACKEND_URL}/api/selling-details`) // Assuming this returns all sales or month sales
            ]);

            const glData = glRes.ok ? await glRes.json() : [];
            const prodData = prodRes.ok ? await prodRes.json() : [];
            const salesData = salesRes.ok ? await salesRes.json() : [];

            // --- 1. Calculate Today's Green Leaf ---
            const todayStr = new Date().toISOString().split('T')[0];
            const todaysGL = glData.filter(item => {
                if (!item.date) return false;
                return new Date(item.date).toISOString().split('T')[0] === todayStr;
            });
            const totalGlToday = todaysGL.reduce((sum, item) => sum + (Number(item.selectedWeight) || 0), 0);
            setGlToday(totalGlToday);

            // --- 2. Calculate Made Tea (This Week) ---
            // Get the timestamp for the start of the current week (Monday)
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
            const startOfWeek = new Date(d.setDate(diff)).setHours(0,0,0,0);

            const thisWeekProd = prodData.filter(item => {
                if (!item.date) return false;
                return new Date(item.date).getTime() >= startOfWeek;
            });
            const totalMtThisWeek = thisWeekProd.reduce((sum, item) => sum + (Number(item.madeTeaWeight) || 0), 0);
            setMtThisWeek(totalMtThisWeek);

            // --- 3. Calculate Total Sales Revenue (LKR) ---
            let totalRevenueLkr = 0;
            // Handle if salesData is an array of monthly/daily records
            const salesArray = Array.isArray(salesData) ? salesData : (salesData.records || []);
            
            salesArray.forEach(sale => {
                const records = sale.records || [];
                const exchangeRate = sale.exchangeRate || 300;
                
                const saleUsd = records.reduce((sum, r) => sum + (Number(r.packs || 0) * Number(r.price || 0)), 0);
                totalRevenueLkr += (saleUsd * exchangeRate);
            });
            setSalesRevenue(totalRevenueLkr);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col space-y-8">
            
            {/* 1. HERO WELCOME BANNER */}
            <div className="bg-gradient-to-r from-[#1B6A31] to-[#4A9E46] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-[#EBFFF4] mb-1">{today}</p>
                    <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
                        {getGreeting()}, Admin! 🍃
                    </h2>
                    <p className="text-[#EBFFF4] text-lg opacity-90 max-w-xl">
                        Here is the latest overview of the handmade tea production and sales.
                    </p>
                </div>
            </div>

            {/* 2. STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat Card 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#8CC63F]/20 rounded-full flex items-center justify-center text-[#4A9E46]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Today's Green Leaf</p>
                        <p className="text-3xl font-bold text-[#1B6A31]">
                            {isLoading ? '...' : glToday.toFixed(2)} <span className="text-lg text-gray-400 font-medium">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#4A9E46]/10 rounded-full flex items-center justify-center text-[#1B6A31]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Made Tea (This Week)</p>
                        <p className="text-3xl font-bold text-[#1B6A31]">
                            {isLoading ? '...' : mtThisWeek.toFixed(3)} <span className="text-lg text-gray-400 font-medium">kg</span>
                        </p>
                    </div>
                </div>

                {/* Stat Card 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#1B6A31]/10 rounded-full flex items-center justify-center text-[#1B6A31]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Sales Revenue (Total)</p>
                        <p className="text-3xl font-bold text-[#1B6A31]">
                            <span className="text-xl">Rs.</span> {isLoading ? '...' : salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. QUICK ACTIONS GRID */}
            <div>
                <h3 className="text-xl font-bold text-[#1B6A31] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Action 1: Combined Record (Primary) */}
                    <button 
                        onClick={() => navigate('/green-leaf-form')}
                        className="group bg-[#1B6A31] p-6 rounded-2xl text-left hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <h4 className="text-white font-semibold text-lg">Daily Record</h4>
                        <p className="text-[#EBFFF4] text-sm mt-1 opacity-80">Add Green leaf & Production</p>
                    </button>

                    {/* Action 2: Costing */}
                    <button 
                        onClick={() => navigate('/costing')}
                        className="group bg-white border border-gray-200 p-6 rounded-2xl text-left hover:border-[#4A9E46] hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                    >
                        <div className="w-10 h-10 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mb-4 text-[#4A9E46] group-hover:bg-[#4A9E46] group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <h4 className="text-[#1B6A31] font-semibold text-lg">Calculate Costs</h4>
                        <p className="text-gray-500 text-sm mt-1">Labor & Electricity entry</p>
                    </button>

                    {/* Action 3: Sales */}
                    <button 
                        onClick={() => navigate('/sales')}
                        className="group bg-white border border-gray-200 p-6 rounded-2xl text-left hover:border-[#4A9E46] hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                    >
                        <div className="w-10 h-10 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mb-4 text-[#4A9E46] group-hover:bg-[#4A9E46] group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <h4 className="text-[#1B6A31] font-semibold text-lg">Record Sales</h4>
                        <p className="text-gray-500 text-sm mt-1">Add USD/LKR transactions</p>
                    </button>

                    {/* Action 4: Reports */}
                    <button 
                        className="group bg-white border border-gray-200 p-6 rounded-2xl text-left hover:border-[#4A9E46] hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                    >
                        <div className="w-10 h-10 bg-[#8CC63F]/20 rounded-full flex items-center justify-center mb-4 text-[#4A9E46] group-hover:bg-[#4A9E46] group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <h4 className="text-[#1B6A31] font-semibold text-lg">View Reports</h4>
                        <p className="text-gray-500 text-sm mt-1">Monthly summary insights</p>
                    </button>

                </div>
            </div>

        </div>
    );
}