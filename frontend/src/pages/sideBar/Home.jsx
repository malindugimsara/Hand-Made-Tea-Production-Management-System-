import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function home() {
    const navigate = useNavigate();

    return (
        <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-8">Welcome Back!</h2>
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#FFFFFF] p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#4A9E46]">
                    <p className="text-sm text-gray-500 font-medium">Today's Green Leaf</p>
                    <p className="text-3xl font-bold text-[#1B6A31] mt-2">120 <span className="text-lg">kg</span></p>
                </div>
                <div className="bg-[#FFFFFF] p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#1B6A31]">
                    <p className="text-sm text-gray-500 font-medium">Made Tea (This Week)</p>
                    <p className="text-3xl font-bold text-[#1B6A31] mt-2">45 <span className="text-lg">kg</span></p>
                </div>
                <div className="bg-[#FFFFFF] p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-[#8CC63F]">
                    <p className="text-sm text-gray-500 font-medium">Sales Revenue (LKR)</p>
                    <p className="text-3xl font-bold text-[#1B6A31] mt-2">Rs. 24,500</p>
                </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex-1 flex flex-col space-y-6 max-w-2xl mx-auto w-full mt-8">
                <button 
                    onClick={() => navigate('/production')}
                    className="w-full py-4 bg-[#1B6A31] text-[#FFFFFF] shadow-md rounded-lg hover:bg-[#4A9E46] transition-colors duration-200 text-lg font-medium flex justify-center items-center"
                >
                    + Add New Production Record
                </button>
                
                <button 
                    onClick={() => navigate('/costing')}
                    className="w-full py-4 bg-[#FFFFFF] border-2 border-[#4A9E46] text-[#4A9E46] shadow-sm rounded-lg hover:bg-[#4A9E46] hover:text-[#FFFFFF] transition-colors duration-200 text-lg font-medium flex justify-center items-center"
                >
                    View Cost Calculations
                </button>
            </div>
        </div>
    );
}