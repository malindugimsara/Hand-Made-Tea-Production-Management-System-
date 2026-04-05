import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function GreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const [showSpinner, setShowSpinner] = useState(false);
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
            const [glRes, prodRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`)
            ]);

            if (glRes.ok) {
                const glData = await glRes.json();
                const dates = glData.map(record => new Date(record.date).toISOString().split('T')[0]);
                setExistingDates(dates);
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

    // Placeholder for when they click "Edit Instead"
    const handleEditRedirect = () => {
        // Example: navigate(`/edit-record/${formData.date}`);
        toast(`Redirecting to edit ${formData.date}...`, { icon: '✍️' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setShowSpinner(true);

        if (existingDates.includes(formData.date)) {
            playErrorSound(); 
            toast.error(`A record for ${formData.date} has already been submitted!`);
            setShowSpinner(false); 
            return; 
        }

        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);
        const made = Number(formData.madeTeaWeight);
        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);

        if (selected > total) {
            playErrorSound();
            toast.error("Selected weight must be less than Total weight!");
            setShowSpinner(false);
            return;
        }

        if (made > selected) {
            playErrorSound();
            toast.error("Made tea weight must be less than Selected weight!");
            setShowSpinner(false);
            return;
        }

        if (mEnd < mStart) {
            playErrorSound();
            toast.error("End Reading must be greater than Start Reading!");
            setShowSpinner(false);
            return;
        }

        const toastId = toast.loading('Saving complete daily record...');

        try {
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

            const labourPayload = {
                date: formData.date,
                workerCount: Number(formData.workerCount)
            };

            const [glRes, prodRes, labRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(greenLeafPayload) }),
                fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productionPayload) }),
                fetch(`${BACKEND_URL}/api/labour`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(labourPayload) })
            ]);

            if (glRes.ok && prodRes.ok && labRes.ok) {
                toast.success("Daily record saved successfully!", { id: toastId });
                
                setLastReadings(prev => ({
                    ...prev,
                    [formData.dryerName]: formData.meterEnd
                }));
                setExistingDates([...existingDates, formData.date]);

                setFormData({
                    ...formData,
                    totalWeight: '', selectedWeight: '', teaType: '', madeTeaWeight: '', dryerName: '', meterStart: '', meterEnd: '', workerCount: ''
                });
            } else {
                playErrorSound();
                toast.error("Error saving records.", { id: toastId });
            }
        } catch (error) {
            playErrorSound();
            toast.error("Network error.", { id: toastId });
        } finally {
            setShowSpinner(false); 
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans">
            <Toaster position="top-right" />
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2">Daily Production Data Entry</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full md:w-1/3 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                    {existingDates.includes(formData.date) && <p className="text-red-500 text-sm mt-2 font-semibold">⚠️ A record for this date already exists!</p>}
                </div>

                {/* 1. GREEN LEAF */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2"><span>🌱</span> 1. Received Green Leaf</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total (kg)</label>
                            <input type="number" step="0.01" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Selected (kg)</label>
                            <input type="number" step="0.01" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#A3D9A5] flex justify-between items-center"><span className="text-sm font-medium text-gray-600">Calculated Returned Weight:</span><span className="text-xl font-bold text-[#1B6A31]">{returnedWeight > 0 ? returnedWeight.toFixed(2) : 0} kg</span></div>
                </div>

                {/* 2. MADE TEA */}
                <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2"><span>🫖</span> 2. Made Tea Production</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tea Type</label>
                            <select name="teaType" value={formData.teaType} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-400">
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
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Made Tea (kg)</label>
                            <input type="number" step="0.001" name="madeTeaWeight" value={formData.madeTeaWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400" />
                        </div>
                    </div>
                </div>

                {/* 3. DRYER METER */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2"><span>⚡</span> 3. Dryer Meter Reading</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="col-span-1 md:col-span-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Dryer</label>
                            <select name="dryerName" value={formData.dryerName} onChange={handleDryerSelect} required className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-orange-400">
                                <option value="">Select Dryer...</option>
                                <option value="Dryer 1">Dryer 1</option>
                                <option value="Dryer 2">Dryer 2</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Reading</label>
                            <input type="number" name="meterStart" value={formData.meterStart} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">End Reading</label>
                            <input type="number" name="meterEnd" value={formData.meterEnd} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Units Consumed</label>
                            <div className="w-full p-3 border border-orange-300 bg-orange-100 text-orange-800 font-bold rounded-md">{dryerUnits > 0 ? dryerUnits : 0}</div>
                        </div>
                    </div>
                </div>

                {/* 4. LABOUR DETAILS */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2"><span>👥</span> 4. Labour Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Worker Count</label>
                            <input type="number" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={(e) => e.target.blur()} required className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                    </div>
                </div>

                {/* DYNAMIC SUBMIT SECTION */}
                {existingDates.includes(formData.date) ? (
                    // COLLISION STATE: Show Disabled Save + Active Edit Button
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <button
                            type="button"
                            disabled
                            className="w-full sm:w-1/2 h-14 bg-gray-300 text-white font-bold rounded-lg text-lg cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            ⚠️ Record Exists
                        </button> 
                        <button
                            type="button"
                            onClick={handleEditRedirect}
                            className="w-full sm:w-1/2 h-14 bg-[#1B6A31] hover:bg-[#4A9E46] text-white font-bold rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Edit Instead
                        </button>
                    </div>
                ) : (
                    // NORMAL STATE: Show Standard Animated Save Button
                    <button
                        type="submit"
                        className={`w-full h-14 text-white font-bold rounded-lg mb-4 text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                            showSpinner
                            ? 'bg-blue-400 cursor-not-allowed opacity-90'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                        disabled={showSpinner}
                    >
                        {showSpinner ? (
                            <>
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving Record...
                            </>
                        ) : (
                            "Save Complete Daily Record"
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}