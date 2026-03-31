import React, { useState } from 'react';

export default function SalesForm() {
    const [usdPrice, setUsdPrice] = useState('');
    const [exchangeRate, setExchangeRate] = useState('');
    const [units, setUnits] = useState('');

    const totalLKR = (Number(usdPrice) * Number(exchangeRate) * Number(units)).toFixed(2);

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-6">Sales Details</h2>
            
            <form className="bg-[#FFFFFF] p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                        <input type="date" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A9E46]" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tea Type</label>
                        <input type="text" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A9E46]" placeholder="e.g. Purple Tea" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Packaging</label>
                        <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A9E46] bg-white">
                            <option>Paper Can</option>
                            <option>Reusable Bag</option>
                            <option>Bulk</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Units Sold</label>
                        <input type="number" value={units} onChange={e => setUnits(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4A9E46]" placeholder="Amount of packs" />
                    </div>
                </div>

                <div className="bg-[#F8FAF8] p-4 rounded-md border border-[#8CC63F]/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Price per Unit (USD)</label>
                        <input type="number" value={usdPrice} onChange={e => setUsdPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="$" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Today's Exchange Rate (LKR)</label>
                        <input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Rs." />
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-center bg-[#4A9E46] text-white p-4 rounded-lg">
                    <span className="font-semibold text-lg">Total Revenue (LKR)</span>
                    <span className="text-2xl font-bold">Rs. {totalLKR}</span>
                </div>

                <button type="button" className="w-full mt-6 py-3 bg-[#1B6A31] text-white rounded-md hover:bg-[#8CC63F] hover:text-[#1B6A31] shadow-sm transition-colors font-semibold text-lg">
                    Record Sale
                </button>
            </form>
        </div>
    );
}