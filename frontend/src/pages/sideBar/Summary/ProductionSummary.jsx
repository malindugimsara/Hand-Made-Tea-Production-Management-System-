import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calculator, Calendar, Leaf, Zap, Users, Settings2, FileDown, RefreshCw, CheckSquare, Square, Save, AlertTriangle, Filter, Info, Eye } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

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

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer';

    // Saving & Dialog States
    const [isSaved, setIsSaved] = useState(true); 
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    // Filters
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); 
    const [selectedTeaTypes, setSelectedTeaTypes] = useState([]); 

    // Rates
    const [labourRate, setLabourRate] = useState(1350);
    const [electricityRate, setElectricityRate] = useState(10);

    // Manual Inputs
    const [manualInputs, setManualInputs] = useState({});

    const teaOptions = [
        "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
        "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
        "Flower", "Chakra"
    ];

    // Load Data on Mount & Month Change
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
        if (!isSilent) toastId = toast.loading(`Loading data for ${month}...`);

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const summaryRes = await fetch(`${BACKEND_URL}/api/production-summary`, { headers: authHeaders });
            
            if (summaryRes.ok) {
                const summaries = await summaryRes.json();
                const savedSummary = summaries.find(s => s.reportMonth === month);

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
                    setIsSaved(true); 
                    if (!isSilent) toast.success(`Loaded saved summary for ${month}!`, { id: toastId });
                    return; 
                }
            }

            autoSelectActiveTeaTypes(availableRecords, month);
            if (!isSilent) toast.success(`Generated new calculations for ${month}`, { id: toastId });

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

        let activeTypes = Object.keys(glTotals).filter(type => glTotals[type] > 0);
        
        if (activeTypes.length === 0) {
            activeTypes = [...teaOptions];
        }

        setSelectedTeaTypes(activeTypes);
        setManualInputs({}); 
        setIsSaved(false); 
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
        if (selectedTeaTypes.length === teaOptions.length) {
            setSelectedTeaTypes([]); 
        } else {
            setSelectedTeaTypes([...teaOptions]); 
        }
        setIsSaved(false);
    };

    const handleManualChange = (type, field, value) => {
        if (Number(value) < 0) return; 
        
        setManualInputs(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: Number(value) || 0
            }
        }));
        setIsSaved(false);
    };

    const handleLabourRateChange = (e) => {
        const val = e.target.value;
        if (Number(val) < 0) return; 
        
        setLabourRate(val.replace(/^0+(?=\d)/, ''));
        setIsSaved(false);
    };

    const handleElectricityRateChange = (e) => {
        const val = e.target.value;
        if (Number(val) < 0) return; 
        
        setElectricityRate(val.replace(/^0+(?=\d)/, ''));
        setIsSaved(false);
    };

    const generateTableData = () => {
        if (selectedTeaTypes.length === 0) return []; 

        let dateFiltered = records;
        if (filterMonth) {
            dateFiltered = dateFiltered.filter(r => r.date.startsWith(filterMonth));
        }

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

        if (tableData.length === 0) {
            toast.error("No production data to save!");
            return false;
        }

        setIsSaving(true);
        const toastId = toast.loading("Saving summary to database...");

        try {
            const token = localStorage.getItem('token');
            const payload = {
                reportMonth: filterMonth,
                labourRate: Number(labourRate),
                electricityRate: Number(electricityRate),
                teaSummaries: tableData,
                grandTotals: grandTotals
            };

            const response = await fetch(`${BACKEND_URL}/api/production-summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error("Access Denied. Admins/Officers only.");
                throw new Error("Failed to save to database");
            }

            toast.success("Summary saved successfully!", { id: toastId });
            setIsSaved(true); 
            return true;
        } catch (error) {
            toast.error(error.message || "Network error.", { id: toastId });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = async () => {
        if (tableData.length === 0) {
            toast.error("No data available to download.");
            return;
        }

        const doc = new jsPDF('landscape'); 
        try {
            const res = await fetch("/logo.png");
            if (res.ok) {
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(dataUrl, "PNG", 14, 10, 30, 30); 
            }
        } catch (err) {}
        
        doc.setFontSize(20);
        doc.setTextColor(27, 106, 49); 
        doc.text("Hand Made Tea Factory - Production Summary", 50, 18);
        
        doc.setFontSize(11);
        doc.setTextColor(100);

        const dateObj = new Date(`${filterMonth}-01`);
        const dateFilterText = `Month: ${dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        
        doc.text(dateFilterText, 50, 25);
        doc.text(`Selected Tea Types: ${selectedTeaTypes.join(', ')}`, 50, 31);
        doc.text(`Rates -> Labour: Rs. ${labourRate} | Electricity: Rs. ${electricityRate}`, 50, 37);

        const tableHead = [
            [
                { content: "Type of Tea", rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [27, 106, 49] } },
                { content: "Quantity (kg)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Labour Requirement", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Labour Cost (Rs.)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Electricity (pts)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Electricity Cost (Rs.)", colSpan: 3, styles: { halign: 'center', fillColor: [27, 106, 49] } }
            ],
            [
                { content: "G/L", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "M/T", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Selection", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Hand Roll", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Selection", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Hand Roll", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Dryer", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Roller", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Dryer", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Roller", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Total Cost", styles: { halign: 'center', fillColor: [40, 130, 60] } }
            ]
        ];
        
        const tableRows = tableData.map(row => [
            row.type, row.totalGL.toFixed(2), row.totalMT.toFixed(3), row.totalSelectionWorkers.toString(),
            row.hrWorkers.toString(), row.selectionCost.toLocaleString(), row.handRollingCost.toLocaleString(),
            row.totalDryerUnits.toString(), row.rPoints.toString(), row.dryerCost.toLocaleString(),
            row.rollerCost.toLocaleString(), row.totalElectricityCost.toLocaleString()
        ]);

        tableRows.push([
            "GRAND TOTAL", grandTotals.totalGL.toFixed(2), grandTotals.totalMT.toFixed(3),
            grandTotals.totalSelectionWorkers.toString(), grandTotals.hrWorkers.toString(),
            grandTotals.selectionCost.toLocaleString(), grandTotals.handRollingCost.toLocaleString(),
            grandTotals.totalDryerUnits.toString(), grandTotals.rPoints.toString(),
            grandTotals.dryerCost.toLocaleString(), grandTotals.rollerCost.toLocaleString(),
            grandTotals.totalElectricityCost.toLocaleString()
        ]);

        autoTable(doc, {
            startY: 45,
            head: tableHead,
            body: tableRows,
            theme: 'grid',
            headStyles: { textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8, halign: 'center', valign: 'middle' },
            columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' } },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const colIdx = data.column.index;
                    if (colIdx === 1 || colIdx === 2) { data.cell.styles.textColor = [27, 106, 49]; data.cell.styles.fontStyle = 'bold'; } 
                    else if (colIdx === 3 || colIdx === 4) { data.cell.styles.textColor = [29, 78, 216]; data.cell.styles.fontStyle = 'bold'; } 
                    else if (colIdx === 7 || colIdx === 8) { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fontStyle = 'bold'; } 
                    else if (colIdx === 11) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
                    if (data.row.index === tableRows.length - 1) {
                        data.cell.styles.fillColor = [240, 240, 240];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        doc.save(`Production_Summary_${filterMonth}.pdf`);
        toast.success("PDF Downloaded Successfully!");
        setShowUnsavedDialog(false); 
    };

    const handleDownloadClick = () => {
        if (!isSaved && !isViewer) {
            setShowUnsavedDialog(true);
        } else {
            generatePDF();
        }
    };

    const handleSaveAndDownload = async () => {
        const saved = await handleSaveToDatabase();
        if (saved) {
            generatePDF();
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
            
            {/* STRICT UNSAVED DATA ALERT DIALOG */}
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md transition-colors">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 border border-orange-200 dark:border-orange-800/50">
                            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Save Before Downloading</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                            You have unsaved calculations on this board. You must save these records to the database before generating the PDF report to ensure data consistency.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg font-semibold mt-0">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleSaveAndDownload} 
                            className="bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                        >
                            Save & Download
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* --- STICKY HEADER SECTION --- */}
            <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 dark:border-zinc-800 shadow-sm text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center justify-center sm:justify-start gap-2">
                        <Calculator size={28} /> Production Summary
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Calculate costs and export PDF reports</p>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
                    <button 
                        onClick={() => { fetchAllData(false); toast.success("Data re-synced with server."); }}
                        disabled={loading}
                        className={`px-5 py-2.5 bg-white dark:bg-zinc-950 text-[#1B6A31] dark:text-green-500 border border-[#8CC63F] dark:border-green-800 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-800'}`}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Data
                    </button>
                    
                    <button 
                        onClick={handleSaveToDatabase}
                        disabled={isSaving || isSaved || tableData.length === 0 || isViewer}
                        className={`px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${
                            (isSaved || tableData.length === 0 || isViewer) ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600'
                        }`}
                    >
                        {isViewer ? <Eye size={18}/> : <Save size={18} />} 
                        {isViewer ? "View Only" : isSaving ? "Saving..." : (isSaved && tableData.length > 0) ? "Saved" : "Save to DB"}
                    </button>

                    <button 
                        onClick={handleDownloadClick}
                        disabled={tableData.length === 0}
                        className={`px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${tableData.length === 0 ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                    >
                        <FileDown size={18} /> Download PDF
                    </button>
                </div>
            </div>
            {/* --------------------------- */}

            {/* Viewer Notification Banner */}
            {isViewer && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <Info size={20} />
                    <p className="text-sm font-medium">You are logged in as a <strong className="dark:text-white">Viewer</strong>. You can view data and download reports. Editing and saving are disabled.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 1. Date Filter */}
                <div className="bg-gradient-to-br from-blue-50/50 dark:from-blue-900/10 to-white dark:to-zinc-900 p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-900/5 dark:shadow-none flex flex-col justify-center relative overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 dark:bg-blue-500"></div>
                    
                    <div className="flex justify-between items-center border-b border-blue-100 dark:border-blue-900/30 pb-3 mb-4">
                        <h3 className="text-sm md:text-base font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><Calendar size={18} className="text-blue-700 dark:text-blue-400"/></div>
                            1. Select Report Month
                        </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 relative z-10 items-end">
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">MONTHLY FILTER</label>
                            <input 
                                type="month" 
                                value={filterMonth} 
                                onChange={(e) => setFilterMonth(e.target.value)} 
                                className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 bg-white dark:bg-zinc-950 dark:text-gray-100 shadow-sm transition-colors" 
                            />
                        </div>
                        <button 
                            onClick={handleLoadMonthDataClick}
                            className="w-full sm:w-auto whitespace-nowrap px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Filter size={16} /> Load Month Data
                        </button>
                    </div>
                </div>

                {/* 2. Rate Settings */}
                <div className="bg-gradient-to-br from-orange-50/50 dark:from-orange-900/10 to-white dark:to-zinc-900 p-6 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-lg shadow-orange-900/5 dark:shadow-none h-fit relative overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 dark:bg-orange-600"></div>
                    
                    <div className="flex items-center gap-2 mb-4 border-b border-orange-100 dark:border-orange-900/30 pb-3">
                        <h3 className="text-sm md:text-base font-extrabold text-orange-700 dark:text-orange-400 flex items-center gap-2 uppercase tracking-wider">
                            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg"><Settings2 size={18} className="text-orange-600 dark:text-orange-400"/></div>
                            2. Adjust Rates (LKR) {isViewer && "(Read Only)"}
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Users size={12}/> LABOUR (PER HEAD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-sm font-bold">Rs.</span>
                                <input 
                                    type="number" onWheel={(e) => e.target.blur()} value={labourRate} min="0"
                                    onChange={handleLabourRateChange} 
                                    disabled={isViewer}
                                    className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 bg-white dark:bg-zinc-950 shadow-sm disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Zap size={12}/> ELECTRICITY (PER UNIT)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 text-sm font-bold">Rs.</span>
                                <input 
                                    type="number" onWheel={(e) => e.target.blur()} value={electricityRate} min="0"
                                    onChange={handleElectricityRateChange} 
                                    disabled={isViewer}
                                    className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 bg-white dark:bg-zinc-950 shadow-sm disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TEA TYPE SELECTION */}
            <div className="bg-gradient-to-br from-green-50/50 dark:from-green-900/10 to-white dark:to-zinc-900 p-6 rounded-xl border border-green-200 dark:border-green-900/50 shadow-lg shadow-green-900/5 dark:shadow-none mb-8 relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31] dark:bg-green-600"></div>
                
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-green-100 dark:border-green-900/30 pb-3'>
                    <div>
                        <h3 className="text-sm md:text-base font-extrabold text-[#1B6A31] dark:text-green-500 flex items-center gap-2 uppercase tracking-wider">
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg"><Leaf size={18} className="text-[#1B6A31] dark:text-green-500"/></div>
                            3. Select Tea Types
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">Active types (G/L {'>'} 0) are auto-selected. Click to add/remove.</p>
                    </div>
                    <button 
                        onClick={handleSelectAll}
                        className="text-xs font-bold flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-950 border border-green-200 dark:border-green-800 text-[#1B6A31] dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
                    >
                        {selectedTeaTypes.length === teaOptions.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                        {selectedTeaTypes.length === teaOptions.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2.5">
                    {teaOptions.map(type => (
                        <button
                            key={type}
                            onClick={() => toggleTeaType(type)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${
                                selectedTeaTypes.includes(type) 
                                ? 'bg-[#1B6A31] dark:bg-green-700 border-[#1B6A31] dark:border-green-700 text-white shadow-md shadow-green-900/20 transform scale-105' 
                                : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:border-[#8CC63F] dark:hover:border-green-600 hover:text-[#1B6A31] dark:hover:text-green-400'
                            }`}
                        >
                            {type} {selectedTeaTypes.includes(type) && '✓'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Table */}
            <div className={`bg-white dark:bg-zinc-900 rounded-xl shadow-md border overflow-hidden mb-12 min-h-[300px] transition-colors duration-300 ${isViewer ? 'border-gray-200 dark:border-zinc-800 opacity-95' : 'border-gray-200 dark:border-zinc-800'}`}>
                <div className="bg-[#1B6A31] dark:bg-green-800 p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-2">
                    <Leaf className="text-white" size={20}/>
                    <h3 className="text-lg font-bold text-white">Calculation Board</h3>
                </div>
                
                {tableData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-zinc-700 shadow-sm">
                            <Leaf size={30} className="text-gray-300 dark:text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Tea Types Selected</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">
                            Load a month with production data using the filters above, or manually select tea types to begin calculations.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-800 dark:text-gray-200 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                    <th rowSpan="2" className="px-4 py-4 font-extrabold border-r border-gray-200 dark:border-zinc-800 align-middle bg-gray-100 dark:bg-zinc-800/50 w-48 text-center">Type of Tea</th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-[#8CC63F]/10 dark:bg-green-900/20 text-center">Quantity (kg)</th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-900/20 text-center">Labour Requirement</th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-blue-900 dark:text-blue-300 border-r border-gray-200 dark:border-zinc-800 bg-blue-100/50 dark:bg-blue-800/30 text-center">Labour Cost (Rs.)</th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-orange-600 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/20 text-center">Electricity (points)</th>
                                    <th colSpan="3" className="px-4 py-2 font-bold text-orange-900 dark:text-orange-400 border-r border-gray-200 dark:border-zinc-800 bg-orange-100/50 dark:bg-orange-900/40 text-center">Electricity Cost (Rs.)</th>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-600 dark:text-gray-400 text-xs border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                    <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 dark:bg-green-900/10 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-24">G/L</th>
                                    <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 dark:bg-green-900/10 text-center border-r border-gray-200 dark:border-zinc-800 w-24">M/T</th>
                                    
                                    <th className="px-3 py-2 font-semibold bg-blue-50/50 dark:bg-blue-900/10 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-24">Selection</th>
                                    <th className="px-3 py-2 font-semibold bg-blue-50/50 dark:bg-blue-900/10 text-center border-r border-gray-200 dark:border-zinc-800 w-32">Hand Roll</th>
                                    
                                    <th className="px-3 py-2 font-semibold bg-blue-100/30 dark:bg-blue-800/20 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-28">Selection</th>
                                    <th className="px-3 py-2 font-semibold bg-blue-100/30 dark:bg-blue-800/20 text-center border-r border-gray-200 dark:border-zinc-800 w-28">Hand Roll</th>
                                    
                                    <th className="px-3 py-2 font-semibold bg-orange-50/50 dark:bg-orange-950/10 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-24">Dryer</th>
                                    <th className="px-3 py-2 font-semibold bg-orange-50/50 dark:bg-orange-950/10 text-center border-r border-gray-200 dark:border-zinc-800 w-28">Roller</th>
                                    
                                    <th className="px-3 py-2 font-semibold bg-orange-100/30 dark:bg-orange-900/20 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-28">Dryer</th>
                                    <th className="px-3 py-2 font-semibold bg-orange-100/30 dark:bg-orange-900/20 text-center border-r border-gray-200/60 dark:border-zinc-800/60 w-28">Roller</th>
                                    <th className="px-3 py-2 font-black bg-orange-200/40 dark:bg-orange-800/40 text-center text-orange-900 dark:text-orange-300 w-32">Total Cost</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {tableData.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group text-center">
                                        <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-[#1B6A31] dark:text-green-500 bg-gray-50/50 dark:bg-zinc-900/50 whitespace-normal">{row.type}</td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.totalGL.toFixed(2)}</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.totalMT.toFixed(3)}</td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-blue-700 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-900/10">{row.totalSelectionWorkers}</td>
                                        <td className="px-2 py-2 border-r border-gray-200 dark:border-zinc-800 bg-blue-50/30 dark:bg-blue-900/20">
                                            <input 
                                                type="number" onWheel={(e) => e.target.blur()} value={row.hrWorkers === 0 ? '' : row.hrWorkers} min="0"
                                                onChange={(e) => handleManualChange(row.type, 'handRolling', e.target.value.replace(/^0+(?=\d)/, ''))} 
                                                disabled={isViewer}
                                                className="w-full p-2 border border-blue-300 dark:border-blue-700/50 rounded text-center font-bold text-blue-800 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-inner bg-white dark:bg-zinc-950 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" 
                                                placeholder="0" 
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.selectionCost.toLocaleString()}</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.handRollingCost.toLocaleString()}</td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-orange-600 dark:text-orange-400 bg-orange-50/10 dark:bg-orange-900/10">{row.totalDryerUnits}</td>
                                        <td className="px-2 py-2 border-r border-gray-200 dark:border-zinc-800 bg-orange-50/30 dark:bg-orange-900/20">
                                            <input 
                                                type="number" onWheel={(e) => e.target.blur()} value={row.rPoints === 0 ? '' : row.rPoints} min="0"
                                                onChange={(e) => handleManualChange(row.type, 'roller', e.target.value.replace(/^0+(?=\d)/, ''))} 
                                                disabled={isViewer}
                                                className="w-full p-2 border border-orange-300 dark:border-orange-700/50 rounded text-center font-bold text-orange-800 dark:text-orange-300 outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 shadow-inner bg-white dark:bg-zinc-950 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" 
                                                placeholder="0" 
                                            />
                                        </td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.dryerCost.toLocaleString()}</td>
                                        <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{row.rollerCost.toLocaleString()}</td>
                                        <td className="px-3 py-4 font-black text-lg text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/20">{row.totalElectricityCost.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            
                            <tfoot className="bg-gray-100/90 dark:bg-zinc-800 border-t-[3px] border-gray-300 dark:border-zinc-700 font-black text-gray-900 dark:text-gray-100 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors duration-300">
                                <tr>
                                    <td className="px-4 py-5 border-r border-gray-200 dark:border-zinc-700 text-right uppercase tracking-wider text-sm">Grand Total</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-[#1B6A31] dark:text-green-400 text-base">{grandTotals.totalGL.toFixed(2)}</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-[#1B6A31] dark:text-green-400 text-base">{grandTotals.totalMT.toFixed(3)}</td>
                                    
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-blue-800 dark:text-blue-400 text-base">{grandTotals.totalSelectionWorkers}</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-blue-800 dark:text-blue-400 text-base">{grandTotals.hrWorkers}</td>
                                    
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700">{grandTotals.selectionCost.toLocaleString()}</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700">{grandTotals.handRollingCost.toLocaleString()}</td>
                                    
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-orange-700 dark:text-orange-400 text-base">{grandTotals.totalDryerUnits}</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700 text-orange-700 dark:text-orange-400 text-base">{grandTotals.rPoints}</td>
                                    
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700">{grandTotals.dryerCost.toLocaleString()}</td>
                                    <td className="px-3 py-5 border-r border-gray-200 dark:border-zinc-700">{grandTotals.rollerCost.toLocaleString()}</td>
                                    
                                    <td className="px-3 py-5 text-red-700 dark:text-red-400 text-xl bg-red-100/50 dark:bg-red-900/30">{grandTotals.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}