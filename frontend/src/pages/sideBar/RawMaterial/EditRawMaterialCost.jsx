import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Zap, Calculator, Save, X } from "lucide-react";

export default function EditRawMaterialCost() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isSaving, setIsSaving] = useState(false);

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

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
        // Security check: Bounce Viewers out immediately
        if (isViewer) {
            toast.error("Access Denied. Viewers cannot edit records.");
            navigate('/view-raw-material-cost');
            return;
        }

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
    }, [recordData, navigate, isViewer]);

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
            // FIX: Grab the token to prove you are authorized!
            const token = localStorage.getItem('token');
            
            const res = await fetch(`${BACKEND_URL}/api/raw-material-cost/${recordData._id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => navigate('/view-raw-material-cost'), 1000); 
            } else {
                if (res.status === 403) {
                    toast.error("Access Denied.", { id: toastId });
                } else {
                    throw new Error('Failed to update');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating record", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center justify-center gap-2">
                    <Leaf size={28} /> Edit Raw Material Cost
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously saved processing costs</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-green-100 dark:border-zinc-800 transition-colors duration-300">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                            <Calculator size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Edit Form</h3>
                    </div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 rounded-full transition-colors"
                        title="Cancel & Go Back"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">DATE</label>
                            <input 
                                type="date" 
                                name="date"
                                required
                                value={formData.date} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 outline-none bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">MATERIAL TYPE</label>
                            <select 
                                name="materialType"
                                required
                                value={formData.materialType} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 outline-none bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors"
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
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">DRY WEIGHT (g)</label>
                        <input 
                            type="number" 
                            name="dryWeight"
                            required
                            min="0"
                            step="0.01"
                            onWheel={(e) => e.target.blur()}
                            value={formData.dryWeight} 
                            onChange={handleInputChange} 
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-800/50 transition-colors duration-300">
                        <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-orange-500"/>
                            <span className="text-sm font-bold text-orange-700 dark:text-orange-500">METER READING</span>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">START</label>
                            <input 
                                type="number" 
                                name="meterStart"
                                required
                                onWheel={(e) => e.target.blur()}
                                value={formData.meterStart} 
                                onChange={handleInputChange} 
                                className="w-full p-2.5 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">END</label>
                            <input 
                                type="number" 
                                name="meterEnd"
                                required
                                onWheel={(e) => e.target.blur()}
                                value={formData.meterEnd} 
                                onChange={handleInputChange} 
                                className="w-full p-2.5 border border-orange-200 dark:border-orange-800/50 rounded-md focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-2 flex flex-col justify-end text-right">
                            <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">Total Points</span>
                            <span className="font-black text-orange-800 dark:text-orange-300 text-2xl">{points > 0 ? points : 0}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">RAW MATERIAL COST (Rs)</label>
                            <input 
                                type="number" 
                                name="rawMaterialCost"
                                required
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                value={formData.rawMaterialCost} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">ELECTRICITY COST (Rs)</label>
                            <input 
                                type="number" 
                                name="electricityCost"
                                required
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                value={formData.electricityCost} 
                                onChange={handleInputChange} 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/50 flex justify-between items-center mt-4 transition-colors duration-300">
                        <span className="text-lg font-bold text-green-800 dark:text-green-400">Total Cost:</span>
                        <span className="text-3xl font-black text-green-700 dark:text-green-500">Rs. {totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            type="button" 
                            onClick={() => navigate(-1)}
                            className="w-1/3 py-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-zinc-800 font-bold hover:bg-gray-300 dark:hover:bg-zinc-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-2/3 py-4 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-md transition-all ${
                                isSaving 
                                ? 'bg-blue-400 dark:bg-blue-800 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
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