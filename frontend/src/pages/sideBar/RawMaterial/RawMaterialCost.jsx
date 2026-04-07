import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Leaf, Zap, Calculator, Save, PlusCircle, Trash2, ListChecks } from "lucide-react";

export default function RawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
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
            // Promise.all හරහා සියලුම records එකවර යැවීම (Backend වෙනස් කිරීම අවශ්‍ය නොවේ)
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
        } catch (error) {
            console.error(error);
            toast.error("Error saving some records. Please check.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    // Pending ලැයිස්තුවේ මුළු පිරිවැය
    const grandTotalPending = pendingRecords.reduce((sum, item) => sum + item.totalCost, 0);

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans bg-gray-50 min-h-screen">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center justify-center gap-2">
                    <Leaf size={28} /> Add Raw Material Cost
                </h2>
                <p className="text-gray-500 mt-2 font-medium">Add multiple processing records and save them at once</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* --- 1. DATA ENTRY FORM --- */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-100 h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4">
                        <div className="p-2 bg-green-100 rounded-lg text-green-700">
                            <Calculator size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">Data Entry Form</h3>
                    </div>

                    <form onSubmit={handleAddToList} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">DATE</label>
                                <input 
                                    type="date" 
                                    name="date"
                                    required
                                    value={formData.date} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">MATERIAL TYPE</label>
                                <select 
                                    name="materialType"
                                    required
                                    value={formData.materialType} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none bg-white"
                                >
                                    <option value="" disabled>Select Material</option>
                                    {materialOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">DRY WEIGHT (g)</label>
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
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="col-span-2 flex items-center gap-2 mb-1">
                                <Zap size={14} className="text-orange-500"/>
                                <span className="text-xs font-bold text-orange-700">METER READING</span>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">START</label>
                                <input 
                                    type="number" 
                                    name="meterStart"
                                    required
                                    onWheel={(e) => e.target.blur()}
                                    value={formData.meterStart} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">END</label>
                                <input 
                                    type="number" 
                                    name="meterEnd"
                                    required
                                    onWheel={(e) => e.target.blur()}
                                    value={formData.meterEnd} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                                />
                            </div>
                            <div className="col-span-2 text-right">
                                <span className="text-orange-600 font-medium text-xs">Points: </span>
                                <span className="font-bold text-orange-800 text-lg">{points > 0 ? points : 0}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">RAW MAT. COST (Rs)</label>
                                <input 
                                    type="number" 
                                    name="rawMaterialCost"
                                    required
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    value={formData.rawMaterialCost} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 block mb-1">ELECTRICITY COST (Rs)</label>
                                <input 
                                    type="number" 
                                    name="electricityCost"
                                    required
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    value={formData.electricityCost} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex justify-between items-center">
                            <span className="text-sm font-bold text-green-800">Total:</span>
                            <span className="text-xl font-black text-green-700">Rs. {totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full py-3 rounded-xl text-[#1B6A31] bg-green-100 font-bold flex justify-center items-center gap-2 border border-green-300 hover:bg-green-200 transition-all"
                        >
                            <PlusCircle size={18} /> Add to List
                        </button>
                    </form>
                </div>

                {/* --- 2. PENDING LIST & SAVE BUTTON --- */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4 border-b pb-4">
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

                        <div className="flex-1 overflow-y-auto max-h-[400px] pr-2">
                            {pendingRecords.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                    <ListChecks size={40} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">List is empty. Add records from the form.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingRecords.map((item, index) => (
                                        <div key={index} className="p-3 border border-gray-200 rounded-xl bg-gray-50 flex justify-between items-center group hover:border-blue-300 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-800">{item.materialType}</span>
                                                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{item.dryWeight}g</span>
                                                </div>
                                                <div className="text-xs text-gray-500 flex gap-3">
                                                    <span>Meter: {item.meterStart} - {item.meterEnd}</span>
                                                    <span>Pts: {item.totalPoints}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500 mb-0.5">Total Cost</div>
                                                    <div className="font-bold text-[#1B6A31]">Rs. {item.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveFromList(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
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
                    </div>

                    <button 
                        onClick={handleSaveAll}
                        disabled={isSaving || pendingRecords.length === 0}
                        className={`w-full py-4 rounded-2xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
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
    );
}