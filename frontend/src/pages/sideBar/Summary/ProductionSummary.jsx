import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast'; 
import { Calculator, Calendar, Leaf, Zap, Users, Settings2, RefreshCw, CheckSquare, Square, Save, AlertTriangle, Filter, Info, Eye, FileDown, Sun, Moon } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader'; 

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductionSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [records, setRecords] = useState([]);

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const [isSaved, setIsSaved] = useState(true); 
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
    const [selectedTeaTypes, setSelectedTeaTypes] = useState([]); 

    const [labourRate, setLabourRate] = useState(1350);
    const [electricityRate, setElectricityRate] = useState(20);

    const teaOptions = [
        "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
        "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
        "Flower", "Chakra"
    ];

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

    const toggleTheme = () => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsDark(!isDark);
    };

    useEffect(() => {
        setIsSaved(false);
    }, [labourRate, electricityRate, selectedTeaTypes]);

    useEffect(() => {
        fetchAllData(true); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterMonth]); 

    const fetchAllData = async (isSilent = false) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders })
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const glUsage = {};
            const labUsage = {};

            const merged = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                const glsForDate = greenLeafData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const labsForDate = labourData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                const gl = glsForDate[glUsage[dateStr]] || null;
                const lab = labsForDate[labUsage[dateStr]] || null;

                glUsage[dateStr]++;
                labUsage[dateStr]++;
                
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                const calculatedUnits = mEnd > mStart ? (mEnd - mStart) : 0;
                const rPoints = Number(prod?.dryerDetails?.rollerPoints) || 0; // Get Roller Points

                return {
                    date: dateStr,
                    teaType: prod.teaType || 'Unknown',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    workerCount: lab ? lab.workerCount : 0,
                    rollingWorkerCount: lab && lab.rollingType === 'Hand Rolling' ? lab.rollingWorkerCount : 0, // Get Hand Rolling Count
                    meterStart: mStart, 
                    meterEnd: mEnd,     
                    dryerUnits: calculatedUnits,
                    rollerPoints: rPoints
                };
            });

            setRecords(merged);
            await loadMonthDataInternal(filterMonth, merged, isSilent);

        } catch (error) {
            if (!isSilent) toast.error("Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const loadMonthDataInternal = async (month, availableRecords, isSilent = false) => {
        let toastId;
        if (!isSilent) toastId = toast.loading(`Checking database for ${month}...`);

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const summaryRes = await fetch(`${BACKEND_URL}/api/production-summary`, { headers: authHeaders });
            
            if (summaryRes.ok) {
                const summaries = await summaryRes.json();
                let savedSummary = Array.isArray(summaries) 
                    ? summaries.find(s => s.reportMonth === month) 
                    : (summaries?.reportMonth === month ? summaries : null);

                if (savedSummary) {
                    setLabourRate(savedSummary.labourRate);
                    // setElectricityRate(savedSummary.electricityRate);

                    const activeTypes = savedSummary.teaSummaries.map(tea => tea.type);

                    setSelectedTeaTypes(activeTypes);
                    setTimeout(() => setIsSaved(true), 100); 
                    
                    if (!isSilent) toast.success(`Loaded saved summary for ${month}!`, { id: toastId });
                    return; 
                }
            }

            autoSelectActiveTeaTypes(availableRecords, month);
            if (!isSilent) toast.success(`Fresh calculations for ${month}`, { id: toastId });

        } catch (err) {
            if (!isSilent) toast.error("Error checking database.", { id: toastId });
        }
    };

    const handleLoadMonthDataClick = () => {
        if (!filterMonth) {
            toast.error("Please select a month first!");
            return;
        }
        loadMonthDataInternal(filterMonth, records, false);
    };

    const autoSelectActiveTeaTypes = (allRecords, month) => {
        const monthRecords = allRecords.filter(r => r.date.startsWith(month));
        const glTotals = {};
        
        monthRecords.forEach(r => {
            if (r.teaType !== 'Unknown') {
                glTotals[r.teaType] = (glTotals[r.teaType] || 0) + Number(r.selectedWeight || 0);
            }
        });

        const activeTypes = Object.keys(glTotals).filter(type => glTotals[type] > 0);
        setSelectedTeaTypes(activeTypes.length > 0 ? activeTypes : [...teaOptions]);
        setTimeout(() => setIsSaved(false), 100); 
    };

    const toggleTeaType = (type) => {
        if (selectedTeaTypes.includes(type)) {
            setSelectedTeaTypes(selectedTeaTypes.filter(t => t !== type));
        } else {
            setSelectedTeaTypes([...selectedTeaTypes, type]);
        }
        setIsSaved(false);
    };

    const handleSelectAll = () => {
        setSelectedTeaTypes(selectedTeaTypes.length === teaOptions.length ? [] : [...teaOptions]);
        setIsSaved(false);
    };

    const handleLabourRateChange = (e) => {
        setLabourRate(e.target.value.replace(/^0+(?=\d)/, ''));
        setIsSaved(false);
    };

    const handleElectricityRateChange = (e) => {
        setElectricityRate(e.target.value.replace(/^0+(?=\d)/, ''));
        setIsSaved(false);
    };

    // Calculate Table Data dynamically based on Backend Records
    const generateTableData = () => {
        if (selectedTeaTypes.length === 0) return []; 

        const dateFiltered = records.filter(r => r.date.startsWith(filterMonth));

        return selectedTeaTypes.map(type => {
            const relevantRecords = dateFiltered.filter(r => r.teaType === type);
            const totalGL = relevantRecords.reduce((sum, r) => sum + Number(r.selectedWeight || 0), 0);
            const totalSelectionWorkers = relevantRecords.reduce((sum, r) => sum + Number(r.workerCount || 0), 0);
            const totalMT = relevantRecords.reduce((sum, r) => sum + Number(r.madeTeaWeight || 0), 0);
            
            // Calculate Hand Rolling Workers & Roller Points from DB records directly
            const hrWorkers = relevantRecords.reduce((sum, r) => sum + Number(r.rollingWorkerCount || 0), 0);
            const rPoints = relevantRecords.reduce((sum, r) => sum + Number(r.rollerPoints || 0), 0);

            // Calculate Unique Dryer Units to avoid overlapping duplication
            const uniqueDryerRecords = [];
            relevantRecords.forEach(r => {
                const isDuplicate = uniqueDryerRecords.some(ud => ud.date === r.date && ud.meterStart === r.meterStart && ud.meterEnd === r.meterEnd);
                if (!isDuplicate) uniqueDryerRecords.push(r);
            });
            const totalDryerUnits = uniqueDryerRecords.reduce((sum, r) => sum + Number(r.dryerUnits || 0), 0);

            const selectionCost = totalSelectionWorkers * labourRate;
            const handRollingCost = hrWorkers * labourRate;
            const dryerCost = totalDryerUnits * electricityRate;
            const rollerCost = rPoints * electricityRate;
            const totalElectricityCost = dryerCost + rollerCost;

            return {
                type, totalGL, totalMT, totalSelectionWorkers, hrWorkers, selectionCost,
                handRollingCost, totalDryerUnits, rPoints, dryerCost, rollerCost, totalElectricityCost
            };
        });
    };

    const tableData = generateTableData();

    const grandTotals = tableData.reduce((acc, row) => ({
        totalGL: acc.totalGL + row.totalGL,
        totalMT: acc.totalMT + row.totalMT,
        totalSelectionWorkers: acc.totalSelectionWorkers + row.totalSelectionWorkers,
        hrWorkers: acc.hrWorkers + row.hrWorkers,
        selectionCost: acc.selectionCost + row.selectionCost,
        handRollingCost: acc.handRollingCost + row.handRollingCost,
        totalDryerUnits: acc.totalDryerUnits + row.totalDryerUnits,
        rPoints: acc.rPoints + row.rPoints,
        dryerCost: acc.dryerCost + row.dryerCost,
        rollerCost: acc.rollerCost + row.rollerCost,
        totalElectricityCost: acc.totalElectricityCost + row.totalElectricityCost
    }), {
        totalGL: 0, totalMT: 0, totalSelectionWorkers: 0, hrWorkers: 0,
        selectionCost: 0, handRollingCost: 0, totalDryerUnits: 0, rPoints: 0,
        dryerCost: 0, rollerCost: 0, totalElectricityCost: 0
    });

    const handleSaveToDatabase = async () => {
        if (isViewer) {
            toast.error("Viewers are not allowed to save data.");
            return false;
        }
        setIsSaving(true);
        const toastId = toast.loading("Saving summary...");
        try {
            const token = localStorage.getItem('token');
            const payload = { reportMonth: filterMonth, labourRate: Number(labourRate), electricityRate: Number(electricityRate), teaSummaries: tableData, grandTotals: grandTotals };
            const response = await fetch(`${BACKEND_URL}/api/production-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to save");
            toast.success("Summary Saved Successfully!", { id: toastId });
            setIsSaved(true); 
            return true;
        } catch (error) {
            toast.error("Error saving summary", { id: toastId });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const getPdfData = () => {
        const rows = tableData.map(row => [
            row.type, row.totalGL.toFixed(2), row.totalMT.toFixed(3), 
            row.totalSelectionWorkers.toString(), row.hrWorkers.toString(), 
            row.selectionCost.toLocaleString(), row.handRollingCost.toLocaleString(),
            row.totalDryerUnits.toString(), row.rPoints.toString(), 
            row.dryerCost.toLocaleString(), row.rollerCost.toLocaleString(), 
            row.totalElectricityCost.toLocaleString()
        ]);
        rows.push(["GRAND TOTAL", grandTotals.totalGL.toFixed(2), grandTotals.totalMT.toFixed(3), grandTotals.totalSelectionWorkers.toString(), grandTotals.hrWorkers.toString(), grandTotals.selectionCost.toLocaleString(), grandTotals.handRollingCost.toLocaleString(), grandTotals.totalDryerUnits.toString(), grandTotals.rPoints.toString(), grandTotals.dryerCost.toLocaleString(), grandTotals.rollerCost.toLocaleString(), grandTotals.totalElectricityCost.toLocaleString()]);
        return rows;
    };

    const pdfHeaders = ["Type of Tea", "G/L (kg)", "M/T (kg)", "Sel. Workers", "H/R Workers", "Sel. Cost", "H/R Cost", "Dryer Pts", "Roller Pts", "Dryer Cost", "Roller Cost", "Total Cost"];

    const getCurrentMonthCode = () => {
        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `HT/PS/${month}.${year}`; 
    };

    const uniqueCode = getCurrentMonthCode();
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
    <div className="p-3 sm:p-5 md:p-8 max-w-[1400px] mx-auto font-sans relative">
        
        {/* --- UNSAVED ALERT MODAL --- */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-sm sm:max-w-md w-[90vw] transition-colors p-5 sm:p-6">
                <AlertDialogHeader>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 sm:mb-4 border border-orange-200 dark:border-orange-800/50">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <AlertDialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Save Before Downloading</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        Unsaved changes detected. Please save to database before generating the PDF.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-5 sm:mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
                    <AlertDialogCancel className="w-full sm:w-auto border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg font-semibold px-4 sm:px-6 py-2.5 mt-0 transition-colors">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={async () => { if(await handleSaveToDatabase()) setShowUnsavedDialog(false); }} 
                        className="w-full sm:w-auto bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg px-4 sm:px-6 py-2.5 font-semibold shadow-sm transition-colors"
                    >
                        Save & Download
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md -mt-3 -mx-3 pt-4 pb-3 px-3 sm:-mt-5 sm:-mx-5 sm:pt-6 sm:pb-4 sm:px-5 md:-mt-8 md:-mx-8 md:pt-8 md:pb-4 md:px-8 mb-5 sm:mb-8 border-b border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col min-[850px]:flex-row justify-between items-start min-[850px]:items-center gap-4 transition-colors duration-300">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1B6A31] dark:text-[#8CC63F] flex items-center gap-2">
                    <Calculator className="w-6 h-6 sm:w-7 sm:h-7" /> Production Summary
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Monthly analysis and cost calculations</p>
            </div>
            
            <div className="flex flex-col min-[450px]:flex-row flex-wrap gap-2 sm:gap-3 w-full min-[850px]:w-auto justify-stretch min-[850px]:justify-end items-stretch min-[850px]:items-center">
                <button 
                    onClick={() => fetchAllData(false)} 
                    disabled={loading} 
                    className="flex-1 min-[850px]:flex-none justify-center px-3 sm:px-5 py-2 sm:py-2.5 bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 hover:bg-[#F8FAF8] dark:hover:bg-zinc-800"
                >
                    <RefreshCw className={`w-4 h-4 sm:w-[16px] sm:h-[16px] ${loading ? 'animate-spin' : ''}`} /> Sync Data
                </button>
                
                <button 
                    onClick={handleSaveToDatabase} 
                    disabled={isSaving || isSaved || tableData.length === 0 || isViewer} 
                    className={`flex-1 min-[850px]:flex-none justify-center px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 ${(isSaved || tableData.length === 0 || isViewer) ? 'bg-gray-400 dark:bg-zinc-700 dark:text-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                    {isViewer ? <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]"/> : <Save className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />} 
                    {isViewer ? "View Only" : isSaving ? "Saving..." : (isSaved && tableData.length > 0) ? "Saved" : "Save to DB"}
                </button>
                
                {(!isSaved && !isViewer) ? (
                    <button 
                        onClick={() => setShowUnsavedDialog(true)} 
                        disabled={tableData.length === 0} 
                        className={`w-full min-[450px]:w-auto justify-center px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 ${tableData.length === 0 ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <FileDown className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Download PDF
                    </button>
                ) : (
                    <div className="w-full min-[450px]:w-auto">
                        <PDFDownloader 
                            title="Production Summary" 
                            subtitle={`Month: ${filterMonth} | Selected Types: ${selectedTeaTypes.join(', ')}`} 
                            headers={pdfHeaders} 
                            data={getPdfData()} 
                            uniqueCode={uniqueCode} 
                            fileName={`Production_Summary_${filterMonth}.pdf`} 
                            orientation="landscape" 
                            disabled={tableData.length === 0} 
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2 sm:py-2.5" 
                        />
                    </div>
                )}
            </div>
        </div>

        {/* VIEWER BANNER */}
        {isViewer && (
            <div className="mb-5 sm:mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg flex items-start sm:items-center gap-2.5 sm:gap-3 transition-colors">
                <Info className="w-5 h-5 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-xs sm:text-sm font-medium">Viewer Mode: You can only view and export reports.</p>
            </div>
        )}

        {/* CONFIG CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-5 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/20 dark:to-zinc-900 p-4 sm:p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-lg relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wider">Select Report Month</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                    <input 
                        type="month" 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)} 
                        className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-400 bg-white dark:bg-zinc-950 dark:text-white shadow-sm transition-colors" 
                    />
                    <button 
                        onClick={handleLoadMonthDataClick} 
                        className="whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors flex justify-center items-center gap-1.5 sm:gap-2 shadow-sm"
                    >
                        <Filter className="w-4 h-4 sm:w-4 sm:h-4" /> Load
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-900/20 dark:to-zinc-900 p-4 sm:p-6 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-lg relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                <h3 className="text-xs sm:text-sm font-extrabold text-orange-700 dark:text-orange-500 flex items-center gap-1.5 sm:gap-2 uppercase mb-3 sm:mb-4 tracking-wider">
                    <Settings2 className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]"/> Global Rates (LKR)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Labour Rate</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 sm:top-3 text-gray-400 dark:text-gray-500 text-xs sm:text-sm font-bold">Rs.</span>
                            <input 
                                type="number" 
                                onWheel={(e) => e.target.blur()} 
                                value={labourRate} 
                                onChange={handleLabourRateChange} 
                                disabled={isViewer} 
                                className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 sm:p-3 pl-9 sm:pl-10 text-xs sm:text-sm font-bold text-gray-800 dark:text-white bg-white dark:bg-zinc-950 disabled:bg-gray-100 dark:disabled:bg-zinc-800 transition-colors" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Elec. Rate</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 sm:top-3 text-gray-400 dark:text-gray-500 text-xs sm:text-sm font-bold">Rs.</span>
                            <input 
                                type="number" 
                                onWheel={(e) => e.target.blur()} 
                                value={electricityRate} 
                                onChange={handleElectricityRateChange} 
                                disabled={isViewer} 
                                className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 sm:p-3 pl-9 sm:pl-10 text-xs sm:text-sm font-bold text-gray-800 dark:text-white bg-white dark:bg-zinc-950 disabled:bg-gray-100 dark:disabled:bg-zinc-800 transition-colors" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TEA TYPE FILTERS */}
        <div className="bg-gradient-to-br from-green-50/50 to-white dark:from-green-900/20 dark:to-zinc-900 p-4 sm:p-6 rounded-xl border border-green-200 dark:border-green-900/50 shadow-lg mb-6 sm:mb-8 relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31]"></div>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0'>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#1B6A31] dark:text-[#8CC63F] flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
                    <Leaf className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]"/> Filter Tea Types
                </h3>
                <button 
                    onClick={handleSelectAll} 
                    className="text-[10px] sm:text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-green-200 dark:border-green-800/50 text-[#1B6A31] dark:text-[#8CC63F] rounded-lg hover:bg-green-50 dark:hover:bg-zinc-700 transition-all shadow-sm w-full sm:w-auto justify-center"
                >
                    {selectedTeaTypes.length === teaOptions.length ? <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> : <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>} Select All
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {teaOptions.map(type => (
                    <button 
                        key={type} 
                        onClick={() => toggleTeaType(type)} 
                        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-xl border-2 transition-all duration-200 ${selectedTeaTypes.includes(type) ? 'bg-[#1B6A31] dark:bg-[#8CC63F] border-[#1B6A31] dark:border-[#8CC63F] text-white dark:text-zinc-900 shadow-md' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:border-[#8CC63F] hover:text-[#1B6A31] dark:hover:text-[#8CC63F]'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        {/* DATA TABLE */}
        <div className={`bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden mb-8 sm:mb-12 min-h-[300px] border transition-colors ${isViewer ? 'border-gray-200 dark:border-zinc-800 opacity-95' : 'border-gray-200 dark:border-zinc-800'}`}>
            <div className="bg-[#1B6A31] dark:bg-[#1B6A31]/80 p-3 sm:p-4 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2 transition-colors">
                <Calculator className="text-white w-4 h-4 sm:w-5 sm:h-5"/>
                <h3 className="text-base sm:text-lg font-bold text-white">Production Summary Board</h3>
            </div>
            
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 w-full p-0 sm:p-4">
                <table className="w-full border-collapse min-w-[800px] lg:min-w-max">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#1a1a1a] dark:text-gray-200 bg-[#f9f9f9] dark:bg-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center transition-colors">Tea Type</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2e6b3b] dark:text-green-400 bg-[#f4f9f4] dark:bg-green-900/20 text-center transition-colors">G/L (kg)</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2e6b3b] dark:text-green-400 bg-[#f4f9f4] dark:bg-green-900/20 text-center transition-colors">M/T (kg)</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2858b4] dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/20 text-center transition-colors">Sel. Lab</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2858b4] dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/20 text-center transition-colors">H/R Lab</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2858b4] dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/20 text-center transition-colors">Sel. Cost</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2858b4] dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/20 text-center transition-colors">H/R Cost</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#d66b2d] dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/20 text-center transition-colors">Dry. Units</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#d66b2d] dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/20 text-center transition-colors">Rol. Units</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#d66b2d] dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/20 text-center transition-colors">Dry. Cost</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#d66b2d] dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/20 text-center transition-colors">Rol. Cost</th>
                            <th className="px-2 sm:px-3 py-3 sm:py-4 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#b81d1d] dark:text-red-400 bg-[#fcedec] dark:bg-red-900/20 text-center transition-colors">Total Elec</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length > 0 ? (
                            tableData.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="sticky left-0 z-10 p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-[#2e6b3b] dark:text-green-400 bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-left pl-3 sm:pl-4 transition-colors whitespace-nowrap">{row.type}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-700 dark:text-gray-300 bg-green-50/20 dark:bg-green-900/10 transition-colors">{row.totalGL.toFixed(2)}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-700 dark:text-gray-300 bg-green-50/20 dark:bg-green-900/10 transition-colors">{row.totalMT.toFixed(3)}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10 transition-colors">{row.totalSelectionWorkers}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-blue-700 dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/10 transition-colors">{row.hrWorkers}</td>
                                    <td className="p-2 sm:p-2.5 text-[9px] sm:text-[11px] font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-600 dark:text-gray-400 transition-colors">{row.selectionCost.toLocaleString()}</td>
                                    <td className="p-2 sm:p-2.5 text-[9px] sm:text-[11px] font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-600 dark:text-gray-400 transition-colors">{row.handRollingCost.toLocaleString()}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-orange-600 dark:text-orange-400 bg-orange-50/20 dark:bg-orange-900/10 transition-colors">{row.totalDryerUnits}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-orange-600 dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/10 transition-colors">{row.rPoints}</td>
                                    <td className="p-2 sm:p-2.5 text-[9px] sm:text-[11px] font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-600 dark:text-gray-400 transition-colors">{row.dryerCost.toLocaleString()}</td>
                                    <td className="p-2 sm:p-2.5 text-[9px] sm:text-[11px] font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-gray-600 dark:text-gray-400 transition-colors">{row.rollerCost.toLocaleString()}</td>
                                    <td className="p-2 sm:p-2.5 text-[10px] sm:text-xs font-black border-b border-r border-gray-200 dark:border-zinc-700 text-center text-[#b81d1d] dark:text-red-400 bg-red-50/30 dark:bg-red-900/20 transition-colors">{row.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="12" className="p-6 sm:p-10 text-center text-gray-400 dark:text-gray-600 text-xs sm:text-sm font-bold italic border-b border-gray-200 dark:border-zinc-700">No types selected for calculation</td></tr>
                        )}
                        {/* GRAND TOTAL ROW */}
                        {tableData.length > 0 && (
                            <tr className="bg-[#fcedec] dark:bg-zinc-800 transition-colors border-t-2 border-gray-300 dark:border-zinc-600">
                                <td className="sticky left-0 z-10 p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-[#1a1a1a] dark:text-gray-200 bg-[#fcedec] dark:bg-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right pr-3 sm:pr-4 border-r border-gray-200 dark:border-zinc-700 whitespace-nowrap">GRAND TOTAL</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.totalGL.toFixed(2)}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.totalMT.toFixed(3)}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-blue-800 dark:text-blue-400 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.totalSelectionWorkers}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-blue-800 dark:text-blue-400 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.hrWorkers}</td>
                                <td className="p-2 sm:p-3 text-[9px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.selectionCost.toLocaleString()}</td>
                                <td className="p-2 sm:p-3 text-[9px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.handRollingCost.toLocaleString()}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-orange-700 dark:text-orange-400 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.totalDryerUnits}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-orange-700 dark:text-orange-400 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.rPoints}</td>
                                <td className="p-2 sm:p-3 text-[9px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.dryerCost.toLocaleString()}</td>
                                <td className="p-2 sm:p-3 text-[9px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.rollerCost.toLocaleString()}</td>
                                <td className="p-2 sm:p-3 text-[11px] sm:text-sm font-black text-[#b81d1d] dark:text-red-400 text-center border-r border-gray-200 dark:border-zinc-700">{grandTotals.totalElectricityCost.toLocaleString()}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
    );
}