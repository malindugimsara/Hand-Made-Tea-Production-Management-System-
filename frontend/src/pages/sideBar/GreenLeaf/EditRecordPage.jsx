import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoMdArrowRoundBack } from "react-icons/io";

export default function EditRecordPage() {
    // 1. Configuration & Hooks
    // Get Backend URL from environment variables
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    
    // useLocation to receive data passed from the View page
    const location = useLocation();
    // useNavigate to redirect users after successful update
    const navigate = useNavigate();
    
    // State to handle button loading animation
    const [showSpinner, setShowSpinner] = useState(false);

    // 2. Form State Management
    // Stores all fields required for GreenLeaf, Production, and Labour models
    const [formData, setFormData] = useState({
        greenLeafId: '',
        productionId: '',
        labourId: '',
        date: '',
        totalWeight: '',
        selectedWeight: '',
        teaType: '',
        madeTeaWeight: '',
        dryerName: '',
        meterStart: '',
        meterEnd: '',
        workerCount: ''
    });

    // 3. Lifecycle - Initial Data Loading
    // Runs once when the component mounts
    useEffect(() => {
        // Check if record data was passed via navigation state
        if (location.state && location.state.recordData) {
            const data = location.state.recordData;

            // Map incoming data to form state fields
            setFormData({
                greenLeafId: data.greenLeafId,
                productionId: data.productionId,
                labourId: data.labourId,
                date: data.date,
                totalWeight: data.totalWeight || '',
                selectedWeight: data.selectedWeight || '',
                teaType: data.teaType || '',
                madeTeaWeight: data.madeTeaWeight || '',
                dryerName: data.dryerName || '',
                meterStart: data.meterStart || '',
                meterEnd: data.meterEnd || '',
                workerCount: data.workerCount || ''
            });
        } else {
            // Fallback: If someone accesses the URL directly without data, send them back
            navigate('/view-green-leaf'); 
        }
    }, [location, navigate]);

    // 4. Derived State (Calculations)
    // Calculate Returned Weight (Total - Selected) for UI display
    const returnedWeight = (Number(formData.totalWeight) || 0) - (Number(formData.selectedWeight) || 0);
    
    // Calculate Total Dryer Units (End - Start) for UI display
    const dryerUnits = (Number(formData.meterEnd) || 0) - (Number(formData.meterStart) || 0);

    // 5. Event Handlers
    // Update state whenever an input field changes
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Helper to prevent number change when scrolling with mouse wheel over inputs
    const handleWheel = (e) => e.target.blur();

    // Browser Audio API to play a simple error beep
    const playErrorSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(150, ctx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gainNode); gainNode.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } catch (e) { console.error("Audio error", e); }
    };

  // 6. Main Submit Logic (Update)
    const handleUpdate = async (e) => {
        e.preventDefault(); // Stop page refresh
        setShowSpinner(true); // Start loading state

        // Local variable conversion for validation logic
        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);
        const made = Number(formData.madeTeaWeight);
        const mStart = Number(formData.meterStart);
        const mEnd = Number(formData.meterEnd);

        // --- Business Logic Validations ---
        if (selected > total) {
            playErrorSound(); toast.error("Selected weight must be less than Total!");
            setShowSpinner(false); return;
        }
        if (made > selected) {
            playErrorSound(); toast.error("Made tea weight must be less than Selected!");
            setShowSpinner(false); return;
        }
        if (mEnd < mStart) {
            playErrorSound(); toast.error("End Reading must be greater than Start!");
            setShowSpinner(false); return;
        }

        const toastId = toast.loading('Updating record...');

        try {
            // 1. GET THE TOKEN AND CREATE HEADERS
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // The magic key!
            };

            const promises = [];

            // Add GreenLeaf Update Request to promise array if ID exists
            if (formData.greenLeafId) {
                promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${formData.greenLeafId}`, {
                    method: 'PUT',
                    headers: authHeaders, // Use the authHeaders here
                    body: JSON.stringify({ totalWeight: total, selectedWeight: selected })
                }));
            }

            // Add Production Update Request (includes Dryer details)
            if (formData.productionId) {
                promises.push(fetch(`${BACKEND_URL}/api/production/${formData.productionId}`, {
                    method: 'PUT',
                    headers: authHeaders, // Use the authHeaders here
                    body: JSON.stringify({
                        teaType: formData.teaType,
                        madeTeaWeight: made,
                        dryerDetails: { dryerName: formData.dryerName, meterStart: mStart, meterEnd: mEnd }
                    })
                }));
            }

            // Add Labour Update Request
            if (formData.labourId) {
                promises.push(fetch(`${BACKEND_URL}/api/labour/${formData.labourId}`, {
                    method: 'PUT',
                    headers: authHeaders, // Use the authHeaders here
                    body: JSON.stringify({ workerCount: Number(formData.workerCount) })
                }));
            }

            // Execute all API requests in parallel for better performance
            const responses = await Promise.all(promises);
            
            // Optional: Check if any of the updates were rejected by the backend (e.g., if a Viewer tried to hack an update)
            const failedResponse = responses.find(res => !res.ok);
            if (failedResponse) {
                if (failedResponse.status === 401 || failedResponse.status === 403) {
                     throw new Error("Access Denied. You do not have permission to edit.");
                }
                throw new Error("Failed to update one or more records.");
            }
            
            toast.success("Record updated successfully!", { id: toastId });
            
            // Wait 1 second and navigate back to the log view
            setTimeout(() => { navigate('/view-green-leaf'); }, 500);

        } catch (error) {
            console.error("Update Error:", error);
            playErrorSound();
            toast.error(error.message || "Network error. Could not update.", { id: toastId });
        } finally {
            setShowSpinner(false); // Stop loading state
        }
    };
    return (
        <div className="p-8 max-w-4xl mx-auto font-sans">
            <Toaster position="top-center" />    
            {/* Header UI */}
            <div className="mb-8 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold transition-colors">
                    <IoMdArrowRoundBack />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-blue-700">Edit Production Record</h2>
                    <p className="text-gray-500 font-semibold mt-1 italic">Editing entry for: {formData.date}</p>
                </div>
            </div>
            
            {/* Main Form UI */}
            <form onSubmit={handleUpdate} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                {/* Section 1: Green Leaf Data */}
                <div className="mb-8 bg-[#F8FAF8] border border-[#A3D9A5] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] mb-4">1. Green Leaf (kg)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Total Received</label>
                            <input type="number" step="0.01" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Selected for Handmade</label>
                            <input type="number" step="0.01" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md focus:ring-2 focus:ring-[#8CC63F]" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Production Data */}
                <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4">2. Made Tea</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Tea Type</label>
                            <select name="teaType" value={formData.teaType} onChange={handleInputChange} required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-purple-400">
                                <option value="Purple Tea">Purple Tea</option>
                                <option value="Pink Tea">Pink Tea</option>
                                <option value="White Tea">White Tea</option>
                                <option value="Silver Green">Silver Green</option>
                                <option value="Golden Tips">Golden Tips</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Made Tea (kg)</label>
                            <input type="number" step="0.001" name="madeTeaWeight" value={formData.madeTeaWeight} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md focus:ring-2 focus:ring-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Section 3: Dryer Meter Data */}
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-600 mb-4">3. Dryer Meter Readings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Dryer Unit</label>
                            <select name="dryerName" value={formData.dryerName} onChange={handleInputChange} required className="w-full p-3 border rounded-md bg-white focus:ring-2 focus:ring-orange-400">
                                <option value="Dryer 1">Dryer 1</option>
                                <option value="Dryer 2">Dryer 2</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Start Reading</label>
                            <input type="number" name="meterStart" value={formData.meterStart} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">End Reading</label>
                            <input type="number" name="meterEnd" value={formData.meterEnd} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Section 4: Workforce Data */}
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4">4. Labour</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Worker Count</label>
                            <input type="number" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={handleWheel} required className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                    </div>
                </div>

                {/* 9. Action Button */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                    type="submit" 
                    disabled={showSpinner} 
                    className={`w-full h-14 text-white font-bold rounded-lg text-lg transition-all shadow-md ${showSpinner ? 'bg-gray-400' : 'bg-green-700 hover:bg-green-800 active:scale-95'}`}
                    >
                        {showSpinner ? "Applying Changes..." : "Update Daily Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}

