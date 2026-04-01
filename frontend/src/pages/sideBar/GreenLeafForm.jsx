import React, { useState } from 'react';
// 1. Import your new DatePicker
import { DatePicker } from '@/components/ui/date-picker';

export default function GreenLeafForm() {
    // 2. Change the state to hold a Date object instead of a string
    const [date, setDate] = useState(new Date()); 
    const [received, setReceived] = useState('');
    const [selected, setSelected] = useState('');
    
    const returnedWeight = (Number(received) || 0) - (Number(selected) || 0);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-6">Green Leaf Entry</h2>
            <form className="bg-[#FFFFFF] p-8 rounded-lg shadow-sm border border-gray-200 space-y-5">
                
                {/* 3. Replace the old input with the new DatePicker */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                    <DatePicker 
                        date={date} 
                        setDate={setDate} 
                        label="Select entry date"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Received Weight (kg)</label>
                    <input type="number" value={received} onChange={(e) => setReceived(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]" placeholder="e.g. 50" />
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Selected Weight for Handmade (kg)</label>
                    <input type="number" value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]" placeholder="e.g. 10" />
                </div>
                
                <div className="pt-6 mt-6 border-t border-gray-100 bg-[#F8FAF8] p-4 rounded-md">
                    <p className="text-sm text-gray-600 font-medium">Calculated Returned Weight (To Main Factory):</p>
                    <p className="text-3xl font-bold text-[#1B6A31] mt-1">{returnedWeight > 0 ? returnedWeight : 0} kg</p>
                </div>
                
                <button type="button" className="w-full mt-6 py-3 bg-[#1B6A31] text-white rounded-md hover:bg-[#4A9E46] shadow-sm transition-colors font-semibold text-lg">
                    Save Green Leaf Record
                </button>
            </form>
        </div>
    );
}