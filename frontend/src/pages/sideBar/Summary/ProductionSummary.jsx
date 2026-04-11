import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calculator, Calendar, Leaf, Zap, Users, Settings2, RefreshCw, CheckSquare, Square, Save, AlertTriangle, Filter, Info, Eye, FileDown } from "lucide-react";
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
    const [electricityRate, setElectricityRate] = useState(10);

    const [manualInputs, setManualInputs] = useState({});

    const teaOptions = [
        "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
        "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
        "Flower", "Chakra"
    ];

    useEffect(() => {
        setIsSaved(false);
    }, [manualInputs, labourRate, electricityRate, selectedTeaTypes]);

    useEffect(() => {
        fetchAllData(true); 
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

                return {
                    date: dateStr,
                    teaType: prod.teaType || 'Unknown',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    workerCount: lab ? lab.workerCount : 0,
                    meterStart: mStart, 
                    meterEnd: mEnd,     
                    dryerUnits: calculatedUnits
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
                    setElectricityRate(savedSummary.electricityRate);

                    const newManualInputs = {};
                    const activeTypes = [];

                    savedSummary.teaSummaries.forEach(tea => {
                        activeTypes.push(tea.type);
                        newManualInputs[tea.type] = {
                            handRolling: tea.hrWorkers,
                            roller: tea.rPoints
                        };
                    });

                    setSelectedTeaTypes(activeTypes);
                    setManualInputs(newManualInputs);
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
        setManualInputs({}); 
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

    const handleManualChange = (type, field, value) => {
        setManualInputs(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: Number(value) || 0 }
        }));
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

    const generateTableData = () => {
        if (selectedTeaTypes.length === 0) return []; 

        const dateFiltered = records.filter(r => r.date.startsWith(filterMonth));

        return selectedTeaTypes.map(type => {
            const relevantRecords = dateFiltered.filter(r => r.teaType === type);
            const totalGL = relevantRecords.reduce((sum, r) => sum + Number(r.selectedWeight || 0), 0);
            const totalSelectionWorkers = relevantRecords.reduce((sum, r) => sum + Number(r.workerCount || 0), 0);
            const totalMT = relevantRecords.reduce((sum, r) => sum + Number(r.madeTeaWeight || 0), 0);

            const uniqueDryerRecords = [];
            relevantRecords.forEach(r => {
                const isDuplicate = uniqueDryerRecords.some(ud => ud.date === r.date && ud.meterStart === r.meterStart && ud.meterEnd === r.meterEnd);
                if (!isDuplicate) uniqueDryerRecords.push(r);
            });
            const totalDryerUnits = uniqueDryerRecords.reduce((sum, r) => sum + Number(r.dryerUnits || 0), 0);

            const hrWorkers = manualInputs[type]?.handRolling || 0;
            const rPoints = manualInputs[type]?.roller || 0;

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
        return `HT/PS/${month}.${year}`; // Result: HT/PS/APRIL.2026
    };

    const uniqueCode = getCurrentMonthCode();
    
    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative">
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4 border border-orange-200"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900">Save Before Downloading</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 text-base">Unsaved changes detected. Please save to database before generating the PDF.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-semibold mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { if(await handleSaveToDatabase()) setShowUnsavedDialog(false); }} className="bg-[#1B6A31] hover:bg-green-800 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors">Save & Download</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* STICKY HEADER */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center gap-2"><Calculator size={28} /> Production Summary</h2>
                    <p className="text-gray-500 mt-1 font-medium">Monthly analysis and cost calculations</p>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
                    <button onClick={() => fetchAllData(false)} disabled={loading} className="px-5 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 hover:bg-[#F8FAF8]"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Data</button>
                    <button onClick={handleSaveToDatabase} disabled={isSaving || isSaved || tableData.length === 0 || isViewer} className={`px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${(isSaved || tableData.length === 0 || isViewer) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}>{isViewer ? <Eye size={18}/> : <Save size={18} />} {isViewer ? "View Only" : isSaving ? "Saving..." : (isSaved && tableData.length > 0) ? "Saved" : "Save to DB"}</button>
                    {(!isSaved && !isViewer) ? (
                        <button onClick={() => setShowUnsavedDialog(true)} disabled={tableData.length === 0} className="px-5 py-2.5 text-white bg-blue-600 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all duration-300"><FileDown size={18} /> Download PDF</button>
                    ) : (
                        <PDFDownloader title="Production Summary" subtitle={`Month: ${filterMonth} | Selected Types: ${selectedTeaTypes.join(', ')}`} headers={pdfHeaders} data={getPdfData()} uniqueCode={uniqueCode} fileName={`Production_Summary_${filterMonth}.pdf`} orientation="landscape" disabled={tableData.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white" />
                    )}
                </div>
            </div>

            {isViewer && (<div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3"><Info size={20} /><p className="text-sm font-medium">Viewer Mode: You can only view and export reports.</p></div>)}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-xl border border-blue-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Select Report Month</label>
                    <div className="flex gap-3 mt-2"><input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" /><button onClick={handleLoadMonthDataClick} className="whitespace-nowrap px-5 py-3 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"><Filter size={16} /> Load</button></div>
                </div>

                <div className="bg-gradient-to-br from-orange-50/50 to-white p-6 rounded-xl border border-orange-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                    <h3 className="text-sm font-extrabold text-orange-700 flex items-center gap-2 uppercase mb-4 tracking-wider"><Settings2 size={18}/> Global Rates (LKR)</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Labour Rate</label><div className="relative"><span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">Rs.</span><input type="number" onWheel={(e) => e.target.blur()} value={labourRate} onChange={handleLabourRateChange} disabled={isViewer} className="w-full border border-gray-300 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 disabled:bg-gray-100" /></div></div>
                        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Elec. Rate</label><div className="relative"><span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">Rs.</span><input type="number" onWheel={(e) => e.target.blur()} value={electricityRate} onChange={handleElectricityRateChange} disabled={isViewer} className="w-full border border-gray-300 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 disabled:bg-gray-100" /></div></div>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-green-50/50 to-white p-6 rounded-xl border border-green-200 shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31]"></div>
                <div className='flex justify-between items-center mb-4'><h3 className="text-sm font-extrabold text-[#1B6A31] flex items-center gap-2 uppercase tracking-wider"><Leaf size={18}/> Filter Tea Types</h3><button onClick={handleSelectAll} className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-[#1B6A31] rounded-lg hover:bg-green-50 transition-all shadow-sm">{selectedTeaTypes.length === teaOptions.length ? <CheckSquare size={16}/> : <Square size={16}/>} Select All</button></div>
                <div className="flex flex-wrap gap-2">{teaOptions.map(type => (<button key={type} onClick={() => toggleTeaType(type)} className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${selectedTeaTypes.includes(type) ? 'bg-[#1B6A31] border-[#1B6A31] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#8CC63F] hover:text-[#1B6A31]'}`}>{type}</button>))}</div>
            </div>

            {/* SELLING DETAILS STYLE TABLE */}
            <div className={`bg-white rounded-xl shadow-md overflow-hidden mb-12 min-h-[300px] border ${isViewer ? 'border-gray-200 opacity-95' : 'border-gray-200'}`}>
                <div className="bg-[#1B6A31] p-4 border-b border-gray-200 flex items-center gap-2">
                    <Calculator className="text-white" size={20}/>
                    <h3 className="text-lg font-bold text-white">Production Summary Board</h3>
                </div>
                
                <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#1a1a1a] bg-[#f9f9f9] text-center">Tea Type</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2e6b3b] bg-[#f4f9f4] text-center">G/L (kg)</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2e6b3b] bg-[#f4f9f4] text-center">M/T (kg)</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2858b4] bg-[#f0f5fd] text-center">Sel. Lab</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2858b4] bg-[#f0f5fd] text-center">H/R Lab</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2858b4] bg-[#f0f5fd] text-center">Sel. Cost</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2858b4] bg-[#f0f5fd] text-center">H/R Cost</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#d66b2d] bg-[#fdf7f2] text-center">Dry. Units</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#d66b2d] bg-[#fdf7f2] text-center">Rol. Units</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#d66b2d] bg-[#fdf7f2] text-center">Dry. Cost</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#d66b2d] bg-[#fdf7f2] text-center">Rol. Cost</th>
                                <th className="px-3 py-4 font-extrabold text-[10px] tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#b81d1d] bg-[#fcedec] text-center">Total Elec</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.length > 0 ? (
                                tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-[#2e6b3b] text-left pl-4">{row.type}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center text-gray-700 bg-green-50/20">{row.totalGL.toFixed(2)}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center text-gray-700 bg-green-50/20">{row.totalMT.toFixed(3)}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center text-blue-700 bg-blue-50/20">{row.totalSelectionWorkers}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center bg-[#f0f5fd]">
                                            <input type="number" onWheel={(e) => e.target.blur()} value={row.hrWorkers || ''} onChange={(e) => handleManualChange(row.type, 'handRolling', e.target.value)} disabled={isViewer} className="w-full p-1 border border-blue-300 rounded text-center font-bold text-blue-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-inner bg-white disabled:bg-gray-50" placeholder="0" />
                                        </td>
                                        <td className="p-2 text-[11px] font-bold border-b border-r border-gray-200 text-center text-gray-600">{row.selectionCost.toLocaleString()}</td>
                                        <td className="p-2 text-[11px] font-bold border-b border-r border-gray-200 text-center text-gray-600">{row.handRollingCost.toLocaleString()}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center text-orange-600 bg-orange-50/20">{row.totalDryerUnits}</td>
                                        <td className="p-2 text-xs font-bold border-b border-r border-gray-200 text-center bg-[#fdf7f2]">
                                            <input type="number" onWheel={(e) => e.target.blur()} value={row.rPoints || ''} onChange={(e) => handleManualChange(row.type, 'roller', e.target.value)} disabled={isViewer} className="w-full p-1 border border-orange-300 rounded text-center font-bold text-orange-800 outline-none focus:ring-1 focus:ring-orange-500 shadow-inner bg-white disabled:bg-gray-50" placeholder="0" />
                                        </td>
                                        <td className="p-2 text-[11px] font-bold border-b border-r border-gray-200 text-center text-gray-600">{row.dryerCost.toLocaleString()}</td>
                                        <td className="p-2 text-[11px] font-bold border-b border-r border-gray-200 text-center text-gray-600">{row.rollerCost.toLocaleString()}</td>
                                        <td className="p-2 text-xs font-black border-b border-r border-gray-200 text-center text-[#b81d1d] bg-red-50/30">{row.totalElectricityCost.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="12" className="p-10 text-center text-gray-400 font-bold italic">No types selected for calculation</td></tr>
                            )}
                            {/* GRAND TOTAL ROW */}
                            {tableData.length > 0 && (
                                <tr className="bg-[#fcedec]">
                                    <td className="p-3 text-xs font-bold text-[#1a1a1a] text-right pr-4 border-r border-gray-200">GRAND TOTAL</td>
                                    <td className="p-3 text-xs font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.totalGL.toFixed(2)}</td>
                                    <td className="p-3 text-xs font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.totalMT.toFixed(3)}</td>
                                    <td className="p-3 text-xs font-bold text-blue-800 text-center border-r border-gray-200">{grandTotals.totalSelectionWorkers}</td>
                                    <td className="p-3 text-xs font-bold text-blue-800 text-center border-r border-gray-200">{grandTotals.hrWorkers}</td>
                                    <td className="p-3 text-[11px] font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.selectionCost.toLocaleString()}</td>
                                    <td className="p-3 text-[11px] font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.handRollingCost.toLocaleString()}</td>
                                    <td className="p-3 text-xs font-bold text-orange-700 text-center border-r border-gray-200">{grandTotals.totalDryerUnits}</td>
                                    <td className="p-3 text-xs font-bold text-orange-700 text-center border-r border-gray-200">{grandTotals.rPoints}</td>
                                    <td className="p-3 text-[11px] font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.dryerCost.toLocaleString()}</td>
                                    <td className="p-3 text-[11px] font-bold text-gray-800 text-center border-r border-gray-200">{grandTotals.rollerCost.toLocaleString()}</td>
                                    <td className="p-3 text-sm font-black text-[#b81d1d] text-center border-r border-gray-200">{grandTotals.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}