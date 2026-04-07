import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // Toaster component එක අයින් කර ඇත
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Zap, Calculator, Save, X } from "lucide-react";

export default function EditRawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isSaving, setIsSaving] = useState(false);

    // View page එකෙන් එවන දත්ත ලබා ගැනීම
    const recordData = location.state?.record;

    // Form State
    const [formData, setFormData] = useState({
        date: '',
        materialType: '',
        dryWeight: '',
        meterStart: '',
        meterEnd: '',
        rawMaterialCost: '',
        electricityCost: ''
    });

    const materialOptions = ["Heenbowitiya", "Moringa", "Gotukola", "Karapincha", "Iramusu", "Polpala"];

    // පිටුව ලෝඩ් වෙද්දී කලින් තිබුණ දත්ත Form එකට පිරවීම
    useEffect(() => {
        if (recordData) {
            setFormData({
                date: new Date(recordData.date).toISOString().split('T')[0],
                materialType: recordData.materialType,
                dryWeight: recordData.dryWeight,
                meterStart: recordData.meterStart,
                meterEnd: recordData.meterEnd,
                rawMaterialCost: recordData.rawMaterialCost,
                electricityCost: recordData.electricityCost
            });
        } else {
            toast.error("No record data found!");
            navigate('/view-raw-material-cost'); // Data නැත්නම් ආපහු View එකට යවනවා
        }
    }, [recordData, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const points = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);
    const totalCost = (Number(formData.rawMaterialCost) || 0) + (Number(formData.electricityCost) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (points < 0) {
            toast.error("Meter End must be greater than Meter Start");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading('Updating record...');

        const payload = {
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

        try {
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost/${recordData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => navigate('/view-raw-material-cost'), 1000); // තත්පරයකින් View Page එකට යවයි
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating record", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto font-sans bg-gray-50 min-h-screen">
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center justify-center gap-2">
                    <Leaf size={28} /> Edit Raw Material Cost
                </h2>
                <p className="text-gray-500 mt-2 font-medium">Update previously saved processing costs</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100">
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg text-green-700">
                            <Calculator size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">Edit Form</h3>
                    </div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-colors"
                        title="Cancel & Go Back"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">DATE</label>
                            <input 
                                type="date" 
                                name="date"
                                required
                                value={formData.date} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none bg-gray-50"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">MATERIAL TYPE</label>
                            <select 
                                name="materialType"
                                required
                                value={formData.materialType} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none bg-gray-50"
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
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-orange-50 rounded-xl border border-orange-100">
                        <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-orange-500"/>
                            <span className="text-sm font-bold text-orange-700">METER READING</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 block mb-1">START</label>
                            <input 
                                type="number" 
                                name="meterStart"
                                required
                                onWheel={(e) => e.target.blur()}
                                value={formData.meterStart} 
                                onChange={handleInputChange} 
                                className="w-full p-2.5 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 block mb-1">END</label>
                            <input 
                                type="number" 
                                name="meterEnd"
                                required
                                onWheel={(e) => e.target.blur()}
                                value={formData.meterEnd} 
                                onChange={handleInputChange} 
                                className="w-full p-2.5 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-2 flex flex-col justify-end text-right">
                            <span className="text-orange-600 font-medium text-sm">Total Points</span>
                            <span className="font-black text-orange-800 text-2xl">{points > 0 ? points : 0}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">RAW MATERIAL COST (Rs)</label>
                            <input 
                                type="number" 
                                name="rawMaterialCost"
                                required
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                value={formData.rawMaterialCost} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">ELECTRICITY COST (Rs)</label>
                            <input 
                                type="number" 
                                name="electricityCost"
                                required
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                value={formData.electricityCost} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-green-50 rounded-xl border border-green-200 flex justify-between items-center mt-4">
                        <span className="text-lg font-bold text-green-800">Total Cost:</span>
                        <span className="text-3xl font-black text-green-700">Rs. {totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            type="button" 
                            onClick={() => navigate(-1)}
                            className="w-1/3 py-4 rounded-xl text-gray-700 bg-gray-200 font-bold hover:bg-gray-300 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-2/3 py-4 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-md transition-all ${
                                isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                            }`}
                        >
                            <Save size={20} /> {isSaving ? "Updating..." : "Update Record"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}