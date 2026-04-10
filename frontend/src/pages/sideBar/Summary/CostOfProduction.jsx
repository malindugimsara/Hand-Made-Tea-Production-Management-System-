import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calculator, DollarSign, Info, Calendar, FileDown, Save, X, AlertCircle, Eye } from "lucide-react"; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
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

export default function CostOfProduction() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 
    
    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view'; 

    // DB tracking
    const [isSaved, setIsSaved] = useState(false);
    
    // PDF Unsaved Alert States
    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
    const [pendingPdfAction, setPendingPdfAction] = useState(null); 

    // Filters & Rates
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
    const [monthlyGlRate, setMonthlyGlRate] = useState(0); 
    const [labourRate, setLabourRate] = useState(1350); 
    const [electricityRate, setElectricityRate] = useState(10);
    
    const [records, setRecords] = useState([]);
    const [supervisionCosts, setSupervisionCosts] = useState({});

    // Range PDF Modal States
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [rangeStartMonth, setRangeStartMonth] = useState('');
    const [rangeEndMonth, setRangeEndMonth] = useState('');
    const [isGeneratingRangePDF, setIsGeneratingRangePDF] = useState(false);

    const preferredOrder = ["Purple Tea", "Pink Tea", "Golden Tips", "Silver Green", "White Tea"];

    useEffect(() => {
        fetchAndProcessData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth]); 

    const fetchAndProcessData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [glRes, prodRes, labRes, costRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/cost-of-production/${selectedMonth}`, { headers: authHeaders }).catch(() => null)
            ]);

            if (!glRes.ok || !prodRes.ok || !labRes.ok) {
                if (glRes.status === 401 || prodRes.status === 401 || labRes.status === 401) {
                    throw new Error("Unauthorized. Please log in.");
                }
                throw new Error("Failed to fetch data");
            }

            const glData = await glRes.json();
            const prodData = await prodRes.json();
            const labData = await labRes.json();

            // Fix Mapping Issue: Sort arrays by _id (which contains creation timestamp) to ensure exact 1-to-1 matching
            const sortById = (a, b) => (a._id < b._id ? -1 : (a._id > b._id ? 1 : 0));
            glData.sort(sortById);
            prodData.sort(sortById);
            labData.sort(sortById);

            let savedMonthData = null;
            let dbLoadedSup = {};
            let dbLoadedHr = {};

            // 1. Check if current month is already saved
            if (costRes && costRes.ok) {
                savedMonthData = await costRes.json();
                
                if (savedMonthData && savedMonthData.month === selectedMonth) {
                    setIsSaved(true);
                    setMonthlyGlRate(savedMonthData.monthlyGlRate || 0);
                    setLabourRate(savedMonthData.labourRate || 1350);
                    setElectricityRate(savedMonthData.electricityRate || 10);

                    const dbLabRate = savedMonthData.labourRate || 1350;

                    (savedMonthData.teaCosts || []).forEach(tc => {
                        dbLoadedSup[tc.teaType] = tc.supervisionCost || 0;
                        dbLoadedHr[tc.teaType] = tc.handRollingCost ? (tc.handRollingCost / dbLabRate) : 0;
                    });
                } else {
                    setIsSaved(false);
                    savedMonthData = null;
                }
            } else {
                setIsSaved(false);
            }

            // 2. Process Production, GL & Labour Data
            const filteredProd = prodData.filter(p => p.date.startsWith(selectedMonth));
            const summary = {};
            const glUsage = {};
            const labUsage = {};

            filteredProd.forEach(prod => {
                const type = prod.teaType || 'Other';
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                
                const glsForDate = glData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const labsForDate = labData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                const gl = glsForDate[glUsage[dateStr]] || null;
                const lab = labsForDate[labUsage[dateStr]] || null;

                glUsage[dateStr]++;
                labUsage[dateStr]++;

                if (!summary[type]) {
                    summary[type] = {
                        teaType: type,
                        selectedWeight: 0,
                        madeTeaWeight: 0,
                        selectionWorkers: 0,
                        hrWorkers: 0, // NEW: Auto Hand Rolling Workers
                        dryerUnits: 0
                    };
                }

                summary[type].selectedWeight += Number(gl?.selectedWeight || 0);
                summary[type].madeTeaWeight += Number(prod.madeTeaWeight || 0);
                
                // Add Selection Workers
                summary[type].selectionWorkers += Number(lab?.workerCount || 0);
                
                // Add Hand Rolling Workers (Automatic Calculation)
                if (lab && lab.rollingType === 'Hand Rolling') {
                    summary[type].hrWorkers += Number(lab.rollingWorkerCount || 0);
                }
                
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                summary[type].dryerUnits += (mEnd > mStart ? mEnd - mStart : 0);
            });

            // Apply loaded Supervision costs
            setSupervisionCosts(savedMonthData ? dbLoadedSup : {});

            // If we have saved data from Cost of Production DB, override auto-calculated HR workers to match saved record
            if (savedMonthData && savedMonthData.month === selectedMonth) {
                Object.keys(summary).forEach(type => {
                    if (dbLoadedHr[type] !== undefined) {
                        summary[type].hrWorkers = dbLoadedHr[type];
                    }
                });
            }

            let recordsArray = Object.values(summary);
            recordsArray.sort((a, b) => {
                const indexA = preferredOrder.indexOf(a.teaType);
                const indexB = preferredOrder.indexOf(b.teaType);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.teaType.localeCompare(b.teaType);
            });

            setRecords(recordsArray);
        } catch (error) {
            toast.error(error.message || "Error loading data");
        } finally {
            setLoading(false);
        }
    };

    // Manual input Change Handlers
    const handleSupervisionChange = (type, value) => {
        if (Number(value) < 0) return;
        setSupervisionCosts(prev => ({ ...prev, [type]: Number(value) || 0 }));
        setIsSaved(false);
    };

    const handleRateChange = (setter) => (e) => {
        const val = e.target.value.replace(/^0+(?=\d)/, '');
        if (Number(val) < 0) return;
        setter(val);
        setIsSaved(false);
    };

    const grandTotalAllTeas = records.reduce((total, item) => {
        const glCost = item.selectedWeight * monthlyGlRate;
        const selectionCost = item.selectionWorkers * labourRate;
        const electricityCost = item.dryerUnits * electricityRate;
        const supCost = supervisionCosts[item.teaType] || 0;
        const handRollingCost = item.hrWorkers * labourRate;

        return total + glCost + selectionCost + handRollingCost + electricityCost + supCost;
    }, 0);

    // Save to Database Logic
    const handleSaveToDatabase = async () => {
        if (isViewer) {
            toast.error("Viewers are not allowed to save data.");
            return false;
        }

        if (records.length === 0) {
            toast.error("No records to save!");
            return false;
        }

        setIsSaving(true);
        const toastId = toast.loading('Saving to database...');

        try {
            const teaCostsPayload = records.map(item => {
                const glCost = item.selectedWeight * monthlyGlRate;
                const selectionCost = item.selectionWorkers * labourRate;
                const electricityCost = item.dryerUnits * electricityRate;
                const supCost = supervisionCosts[item.teaType] || 0;
                const handRollingCost = item.hrWorkers * labourRate;
                const totalCost = glCost + selectionCost + handRollingCost + electricityCost + supCost;

                return {
                    teaType: item.teaType,
                    selectedWeight: item.selectedWeight,
                    madeTeaWeight: item.madeTeaWeight,
                    glCost,
                    selectionCost,
                    handRollingCost,
                    electricityCost,
                    supervisionCost: supCost,
                    totalCost
                };
            });

            const payload = {
                month: selectedMonth,
                monthlyGlRate: Number(monthlyGlRate),
                labourRate: Number(labourRate),
                electricityRate: Number(electricityRate),
                teaCosts: teaCostsPayload,
                grandTotal: grandTotalAllTeas
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/cost-of-production`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(`Cost data for ${selectedMonth} saved successfully!`, { id: toastId });
                setIsSaved(true);
                return true;
            } else {
                if (response.status === 403) {
                    toast.error("Access Denied. You don't have permission.", { id: toastId });
                } else {
                    throw new Error("Failed to save data");
                }
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error("Database saving failed.", { id: toastId });
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndDownload = async () => {
        setShowUnsavedAlert(false);
        const success = await handleSaveToDatabase();
        
        if (success) {
            if (pendingPdfAction === 'single') {
                toast.success("Saved! You can now click Download PDF again.");
            } else if (pendingPdfAction === 'range') {
                generateRangePDF(true); 
            }
        }
        setPendingPdfAction(null);
    };

    // -------------------------------------------------------------
    // Prepare Data for Single Month PDF
    // -------------------------------------------------------------
    const getSinglePdfData = () => {
        const rows = [];

        records.forEach((item) => {
            const glCost = item.selectedWeight * monthlyGlRate;
            const selectionCost = item.selectionWorkers * labourRate;
            const electricityCost = item.dryerUnits * electricityRate;
            const supCost = supervisionCosts[item.teaType] || 0;
            const handRollingCost = item.hrWorkers * labourRate;
            const totalCost = glCost + selectionCost + handRollingCost + electricityCost + supCost;

            rows.push([
                item.teaType,
                "Green Leaf (G/L) Cost",
                `${item.selectedWeight.toFixed(2)} kg @ Rs.${monthlyGlRate}`,
                glCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
            rows.push([
                "",
                "G/L Selection Cost",
                `${item.selectionWorkers} workers`,
                selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
            rows.push([
                "",
                "Hand Rolling Cost",
                `${item.hrWorkers} workers`,
                handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
            rows.push([
                "",
                "Electricity Cost",
                `${item.dryerUnits} units`,
                electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
            rows.push([
                "",
                "Supervision Cost",
                "Manual Input",
                supCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
            rows.push([
                "",
                "TOTAL COST",
                `Made Tea: ${item.madeTeaWeight.toFixed(3)} kg`,
                totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})
            ]);
        });

        rows.push([
            "GRAND TOTAL (ALL TEAS)", "-", "-", grandTotalAllTeas.toLocaleString(undefined, {minimumFractionDigits: 2})
        ]);

        return rows;
    };

    // -------------------------------------------------------------
    // Range Months PDF Generation
    // -------------------------------------------------------------
    const generateRangePDF = async (bypassCheck = false) => {
        if (!rangeStartMonth || !rangeEndMonth) {
            toast.error("Please select both Start and End months.");
            return;
        }

        if (rangeStartMonth > rangeEndMonth) {
            toast.error("Start month must be before End month.");
            return;
        }

        if (!isSaved && !bypassCheck && !isViewer) {
            setPendingPdfAction('range');
            setShowUnsavedAlert(true);
            return;
        }

        setIsGeneratingRangePDF(true);
        const toastId = toast.loading('Fetching data and generating PDF...');

        try {
            let start = new Date(rangeStartMonth);
            let end = new Date(rangeEndMonth);
            let monthsArray = [];
            let current = new Date(start);
            while (current <= end) {
                monthsArray.push(current.toISOString().slice(0, 7));
                current.setMonth(current.getMonth() + 1);
            }

            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [glRes, prodRes, labRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders })
            ]);

            if (!glRes.ok || !prodRes.ok || !labRes.ok) {
                throw new Error("Failed to fetch data for range PDF");
            }

            const glData = await glRes.json();
            const prodData = await prodRes.json();
            const labData = await labRes.json();

            const sortById = (a, b) => (a._id < b._id ? -1 : (a._id > b._id ? 1 : 0));
            glData.sort(sortById);
            prodData.sort(sortById);
            labData.sort(sortById);

            const doc = new jsPDF('landscape');

            try {
                const res = await fetch("/logo.png");
                if (res.ok) {
                    const blob = await res.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    doc.addImage(dataUrl, "PNG", 14, 10, 25, 25); 
                }
            } catch (err) {}

            doc.setFontSize(22);
            doc.setTextColor(27, 106, 49); 
            doc.text("Monthly Cost Summary", 45, 20);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            const startName = new Date(rangeStartMonth).toLocaleString('default', { month: 'short', year: 'numeric' });
            const endName = new Date(rangeEndMonth).toLocaleString('default', { month: 'short', year: 'numeric' });
            doc.text(`Period: ${startName} to ${endName}`, 45, 27);

            const headRow = ["Type of Cost", ...monthsArray.map(m => new Date(m).toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase())];
            
            let allRows = [];
            let overallGrandTotal = new Array(monthsArray.length).fill(0);

            preferredOrder.forEach((teaType) => {
                let typeRow = [{ content: teaType, colSpan: monthsArray.length + 1, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' } }];
                allRows.push(typeRow);

                let glCostRow = ["G/L Cost"];
                let selCostRow = ["G/L Selection Cost"];
                let hrCostRow = ["Hand Rolling Cost"];
                let elecCostRow = ["Electricity Cost"];
                let supCostRow = ["Supervision Cost"];
                let mtRow = ["MADE TEA (KG)"];
                let costPerKgRow = ["COST PER 1 KG (Rs.)"];
                let totalCostRow = [{ content: "Total Cost", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }];

                monthsArray.forEach((month, index) => {
                    const filteredProd = prodData.filter(p => p.date.startsWith(month) && p.teaType === teaType);
                    
                    let m_selectedWeight = 0;
                    let m_madeTeaWeight = 0;
                    let m_selectionWorkers = 0;
                    let m_dryerUnits = 0;
                    let m_hrWorkersCalc = 0;

                    const glUsage = {};
                    const labUsage = {};

                    filteredProd.forEach(prod => {
                        const dateStr = new Date(prod.date).toISOString().split('T')[0];
                        const glsForDate = glData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                        const labsForDate = labData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                        if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                        if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                        const gl = glsForDate[glUsage[dateStr]] || null;
                        const lab = labsForDate[labUsage[dateStr]] || null;

                        glUsage[dateStr]++;
                        labUsage[dateStr]++;

                        m_selectedWeight += Number(gl?.selectedWeight || 0);
                        m_madeTeaWeight += Number(prod.madeTeaWeight || 0);
                        m_selectionWorkers += Number(lab?.workerCount || 0);
                        
                        if (lab && lab.rollingType === 'Hand Rolling') {
                            m_hrWorkersCalc += Number(lab.rollingWorkerCount || 0);
                        }

                        const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                        const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                        m_dryerUnits += (mEnd > mStart ? mEnd - mStart : 0);
                    });

                    const m_glCost = m_selectedWeight * monthlyGlRate;
                    const m_selectionCost = m_selectionWorkers * labourRate;
                    const m_electricityCost = m_dryerUnits * electricityRate;
                    const m_supCost = supervisionCosts[teaType] || 0; 
                    
                    const m_hrWorkers = m_hrWorkersCalc;
                    const m_handRollingCost = m_hrWorkers * labourRate;

                    const m_totalCost = m_glCost + m_selectionCost + m_handRollingCost + m_electricityCost + m_supCost;
                    const m_costPerKg = m_madeTeaWeight > 0 ? (m_totalCost / m_madeTeaWeight) : 0;

                    glCostRow.push(m_glCost > 0 ? m_glCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-");
                    selCostRow.push(m_selectionCost > 0 ? m_selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-");
                    hrCostRow.push(m_handRollingCost > 0 ? m_handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-");
                    elecCostRow.push(m_electricityCost > 0 ? m_electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-");
                    supCostRow.push(m_supCost > 0 ? m_supCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-");
                    totalCostRow.push({ content: m_totalCost > 0 ? m_totalCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } });
                    
                    mtRow.push(m_madeTeaWeight > 0 ? m_madeTeaWeight.toFixed(3) : "-");
                    costPerKgRow.push({ content: m_costPerKg > 0 ? m_costPerKg.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: { fontStyle: 'bold', fillColor: [210, 230, 210] } });

                    overallGrandTotal[index] += m_totalCost;
                });

                allRows.push(glCostRow, selCostRow, hrCostRow, elecCostRow, supCostRow, totalCostRow, mtRow, costPerKgRow);
            });

            let grandTotalRow = [{ content: "GRAND TOTAL (All Teas)", styles: { fontStyle: 'bold', fillColor: [27, 106, 49], textColor: 255 } }];
            overallGrandTotal.forEach(total => {
                grandTotalRow.push({ content: total > 0 ? total.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: { fontStyle: 'bold', fillColor: [27, 106, 49], textColor: 255 } });
            });
            allRows.push(grandTotalRow);

            autoTable(doc, {
                startY: 45,
                head: [headRow],
                body: allRows,
                theme: 'grid',
                headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 9, halign: 'center' },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
                styles: { halign: 'right' },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0) {
                        data.cell.styles.halign = 'left';
                    }
                }
            });

            doc.save(`Monthly_Cost_Summary_${startName}_to_${endName}.pdf`);
            toast.success("Range PDF Downloaded Successfully!", { id: toastId });
            setShowRangeModal(false);

        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF.", { id: toastId });
        } finally {
            setIsGeneratingRangePDF(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen relative">
            
            {showRangeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
                        <button onClick={() => setShowRangeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-[#1B6A31] mb-2">Download Range Summary</h3>
                        <p className="text-sm text-gray-500 mb-6">Select a date range to generate a combined PDF report for multiple months.</p>
                        
                        <div className="flex flex-col gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">FROM MONTH</label>
                                <input type="month" value={rangeStartMonth} onChange={(e) => setRangeStartMonth(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">TO MONTH</label>
                                <input type="month" value={rangeEndMonth} onChange={(e) => setRangeEndMonth(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                            </div>
                        </div>

                        <button 
                            onClick={() => generateRangePDF(false)}
                            disabled={isGeneratingRangePDF}
                            className={`w-full py-3 rounded-lg text-white font-bold flex justify-center items-center gap-2 ${isGeneratingRangePDF ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            <FileDown size={18} /> {isGeneratingRangePDF ? "Generating PDF..." : "Download Report"}
                        </button>
                    </div>
                </div>
            )}

            <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
                <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900">Data Not Saved!</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 text-base">
                            You have unsaved changes. You must save the records to the database before generating a PDF. 
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel 
                            onClick={() => {
                                setShowUnsavedAlert(false);
                                setPendingPdfAction(null);
                            }} 
                            className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 rounded-lg px-6 font-semibold"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleSaveAndDownload} 
                            className="bg-[#1B6A31] hover:bg-green-800 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                        >
                            Save & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center gap-2">
                        <DollarSign /> Cost of Production
                    </h2>
                    <p className="text-gray-500 font-medium">Detailed monthly analysis per tea type</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Calendar size={14}/> ACTIVE MONTH
                        </label>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="p-2.5 border border-green-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                        <button 
                            onClick={() => setShowRangeModal(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                            <FileDown size={18} /> Range PDF
                        </button>

                        {(!isSaved && !isViewer) ? (
                            <button 
                                onClick={() => {
                                    setPendingPdfAction('single');
                                    setShowUnsavedAlert(true);
                                }}
                                disabled={loading || records.length === 0}
                                className={`px-4 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${(loading || records.length === 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                <FileDown size={18} /> Single PDF
                            </button>
                        ) : (
                            <PDFDownloader 
                                title="Cost of Production Summary"
                                subtitle={`Month: ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })} | Global Rates -> G/L: Rs.${monthlyGlRate} | Labour: Rs.${labourRate} | Electricity: Rs.${electricityRate}`}
                                headers={["Tea Type", "Cost Category", "Basis", "Cost (LKR)"]}
                                data={getSinglePdfData()}
                                fileName={`Cost_Of_Production_${selectedMonth}.pdf`}
                                orientation="portrait"
                                disabled={loading || records.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            />
                        )}

                        <button 
                            onClick={handleSaveToDatabase}
                            disabled={isSaving || records.length === 0 || isSaved || isViewer}
                            className={`px-4 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                                (isSaving || records.length === 0 || isSaved || isViewer) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-green-800'
                            }`}
                        >
                            {isViewer ? <Eye size={18}/> : <Save size={18} />} 
                            {isViewer ? "View Only" : isSaving ? "Saving..." : isSaved ? "Saved to DB" : "Save to DB"}
                        </button>
                    </div>
                </div>
            </div>

            {isViewer && (
                <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <Info size={20} />
                    <p className="text-sm font-medium">You are logged in as a <strong>Viewer</strong>. You can only view the data and download reports. Editing and saving are disabled.</p>
                </div>
            )}

            <div className={`bg-white p-6 rounded-xl border shadow-sm mb-10 ${isViewer ? 'border-gray-200 opacity-90' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <span className="text-orange-500 font-bold text-lg">⚯</span>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        ADJUST RATES (LKR) {isViewer && "(Read Only)"}
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">G/L RATE (PER KG)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                            <input 
                                type="number" 
                                min="0"
                                value={monthlyGlRate === 0 ? '' : monthlyGlRate} 
                                onChange={handleRateChange(setMonthlyGlRate)}
                                onWheel={(e) => e.target.blur()}
                                disabled={isViewer}
                                className="w-full border border-gray-300 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                placeholder="0.00" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">LABOUR RATE (PER HEAD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                            <input 
                                type="number" 
                                min="0"
                                value={labourRate} 
                                onChange={handleRateChange(setLabourRate)}
                                onWheel={(e) => e.target.blur()}
                                disabled={isViewer}
                                className="w-full border border-gray-300 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500">ELECTRICITY RATE (PER UNIT)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                            <input 
                                type="number"
                                min="0" 
                                value={electricityRate} 
                                onChange={handleRateChange(setElectricityRate)}
                                onWheel={(e) => e.target.blur()}
                                disabled={isViewer}
                                className="w-full border border-gray-300 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500 font-bold">Processing Monthly Data...</div>
            ) : records.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 gap-10">
                        {records.map((item) => {
                            const glCost = item.selectedWeight * monthlyGlRate;
                            const selectionCost = item.selectionWorkers * labourRate;
                            const electricityCost = item.dryerUnits * electricityRate;
                            const supCost = supervisionCosts[item.teaType] || 0;
                            const handRollingCost = item.hrWorkers * labourRate;
                            const totalCost = glCost + selectionCost + handRollingCost + electricityCost + supCost;

                            return (
                                <div key={item.teaType} className={`bg-white rounded-2xl shadow-lg overflow-hidden border ${isViewer ? 'border-gray-200 opacity-95' : 'border-gray-200'}`}>
                                    <div className="bg-[#1B6A31] p-4 text-white flex justify-between items-center px-8">
                                        <h3 className="text-xl font-bold">{item.teaType}</h3>
                                        <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-semibold">
                                            Total Output: {item.madeTeaWeight.toFixed(3)} kg
                                        </span>
                                    </div>

                                    <div className="p-8 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-gray-400 text-xs uppercase tracking-widest border-b">
                                                    <th className="pb-4 font-bold">Type of Cost</th>
                                                    <th className="pb-4 font-bold text-right">Basis</th>
                                                    <th className="pb-4 font-bold text-right">Cost (Rs.)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700">Green Leaf (G/L) Cost</td>
                                                    <td className="py-4 text-right text-gray-500">{item.selectedWeight.toFixed(2)} kg @ Rs.{monthlyGlRate}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900">{glCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700">G/L Selection Cost</td>
                                                    <td className="py-4 text-right text-gray-500">{item.selectionWorkers > 0 ? `${item.selectionWorkers} Worker days` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900">{selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700">Hand Rolling Cost</td>
                                                    <td className="py-4 text-right text-gray-500">{item.hrWorkers > 0 ? `${item.hrWorkers} Worker days` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900">{handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700">Electricity Cost</td>
                                                    <td className="py-4 text-right text-gray-500">{item.dryerUnits > 0 ? `${item.dryerUnits} Units Used` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900">{electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700">Supervision Cost</td>
                                                    <td className="py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            value={supervisionCosts[item.teaType] === 0 ? '' : (supervisionCosts[item.teaType] || '')}
                                                            placeholder="Manual Input"
                                                            disabled={isViewer}
                                                            className="w-32 p-1 border border-gray-300 rounded text-right focus:ring-1 focus:ring-green-400 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                            onChange={(e) => handleSupervisionChange(item.teaType, e.target.value)}
                                                            onWheel={(e) => e.target.blur()}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-right font-bold text-gray-900">{supCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-green-50/50">
                                                    <td colSpan="2" className="py-5 px-4 text-lg font-bold text-[#1B6A31]">Total Production Cost ({item.teaType})</td>
                                                    <td className="py-5 px-4 text-right text-2xl font-black text-[#1B6A31]">
                                                        Rs. {totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-10 bg-[#1B6A31] text-white rounded-2xl shadow-xl overflow-hidden border border-green-800">
                        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-4 rounded-full">
                                    <Calculator size={25} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-wider">Grand Total</h2>
                                    <p className="text-green-100 font-medium text-md">Sum of all production costs for {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-green-200 font-bold uppercase tracking-widest block mb-1">Total LKR</span>
                                <span className="text-xl md:text-3xl font-black">
                                    Rs. {grandTotalAllTeas.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white p-20 text-center rounded-xl border border-dashed border-gray-300 text-gray-400">
                    No production records found for the selected month.
                </div>
            )}
        </div>
    );
}