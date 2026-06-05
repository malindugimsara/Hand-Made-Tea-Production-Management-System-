import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Leaf, Save, Tag, PlusCircle, X, User, Weight, Factory, Users, Trash2 } from "lucide-react"; 
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../api/axiosConfig'; 

export default function EditLoftLeafCount() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    const [showSpinner, setShowSpinner] = useState(false);
    const [editDate, setEditDate] = useState('');
    
    // Dynamic List of Records
    const [recordsList, setRecordsList] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);

    const routeOptions = [
        "c1 - maththaka", "c2 - walallawita", "c3 - pelawaththa", 
        "c4 - polgampala", "c5 - manampita", "c7 - ganegoda", 
        "c8 - thundola", "fa - factory", "e - estate tea"
    ];

    useEffect(() => {
        if (location.state && location.state.recordsData && location.state.date) {
            setEditDate(location.state.date);
            
            // Map incoming DB records to UI state
            const mappedRecords = location.state.recordsData.map((data, index) => ({
                id: data._id || Date.now() + index,
                _id: data._id,
                sampleType: data.sampleType || 'Factory', 
                route: data.route ? data.route.toLowerCase() : '',
                officerName: data.officerName || '',
                
                // Fix: 0 ආවත් නිවැරදිව පෙන්නන්න !== undefined සහ null චෙක් කර ඇත
                totalLeafQty: data.totalLeafQty !== undefined && data.totalLeafQty !== null ? data.totalLeafQty : '',
                bestQty: data.bestQty !== undefined && data.bestQty !== null ? data.bestQty : '',
                belowBestQty: data.belowBestQty !== undefined && data.belowBestQty !== null ? data.belowBestQty : ''
            }));
            
            setRecordsList(mappedRecords);
        } else {
            toast.error("No record data found to edit.");
            navigate(-1); 
        }
    }, [location, navigate]);

    // --- DYNAMIC FIELD HANDLERS ---
    const handleAddRow = (type) => {
        setRecordsList([
            ...recordsList, 
            { id: Date.now().toString(), _id: null, sampleType: type, route: '', officerName: '', totalLeafQty: '', bestQty: '', belowBestQty: '' }
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

        // ඍණ සංඛ්‍යා ඇතුළත් කිරීම වැළැක්වීම
        if (['bestQty', 'belowBestQty', 'totalLeafQty'].includes(field) && value !== '' && val < 0) return;

        setRecordsList(recordsList.map(row => {
            if (row.id === id) {
                if (field === 'bestQty' || field === 'belowBestQty') {
                    const b = field === 'bestQty' ? val : (Number(row.bestQty) || 0);
                    const bb = field === 'belowBestQty' ? val : (Number(row.belowBestQty) || 0);
                    if (b + bb > 100) return row; // 100g සීමාව ඉක්මවා යාම වැළැක්වීම
                }
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    // --- SUBMIT LOGIC ---
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

        // Factory Sample Validation
        const hasInvalidFactory = recordsList.some(r => r.sampleType === 'Factory' && (!r.officerName || r.totalLeafQty === ''));
        if (hasInvalidFactory) {
            toast.error("Please fill Officer Name and Total Leaf Qty for all Factory samples!");
            return;
        }

        setShowSpinner(true);
        const toastId = toast.loading('Updating records...');

        try {
            const currentUsername = localStorage.getItem('username') || 'Unknown User';
            const promises = [];

            // 1. DELETE
            deletedIds.forEach(id => {
                // api.delete භාවිතය
                promises.push(api.delete(`/api/loft-leaf/${id}`));
            });

            // 2. UPDATE / CREATE
            recordsList.forEach(record => {
                const b = Number(record.bestQty) || 0;
                const bb = Number(record.belowBestQty) || 0;
                const p = Math.max(0, 100 - (b + bb));

                const payload = {
                    date: editDate,
                    route: record.route,
                    sampleType: record.sampleType,
                    officerName: record.sampleType === 'Factory' ? record.officerName : "",
                    totalLeafQty: record.sampleType === 'Factory' ? Number(record.totalLeafQty) : null,
                    bestQty: b,
                    belowBestQty: bb,
                    poorQty: p,
                    updatedBy: currentUsername 
                };

                if (record._id) {
                    // api.put භාවිතය
                    promises.push(api.put(`/api/loft-leaf/${record._id}`, payload));
                } else {
                    // api.post භාවිතය
                    promises.push(api.post(`/api/loft-leaf`, payload));
                }
            });

            await Promise.all(promises);

            toast.success("Records updated successfully!", { id: toastId });
            setTimeout(() => {
                navigate(-1);
            }, 500);

        } catch (error) {
            console.error(error);
            // Axios error handling
            if (error.response?.status === 403) {
                toast.error("Access Denied. You do not have permission to edit records.", { id: toastId });
            } else {
                toast.error("Error updating records. Please try again.", { id: toastId });
            }
        } finally {
            setShowSpinner(false);
        }
    };

    // --- REUSABLE ROW RENDER FUNCTION ---
    const renderRecordCard = (row) => {
        const isFactory = row.sampleType === 'Factory';
        const b = Number(row.bestQty) || 0;
        const bb = Number(row.belowBestQty) || 0;
        const p = Math.max(0, 100 - (b + bb));
        const totalQty = b + bb + p;

        const bPct = totalQty > 0 ? ((b / totalQty) * 100).toFixed(0) : 0;
        const bbPct = totalQty > 0 ? ((bb / totalQty) * 100).toFixed(0) : 0;
        const pPct = totalQty > 0 ? ((p / totalQty) * 100).toFixed(0) : 0;

        return (
            <div key={row.id} className={`bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border-t-4 border-x border-b border-gray-100 dark:border-zinc-800 relative transition-all`}>
                
                <button 
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="absolute top-6 right-6 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 rounded-full p-2 transition-colors"
                    title="Remove Entry"
                >
                    <Trash2 size={18} />
                </button>

                <div className={`grid grid-cols-1 ${isFactory ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                    
                    {/* Route Dropdown */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                            <Tag size={12} /> Route
                        </label>
                        <select 
                            value={row.route} 
                            onChange={(e) => handleInputChange(row.id, 'route', e.target.value)} 
                            required 
                            className="w-full p-2.5 px-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-[#1B6A31]/50 outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors"
                        >
                            <option value="">Select Route</option>
                            {routeOptions.map(r => (
                                <option key={r} value={r}>{r.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Officer Name (Factory Only) */}
                    {isFactory && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                                <User size={12} /> Selected Officer Name
                            </label>
                            <input 
                                type="text" 
                                value={row.officerName} 
                                onChange={(e) => handleInputChange(row.id, 'officerName', e.target.value)} 
                                required 
                                placeholder="Enter officer name"
                                className="w-full p-2.5 px-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-[#1B6A31]/50 outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors"
                            />
                        </div>
                    )}

                    {/* Total Leaf Qty (Factory Only) */}
                    {isFactory && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                                <Weight size={12} /> Total Leaf Qty (Kg)
                            </label>
                            <input 
                                type="number" 
                                step="any"
                                min="0"
                                value={row.totalLeafQty} 
                                onChange={(e) => handleInputChange(row.id, 'totalLeafQty', e.target.value)} 
                                required 
                                placeholder="e.g. 250"
                                className="w-full p-2.5 px-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-[#1B6A31]/50 outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors"
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {/* Best */}
                    <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/50">
                        <label className="block text-xs font-bold text-green-700 dark:text-green-500 mb-2">Best (g)</label>
                        <input 
                            type="number" 
                            step="any"
                            min="0"
                            value={row.bestQty} 
                            onChange={(e) => handleInputChange(row.id, 'bestQty', e.target.value)} 
                            onWheel={(e) => e.target.blur()} 
                            required 
                            className="w-full p-2.5 mb-3 border border-green-200 dark:border-green-800 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none bg-white dark:bg-zinc-900 text-gray-900 dark:text-white" 
                        />
                        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 px-3 py-2 rounded-lg font-bold text-green-800 dark:text-green-400 justify-center shadow-inner">{bPct}%</div>
                    </div>

                    {/* Below Best */}
                    <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/50">
                        <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-2 uppercase">Below Best (g)</label>
                        <input 
                            type="number" 
                            step="any"
                            min="0"
                            value={row.belowBestQty} 
                            onChange={(e) => handleInputChange(row.id, 'belowBestQty', e.target.value)} 
                            onWheel={(e) => e.target.blur()} 
                            required 
                            className="w-full p-2.5 mb-3 border border-yellow-200 dark:border-yellow-800 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white dark:bg-zinc-900 text-gray-900 dark:text-white" 
                        />
                        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-2 rounded-lg font-bold text-yellow-800 dark:text-yellow-500 justify-center shadow-inner">{bbPct}%</div>
                    </div>

                    {/* Poor */}
                    <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/50">
                        <label className="block text-xs font-bold text-red-700 dark:text-red-500 mb-2 uppercase">Poor Leaf (g)</label>
                        <input 
                            type="number" 
                            value={p} 
                            disabled 
                            className="w-full p-2.5 mb-3 border border-red-200 dark:border-red-800/50 bg-gray-100 dark:bg-zinc-800 font-bold text-red-700 dark:text-red-500 rounded-lg outline-none cursor-not-allowed" 
                        />
                        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/40 px-3 py-2 rounded-lg font-bold text-red-800 dark:text-red-400 justify-center shadow-inner">{pPct}%</div>
                    </div>
                </div>
            </div>
        );
    };

    const factoryRows = recordsList.filter(r => r.sampleType === 'Factory');
    const collectorRows = recordsList.filter(r => r.sampleType === 'LeafCollector');

    return (
        <div className="p-4 sm:p-8 max-w-[900px] mx-auto font-sans min-h-screen transition-colors duration-300 relative">
            
            <button 
                onClick={() => navigate(-1)} 
                className="mb-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back to View Records
            </button>

            {/* --- HEADER --- */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
                        <Leaf size={24} /> Edit Daily Loft Leaf
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Update leaf quantities and details for the selected date.
                    </p>
                </div>
                <div className="text-left md:text-right">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Editing Date</span>
                    <span className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-lg font-mono font-bold text-gray-700 dark:text-gray-300">
                        {editDate || 'Loading...'}
                    </span>
                </div>
            </div>

            <div className="flex gap-3 mb-8 pb-6 border-b border-gray-200 dark:border-zinc-800">
                <button 
                    type="button" 
                    onClick={() => handleAddRow('Factory')}
                    className="text-sm font-bold bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                >
                    <PlusCircle size={16} /> Add Factory Sample
                </button>
                <button 
                    type="button" 
                    onClick={() => handleAddRow('LeafCollector')}
                    className="text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                >
                    <PlusCircle size={16} /> Add Collector Sample
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                
                {recordsList.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                        <Leaf className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">All entries removed. Add a new sample to save.</p>
                    </div>
                )}

                {/* 1. FACTORY SAMPLE SECTION (TOP) */}
                {factoryRows.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                            <Factory size={20} className="text-gray-800 dark:text-gray-400" /> Factory Sample Entries
                        </h3>
                        <div className="space-y-6">
                            {factoryRows.map(row => renderRecordCard(row))}
                        </div>
                    </div>
                )}

                {/* 2. LEAF COLLECTOR SECTION (BOTTOM) */}
                {collectorRows.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                            <Users size={20} className="text-teal-600" /> Leaf Collector's Sample Entries
                        </h3>
                        <div className="space-y-6">
                            {collectorRows.map(row => renderRecordCard(row))}
                        </div>
                    </div>
                )}

                {/* Save Button Container */}
                {recordsList.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">
                            Updating Total: <span className="text-[#1B6A31] dark:text-green-500">{recordsList.length} Records</span>
                        </div>
                        <button
                            type="submit"
                            disabled={showSpinner}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#1B6A31] hover:bg-green-800 text-white font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {showSpinner ? "Saving to Database..." : "Save Changes"}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}