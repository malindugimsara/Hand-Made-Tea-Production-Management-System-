import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoMdArrowRoundBack } from "react-icons/io";
import { PlusCircle, X, Leaf, Factory, CalendarClock, Users } from "lucide-react";

export default function EditRecordPage() {
    // 1. Configuration & Hooks
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();
    const [showSpinner, setShowSpinner] = useState(false);

    // State to hold the latest meter readings for auto-filling
    const [lastReadings, setLastReadings] = useState({ 'Dryer 1': '', 'Dryer 2': '' });

    // 2. Form State Management (Added expectedDryerDate)
    const [formData, setFormData] = useState({
        greenLeafId: '',
        productionId: '',
        labourId: '',
        date: '',
        expectedDryerDate: '', // <-- NEW FIELD
        totalWeight: '',
        selectedWeight: '',
        outputs: [{ teaType: '', madeTeaWeight: '' }], 
        dryers: [{ dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }], 
        workerCount: '',
        rollingType: 'Machine Rolling',
        rollingWorkerCount: ''
    });

    const teaOptions = [
        "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
        "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
        "Flower", "Chakra"
    ];

    // 3. Lifecycle - Initial Data Loading
    useEffect(() => {
        if (location.state && location.state.recordData) {
            const data = location.state.recordData;
            setFormData({
                greenLeafId: data.greenLeafId,
                productionId: data.productionId,
                labourId: data.labourId,
                date: data.date,
                // Safely grab expectedDryerDate or fallback to the main date
                expectedDryerDate: data.expectedDryerDate ? new Date(data.expectedDryerDate).toISOString().split('T')[0] : data.date,
                totalWeight: data.totalWeight || '',
                selectedWeight: data.selectedWeight || '',
                outputs: [{ 
                    teaType: data.teaType || '', 
                    madeTeaWeight: data.madeTeaWeight || '' 
                }],
                dryers: [{
                    dryerName: data.dryerName !== '-' ? data.dryerName : '',
                    meterStart: data.meterStart !== '-' ? data.meterStart : '',
                    meterEnd: data.meterEnd !== '-' ? data.meterEnd : '',
                    rollerPoints: data.rollerPoints !== undefined && data.rollerPoints !== '-' ? data.rollerPoints : ''
                }],
                workerCount: data.workerCount || '',
                rollingType: data.rollingType && data.rollingType !== '-' ? data.rollingType : 'Machine Rolling',
                rollingWorkerCount: data.rollingWorkerCount || ''
            });
        } else {
            navigate('/view-green-leaf'); 
        }
    }, [location, navigate]);

    // Fetch latest meter readings for auto-filling
    useEffect(() => {
        const fetchLastReadings = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${BACKEND_URL}/api/production`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const prodData = await res.json();
                    
                    prodData.sort((a, b) => {
                        const dateDiff = new Date(b.date) - new Date(a.date);
                        if (dateDiff !== 0) return dateDiff;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
                    
                    let d1Last = '';
                    let d2Last = '';

                    const d1Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 1');
                    if (d1Record) d1Last = d1Record.dryerDetails.meterEnd;

                    const d2Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 2');
                    if (d2Record) d2Last = d2Record.dryerDetails.meterEnd;

                    setLastReadings({ 'Dryer 1': d1Last, 'Dryer 2': d2Last });
                }
            } catch (error) {
                console.error("Failed to fetch last dryer readings", error);
            }
        };

        fetchLastReadings();
    }, [BACKEND_URL]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'rollingType' && value !== 'Hand Rolling') {
            setFormData({ ...formData, [name]: value, rollingWorkerCount: '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // --- Dynamic Array Handlers ---
    const handleOutputChange = (index, field, value) => {
        const newOutputs = [...formData.outputs];
        newOutputs[index][field] = value;
        setFormData({ ...formData, outputs: newOutputs });
    };

    const addOutput = () => {
        setFormData({ ...formData, outputs: [...formData.outputs, { teaType: '', madeTeaWeight: '' }] });
    };

    const removeOutput = (index) => {
        const newOutputs = formData.outputs.filter((_, i) => i !== index);
        setFormData({ ...formData, outputs: newOutputs });
    };

    const handleDryerChange = (index, field, value) => {
        const newDryers = [...formData.dryers];
        newDryers[index][field] = value;
        if (field === 'dryerName') {
            newDryers[index].meterStart = lastReadings[value] !== undefined ? String(lastReadings[value]) : '';
        }
        setFormData({ ...formData, dryers: newDryers });
    };

    const addDryer = () => {
        setFormData({ ...formData, dryers: [...formData.dryers, { dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }] });
    };

    const removeDryer = (index) => {
        const newDryers = formData.dryers.filter((_, i) => i !== index);
        setFormData({ ...formData, dryers: newDryers });
    };

    const handleWheel = (e) => e.target.blur();
    
    const blockMinus = (e) => {
        if (e.key === '-') {
            e.preventDefault();
        }
    };

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

    const fetchWithErr = (url, options, defaultErrorMsg) => {
        return fetch(url, options).then(async res => {
            if (!res.ok) {
                let msg = defaultErrorMsg;
                try {
                    const data = await res.json();
                    msg = data.message || msg;
                } catch(e) {}
                if (res.status === 401 || res.status === 403) msg = "Access Denied.";
                throw new Error(msg);
            }
            return res;
        });
    };

    // 6. Main Submit Logic (Update)
    const handleUpdate = async (e) => {
        e.preventDefault(); 

        const currentUser = localStorage.getItem("username");
        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);
        
        let totalMade = 0;
        for (let out of formData.outputs) {
            if (!out.teaType || out.madeTeaWeight === '') {
                playErrorSound(); toast.error("Please fill all Tea Types and Weights!"); return;
            }
            totalMade += Number(out.madeTeaWeight);
        }

        if (selected > total) {
            playErrorSound(); toast.error("Selected weight must be less than Total!"); return;
        }
        if (totalMade > selected) {
            playErrorSound(); toast.error("Total Made Tea weight must be less than Selected weight!"); return;
        }

        // Validate Dryers
        for (let dryer of formData.dryers) {
            if (dryer.dryerName && dryer.meterEnd !== '') {
                if (Number(dryer.meterEnd) < Number(dryer.meterStart)) {
                    playErrorSound(); toast.error(`End Reading must be greater than Start for ${dryer.dryerName}!`); return;
                }
            }
        }

        setShowSpinner(true); 
        const toastId = toast.loading('Updating record...');

        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            };

            const promises = [];

            // 1. Update Green Leaf
            if (formData.greenLeafId) {
                promises.push(fetchWithErr(`${BACKEND_URL}/api/green-leaf/${formData.greenLeafId}`, {
                    method: 'PUT', headers: authHeaders, body: JSON.stringify({ totalWeight: total, selectedWeight: selected, updatedBy: currentUser })
                }, "Failed to update Green Leaf record."));
            }

            // 2. Update Labour
            if (formData.labourId) {
                promises.push(fetchWithErr(`${BACKEND_URL}/api/labour/${formData.labourId}`, {
                    method: 'PUT', headers: authHeaders, 
                    body: JSON.stringify({ 
                        workerCount: Number(formData.workerCount),
                        rollingType: formData.rollingType,
                        rollingWorkerCount: formData.rollingType === 'Hand Rolling' ? Number(formData.rollingWorkerCount) : 0,
                        updatedBy: currentUser
                    })
                }, "Failed to update Labour record."));
            }

            // 3. Update the Primary Production Record (outputs[0] & dryers[0])
            if (formData.productionId) {
                const primaryDryer = formData.dryers[0];
                const dryerDetailsObj = primaryDryer.dryerName ? {
                    dryerName: primaryDryer.dryerName,
                    meterStart: Number(primaryDryer.meterStart),
                    meterEnd: Number(primaryDryer.meterEnd),
                    rollerPoints: Number(primaryDryer.rollerPoints || 0)
                } : {
                    dryerName: '', meterStart: 0, meterEnd: 0, rollerPoints: 0
                };

                promises.push(fetchWithErr(`${BACKEND_URL}/api/production/${formData.productionId}`, {
                    method: 'PUT', headers: authHeaders, 
                    body: JSON.stringify({
                        teaType: formData.outputs[0].teaType,
                        madeTeaWeight: Number(formData.outputs[0].madeTeaWeight),
                        expectedDryerDate: formData.expectedDryerDate, // <-- INCLUDED
                        dryerDetails: dryerDetailsObj,
                        updatedBy: currentUser
                    })
                }, "Failed to update Primary Production record."));
            }

            // 4. Create NEW Production Records for extra Tea Types (outputs.slice(1))
            if (formData.outputs.length > 1) {
                for (let i = 1; i < formData.outputs.length; i++) {
                    const extraPayload = {
                        date: formData.date,
                        teaType: formData.outputs[i].teaType,
                        madeTeaWeight: Number(formData.outputs[i].madeTeaWeight),
                        expectedDryerDate: formData.expectedDryerDate, // <-- INCLUDED
                        dryerDetails: { dryerName: '', meterStart: 0, meterEnd: 0, rollerPoints: 0 }, 
                        updatedBy: currentUser
                    };
                    promises.push(fetchWithErr(`${BACKEND_URL}/api/production`, {
                        method: 'POST', headers: authHeaders, body: JSON.stringify(extraPayload)
                    }, `Failed to add extra tea type: ${formData.outputs[i].teaType}`));
                }
            }

            // 5. Create NEW Production Records for extra Dryers (dryers.slice(1))
            if (formData.dryers.length > 1) {
                for (let j = 1; j < formData.dryers.length; j++) {
                    const extraDryer = formData.dryers[j];
                    if (extraDryer.dryerName) {
                        const extraPayload = {
                            date: formData.date,
                            teaType: formData.outputs[0].teaType || "Other", // Bind to primary tea type securely
                            madeTeaWeight: 0, // Prevent duplicating yields
                            expectedDryerDate: formData.expectedDryerDate, // <-- INCLUDED
                            dryerDetails: {
                                dryerName: extraDryer.dryerName,
                                meterStart: Number(extraDryer.meterStart),
                                meterEnd: Number(extraDryer.meterEnd),
                                rollerPoints: Number(extraDryer.rollerPoints || 0)
                            }
                        };
                        promises.push(fetchWithErr(`${BACKEND_URL}/api/production`, {
                            method: 'POST', headers: authHeaders, body: JSON.stringify(extraPayload)
                        }, `Failed to add extra dryer: ${extraDryer.dryerName}`));
                    }
                }
            }

            await Promise.all(promises);
            
            toast.success("Record updated successfully!", { id: toastId });
            setTimeout(() => { navigate('/view-green-leaf'); }, 500);

        } catch (error) {
            console.error("Update Error:", error);
            playErrorSound();
            toast.error(`Update Error: ${error.message}`, { id: toastId });
        } finally {
            setShowSpinner(false); 
        }
    };
    
    // Shared Input Styles
    const inputStyles = "w-full p-3.5 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-600 disabled:cursor-not-allowed";
    const labelStyles = "block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans bg-gray-50 dark:bg-zinc-950 min-h-screen transition-colors">
           
            
            <div className="mb-8 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700 rounded font-bold transition-colors">
                    <IoMdArrowRoundBack size={20} />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500">Edit Production Record</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-semibold mt-1 italic">Editing entry for: {formData.date}</p>
                </div>
            </div>
            
            <form onSubmit={handleUpdate} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 transition-colors">
                
                {/* 1. GREEN LEAF */}
                <div className="mb-8 bg-[#F8FAF8] dark:bg-green-950/20 border border-[#A3D9A5] dark:border-green-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-[#1B6A31] dark:text-green-500 mb-4 flex items-center gap-2"><Leaf size={18}/> 1. Green Leaf (kg)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelStyles}>Total Received</label>
                            <input type="number" step="0.01" min="0" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                        </div>
                        <div>
                            <label className={labelStyles}>Selected for Handmade</label>
                            <input type="number" step="0.01" min="0" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                        </div>
                    </div>
                </div>

                {/* 2. PRODUCTION OUTPUTS (Multiple Array) */}
                <div className="mb-8 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                            <Factory size={18}/> 2. Made Tea Output
                        </h3>
                        <button type="button" onClick={addOutput} className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg transition-colors">
                            <PlusCircle size={16} /> Add Type
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.outputs.map((out, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-purple-100 dark:border-purple-900/30 relative shadow-sm">
                                {formData.outputs.length > 1 && (
                                    <button type="button" onClick={() => removeOutput(index)} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm border border-red-200 dark:border-red-800/50">
                                        <X size={14} />
                                    </button>
                                )}
                                <div>
                                    <label className={labelStyles}>Tea Type</label>
                                    <select value={out.teaType} onChange={(e) => handleOutputChange(index, 'teaType', e.target.value)} required className={inputStyles}>
                                        <option value="">Select Type...</option>
                                        {teaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        {!teaOptions.includes(out.teaType) && out.teaType && <option value={out.teaType}>{out.teaType}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyles}>Made Tea (kg)</label>
                                    <input type="number" step="0.001" min="0" value={out.madeTeaWeight} onChange={(e) => handleOutputChange(index, 'madeTeaWeight', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. DRYER METER READINGS (Multiple Array) */}
                <div className="mb-8 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-orange-600 dark:text-orange-500 flex items-center gap-2">
                            <CalendarClock size={18}/> 3. Dryer Schedule & Meter Readings
                        </h3>
                        <button type="button" onClick={addDryer} className="text-sm font-bold text-orange-600 hover:text-orange-800 dark:text-orange-400 flex items-center gap-1 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg transition-colors">
                            <PlusCircle size={16} /> Add Dryer
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className={labelStyles}>Expected Dryer Date</label>
                        <input type="date" name="expectedDryerDate" value={formData.expectedDryerDate} onChange={handleInputChange} required className={inputStyles} />
                    </div>

                    <div className="space-y-4">
                        {formData.dryers.map((dryer, index) => (
                            <div key={index} className="p-5 border border-orange-100 dark:border-orange-900/30 rounded-xl bg-white dark:bg-zinc-900 relative shadow-sm">
                                {formData.dryers.length > 1 && (
                                    <button type="button" onClick={() => removeDryer(index)} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm">
                                        <X size={14} />
                                    </button>
                                )}
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelStyles}>Select Dryer</label>
                                        <select value={dryer.dryerName} onChange={(e) => handleDryerChange(index, 'dryerName', e.target.value)} className={inputStyles}>
                                            <option value="">Select Dryer (Optional)</option>
                                            <option value="Dryer 1">Dryer 1</option>
                                            <option value="Dryer 2">Dryer 2</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyles}>Start Reading</label>
                                            <input type="number" min="0" value={dryer.meterStart} onChange={(e) => handleDryerChange(index, 'meterStart', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} className={inputStyles} />
                                        </div>
                                        <div>
                                            <label className={labelStyles}>End Reading</label>
                                            <input type="number" min="0" value={dryer.meterEnd} onChange={(e) => handleDryerChange(index, 'meterEnd', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} className={inputStyles} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyles}>Roller (Points)</label>
                                        <input type="number" min="0" value={dryer.rollerPoints} onChange={(e) => handleDryerChange(index, 'rollerPoints', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} className={inputStyles} placeholder="Optional" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. LABOUR DETAILS */}
                <div className="mb-8 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2"><Users size={18}/> 4. Labour & Rolling Details</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Selection Worker Count</label>
                                <input type="number" step="any" min="0" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={handleWheel} onKeyDown={blockMinus} className={inputStyles} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-blue-200 dark:border-blue-800/50">
                            <div>
                                <label className={labelStyles}>Rolling Type</label>
                                <select 
                                    name="rollingType" 
                                    value={formData.rollingType} 
                                    onChange={handleInputChange} 
                                    className={inputStyles}
                                >
                                    <option value="Machine Rolling">Machine Rolling</option>
                                    <option value="Hand Rolling">Hand Rolled</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block text-[11px] font-bold mb-1.5 uppercase tracking-wider ${formData.rollingType === 'Hand Rolling' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                    Hand Rolling Labour Count
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="any"
                                    name="rollingWorkerCount" 
                                    value={formData.rollingWorkerCount} 
                                    onChange={handleInputChange} 
                                    onWheel={handleWheel} 
                                    onKeyDown={blockMinus}
                                    disabled={formData.rollingType !== 'Hand Rolling'}
                                    placeholder={formData.rollingType === 'Hand Rolling' ? "Enter count" : "Not Required"}
                                    required={formData.rollingType === 'Hand Rolling'}
                                    className={inputStyles} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-1/3 h-14 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={showSpinner} 
                        className={`w-full h-14 text-white font-bold rounded-xl text-lg transition-all shadow-md ${showSpinner ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 active:scale-95'}`}
                    >
                        {showSpinner ? "Applying Changes..." : "Update Daily Record"}
                    </button> 
                </div>
            </form>
        </div>
    );
}