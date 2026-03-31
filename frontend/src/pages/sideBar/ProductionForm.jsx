import React from 'react';

export default function ProductionForm() {
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1B6A31] mb-6">Production Record</h2>
            
            <form className="bg-[#FFFFFF] p-8 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                        <input type="date" className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tea Type</label>
                        <select className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46] bg-white">
                            <option>Purple Tea</option>
                            <option>Pink Tea</option>
                            <option>White Tea</option>
                            <option>Golden Tips</option>
                            <option>Silver Tips</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Made Tea Weight (kg)</label>
                        <input type="number" step="0.01" className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]" placeholder="e.g. 2.5" />
                    </div>

                    {/* Dryer Details Section */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-semibold text-[#1B6A31] mb-4">Dryer Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Meter Start</label>
                                <input type="number" className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Meter End</label>
                                <input type="number" className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" />
                            </div>
                        </div>
                    </div>
                </div>

                <button type="button" className="w-full mt-8 py-3 bg-[#1B6A31] text-white rounded-md hover:bg-[#4A9E46] shadow-sm transition-colors font-semibold text-lg">
                    Save Production Record
                </button>
            </form>
        </div>
    );
}