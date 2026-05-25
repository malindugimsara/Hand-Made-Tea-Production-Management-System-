import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Leaf, Save, Tag } from "lucide-react"; 
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditLoftLeafCount() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    const [showSpinner, setShowSpinner] = useState(false);
    const [recordId, setRecordId] = useState(null);

    const [formData, setFormData] = useState({
        date: '',
        route: '',
        bestQty: '',
        belowBestQty: '',
    });

    useEffect(() => {
        if (location.state && location.state.recordData) {
            const data = location.state.recordData;
            setRecordId(data._id);
            setFormData({
                date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
                route: data.route || '',
                bestQty: data.bestQty || '',
                belowBestQty: data.belowBestQty || ''
            });
        } else {
            toast.error("No record data found to edit.");
            navigate(-1); 
        }
    }, [location, navigate]);

    // Auto-calculate poor leaf
    const b = Number(formData.bestQty) || 0;
    const bb = Number(formData.belowBestQty) || 0;
    const p = Math.max(0, 100 - (b + bb)); 

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const val = Number(value) || 0;

        if (name === "bestQty" && val + bb > 100) return;
        if (name === "belowBestQty" && val + b > 100) return;
        if (name !== 'date' && name !== 'route' && value !== '' && val < 0) return;

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Updating record...');

        try {
            const token = localStorage.getItem('token');
            const currentUsername = localStorage.getItem('username') || 'Unknown User';

            const payload = {
                date: formData.date,
                route: formData.route,
                bestQty: b,
                belowBestQty: bb,
                poorQty: p,
                updatedBy: currentUsername 
            };

            const response = await fetch(`${BACKEND_URL}/api/loft-leaf/${recordId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Record updated successfully!", { id: toastId });
                setTimeout(() => {
                    navigate(-1);
                }, 500);
            } else {
                if (response.status === 403) {
                    toast.error("Access Denied. You do not have permission.", { id: toastId });
                } else {
                    toast.error("Error updating record.", { id: toastId });
                }
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to Records
            </button>
            
            <div className="mb-8 mt-10 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center justify-center gap-2">
                    <Leaf size={28} /> Edit Loft Leaf Record
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update previously saved daily leaf quantities</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                
                {/* General Info Section */}
                <div className="mb-8 pb-6 border-b border-gray-100 dark:border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Date</label>
                            <input 
                                type="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                                <Tag size={16} className="text-[#0f766e] dark:text-teal-500" /> Route
                            </label>
                            <select 
                                name="route" 
                                value={formData.route} 
                                onChange={handleInputChange} 
                                required 
                                className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                            >
                                <option value="">Select Route</option>
                                {["c1 - MATHTHAKA", "c2 - walallawita", "c3 - pelawaththa", "c4 - polgampala", "c5 - manampita", "c7 - ganegoda", "c8 - thundola", "fa - factory", "e - estate tea"].map(r => (
                                    <option key={r} value={r.split(" ")[0]}>{r.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Quantities Section */}
                <div className="mb-8 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg p-6 transition-colors duration-300">
                    <h3 className="text-lg font-bold text-green-700 dark:text-green-500 flex items-center gap-2 mb-6">
                        <Leaf size={20} /> Leaf Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Best (g)</label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                name="bestQty" 
                                value={formData.bestQty} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-green-200 dark:border-green-800/50 rounded-md focus:ring-2 focus:ring-green-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Below Best (g)</label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                name="belowBestQty" 
                                value={formData.belowBestQty} 
                                onChange={handleInputChange} 
                                onWheel={(e) => e.target.blur()} 
                                required 
                                className="w-full p-3 border border-yellow-200 dark:border-yellow-800/50 rounded-md focus:ring-2 focus:ring-yellow-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Poor (g)</label>
                            <input 
                                type="number" 
                                value={p} 
                                disabled 
                                className="w-full p-3 border border-red-200 dark:border-red-800/50 rounded-md bg-gray-100 dark:bg-zinc-900 font-bold text-red-600 dark:text-red-500 transition-colors cursor-not-allowed" 
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`w-2/3 h-14 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                            showSpinner ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-[#1B6A31] dark:bg-green-700 hover:bg-[#145226] dark:hover:bg-green-600 shadow-lg'
                        }`}
                        disabled={showSpinner}
                    >
                        <Save size={20} />
                        {showSpinner ? "Updating..." : "Update Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}