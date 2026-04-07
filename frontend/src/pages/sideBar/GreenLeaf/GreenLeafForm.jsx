import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // App.jsx හි ඇති බැවින් <Toaster /> UI එක ඉවත් කර ඇත
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, ListChecks, Save, X } from "lucide-react";

export default function GreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigation = useNavigate();

    const [isSavingAll, setIsSavingAll] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        totalWeight: '',
        selectedWeight: '',
        teaType: '',
        madeTeaWeight: '',
        dryerName: '',
        meterStart: '',
        meterEnd: '',
        workerCount: ''
    });

    const [existingDates, setExistingDates] = useState([]);
    const [lastReadings, setLastReadings] = useState({ 'Dryer 1': '', 'Dryer 2': '' });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // 1. Get the token for initial data fetching
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [glRes, prodRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders })
            ]);

            if (glRes.ok) {
                const glData = await glRes.json();
                const dates = glData.map(record => new Date(record.date).toISOString().split('T')[0]);
                setExistingDates(dates);
            } else if (glRes.status === 401 || glRes.status === 403) {
                 toast.error("Session expired. Please log in again.");
                 // Optional: navigation('/login');
                 return;
            }

            if (prodRes.ok) {
                const prodData = await prodRes.json();
                prodData.sort((a, b) => new Date(b.date) - new Date(a.date)); 

                let d1Last = '';
                let d2Last = '';

                const d1Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 1');
                if (d1Record) d1Last = d1Record.dryerDetails.meterEnd;

                const d2Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 2');
                if (d2Record) d2Last = d2Record.dryerDetails.meterEnd;

                setLastReadings({ 'Dryer 1': d1Last, 'Dryer 2': d2Last });
            }
        } catch (error) {
            console.error("Data fetch error:", error);
        }
    };

    const returnedWeight = (Number(formData.totalWeight) || 0) - (Number(formData.selectedWeight) || 0);
    const dryerUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleDryerSelect = (e) => {
        const selectedDryer = e.target.value;
        setFormData({ 
            ...formData, 
            dryerName: selectedDryer,
            meterStart: lastReadings[selectedDryer] !== undefined ? String(lastReadings[selectedDryer]) : '' 
        });
    };

    const playErrorSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(150, ctx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log("Audio not supported");
        }
    };

    // 1. තාවකාලික ලැයිස්තුවට එකතු කිරීම
    const handleAddToList = (e) => {
        e.preventDefault();

        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);
        const made = Number(formData.madeTeaWeight);
        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);

        if (selected > total) {
            playErrorSound();
            toast.error("Selected weight must be less than Total weight!");
            return;
        }

        if (made > selected) {
            playErrorSound();
            toast.error("Made tea weight must be less than Selected weight!");
            return;
        }

        if (mEnd < mStart) {
            playErrorSound();
            toast.error("End Reading must be greater than Start Reading!");
            return;
        }

        // List එකට එකතු කිරීම
        const newRecord = { ...formData, returnedWeight, dryerUnits };
        setPendingRecords([...pendingRecords, newRecord]);
        toast.success("Added to list!");

        // ඊළඟ රෙකෝඩ් එක සඳහා Start Meter එක යාවත්කාලීන කිරීම
        setLastReadings(prev => ({
            ...prev,
            [formData.dryerName]: formData.meterEnd
        }));

        // Form එක හිස් කිරීම (Date එක පමණක් ඉතිරි කර)
        setFormData({
            ...formData,
            totalWeight: '',
            selectedWeight: '',
            teaType: '',
            madeTeaWeight: '',
            dryerName: '',
            meterStart: '',
            meterEnd: '',
            workerCount: ''
        });
    };

        try {
            // 2. Get the token for submitting the data
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const greenLeafPayload = {
                date: formData.date,
                totalWeight: total,
                selectedWeight: selected
            };

            const productionPayload = {
                date: formData.date,
                teaType: formData.teaType,
                madeTeaWeight: made,
                dryerDetails: {
                    dryerName: formData.dryerName,
                    meterStart: mStart,
                    meterEnd: mEnd
                }
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

            // 3. Attach the headers to your POST requests
            const [glRes, prodRes, labRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { method: 'POST', headers: authHeaders, body: JSON.stringify(greenLeafPayload) }),
                fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: authHeaders, body: JSON.stringify(productionPayload) }),
                fetch(`${BACKEND_URL}/api/labour`, { method: 'POST', headers: authHeaders, body: JSON.stringify(labourPayload) })
            ]);
        setIsSavingAll(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const promises = pendingRecords.map(async (record) => {
                const total = Number(record.totalWeight);
                const selected = Number(record.selectedWeight);
                const made = Number(record.madeTeaWeight);
                const mStart = Number(record.meterStart);
                const mEnd = Number(record.meterEnd);

                const greenLeafPayload = {
                    date: record.date,
                    totalWeight: total,
                    selectedWeight: selected
                };

                const productionPayload = {
                    date: record.date,
                    teaType: record.teaType,
                    madeTeaWeight: made,
                    dryerDetails: {
                        dryerName: record.dryerName,
                        meterStart: mStart,
                        meterEnd: mEnd
                    }
                };

                const labourPayload = {
                    date: record.date,
                    workerCount: Number(record.workerCount)
                };

                // සෑම රෙකෝඩ් එකකටම අදාළව API 3 කට data යැවීම
                const [glRes, prodRes, labRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/green-leaf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(greenLeafPayload) }),
                    fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productionPayload) }),
                    fetch(`${BACKEND_URL}/api/labour`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(labourPayload) })
                ]);

                if (!glRes.ok || !prodRes.ok || !labRes.ok) {
                    throw new Error('Failed to save a record');
                }
            });

            await Promise.all(promises);
            
            toast.success("All records saved successfully!", { id: toastId });
            setExistingDates([...existingDates, ...pendingRecords.map(r => r.date)]);
            setPendingRecords([]); // Save වූ පසු ලැයිස්තුව හිස් කිරීම
            
            setTimeout(() => {
                navigation('/view-green-leaf');
            } else {
                playErrorSound();
                
                // Extra check to see if the server blocked them (403 Forbidden)
                if (glRes.status === 403 || prodRes.status === 403 || labRes.status === 403) {
                    toast.error("Access Denied. You do not have permission to add records.", { id: toastId });
                } else {
                    toast.error("Error saving records.", { id: toastId });
                }
            }
        } catch (error) {
            playErrorSound();
            console.error(error);
            toast.error("Error saving some records. Please check.", { id: toastId });
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) {
                navigation(-1);
            }
        } else {
            navigation(-1);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 min-h-screen">
            
            <div className="mb-8 text-center sm:text-left">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2">Daily Production Multiple Data Entry</p>
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

                        {/* 1. GREEN LEAF */}
                        <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-xl p-6">
                            <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2"><span>🌱</span> 1. Received Green Leaf</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">TOTAL (KG)</label>
                                    <input type="number" step="0.01" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">SELECTED (KG)</label>
                                    <input type="number" step="0.01" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#A3D9A5] flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-600">Calculated Returned Weight:</span>
                                <span className="text-xl font-black text-[#1B6A31]">{returnedWeight > 0 ? returnedWeight.toFixed(2) : 0} kg</span>
                            </div>
                        </div>

                        {/* 2. MADE TEA */}
                        <div className="mb-8 bg-purple-50 border border-purple-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2"><span>🫖</span> 2. Made Tea Production</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">TEA TYPE</label>
                                    <select name="teaType" value={formData.teaType} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-400 outline-none">
                                        <option value="">Select Type...</option>
                                        <option value="Purple Tea">Purple Tea</option>
                                        <option value="Pink Tea">Pink Tea</option>
                                        <option value="White Tea">White Tea</option>
                                        <option value="Silver Tips">Silver Tips</option>
                                        <option value="Silver Green">Silver Green</option>
                                        <option value="VitaGlow Tea">VitaGlow Tea</option>
                                        <option value="Slim Beauty">Slim Beauty</option>
                                        <option value="Golden Tips">Golden Tips</option>
                                        <option value="Flower">Flower</option>
                                        <option value="Chakra">Chakra</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">MADE TEA (KG)</label>
                                    <input type="number" step="0.001" name="madeTeaWeight" value={formData.madeTeaWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* 3. DRYER METER */}
                        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2"><span>⚡</span> 3. Dryer Meter Reading</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="col-span-1 md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">SELECT DRYER</label>
                                    <select name="dryerName" value={formData.dryerName} onChange={handleDryerSelect} required className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                                        <option value="">Select Dryer...</option>
                                        <option value="Dryer 1">Dryer 1</option>
                                        <option value="Dryer 2">Dryer 2</option>
                                    </select>
                                </div>
                                <div className="col-span-1 md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">START READING</label>
                                    <input type="number" name="meterStart" value={formData.meterStart} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" />
                                </div>
                                <div className="col-span-1 md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">END READING</label>
                                    <input type="number" name="meterEnd" value={formData.meterEnd} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" />
                                </div>
                                <div className="col-span-1 md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">UNITS CONSUMED</label>
                                    <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md flex items-center">{dryerUnits > 0 ? dryerUnits : 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* 4. LABOUR DETAILS */}
                        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2"><span>👥</span> 4. Labour Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">TOTAL WORKER COUNT</label>
                                    <input type="number" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none" />
                                </div>
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
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-800 text-lg">{item.teaType}</span>
                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase">Made: {item.madeTeaWeight}kg</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                                                    <div className="bg-white p-2 rounded border border-gray-100">
                                                        <span className="block text-gray-400 font-bold mb-0.5 text-[9px] uppercase">Green Leaf</span>
                                                        Sel: <span className="font-bold text-green-700">{item.selectedWeight}kg</span><br/>
                                                        Tot: {item.totalWeight}kg
                                                    </div>
                                                    <div className="bg-white p-2 rounded border border-gray-100">
                                                        <span className="block text-gray-400 font-bold mb-0.5 text-[9px] uppercase">{item.dryerName}</span>
                                                        Units: <span className="font-bold text-orange-600">{item.dryerUnits}</span><br/>
                                                        ({item.meterStart} - {item.meterEnd})
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-500 font-medium">
                                                    Workers: <span className="font-bold text-blue-600">{item.workerCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSavingAll}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancel / Go Back
                            </button>

                            <button 
                                onClick={handleSaveAll}
                                disabled={isSavingAll || pendingRecords.length === 0}
                                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${
                                    isSavingAll || pendingRecords.length === 0 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-[#1B6A31] hover:bg-green-800 hover:-translate-y-1'
                                }`}
                            >
                                <Save size={20} /> {isSavingAll ? "Saving All..." : `Save All ${pendingRecords.length} Records`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}