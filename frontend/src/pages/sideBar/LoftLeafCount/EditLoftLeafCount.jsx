import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Leaf, Save, Tag, PlusCircle, X } from "lucide-react"; 
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditLoftLeafCount() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    const [showSpinner, setShowSpinner] = useState(false);
    const [editDate, setEditDate] = useState('');
    
    // Dynamic List of Records
    const [recordsList, setRecordsList] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);

    useEffect(() => {
        if (location.state && location.state.recordsData && location.state.date) {
            setEditDate(location.state.date);
            
            // Map incoming DB records to UI state
            const mappedRecords = location.state.recordsData.map((data, index) => ({
                id: data._id || Date.now() + index,
                _id: data._id,
                // මෙතනදී route එක lowercase කරලා ගන්නවා ගැලපීම පහසු වෙන්න
                route: data.route ? data.route.toLowerCase() : '',
                bestQty: data.bestQty || '',
                belowBestQty: data.belowBestQty || ''
            }));
            
            setRecordsList(mappedRecords);
        } else {
            toast.error("No record data found to edit.");
            navigate(-1); 
        }
    }, [location, navigate]);

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddRow = () => {
        setRecordsList([
            ...recordsList, 
            { id: Date.now().toString(), _id: null, route: '', bestQty: '', belowBestQty: '' }
        ]);
    };

    const handleRemoveRow = (idToRemove) => {
        const recordToRemove = recordsList.find(r => r.id === idToRemove);
        
        if (recordToRemove && recordToRemove._id) {
            setDeletedIds([...deletedIds, recordToRemove._id]);
        }
        
        setRecordsList(recordsList.filter(row => row.id !== idToRemove));
    };

    const handleInputChange = (id, field, value) => {
        const val = Number(value) || 0;

        if (field !== 'route' && value !== '' && val < 0) return;

        setRecordsList(recordsList.map(row => {
            if (row.id === id) {
                const b = field === 'bestQty' ? val : (Number(row.bestQty) || 0);
                const bb = field === 'belowBestQty' ? val : (Number(row.belowBestQty) || 0);
                if (b + bb > 100) return row; 
                
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    // --- SUBMIT LOGIC ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (recordsList.length === 0 && deletedIds.length === 0) {
            toast.error("Nothing to save!");
            return;
        }

        const hasEmptyRoute = recordsList.some(r => !r.route);
        if (hasEmptyRoute) {
            toast.error("Please select a route for all entries!");
            return;
        }

        setShowSpinner(true);
        const toastId = toast.loading('Updating records...');

        try {
            const token = localStorage.getItem('token');
            const currentUsername = localStorage.getItem('username') || 'Unknown User';
            const promises = [];

            // 1. DELETE
            deletedIds.forEach(id => {
                promises.push(
                    fetch(`${BACKEND_URL}/api/loft-leaf/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                );
            });

            // 2. UPDATE / CREATE
            recordsList.forEach(record => {
                const b = Number(record.bestQty) || 0;
                const bb = Number(record.belowBestQty) || 0;
                const p = Math.max(0, 100 - (b + bb));

                const payload = {
                    date: editDate,
                    route: record.route,
                    bestQty: b,
                    belowBestQty: bb,
                    poorQty: p,
                    updatedBy: currentUsername 
                };

                if (record._id) {
                    promises.push(
                        fetch(`${BACKEND_URL}/api/loft-leaf/${record._id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(payload)
                        }).then(res => { if (!res.ok) throw new Error("Update Failed"); })
                    );
                } else {
                    promises.push(
                        fetch(`${BACKEND_URL}/api/loft-leaf`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(payload)
                        }).then(res => { if (!res.ok) throw new Error("Create Failed"); })
                    );
                }
            });

            await Promise.all(promises);

            toast.success("Records updated successfully!", { id: toastId });
            setTimeout(() => {
                navigate(-1);
            }, 500);

        } catch (error) {
            console.error(error);
            toast.error("Error updating records. Please try again.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to Records
            </button>
            
            <div className="mb-8 mt-10 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center justify-center gap-2">
                    <Leaf size={28} /> Edit Daily Loft Leaf
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage all routes for: <span className="text-[#1B6A31] font-bold">{editDate}</span></p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                
                <div className="mb-8 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-xl p-6 transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-green-700 dark:text-green-500 flex items-center gap-2">
                            <Tag size={20} /> Leaf Quantities by Route
                        </h3>
                        <button 
                            type="button" 
                            onClick={handleAddRow}
                            className="text-sm font-bold bg-green-200 hover:bg-green-300 dark:bg-green-900/40 dark:hover:bg-green-800/60 text-green-800 dark:text-green-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                            <PlusCircle size={16} /> Add Route
                        </button>
                    </div>

                    <div className="space-y-4">
                        {recordsList.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm">All entries removed. Add a route to save.</div>
                        ) : (
                            recordsList.map((row) => {
                                const b = Number(row.bestQty) || 0;
                                const bb = Number(row.belowBestQty) || 0;
                                const p = Math.max(0, 100 - (b + bb));

                                return (
                                    <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-5 rounded-xl border border-green-100 dark:border-green-900/40 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                                        
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 text-red-600 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                            title="Remove Entry"
                                        >
                                            <X size={14} />
                                        </button>

                                        <div className="w-full md:w-1/4">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Route</label>
                                            <select 
                                                value={row.route ? row.route.toLowerCase() : ""} 
                                                onChange={(e) => handleInputChange(row.id, 'route', e.target.value)} 
                                                required 
                                                className="w-full p-2.5 border border-gray-200 rounded-md outline-none focus:border-[#8CC63F] dark:bg-zinc-900 dark:border-zinc-700"
                                            >
                                                <option value="">Select Route</option>
                                                {/* මෙහි value එකද සම්පූර්ණ අගයක් ලෙසම ලබාදී ඇත */}
                                                {["c1 - MATHTHAKA", "c2 - walallawita", "c3 - pelawaththa", "c4 - polgampala", "c5 - manampita", "c7 - ganegoda", "c8 - thundola", "fa - factory", "e - estate tea"].map(r => (
                                                    <option key={r} value={r.toLowerCase()}>{r.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-full md:w-1/4">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Best (g)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                min="0"
                                                value={row.bestQty} 
                                                onChange={(e) => handleInputChange(row.id, 'bestQty', e.target.value)} 
                                                onWheel={(e) => e.target.blur()} 
                                                required 
                                                className="w-full p-2.5 border border-green-200 rounded-md outline-none focus:border-[#8CC63F] dark:bg-zinc-900 dark:border-green-900/50" 
                                            />
                                        </div>

                                        <div className="w-full md:w-1/4">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Below Best (g)</label>
                                            <input 
                                                type="number" 
                                                step="any"
                                                min="0"
                                                value={row.belowBestQty} 
                                                onChange={(e) => handleInputChange(row.id, 'belowBestQty', e.target.value)} 
                                                onWheel={(e) => e.target.blur()} 
                                                required 
                                                className="w-full p-2.5 border border-yellow-200 rounded-md outline-none focus:border-yellow-400 dark:bg-zinc-900 dark:border-yellow-900/50" 
                                            />
                                        </div>

                                        <div className="w-full md:w-1/4">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Poor (g)</label>
                                            <input 
                                                type="number" 
                                                value={p} 
                                                disabled 
                                                className="w-full p-2.5 border border-red-200 bg-gray-100 font-bold text-red-600 rounded-md outline-none dark:bg-zinc-900 dark:border-red-900/50 cursor-not-allowed" 
                                            />
                                        </div>

                                    </div>
                                );
                            })
                        )}
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
                        {showSpinner ? "Saving Updates..." : "Save All Changes"}
                    </button> 
                </div>
            </form>
        </div>
    );
}