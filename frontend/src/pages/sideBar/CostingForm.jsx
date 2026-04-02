import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Calculator, Calendar, Leaf, Zap, Users, Settings2 } from "lucide-react";

export default function ProductionSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teaType, setTeaType] = useState('');

    // Rates (Editable with Defaults)
    const [labourRate, setLabourRate] = useState(1350);
    const [electricityRate, setElectricityRate] = useState(10);

    // Manual Inputs for Table
    const [handRollingWorkers, setHandRollingWorkers] = useState(0);
    const [rollerPoints, setRollerPoints] = useState(0);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`),
                fetch(`${BACKEND_URL}/api/labour`)
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            // Merge data based on date
            const merged = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                const gl = greenLeafData.find(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const lab = labourData.find(l => new Date(l.date).toISOString().split('T')[0] === dateStr);
                
                // Calculate units manually as it might not be explicitly saved as 'units' in DB
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                const calculatedUnits = mEnd > mStart ? (mEnd - mStart) : 0;

                return {
                    date: dateStr,
                    teaType: prod.teaType,
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    workerCount: lab ? lab.workerCount : 0,
                    dryerUnits: calculatedUnits
                };
            });

            setRecords(merged);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary based on Filters
    const calculateSummary = () => {
        let filtered = records;

        // Apply Date Filter
        if (startDate) filtered = filtered.filter(r => r.date >= startDate);
        if (endDate) filtered = filtered.filter(r => r.date <= endDate);
        
        // Apply Tea Type Filter
        if (teaType) filtered = filtered.filter(r => r.teaType === teaType);

        // Sum up the values
        const summary = filtered.reduce((acc, curr) => {
            acc.totalGL += Number(curr.selectedWeight);
            acc.totalMT += Number(curr.madeTeaWeight);
            acc.totalSelectionWorkers += Number(curr.workerCount);
            acc.totalDryerUnits += Number(curr.dryerUnits);
            return acc;
        }, { totalGL: 0, totalMT: 0, totalSelectionWorkers: 0, totalDryerUnits: 0 });

        return summary;
    };

    const summaryData = calculateSummary();

    // Cost Calculations
    const selectionCost = summaryData.totalSelectionWorkers * labourRate;
    const handRollingCost = handRollingWorkers * labourRate;
    
    const dryerCost = summaryData.totalDryerUnits * electricityRate;
    const rollerCost = rollerPoints * electricityRate;
    const totalElectricityCost = dryerCost + rollerCost;

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center justify-center sm:justify-start gap-2">
                        <Calculator size={28} /> Production Summary
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium">Calculate costs and requirements based on Tea Type</p>
                </div>
                
                <button 
                    onClick={fetchAllData}
                    disabled={loading}
                    className={`px-5 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8]'}`}
                >
                    {loading ? 'Syncing...' : 'Sync Latest Data'}
                </button>
            </div>

            {/* Top Control Panel: Filters & Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* 1. Filters */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider border-b pb-2">
                        <Calendar size={16} className="text-blue-600"/> 1. Select Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500">FROM DATE</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500">TO DATE</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500">TEA TYPE</label>
                            <select value={teaType} onChange={(e) => setTeaType(e.target.value)} className="border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 font-medium">
                                <option value="">-- All Types --</option>
                                <option value="Purple Tea">Purple Tea</option>
                                <option value="Pink Tea">Pink Tea</option>
                                <option value="White Tea">White Tea</option>
                                <option value="Silver Tips">Silver Tips</option>
                                <option value="Golden Tips">Golden Tips</option>
                                <option value="Silver Green">Silver Green</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Rate Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider border-b pb-2">
                        <Settings2 size={16} className="text-orange-500"/> 2. Adjust Rates (LKR)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Users size={12}/> LABOUR RATE (PER HEAD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                                <input type="number" value={labourRate} onChange={(e) => setLabourRate(Number(e.target.value))} className="w-full border rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/30" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Zap size={12}/> ELECTRICITY RATE (PER UNIT)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                                <input type="number" value={electricityRate} onChange={(e) => setElectricityRate(Number(e.target.value))} className="w-full border rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/30" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-[#1B6A31] p-4 border-b border-gray-200 flex items-center gap-2">
                    <Leaf className="text-white" size={20}/>
                    <h3 className="text-lg font-bold text-white">Calculation Board {teaType && ` - ${teaType}`}</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 text-gray-800 uppercase text-xs tracking-wider border-b border-gray-200">
                                <th rowSpan="2" className="px-4 py-4 font-extrabold border-r border-gray-200 align-middle bg-gray-100 w-40 text-center">Type of Tea</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 text-center">Quantity (kg)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 text-center">Labour Requirement</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-900 border-r border-gray-200 bg-blue-100/50 text-center">Labour Cost (Rs.)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-orange-600 border-r border-gray-200 bg-orange-50 text-center">Electricity (points)</th>
                                <th colSpan="3" className="px-4 py-2 font-bold text-orange-900 border-r border-gray-200 bg-orange-100/50 text-center">Electricity Cost (Rs.)</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                                {/* Quantity */}
                                <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 text-center border-r border-gray-200/60 w-24">G/L</th>
                                <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 text-center border-r border-gray-200 w-24">M/T</th>
                                {/* Labour Req */}
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 text-center border-r border-gray-200/60 w-24">Selection</th>
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 text-center border-r border-gray-200 w-32">Hand Rolling</th>
                                {/* Labour Cost */}
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200/60 w-28">Selection</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200 w-28">Hand Rolling</th>
                                {/* Elec Points */}
                                <th className="px-3 py-2 font-semibold bg-orange-50/50 text-center border-r border-gray-200/60 w-24">Dryer</th>
                                <th className="px-3 py-2 font-semibold bg-orange-50/50 text-center border-r border-gray-200 w-32">Roller</th>
                                {/* Elec Cost */}
                                <th className="px-3 py-2 font-semibold bg-orange-100/30 text-center border-r border-gray-200/60 w-28">Dryer</th>
                                <th className="px-3 py-2 font-semibold bg-orange-100/30 text-center border-r border-gray-200/60 w-28">Roller</th>
                                <th className="px-3 py-2 font-black bg-orange-200/40 text-center text-orange-900 w-32">Total Cost</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50/80 transition-colors group text-center">
                                
                                {/* Tea Type */}
                                <td className="px-4 py-4 border-r border-gray-200 font-bold text-gray-800 bg-gray-50/50">
                                    {teaType || <span className="text-gray-400 italic">All Types Selected</span>}
                                </td>

                                {/* Quantity */}
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-[#1B6A31] text-base">{summaryData.totalGL.toFixed(2)}</td>
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-[#1B6A31] text-base">{summaryData.totalMT.toFixed(3)}</td>

                                {/* Labour Requirement */}
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-blue-700 bg-blue-50/10">{summaryData.totalSelectionWorkers}</td>
                                <td className="px-2 py-2 border-r border-gray-200 bg-blue-50/30">
                                    <input 
                                        type="number" 
                                        value={handRollingWorkers} 
                                        onChange={(e) => setHandRollingWorkers(Number(e.target.value) || 0)} 
                                        onWheel={(e) => e.target.blur()}
                                        className="w-full p-2 border border-blue-300 rounded text-center font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                        placeholder="0"
                                    />
                                </td>

                                {/* Labour Cost */}
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{selectionCost.toLocaleString()}</td>
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{handRollingCost.toLocaleString()}</td>

                                {/* Electricity Points */}
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-orange-600 bg-orange-50/10">{summaryData.totalDryerUnits}</td>
                                <td className="px-2 py-2 border-r border-gray-200 bg-orange-50/30">
                                    <input 
                                        type="number" 
                                        value={rollerPoints} 
                                        onChange={(e) => setRollerPoints(Number(e.target.value) || 0)} 
                                        onWheel={(e) => e.target.blur()}
                                        className="w-full p-2 border border-orange-300 rounded text-center font-bold text-orange-800 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
                                        placeholder="0"
                                    />
                                </td>

                                {/* Electricity Cost */}
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{dryerCost.toLocaleString()}</td>
                                <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{rollerCost.toLocaleString()}</td>
                                <td className="px-3 py-4 font-black text-lg text-red-600 bg-red-50/30">{totalElectricityCost.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}