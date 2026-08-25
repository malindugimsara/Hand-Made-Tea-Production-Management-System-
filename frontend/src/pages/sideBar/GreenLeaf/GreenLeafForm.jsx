import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, ListChecks, Save, X, CalendarClock, Zap, AlertCircle, Search, Leaf, Factory, Users } from "lucide-react";

export default function NewEntryForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigation = useNavigate();

    // --- THEME STATE LOGIC ---
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }
    }, []);

    const [existingDates, setExistingDates] = useState([]);
    const [lastReadings, setLastReadings] = useState({ 'Dryer 1': '', 'Dryer 2': '' });
    const [allProductionData, setAllProductionData] = useState([]);

    // ==========================================
    // ADD NEW RECORD FORM STATES (DAY 1)
    // ==========================================
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);

    const getTodayLocalString = () => {
        const today = new Date();
        return today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');
    };

    const [formData, setFormData] = useState({
        date: getTodayLocalString(),
        totalWeight: '',
        selectedWeight: '',
        expectedDryerDate: '',
        workerCount: '',
        rollingType: 'Machine Rolling1',
        rollingWorkerCount: ''
    });

    // ==========================================
    // DRYER POPUP STATES (DAY 2) - UNIFIED OUTPUTS
    // ==========================================
    const [pendingDryerTasks, setPendingDryerTasks] = useState([]);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [isSubmittingDryer, setIsSubmittingDryer] = useState(false);

    const [productionOutputs, setProductionOutputs] = useState([{
        teaType: '',
        selectedTeaWeight: '',
        madeTeaWeight: '',
        dryerName: '',
        meterStart: '',
        meterEnd: '',
        rollerPoints: ''
    }]);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [glRes, prodRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders })
            ]);

            if (glRes.ok && prodRes.ok) {
                const glData = await glRes.json();
                const rawProdData = await prodRes.json();

                const dates = glData.map(record => record.date ? record.date.substring(0, 10) : '');
                setExistingDates(dates);

                // Map Green Leaf Selected Weight into Production Data for validation
                const prodData = rawProdData.map(p => {
                    const pDateStr = p.date ? p.date.substring(0, 10) : '';
                    const matchedGL = glData.find(g => g.date && g.date.substring(0, 10) === pDateStr);
                    return {
                        ...p,
                        glSelectedWeight: matchedGL ? Number(matchedGL.selectedWeight) : 0
                    };
                });

                prodData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setAllProductionData(prodData);

                let d1Last = '';
                let d2Last = '';

                const d1Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 1');
                if (d1Record) d1Last = d1Record.dryerDetails.meterEnd;

                const d2Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 2');
                if (d2Record) d2Last = d2Record.dryerDetails.meterEnd;

                setLastReadings({ 'Dryer 1': d1Last, 'Dryer 2': d2Last });

                const todayStr = getTodayLocalString();
                const tasksNeedingDryer = prodData.filter(p => {
                    const hasNoDryer = !p.dryerDetails || !p.dryerDetails.dryerName || p.dryerDetails.dryerName === "";
                    const expectedDateStr = p.expectedDryerDate ? p.expectedDryerDate.substring(0, 10) : null;
                    const isDue = expectedDateStr && expectedDateStr <= todayStr;
                    return hasNoDryer && isDue;
                });

                if (tasksNeedingDryer.length > 0) {
                    setPendingDryerTasks(tasksNeedingDryer.reverse());
                }
            }
        } catch (error) {
            console.error("Data fetch error:", error);
        }
    };

    const handleLoadDateTasks = () => {
        const tasksForDate = allProductionData.filter(p => {
            const hasNoDryer = !p.dryerDetails || !p.dryerDetails.dryerName || p.dryerDetails.dryerName === "";
            const expectedDateStr = p.expectedDryerDate ? p.expectedDryerDate.substring(0, 10) : null;
            return hasNoDryer && expectedDateStr === formData.date;
        });

        if (tasksForDate.length > 0) {
            setPendingDryerTasks(tasksForDate);
            setActiveTaskIndex(0);
            setProductionOutputs([{ teaType: '', selectedTeaWeight: '', madeTeaWeight: '', dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }]);
            toast.success(`Found ${tasksForDate.length} pending task(s) expected to be dried on this date!`);
        } else {
            toast.success("No pending dryer tasks scheduled for this date.");
        }
    };

    const returnedWeight = (Number(formData.totalWeight) || 0) - (Number(formData.selectedWeight) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'rollingType' && value !== 'Hand Rolling') {
            setFormData({ ...formData, [name]: value, rollingWorkerCount: '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleOutputChange = (index, field, value) => {
        const newOutputs = [...productionOutputs];
        newOutputs[index][field] = value;
        const currentDryer = newOutputs[index].dryerName;

        // 1. Handle Dryer Selection
        if (field === 'dryerName' && value !== '') {
            // Fallback to database last readings first
            if (lastReadings[value] !== undefined) {
                newOutputs[index].meterStart = String(lastReadings[value]);
            }

            // Find if this dryer is already active in another output block
            const existingBlock = newOutputs.find((out, i) => i !== index && out.dryerName === value);
            if (existingBlock) {
                // Auto-sync meter readings from the existing block
                newOutputs[index].meterStart = existingBlock.meterStart;
                newOutputs[index].meterEnd = existingBlock.meterEnd;
            }
        }

        // 2. Handle Meter Updates (Sync across matching dryers)
        if ((field === 'meterStart' || field === 'meterEnd') && currentDryer) {
            newOutputs.forEach(out => {
                if (out.dryerName === currentDryer) {
                    out[field] = value;
                }
            });
        }

        setProductionOutputs(newOutputs);
    };

    const addOutput = () => {
        setProductionOutputs([...productionOutputs, {
            teaType: '', selectedTeaWeight: '', madeTeaWeight: '',
            dryerName: '', meterStart: '', meterEnd: '', rollerPoints: ''
        }]);
    };

    const removeOutput = (index) => {
        setProductionOutputs(productionOutputs.filter((_, i) => i !== index));
    };

    const handleAddToList = (e) => {
        e.preventDefault();

        if (existingDates.includes(formData.date)) {
            toast.error(`A record for ${formData.date} already exists in the database!`);
            return;
        }

        const isAlreadyInQueue = pendingRecords.some(r => r.date === formData.date);
        if (isAlreadyInQueue) {
            toast.error(`A record for ${formData.date} is already in the pending list!`);
            return;
        }

        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);

        if (selected > total) {
            toast.error("Selected weight must be less than Total weight!"); return;
        }
        if (formData.expectedDryerDate < formData.date) {
            toast.error("Expected Dryer Date cannot be before the collection date!"); return;
        }

        const newRecord = { ...formData, returnedWeight };
        setPendingRecords([...pendingRecords, newRecord]);
        toast.success("Added to list!");

        setFormData({
            ...formData,
            totalWeight: '',
            selectedWeight: '',
            expectedDryerDate: '',
            workerCount: '',
            rollingType: 'Machine Rolling1',
            rollingWorkerCount: ''
        });
    };

    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("No records in the list to save!"); return;
        }

        setIsSavingAll(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            for (const record of pendingRecords) {
                const total = Number(record.totalWeight);
                const selected = Number(record.selectedWeight);

                const greenLeafPayload = { date: record.date, totalWeight: total, selectedWeight: selected };
                const labourPayload = {
                    date: record.date, workerCount: Number(record.workerCount), rollingType: record.rollingType,
                    rollingWorkerCount: record.rollingType === 'Hand Rolling' ? Number(record.rollingWorkerCount) : 0
                };

                const [glRes, labRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/green-leaf`, { method: 'POST', headers: authHeaders, body: JSON.stringify(greenLeafPayload) }),
                    fetch(`${BACKEND_URL}/api/labour`, { method: 'POST', headers: authHeaders, body: JSON.stringify(labourPayload) })
                ]);

                if (!glRes.ok || !labRes.ok) {
                    if (glRes.status === 403 || labRes.status === 403) throw new Error('Access Denied');
                    throw new Error(`Failed to save GL or Labour record for ${record.date}`);
                }

                const productionPayload = {
                    date: record.date,
                    teaType: "-",
                    madeTeaWeight: 0,
                    expectedDryerDate: record.expectedDryerDate
                };

                const prodRes = await fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: authHeaders, body: JSON.stringify(productionPayload) });

                if (!prodRes.ok) {
                    if (prodRes.status === 403) throw new Error('Access Denied');
                    throw new Error(`Failed to save Production record for ${record.date}`);
                }
            }

            toast.success("All records saved successfully!", { id: toastId });
            setExistingDates([...existingDates, ...pendingRecords.map(r => r.date)]);
            setPendingRecords([]);

            setTimeout(() => {
                fetchInitialData();
            }, 1000);

            navigation('/view-green-leaf');

        } catch (error) {
            if (error.message === 'Access Denied') {
                toast.error("Access Denied. You do not have permission.", { id: toastId });
            } else {
                toast.error(error.message || "Error saving some records. Please check.", { id: toastId });
            }
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();

        const currentTask = pendingDryerTasks[activeTaskIndex];
        let totalSelectedEntered = 0;

        // Validation & Accumulation
        for (let out of productionOutputs) {
            if (!out.teaType || out.selectedTeaWeight === '' || out.madeTeaWeight === '' || !out.dryerName || out.meterStart === '' || out.meterEnd === '') {
                toast.error("Please fill all required fields in all blocks!");
                return;
            }
            if (Number(out.meterEnd) < Number(out.meterStart)) {
                toast.error(`End Reading must be greater than Start Reading for ${out.dryerName || 'the dryer'}!`);
                return;
            }
            totalSelectedEntered += Number(out.selectedTeaWeight);
        }

        // Limit Check against Green Leaf amount
        if (totalSelectedEntered > currentTask.glSelectedWeight) {
            toast.error(`Total Selected Tea (${totalSelectedEntered}kg) cannot exceed the Green Leaf limit (${currentTask.glSelectedWeight}kg)!`);
            return;
        }

        setIsSubmittingDryer(true);
        const toastId = toast.loading("Saving details...");

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            const extraPromises = [];

            for (let i = 0; i < productionOutputs.length; i++) {
                const out = productionOutputs[i];

                const payload = {
                    date: currentTask.date,
                    expectedDryerDate: currentTask.expectedDryerDate,
                    teaType: out.teaType,
                    selectedTeaWeight: Number(out.selectedTeaWeight),
                    madeTeaWeight: Number(out.madeTeaWeight),
                    dryerDetails: {
                        dryerName: out.dryerName,
                        meterStart: Number(out.meterStart),
                        meterEnd: Number(out.meterEnd),
                        rollerPoints: Number(out.rollerPoints || 0)
                    }
                };

                if (i === 0) {
                    const res = await fetch(`${BACKEND_URL}/api/production/${currentTask._id}`, {
                        method: 'PUT', headers: authHeaders, body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error("Failed to update initial record");
                } else {
                    extraPromises.push(
                        fetch(`${BACKEND_URL}/api/production`, {
                            method: 'POST', headers: authHeaders, body: JSON.stringify(payload)
                        })
                    );
                }
            }

            if (extraPromises.length > 0) {
                await Promise.all(extraPromises);
            }

            setLastReadings(prev => {
                const newReadings = { ...prev };
                productionOutputs.forEach(out => { newReadings[out.dryerName] = Number(out.meterEnd); });
                return newReadings;
            });

            toast.success("Production & Dryer details saved!", { id: toastId });

            if (activeTaskIndex < pendingDryerTasks.length - 1) {
                setActiveTaskIndex(prev => prev + 1);
                setProductionOutputs([{ teaType: '', selectedTeaWeight: '', madeTeaWeight: '', dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }]);
            } else {
                setPendingDryerTasks([]);
                toast.success("All pending dryer tasks complete!");
                setTimeout(() => { fetchInitialData(); }, 500);
            }
        } catch (error) {
            toast.error("Error saving details.", { id: toastId });
        } finally {
            setIsSubmittingDryer(false);
        }
    };

    const inputStyles = "w-full p-3.5 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-600 disabled:cursor-not-allowed";
    const labelStyles = "block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300 pb-20">

            {/* --- TOP HEADER NAVIGATION --- */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800 shadow-sm px-8 py-4 mb-8 flex justify-between items-center transition-colors duration-300">
                <div>
                    <h2 className="text-2xl font-black text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
                        <Leaf size={24} /> New Production Entry
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-medium">Record Green Leaf, Production, and Labour data</p>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto relative">

                {/* --- DAY 2 PENDING DRYER & PRODUCTION MODAL --- */}
                {pendingDryerTasks.length > 0 && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border  dark:border-green-800 my-auto relative">
                            <div className="bg-green-700 dark:bg-green-700 p-6 text-white relative">
                                <button onClick={() => setPendingDryerTasks([])} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors focus:outline-none">
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-3 mb-1">
                                    <AlertCircle size={28} className="opacity-90" />
                                    <h2 className="text-2xl font-black m-0 leading-none">Pending Production</h2>
                                </div>
                                <p className="text-orange-100 font-medium m-0 mt-2 ml-10">Task {activeTaskIndex + 1} of {pendingDryerTasks.length}</p>
                            </div>

                            <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-2xl mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 dark:text-orange-400 mb-3">Record Details</p>
                                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between border-b border-orange-100 dark:border-orange-900/30 pb-2">
                                            <span className="text-gray-500 dark:text-gray-400">Date Collected</span>
                                            <span className="font-bold">{new Date(pendingDryerTasks[activeTaskIndex].date).toISOString().split('T')[0]}</span>
                                        </div>
                                        <div className="flex justify-between pt-1">
                                            <span className="text-gray-500 dark:text-gray-400">Expected Dryer Date</span>
                                            <span className="font-black text-gray-900 dark:text-white">
                                                {pendingDryerTasks[activeTaskIndex].expectedDryerDate ? new Date(pendingDryerTasks[activeTaskIndex].expectedDryerDate).toISOString().split('T')[0] : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleModalSubmit} className="space-y-6">
                                    <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-5 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-md font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                                <div className="p-1.5 bg-purple-100 dark:bg-purple-500/20 rounded-md"><Factory size={16} /></div>
                                                Production & Dryer Details
                                            </h3>
                                            <button type="button" onClick={addOutput} className="text-xs font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                                                <PlusCircle size={14} /> Add Type
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {productionOutputs.map((out, index) => (
                                                <div key={index} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-purple-100 dark:border-purple-900/30 relative shadow-sm">
                                                    {productionOutputs.length > 1 && (
                                                        <button type="button" onClick={() => removeOutput(index)} className="absolute -top-3 -right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm">
                                                            <X size={14} />
                                                        </button>
                                                    )}

                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Tea Output Info</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                        <div>
                                                            <label className={labelStyles}>Tea Type</label>
                                                            <select value={out.teaType} onChange={(e) => handleOutputChange(index, 'teaType', e.target.value)} required className={inputStyles}>
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
                                                                <option value="Other">Other</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className={labelStyles}>
                                                                Selected Tea (KG)
                                                                <span className="ml-1 text-[9px] text-blue-600 dark:text-blue-400 normal-case bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                                                                    Max: {pendingDryerTasks[activeTaskIndex]?.glSelectedWeight || 0}kg
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max={pendingDryerTasks[activeTaskIndex]?.glSelectedWeight || ''}
                                                                value={out.selectedTeaWeight}
                                                                onChange={(e) => handleOutputChange(index, 'selectedTeaWeight', e.target.value)}
                                                                onWheel={(e) => e.target.blur()}
                                                                required
                                                                className={inputStyles}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={labelStyles}>Made Tea (KG)</label>
                                                            <input type="number" step="0.001" min="0" value={out.madeTeaWeight} onChange={(e) => handleOutputChange(index, 'madeTeaWeight', e.target.value)} onWheel={(e) => e.target.blur()} required className={inputStyles} />
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                                                        <h4 className="text-xs font-bold text-orange-500 uppercase mb-3 flex items-center gap-1"><Zap size={14} /> Dryer Readings</h4>
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
                                                                    <input type="number" min="0" value={out.meterStart} onChange={(e) => handleOutputChange(index, 'meterStart', e.target.value)} onWheel={(e) => e.target.blur()} required className={inputStyles} />
                                                                </div>
                                                                <div>
                                                                    <label className={labelStyles}>End Reading</label>
                                                                    <input type="number" min="0" value={out.meterEnd} onChange={(e) => handleOutputChange(index, 'meterEnd', e.target.value)} onWheel={(e) => e.target.blur()} required className={inputStyles} />
                                                                </div>
                                                                <div className="col-span-2 md:col-span-1">
                                                                    <label className={labelStyles}>Roller (Points)</label>
                                                                    <input type="number" min="0" value={out.rollerPoints} onChange={(e) => handleOutputChange(index, 'rollerPoints', e.target.value)} onWheel={(e) => e.target.blur()} className={inputStyles} placeholder="Optional" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSubmittingDryer} className="w-full py-4 mt-4 bg-green-700 hover:bg-green-800 text-white font-black rounded-xl transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                                        {isSubmittingDryer ? "Saving..." : activeTaskIndex < pendingDryerTasks.length - 1 ? "Save & Next Task" : "Save & Complete"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* --- LEFT SIDE: FORM --- */}
                    <div className="lg:col-span-8 space-y-6">

                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-4">
                                <div className="w-full sm:w-1/2">
                                    <label className={labelStyles}>Date of Collection</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className={inputStyles} />
                                </div>
                            </div>
                            <button type="button" onClick={handleLoadDateTasks} className="w-full sm:w-auto px-5 py-3.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-500/20">
                                <Search size={18} /> Load Tasks for Date
                            </button>
                        </div>

                        <form onSubmit={handleAddToList} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 1. GREEN LEAF */}
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-fit">
                                    <div className="bg-green-50/50 dark:bg-green-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg text-green-700 dark:text-green-400"><Leaf size={18} /></div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Green Leaf Details</h3>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        <div>
                                            <label className={labelStyles}>Total Received (kg)</label>
                                            <input type="number" step="0.01" min="0" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Selected for Handmade (kg)</label>
                                            <input type="number" step="0.01" min="0" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Return Weight</span>
                                            <span className="text-lg font-black text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-500/10 px-3 py-1 rounded-lg border border-green-100 dark:border-green-500/20">
                                                {returnedWeight > 0 ? returnedWeight.toFixed(2) : 0} kg
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. DRYER SCHEDULE */}
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-fit">
                                    <div className="bg-orange-50/50 dark:bg-orange-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400"><CalendarClock size={18} /></div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Dryer Schedule</h3>
                                    </div>
                                    <div className="p-5">
                                        <label className={labelStyles}>Expected Dryer Date</label>
                                        <input type="date" name="expectedDryerDate" value={formData.expectedDryerDate} onChange={handleInputChange} required className={inputStyles} />
                                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-2 leading-relaxed">Selecting a date here will trigger a popup on that day to enter Production Outputs and Meter Readings.</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. LABOUR DETAILS */}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400"><Users size={18} /></div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Labour & Workforce</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelStyles}>Selection Workers</label>
                                            <input type="number" min="0" step="0.01" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Rolling Method</label>
                                            <select name="rollingType" value={formData.rollingType} onChange={handleInputChange} className={inputStyles}>
                                                <option value="Machine Rolling1">M/R 1</option>
                                                <option value="Machine Rolling2">M/R 2</option>
                                                <option value="Machine Rolling3">M/R 3</option>
                                                <option value="Hand Rolling">Hand Rolled</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Rolling Workers</label>
                                            <input
                                                type="number"
                                                name="rollingWorkerCount"
                                                step="any"
                                                min="0"
                                                value={formData.rollingWorkerCount}
                                                onChange={handleInputChange}
                                                disabled={formData.rollingType !== 'Hand Rolling'}
                                                placeholder={formData.rollingType === 'Hand Rolling' ? "Enter count" : "N/A"}
                                                required={formData.rollingType === 'Hand Rolling'}
                                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                className={inputStyles}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 rounded-2xl text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 font-black text-lg flex justify-center items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5">
                                <PlusCircle size={22} /> Add to Pending Queue
                            </button>
                        </form>
                    </div>

                    {/* --- RIGHT SIDE: PENDING QUEUE --- */}
                    <div className="lg:col-span-4 flex flex-col h-full max-h-[85vh]">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex-1 flex flex-col overflow-hidden sticky top-24 transition-colors duration-300">

                            <div className="bg-gray-50/80 dark:bg-zinc-950/50 p-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300">
                                        <ListChecks size={18} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Pending Queue</h3>
                                </div>
                                <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-black px-3 py-1 rounded-full">
                                    {pendingRecords.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-zinc-950/20">
                                {pendingRecords.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 py-10">
                                        <div className="p-6 bg-gray-50 dark:bg-zinc-900 rounded-full mb-4 border border-gray-100 dark:border-zinc-800">
                                            <ListChecks size={32} className="opacity-50" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">Queue is empty</p>
                                        <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Fill the form and add records here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingRecords.map((item, index) => (
                                            <div key={index} className="bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm relative group hover:border-green-300 dark:hover:border-green-700/50 transition-colors">

                                                <button
                                                    onClick={() => handleRemoveFromList(index)}
                                                    className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="flex flex-col gap-3 pr-10">
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{item.date}</span>
                                                        <div className="mt-2 space-y-2">
                                                            <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                                                <span className="font-bold text-purple-900 dark:text-purple-300 text-sm">Production Output</span>
                                                                <span className="text-[10px] bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded font-bold">Pending on Dryer</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        <div className="bg-gray-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 transition-colors">
                                                            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Leaf</span>
                                                            <span className="text-green-600 dark:text-green-400 font-black">{item.selectedWeight}kg</span> / {item.totalWeight}kg
                                                        </div>
                                                        <div className="bg-gray-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 transition-colors flex items-center justify-center">
                                                            <span className="text-gray-400 font-bold uppercase text-[10px]">Awaiting Output</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-zinc-800">
                                                        <span className="text-[10px] uppercase text-gray-400 font-bold flex items-center gap-1"><CalendarClock size={10} /> Dryer Date</span>
                                                        <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">{item.expectedDryerDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-5 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 transition-colors">
                                <button
                                    onClick={handleSaveAll}
                                    disabled={isSavingAll || pendingRecords.length === 0}
                                    className={`w-full py-4 rounded-2xl text-white font-black flex justify-center items-center gap-2 transition-all ${isSavingAll || pendingRecords.length === 0
                                            ? 'bg-gray-300 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5'
                                        }`}
                                >
                                    <Save size={18} /> {isSavingAll ? "Saving..." : `Save to Database (${pendingRecords.length})`}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}