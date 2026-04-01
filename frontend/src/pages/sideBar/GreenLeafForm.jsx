import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function GreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Unified State for the entire form
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        totalWeight: '',
        selectedWeight: '',
        teaType: '',
        madeTeaWeight: '',
        meterStart: '',
        meterEnd: ''
    });

    // State to keep track of dates that already have records
    const [existingDates, setExistingDates] = useState([]);

    // Fetch existing records when component loads to get the dates
    useEffect(() => {
        fetchExistingDates();
    }, []);

    const fetchExistingDates = async () => {
        try {
            // We only need to check one of the tables (e.g., green-leaf) to know if that day is already entered
            const response = await fetch(`${BACKEND_URL}/api/green-leaf`);
            if (response.ok) {
                const data = await response.json();
                // Extract only the dates from the database records
                const dates = data.map(record => new Date(record.date).toISOString().split('T')[0]);
                setExistingDates(dates);
            }
        } catch (error) {
            console.error("Could not fetch existing dates for validation:", error);
        }
    };

    // Auto-calculations for display
    const returnedWeight = (Number(formData.totalWeight) || 0) - (Number(formData.selectedWeight) || 0);
    const dryerUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // --- FUNCTION TO PLAY ERROR SOUND ---
    const playErrorSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'square'; // Creates a buzz/error like sound
            osc.frequency.setValueAtTime(150, ctx.currentTime); // Low pitch
            
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log("Audio context not supported or blocked");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- 🚨 VALIDATION: Check if date already exists 🚨 ---
        if (existingDates.includes(formData.date)) {
            playErrorSound(); // Play the error beep
            toast.error(`A record for ${formData.date} has already been submitted!`, {
                duration: 4000,
                style: { background: '#ffebee', color: '#c62828', fontWeight: 'bold' }
            });
            return; // Stop the form submission
        }

        const toastId = toast.loading('Saving complete daily record...');

        try {
            // 1. Prepare data for Green Leaf Model
            const greenLeafPayload = {
                date: formData.date,
                totalWeight: Number(formData.totalWeight),
                selectedWeight: Number(formData.selectedWeight)
            };

            // 2. Prepare data for Production Model
            const productionPayload = {
                date: formData.date,
                teaType: formData.teaType,
                madeTeaWeight: Number(formData.madeTeaWeight),
                dryerDetails: {
                    meterStart: Number(formData.meterStart),
                    meterEnd: Number(formData.meterEnd)
                }
            };

            // 3. Send BOTH requests simultaneously
            const [greenLeafRes, productionRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(greenLeafPayload)
                }),
                fetch(`${BACKEND_URL}/api/production`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productionPayload)
                })
            ]);

            // 4. Handle Responses
            if (greenLeafRes.ok && productionRes.ok) {
                toast.success("Daily record saved successfully!", { id: toastId });
                
                // Add this new date to the existing dates array so they can't submit it again without reloading
                setExistingDates([...existingDates, formData.date]);

                // Reset form fields (keeping the date as is)
                setFormData({
                    ...formData,
                    totalWeight: '',
                    selectedWeight: '',
                    teaType: '',
                    madeTeaWeight: '',
                    meterStart: '',
                    meterEnd: ''
                });
            } else {
                playErrorSound();
                toast.error("Error saving records. Please check the backend connection.", { id: toastId });
            }

        } catch (error) {
            console.error("Network Error:", error);
            playErrorSound();
            toast.error("Network error. Could not connect to the server.", { id: toastId });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#1B6A31]">Hand Made Tea Factory</h2>
                <p className="text-gray-500 mt-2">Daily Production Data Entry</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                {/* --- HEADER: DATE --- */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Date</label>
                    <input 
                        type="date" 
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="w-full md:w-1/3 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-[#4A9E46]" 
                    />
                    {/* Visual warning if user selects a date that already exists */}
                    {existingDates.includes(formData.date) && (
                        <p className="text-red-500 text-sm mt-2 font-semibold">⚠️ A record for this date already exists!</p>
                    )}
                </div>

                {/* --- SECTION 1: GREEN LEAF --- */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4 flex items-center gap-2">
                        <span>🌱</span> 1. Received Green Leaf
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Received (kg)</label>
                            <input 
                                type="number" step="0.01" name="totalWeight" 
                                value={formData.totalWeight} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Selected for Handmade (kg)</label>
                            <input 
                                type="number" step="0.01" name="selectedWeight" 
                                value={formData.selectedWeight} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F]" 
                            />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#A3D9A5] flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Calculated Returned Weight:</span>
                        <span className="text-xl font-bold text-[#1B6A31]">{returnedWeight > 0 ? returnedWeight.toFixed(2) : 0} kg</span>
                    </div>
                </div>

                {/* --- SECTION 2: MADE TEA --- */}
                <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
                        <span>🫖</span> 2. Made Tea Production
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tea Type</label>
                            <select 
                                name="teaType" value={formData.teaType} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                            >
                                <option value="">Select Type...</option>
                                <option value="Purple Tea">Purple Tea</option>
                                <option value="Pink Tea">Pink Tea</option>
                                <option value="White Tea">White Tea</option>
                                <option value="Silver Green">Silver Green</option>
                                <option value="Golden Tips">Golden Tips</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Made Tea Weight (kg)</label>
                            <input 
                                type="number" step="0.001" name="madeTeaWeight" 
                                value={formData.madeTeaWeight} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400" 
                            />
                        </div>
                    </div>
                </div>

                {/* --- SECTION 3: DRYER METER --- */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <span>⚡</span> 3. Dryer Meter Reading
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Reading</label>
                            <input 
                                type="number" name="meterStart" 
                                value={formData.meterStart} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">End Reading</label>
                            <input 
                                type="number" name="meterEnd" 
                                value={formData.meterEnd} onChange={handleInputChange} required
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400" 
                            />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Total Units Consumed:</span>
                        <span className="text-xl font-bold text-orange-600">{dryerUnits > 0 ? dryerUnits : 0} Units</span>
                    </div>
                </div>

                {/* --- SUBMIT BUTTON --- */}
                <button 
                    type="submit" 
                    className={`w-full py-4 text-white rounded-lg shadow-md transition-colors font-bold text-lg ${
                        existingDates.includes(formData.date) 
                        ? 'bg-red-400 cursor-not-allowed hover:bg-red-500' // Change button to red if date exists
                        : 'bg-[#1B6A31] hover:bg-[#4A9E46]'
                    }`}
                >
                    {existingDates.includes(formData.date) ? 'Record Already Exists for this Date' : 'Save Complete Daily Record'}
                </button>

            </form>
        </div>
    );
}