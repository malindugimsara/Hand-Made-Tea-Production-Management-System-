import React, { useState } from 'react';

export default function CostingForm() {
    const [madeTea, setMadeTea] = useState('');
    const [selectionCost, setSelectionCost] = useState('');
    const [rollingCost, setRollingCost] = useState('');
    const [supervision, setSupervision] = useState('');
    const [electricity, setElectricity] = useState('');

    const totalCost = (Number(selectionCost) || 0) + (Number(rollingCost) || 0) + (Number(supervision) || 0) + (Number(electricity) || 0);
    const costPerKg = madeTea > 0 ? (totalCost / Number(madeTea)).toFixed(2) : 0;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-6">Cost Calculation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Input Form */}
                <form className="md:col-span-2 bg-[#FFFFFF] p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                            <input type="date" className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Made Tea Weight (kg)</label>
                            <input type="number" value={madeTea} onChange={e => setMadeTea(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" placeholder="From Production" />
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-[#1B6A31] border-b pb-2 mb-4">Expenses (Rs.)</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">Selection Labor</label>
                            <input type="number" value={selectionCost} onChange={e => setSelectionCost(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md" placeholder="Rs." />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">Hand Rolling Labor</label>
                            <input type="number" value={rollingCost} onChange={e => setRollingCost(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md" placeholder="Rs." />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">Supervision</label>
                            <input type="number" value={supervision} onChange={e => setSupervision(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md" placeholder="Rs." />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-gray-700 font-medium">Electricity Cost</label>
                            <input type="number" value={electricity} onChange={e => setElectricity(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-md" placeholder="Rs." />
                        </div>
                    </div>
                </form>

                {/* Live Results Panel */}
                <div className="bg-[#1B6A31] text-white p-6 rounded-lg shadow-md flex flex-col justify-center h-full">
                    <h3 className="text-xl font-bold mb-6 text-[#8CC63F]">Summary</h3>
                    
                    <div className="mb-6">
                        <p className="text-sm opacity-80 mb-1">Total Production Cost</p>
                        <p className="text-4xl font-bold">Rs. {totalCost}</p>
                    </div>

                    <div>
                        <p className="text-sm opacity-80 mb-1">Cost Per 1 kg</p>
                        <p className="text-3xl font-bold text-[#8CC63F]">Rs. {costPerKg}</p>
                    </div>

                    <button className="w-full mt-auto mt-8 py-3 bg-[#4A9E46] text-white rounded-md hover:bg-[#8CC63F] hover:text-[#1B6A31] transition-colors font-bold">
                        Save Costing
                    </button>
                </div>
            </div>
        </div>
    );
}