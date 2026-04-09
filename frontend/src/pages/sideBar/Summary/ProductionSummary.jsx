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
            if (!isSilent) toast.success(`No saved record. Fresh calculations for ${month}`, { id: toastId });

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
        const toastId = toast.loading("Saving...");
        try {
            const token = localStorage.getItem('token');
            const payload = { reportMonth: filterMonth, labourRate: Number(labourRate), electricityRate: Number(electricityRate), teaSummaries: tableData, grandTotals: grandTotals };
            const response = await fetch(`${BACKEND_URL}/api/production-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to save");
            toast.success("Saved!", { id: toastId });
            setIsSaved(true); 
            return true;
        } catch (error) {
            toast.error("Error saving", { id: toastId });
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

    const pdfHeaders = ["Type of Tea", "G/L (kg)", "M/T (kg)", "Sel. Workers", "H/R Workers", "Sel. Cost", "H/R Cost", "Dryer Pts", "Roller Pts", "Dryer Cost", "Roller Cost", "Total Elec Cost"];

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative">
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4 border border-orange-200"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900">Save Before Downloading</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 text-base">Unsaved changes detected. Please save to continue.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-semibold mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { if(await handleSaveToDatabase()) setShowUnsavedDialog(false); }} className="bg-[#1B6A31] hover:bg-green-800 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors">Save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center gap-2"><Calculator size={28} /> Production Summary</h2>
                    <p className="text-gray-500 mt-1 font-medium">Export monthly analysis</p>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
                    <button onClick={() => fetchAllData(false)} disabled={loading} className="px-5 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 hover:bg-[#F8FAF8]"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Data</button>
                    <button onClick={handleSaveToDatabase} disabled={isSaving || isSaved || tableData.length === 0 || isViewer} className={`px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${(isSaved || tableData.length === 0 || isViewer) ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}>{isViewer ? <Eye size={18}/> : <Save size={18} />} {isViewer ? "View Only" : isSaving ? "Saving..." : (isSaved && tableData.length > 0) ? "Saved" : "Save to DB"}</button>
                    {(!isSaved && !isViewer) ? (
                        <button onClick={() => setShowUnsavedDialog(true)} disabled={tableData.length === 0} className="px-5 py-2.5 text-white bg-blue-600 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all duration-300"><FileDown size={18} /> Download PDF</button>
                    ) : (
                        <PDFDownloader title="Production Summary" subtitle={`Month: ${filterMonth}`} headers={pdfHeaders} data={getPdfData()} fileName={`Production_Summary_${filterMonth}.pdf`} orientation="landscape" disabled={tableData.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white" />
                    )}
                </div>
            </div>

            {isViewer && (<div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3"><Info size={20} /><p className="text-sm font-medium">Viewer Mode: Reports only.</p></div>)}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-xl border border-blue-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Select Report Month</label>
                    <div className="flex gap-3 mt-2"><input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" /><button onClick={handleLoadMonthDataClick} className="whitespace-nowrap px-5 py-3 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"><Filter size={16} /> Load</button></div>
                </div>

                <div className="bg-gradient-to-br from-orange-50/50 to-white p-6 rounded-xl border border-orange-200 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                    <h3 className="text-sm font-extrabold text-orange-700 flex items-center gap-2 uppercase mb-4 tracking-wider"><Settings2 size={18}/> Rates (LKR)</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Labour Rate</label><div className="relative"><span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">Rs.</span><input type="number" onWheel={(e) => e.target.blur()} value={labourRate} onChange={handleLabourRateChange} disabled={isViewer} className="w-full border border-gray-300 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 disabled:bg-gray-100" /></div></div>
                        <div className="flex flex-col gap-1.5"><label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Elec. Rate</label><div className="relative"><span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">Rs.</span><input type="number" onWheel={(e) => e.target.blur()} value={electricityRate} onChange={handleElectricityRateChange} disabled={isViewer} className="w-full border border-gray-300 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 disabled:bg-gray-100" /></div></div>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-green-50/50 to-white p-6 rounded-xl border border-green-200 shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31]"></div>
                <div className='flex justify-between items-center mb-4'><h3 className="text-sm font-extrabold text-[#1B6A31] flex items-center gap-2 uppercase tracking-wider"><Leaf size={18}/> Tea Types Selection</h3><button onClick={handleSelectAll} className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-[#1B6A31] rounded-lg hover:bg-green-50 transition-all">{selectedTeaTypes.length === teaOptions.length ? <CheckSquare size={16}/> : <Square size={16}/>} All</button></div>
                <div className="flex flex-wrap gap-2">{teaOptions.map(type => (<button key={type} onClick={() => toggleTeaType(type)} className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${selectedTeaTypes.includes(type) ? 'bg-[#1B6A31] border-[#1B6A31] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#8CC63F]'}`}>{type}</button>))}</div>
            </div>

            <div className="bg-white rounded-xl shadow-md border overflow-hidden mb-12 min-h-[300px]">
                <div className="bg-[#1B6A31] p-4 text-white font-bold">Calculation Board</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 text-gray-800 text-xs tracking-wider uppercase border-b border-gray-200">
                                <th rowSpan="2" className="px-4 py-4 font-extrabold border-r border-gray-200 align-middle bg-gray-100 w-48 text-center">Type of Tea</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 text-center">Quantity (kg)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 text-center">Labour Requirement</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-900 border-r border-gray-200 bg-blue-100/50 text-center">Labour Cost (Rs.)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-orange-600 border-r border-gray-200 bg-orange-50 text-center">Electricity (points)</th>
                                <th colSpan="3" className="px-4 py-2 font-bold text-orange-900 border-r border-gray-200 bg-orange-100/50 text-center">Electricity Cost (Rs.)</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-600 text-[10px] border-b border-gray-200 text-center">
                                <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 border-r">G/L</th><th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 border-r">M/T</th>
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 border-r">Selection</th><th className="px-3 py-2 font-semibold bg-blue-50/50 border-r">Hand Roll</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 border-r">Selection</th><th className="px-3 py-2 font-semibold bg-blue-100/30 border-r">Hand Roll</th>
                                <th className="px-3 py-2 font-semibold bg-orange-50/50 border-r">Dryer</th><th className="px-3 py-2 font-semibold bg-orange-50/50 border-r">Roller</th>
                                <th className="px-3 py-2 font-semibold bg-orange-100/30 border-r">Dryer</th><th className="px-3 py-2 font-semibold bg-orange-100/30 border-r">Roller</th><th className="px-3 py-2 font-black bg-orange-200/40 text-orange-900">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors group text-center border-b divide-x divide-gray-100">
                                    <td className="px-4 py-4 font-bold text-[#1B6A31] text-left bg-gray-50/50">{row.type}</td>
                                    <td className="px-3 py-4 font-bold text-gray-700">{row.totalGL.toFixed(2)}</td>
                                    <td className="px-3 py-4 font-bold text-gray-700">{row.totalMT.toFixed(3)}</td>
                                    <td className="px-3 py-4 font-bold text-blue-700">{row.totalSelectionWorkers}</td>
                                    <td className="px-2 py-2 bg-blue-50/30"><input type="number" onWheel={(e) => e.target.blur()} value={row.hrWorkers || ''} onChange={(e) => handleManualChange(row.type, 'handRolling', e.target.value)} disabled={isViewer} className="w-16 p-2 border border-blue-300 rounded text-center font-bold text-blue-800 disabled:bg-gray-100" placeholder="0" /></td>
                                    <td className="px-3 py-4">{row.selectionCost.toLocaleString()}</td>
                                    <td className="px-3 py-4">{row.handRollingCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 font-bold text-orange-600">{row.totalDryerUnits}</td>
                                    <td className="px-2 py-2 bg-orange-50/30"><input type="number" onWheel={(e) => e.target.blur()} value={row.rPoints || ''} onChange={(e) => handleManualChange(row.type, 'roller', e.target.value)} disabled={isViewer} className="w-16 p-2 border border-orange-300 rounded text-center font-bold text-orange-800 disabled:bg-gray-100" placeholder="0" /></td>
                                    <td className="px-3 py-4">{row.dryerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4">{row.rollerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 font-black text-red-600 bg-red-50/30">{row.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-black text-center shadow-inner">
                            <tr className="divide-x divide-gray-200">
                                <td className="px-4 py-5 text-right uppercase tracking-wider text-xs">Grand Total</td>
                                <td className="px-3 py-5 text-[#1B6A31]">{grandTotals.totalGL.toFixed(2)}</td>
                                <td className="px-3 py-5 text-[#1B6A31]">{grandTotals.totalMT.toFixed(3)}</td>
                                <td className="px-3 py-5 text-blue-800">{grandTotals.totalSelectionWorkers}</td>
                                <td className="px-3 py-5 text-blue-800">{grandTotals.hrWorkers}</td>
                                <td className="px-3 py-5">{grandTotals.selectionCost.toLocaleString()}</td>
                                <td className="px-3 py-5">{grandTotals.handRollingCost.toLocaleString()}</td>
                                <td className="px-3 py-5 text-orange-700">{grandTotals.totalDryerUnits}</td>
                                <td className="px-3 py-5 text-orange-700">{grandTotals.rPoints}</td>
                                <td className="px-3 py-5">{grandTotals.dryerCost.toLocaleString()}</td>
                                <td className="px-3 py-5">{grandTotals.rollerCost.toLocaleString()}</td>
                                <td className="px-3 py-5 text-red-700 text-xl bg-red-100/50">{grandTotals.totalElectricityCost.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}