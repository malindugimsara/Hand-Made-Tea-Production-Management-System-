import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoMdArrowRoundBack } from "react-icons/io";
import { PlusCircle, X, Leaf, Factory, Users, Zap } from "lucide-react";

export default function EditRecordPage() {
    // 1. Configuration & Hooks
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();
    const [showSpinner, setShowSpinner] = useState(false);

    // State to hold the latest meter readings for auto-filling
    const [lastReadings, setLastReadings] = useState({ 'Dryer 1': '', 'Dryer 2': '' });

    // 2. Form State Management (Unified Outputs)
    const [formData, setFormData] = useState({
        greenLeafId: '',
        productionId: '',
        labourId: '',
        date: '',
        expectedDryerDate: '', 
        totalWeight: '',
        selectedWeight: '', // Green Leaf selected weight
        productionOutputs: [{
            teaType: '',
            selectedTeaWeight: '', // <-- NEW FIELD
            madeTeaWeight: '',
            dryerName: '',
            meterStart: '',
            meterEnd: '',
            rollerPoints: '' 
        }],
        workerCount: '',
        rollingType: 'Machine Rolling1',
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
                expectedDryerDate: data.expectedDryerDate ? new Date(data.expectedDryerDate).toISOString().split('T')[0] : data.date,
                totalWeight: data.totalWeight || '',
                selectedWeight: data.selectedWeight || '',
                
                // Map the initial data to the unified block
                productionOutputs: [{ 
                    teaType: data.teaType !== '-' ? data.teaType : '', 
                    selectedTeaWeight: data.selectedTeaWeight !== undefined ? data.selectedTeaWeight : '',
                    madeTeaWeight: data.madeTeaWeight || '',
                    dryerName: data.dryerName !== '-' ? data.dryerName : '',
                    meterStart: data.meterStart !== '-' ? data.meterStart : '',
                    meterEnd: data.meterEnd !== '-' ? data.meterEnd : '',
                    rollerPoints: data.rollerPoints !== undefined && data.rollerPoints !== '-' ? data.rollerPoints : ''
                }],
                
                workerCount: data.workerCount || '',
                rollingType: data.rollingType && data.rollingType !== '-' ? data.rollingType : 'Machine Rolling1',
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

    // --- Unified Array Handlers ---
    const handleOutputChange = (index, field, value) => {
        const newOutputs = [...formData.productionOutputs];
        newOutputs[index][field] = value;

        // Auto-fill meterStart when dryerName changes
        if (field === 'dryerName') {
            newOutputs[index].meterStart = lastReadings[value] !== undefined ? String(lastReadings[value]) : '';
        }
        setFormData({ ...formData, productionOutputs: newOutputs });
    };

    const addOutput = () => {
        setFormData({ 
            ...formData, 
            productionOutputs: [...formData.productionOutputs, { 
                teaType: '', selectedTeaWeight: '', madeTeaWeight: '', 
                dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' 
            }] 
        });
    };

    const removeOutput = (index) => {
        const newOutputs = formData.productionOutputs.filter((_, i) => i !== index);
        setFormData({ ...formData, productionOutputs: newOutputs });
    };

    const handleWheel = (e) => e.target.blur();
    
    const blockMinus = (e) => {
        if (e.key === '-') {
            e.preventDefault();
        }
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
        
        // Validate Unified Blocks
        for (let out of formData.productionOutputs) {
            if (!out.teaType || out.selectedTeaWeight === '' || out.madeTeaWeight === '' || !out.dryerName || out.meterStart === '' || out.meterEnd === '') {
                toast.error("Please fill all required fields in Production & Dryer blocks!"); 
                return;
            }
            if (Number(out.meterEnd) < Number(out.meterStart)) {
                toast.error(`End Reading must be greater than Start for ${out.dryerName}!`); 
                return;
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
            } else if (total > 0 || selected > 0) {
                promises.push(fetchWithErr(`${BACKEND_URL}/api/green-leaf`, {
                    method: 'POST', headers: authHeaders, body: JSON.stringify({ 
                        date: formData.date, 
                        totalWeight: total, 
                        selectedWeight: selected, 
                        updatedBy: currentUser 
                    })
                }, "Failed to create new Green Leaf record."));
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
            } else if (Number(formData.workerCount) > 0 || Number(formData.rollingWorkerCount) > 0) {
                promises.push(fetchWithErr(`${BACKEND_URL}/api/labour`, {
                    method: 'POST', headers: authHeaders, 
                    body: JSON.stringify({ 
                        date: formData.date,
                        workerCount: Number(formData.workerCount),
                        rollingType: formData.rollingType,
                        rollingWorkerCount: formData.rollingType === 'Hand Rolling' ? Number(formData.rollingWorkerCount) : 0,
                        updatedBy: currentUser
                    })
                }, "Failed to create new Labour record."));
            }

            // 3. Update the Primary Production Record (Block 0)
            if (formData.productionId) {
                const primaryOut = formData.productionOutputs[0];
                const dryerDetailsObj = {
                    dryerName: primaryOut.dryerName,
                    meterStart: Number(primaryOut.meterStart),
                    meterEnd: Number(primaryOut.meterEnd),
                    rollerPoints: Number(primaryOut.rollerPoints || 0)
                };

                promises.push(fetchWithErr(`${BACKEND_URL}/api/production/${formData.productionId}`, {
                    method: 'PUT', headers: authHeaders, 
                    body: JSON.stringify({
                        teaType: primaryOut.teaType,
                        selectedTeaWeight: Number(primaryOut.selectedTeaWeight),
                        madeTeaWeight: Number(primaryOut.madeTeaWeight),
                        expectedDryerDate: formData.expectedDryerDate,
                        dryerDetails: dryerDetailsObj,
                        updatedBy: currentUser
                    })
                }, "Failed to update Primary Production record."));
            }

            // 4. Create NEW Production Records for extra blocks (Blocks 1+)
            if (formData.productionOutputs.length > 1) {
                for (let i = 1; i < formData.productionOutputs.length; i++) {
                    const extraOut = formData.productionOutputs[i];
                    const extraPayload = {
                        date: formData.date,
                        teaType: extraOut.teaType,
                        selectedTeaWeight: Number(extraOut.selectedTeaWeight),
                        madeTeaWeight: Number(extraOut.madeTeaWeight),
                        expectedDryerDate: formData.expectedDryerDate, 
                        dryerDetails: {
                            dryerName: extraOut.dryerName, 
                            meterStart: Number(extraOut.meterStart), 
                            meterEnd: Number(extraOut.meterEnd), 
                            rollerPoints: Number(extraOut.rollerPoints || 0)
                        }, 
                        updatedBy: currentUser
                    };
                    promises.push(fetchWithErr(`${BACKEND_URL}/api/production`, {
                        method: 'POST', headers: authHeaders, body: JSON.stringify(extraPayload)
                    }, `Failed to add extra block for: ${extraOut.teaType}`));
                }
            }

            await Promise.all(promises);
            
            toast.success("Record updated successfully!", { id: toastId });
            setTimeout(() => { navigate('/view-green-leaf'); }, 500);

        } catch (error) {
            console.error("Update Error:", error);
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

                {/* 2. PRODUCTION OUTPUTS & DRYER DETAILS (Unified Array) */}
                <div className="mb-8 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                            <Factory size={18}/> 2. Production & Dryer Details
                        </h3>
                        <button type="button" onClick={addOutput} className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg transition-colors">
                            <PlusCircle size={16} /> Add Type
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className={labelStyles}>Expected Dryer Date</label>
                        <input type="date" name="expectedDryerDate" value={formData.expectedDryerDate} onChange={handleInputChange} required className={inputStyles} />
                    </div>

                    <div className="space-y-6">
                        {formData.productionOutputs.map((out, index) => (
                            <div key={index} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-purple-100 dark:border-purple-900/30 relative shadow-sm">
                                {formData.productionOutputs.length > 1 && (
                                    <button type="button" onClick={() => removeOutput(index)} className="absolute -top-3 -right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm border border-red-200 dark:border-red-800/50">
                                        <X size={14} />
                                    </button>
                                )}
                                
                                {/* TEA OUTPUT INFO */}
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Tea Output Info</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className={labelStyles}>Tea Type</label>
                                        <select value={out.teaType} onChange={(e) => handleOutputChange(index, 'teaType', e.target.value)} required className={inputStyles}>
                                            <option value="">Select Type...</option>
                                            {teaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            {!teaOptions.includes(out.teaType) && out.teaType && <option value={out.teaType}>{out.teaType}</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelStyles}>Selected Tea (KG)</label>
                                        <input type="number" step="0.01" min="0" value={out.selectedTeaWeight} onChange={(e) => handleOutputChange(index, 'selectedTeaWeight', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                                    </div>
                                    <div>
                                        <label className={labelStyles}>Made Tea (kg)</label>
                                        <input type="number" step="0.001" min="0" value={out.madeTeaWeight} onChange={(e) => handleOutputChange(index, 'madeTeaWeight', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                                    </div>
                                </div>

                                {/* DRYER READINGS INFO */}
                                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                                    <h4 className="text-xs font-bold text-orange-500 uppercase mb-3 flex items-center gap-1"><Zap size={14}/> Dryer Readings</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelStyles}>Select Dryer</label>
                                            <select value={out.dryerName} onChange={(e) => handleOutputChange(index, 'dryerName', e.target.value)} required className={inputStyles}>
                                                <option value="">Choose...</option>
                                                <option value="Dryer 1">Dryer 1</option>
                                                <option value="Dryer 2">Dryer 2</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className={labelStyles}>Start Reading</label>
                                                <input type="number" min="0" value={out.meterStart} onChange={(e) => handleOutputChange(index, 'meterStart', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                                            </div>
                                            <div>
                                                <label className={labelStyles}>End Reading</label>
                                                <input type="number" min="0" value={out.meterEnd} onChange={(e) => handleOutputChange(index, 'meterEnd', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} required className={inputStyles} />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className={labelStyles}>Roller (Points)</label>
                                                <input type="number" min="0" value={out.rollerPoints} onChange={(e) => handleOutputChange(index, 'rollerPoints', e.target.value)} onWheel={handleWheel} onKeyDown={blockMinus} className={inputStyles} placeholder="Optional" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. LABOUR DETAILS */}
                <div className="mb-8 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2"><Users size={18}/> 3. Labour & Rolling Details</h3>
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
                                    <option value="Machine Rolling1">M/R 1</option>
                                    <option value="Machine Rolling2">M/R 2</option>
                                    <option value="Machine Rolling3">M/R 3</option>
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