import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Leaf, Zap, Calculator, Save, PlusCircle, Trash2, ListChecks } from "lucide-react";

export default function RawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    const [isSaving, setIsSaving] = useState(false);

    // Pending Records Array (එකවර Save කිරීමට පෙර තබාගන්නා ලැයිස්තුව)
    const [pendingRecords, setPendingRecords] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        materialType: '',
        dryWeight: '',
        meterStart: '',
        meterEnd: '',
        rawMaterialCost: '',
        electricityCost: ''
    });

    // Material Options
    const materialOptions = [
        "Heenbowitiya",
        "Moringa",
        "Gotukola",
        "Karapincha",
        "Iramusu",
        "Polpala"
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // ස්වයංක්‍රීය ගණනය කිරීම්
    const points = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);
    const totalCost = (Number(formData.rawMaterialCost) || 0) + (Number(formData.electricityCost) || 0);

    // 1. තාවකාලික ලැයිස්තුවට එකතු කිරීම (Add to List)
    const handleAddToList = (e) => {
        e.preventDefault();

        if (points < 0) {
            toast.error("Meter End must be greater than Meter Start");
            return;
        }

        const newRecord = {
            date: formData.date,
            materialType: formData.materialType,
            dryWeight: Number(formData.dryWeight),
            meterStart: Number(formData.meterStart),
            meterEnd: Number(formData.meterEnd),
            totalPoints: points,
            rawMaterialCost: Number(formData.rawMaterialCost),
            electricityCost: Number(formData.electricityCost),
            totalCost: totalCost
        };

        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`${formData.materialType} added to list!`);

        // Form එක හිස් කිරීම (නමුත් ඊළඟ පහසුව සඳහා Date සහ Meter Start එක තබාගැනීම)
        setFormData({
            ...formData,
            materialType: '',
            dryWeight: '',
            meterStart: formData.meterEnd, // කලින් එකේ End එක මීළඟ එකේ Start එක වේ
            meterEnd: '',
            rawMaterialCost: '',
            electricityCost: ''
        });
    };

    // 2. ලැයිස්තුවෙන් ඉවත් කිරීම
    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

    // 3. සියල්ල එකවර Database එකට Save කිරීම
    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("No records in the list to save!");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            // Promise.all හරහා සියලුම records එකවර යැවීම
            const promises = pendingRecords.map(record => 
                fetch(`${BACKEND_URL}/api/raw-material-cost`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                }).then(res => {
                    if (!res.ok) throw new Error('Failed');
                    return res.json();
                })
            );

            await Promise.all(promises);
            toast.success("All records saved successfully!", { id: toastId });
            
            // Save වූ පසු ලැයිස්තුව හිස් කිරීම
            setPendingRecords([]);
            
            setTimeout(() => {
                navigate('/view-raw-material-cost');
            }, 1000);
            
        } catch (error) {
            console.error(error);
            toast.error("Error saving some records. Please check.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    // Pending ලැයිස්තුවේ මුළු පිරිවැය
    const grandTotalPending = pendingRecords.reduce((sum, item) => sum + item.totalCost, 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 min-h-screen">
            
            <div className="mb-8 text-center sm:text-left">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Add Raw Material Cost</h2>
                <p className="text-gray-500 mt-2 font-medium">Add multiple processing records and save them at once</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* --- 1. DATA ENTRY FORM (Left Side) --- */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleAddToList} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
                        
                        <div className="mb-8 pb-6 border-b border-gray-100 flex items-center gap-4">
                            <label className="block text-sm font-bold text-gray-700">Select Date:</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleInputChange} 
                                required 
                                className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" 
                            />
                        </div>

                        {/* 1. MATERIAL DETAILS */}
                        <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-xl p-6">
                            <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2"><span>🌱</span> 1. Material Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">MATERIAL TYPE</label>
                                    <select 
                                        name="materialType"
                                        required
                                        value={formData.materialType} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none bg-white"
                                    >
                                        <option value="" disabled>Select Material</option>
                                        {materialOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">DRY WEIGHT (g)</label>
                                    <input 
                                        type="number" 
                                        name="dryWeight"
                                        required
                                        min="0"
                                        step="0.01"
                                        onWheel={(e) => e.target.blur()}
                                        value={formData.dryWeight} 
                                        onChange={handleInputChange} 
                                        placeholder="0"
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. ELECTRICITY METER */}
                        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2"><span>⚡</span> 2. Electricity Meter Reading</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">START READING</label>
                                    <input 
                                        type="number" 
                                        name="meterStart"
                                        required
                                        onWheel={(e) => e.target.blur()}
                                        value={formData.meterStart} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">END READING</label>
                                    <input 
                                        type="number" 
                                        name="meterEnd"
                                        required
                                        onWheel={(e) => e.target.blur()}
                                        value={formData.meterEnd} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">TOTAL POINTS</label>
                                    <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md flex items-center">
                                        {points > 0 ? points : 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. COSTS */}
                        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2"><span>💰</span> 3. Cost Breakdown</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">RAW MAT. COST (Rs)</label>
                                    <input 
                                        type="number" 
                                        name="rawMaterialCost"
                                        required
                                        min="0"
                                        onWheel={(e) => e.target.blur()}
                                        value={formData.rawMaterialCost} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ELECTRICITY COST (Rs)</label>
                                    <input 
                                        type="number" 
                                        name="electricityCost"
                                        required
                                        min="0"
                                        onWheel={(e) => e.target.blur()}
                                        value={formData.electricityCost} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-600">Calculated Total Cost:</span>
                                <span className="text-xl font-black text-blue-700">Rs. {totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-4 rounded-xl text-[#1B6A31] bg-[#F8FAF8] border border-[#8CC63F] font-bold flex justify-center items-center gap-2 hover:bg-[#eaf5e5] transition-all"
                        >
                            <PlusCircle size={20} /> Add Record to List
                        </button>
                    </form>
                </div>

                {/* --- 2. PENDING LIST (Right Side) --- */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 flex-1 flex flex-col sticky top-8 max-h-[80vh]">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                    <ListChecks size={20} />
                                </div>
                                <h3 className="font-bold text-gray-800 text-lg">Pending Records</h3>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                {pendingRecords.length} Items
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {pendingRecords.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                                    <ListChecks size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">List is empty.</p>
                                    <p className="text-xs mt-1 text-gray-400">Fill the form and click 'Add to List'</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRecords.map((item, index) => (
                                        <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50 relative group hover:border-blue-300 transition-colors">
                                            
                                            <button 
                                                onClick={() => handleRemoveFromList(index)}
                                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm border border-gray-100 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 pr-8">
                                                    <span className="font-black text-gray-800 text-lg">{item.materialType}</span>
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase">{item.dryWeight}g</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                                                    <div className="bg-white p-2 rounded border border-gray-100">
                                                        <span className="block text-gray-400 font-bold mb-0.5 text-[9px] uppercase">Electricity</span>
                                                        Pts: <span className="font-bold text-orange-600">{item.totalPoints}</span><br/>
                                                        ({item.meterStart} - {item.meterEnd})
                                                    </div>
                                                    <div className="bg-white p-2 rounded border border-gray-100">
                                                        <span className="block text-gray-400 font-bold mb-0.5 text-[9px] uppercase">Costs</span>
                                                        Mat: <span className="font-bold text-gray-700">{item.rawMaterialCost}</span><br/>
                                                        Elec: <span className="font-bold text-gray-700">{item.electricityCost}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grand Total of Pending List */}
                        {pendingRecords.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-end">
                                <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Grand Total</span>
                                <span className="text-2xl font-black text-[#1B6A31]">
                                    Rs. {grandTotalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancel / Go Back
                            </button>

                            <button 
                                onClick={handleSaveAll}
                                disabled={isSaving || pendingRecords.length === 0}
                                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                    isSaving || pendingRecords.length === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-[#1B6A31] hover:bg-green-800 hover:-translate-y-1'
                                }`}
                            >
                                <Save size={20} /> {isSaving ? "Saving All..." : `Save All ${pendingRecords.length} Records`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
} 