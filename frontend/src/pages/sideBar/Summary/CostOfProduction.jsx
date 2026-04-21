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
    const [electricityRate, setElectricityRate] = useState(20);
    
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

            const sortById = (a, b) => (a._id < b._id ? -1 : (a._id > b._id ? 1 : 0));
            glData.sort(sortById);
            prodData.sort(sortById);
            labData.sort(sortById);

            let savedMonthData = null;
            let dbLoadedSup = {};
            let dbLoadedHr = {};

            if (costRes && costRes.ok) {
                savedMonthData = await costRes.json();
                
                if (savedMonthData && savedMonthData.month === selectedMonth) {
                    setIsSaved(true);
                    setMonthlyGlRate(savedMonthData.monthlyGlRate || 0);
                    setLabourRate(savedMonthData.labourRate || 1350);
                    // setElectricityRate(savedMonthData.electricityRate || 20);

                    const dbLabRate = savedMonthData.labourRate || 1350;

                    (savedMonthData.teaCosts || []).forEach(tc => {
                        dbLoadedSup[tc.teaType] = tc.supervisionCost || 0;
                        dbLoadedHr[tc.teaType] = tc.handRollingCost ? (tc.handRollingCost / dbLabRate) : 0;
                    });
                } else {
                    setIsSaved(false);
                    savedMonthData = null;
                    setMonthlyGlRate(0);
                    setLabourRate(1350);
                    setElectricityRate(20);
                }
            } else {
                setIsSaved(false);
                setMonthlyGlRate(0);
                setLabourRate(1350);
                setElectricityRate(20);
            }

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
                        hrWorkers: 0, 
                        dryerUnits: 0
                    };
                }

                summary[type].selectedWeight += Number(gl?.selectedWeight || 0);
                summary[type].madeTeaWeight += Number(prod.madeTeaWeight || 0);
                
                summary[type].selectionWorkers += Number(lab?.workerCount || 0);
                
                if (lab && lab.rollingType === 'Hand Rolling') {
                    summary[type].hrWorkers += Number(lab.rollingWorkerCount || 0);
                }
                
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                summary[type].dryerUnits += (mEnd > mStart ? mEnd - mStart : 0);
            });

            setSupervisionCosts(savedMonthData ? dbLoadedSup : {});

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
        const glCost = item.selectedWeight * Number(monthlyGlRate || 0);
        const selectionCost = item.selectionWorkers * Number(labourRate || 0);
        const electricityCost = item.dryerUnits * Number(electricityRate || 0);
        const supCost = supervisionCosts[item.teaType] || 0;
        const handRollingCost = item.hrWorkers * Number(labourRate || 0);

        return total + glCost + selectionCost + handRollingCost + electricityCost + supCost;
    }, 0);

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
                const glCost = item.selectedWeight * Number(monthlyGlRate || 0);
                const selectionCost = item.selectionWorkers * Number(labourRate || 0);
                const electricityCost = item.dryerUnits * Number(electricityRate || 0);
                const supCost = supervisionCosts[item.teaType] || 0;
                const handRollingCost = item.hrWorkers * Number(labourRate || 0);
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
                monthlyGlRate: Number(monthlyGlRate || 0),
                labourRate: Number(labourRate || 0),
                electricityRate: Number(electricityRate || 0),
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
        let isShaded = false; // Toggle for shading

        records.forEach((item) => {
            const glCost = item.selectedWeight * Number(monthlyGlRate || 0);
            const selectionCost = item.selectionWorkers * Number(labourRate || 0);
            const electricityCost = item.dryerUnits * Number(electricityRate || 0);
            const supCost = supervisionCosts[item.teaType] || 0;
            const handRollingCost = item.hrWorkers * Number(labourRate || 0);
            const totalCost = glCost + selectionCost + handRollingCost + electricityCost + supCost;

            // Apply a shaded background array to rows if 'isShaded' is true
            const rowStyle = isShaded ? { fillColor: [245, 245, 245] } : {};
            const boldStyle = isShaded ? { fillColor: [230, 230, 230], fontStyle: 'bold' } : { fontStyle: 'bold' };

            rows.push([
                { content: item.teaType, rowSpan: 6, styles: { ...rowStyle, fontStyle: 'bold', valign: 'middle' } },
                { content: "Green Leaf (G/L) Cost", styles: rowStyle },
                { content: `${item.selectedWeight.toFixed(2)} kg @ Rs.${monthlyGlRate}`, styles: rowStyle },
                { content: glCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: rowStyle }
            ]);
            rows.push([
                { content: "G/L Selection Cost", styles: rowStyle },
                { content: `${item.selectionWorkers} workers`, styles: rowStyle },
                { content: selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: rowStyle }
            ]);
            rows.push([
                { content: "Hand Rolling Cost", styles: rowStyle },
                { content: `${item.hrWorkers} workers`, styles: rowStyle },
                { content: handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: rowStyle }
            ]);
            rows.push([
                { content: "Electricity Cost", styles: rowStyle },
                { content: `${item.dryerUnits} units`, styles: rowStyle },
                { content: electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: rowStyle }
            ]);
            rows.push([
                { content: "Supervision Cost", styles: rowStyle },
                { content: "Manual Input", styles: rowStyle },
                { content: supCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: rowStyle }
            ]);
            rows.push([
                { content: "TOTAL COST", styles: boldStyle },
                { content: `Made Tea: ${item.madeTeaWeight.toFixed(3)} kg`, styles: boldStyle },
                { content: totalCost.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: boldStyle }
            ]);

            isShaded = !isShaded; // Flip shading for the next tea type
        });

        rows.push([
            { content: "GRAND TOTAL (ALL TEAS)", colSpan: 3, styles: { fontStyle: 'bold', fillColor: [27, 106, 49], textColor: 255, halign: 'right' } }, 
            { content: grandTotalAllTeas.toLocaleString(undefined, {minimumFractionDigits: 2}), styles: { fontStyle: 'bold', fillColor: [27, 106, 49], textColor: 255 } }
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

            const getRangeDocCode = () => {
                const d1 = new Date(rangeStartMonth);
                const d2 = new Date(rangeEndMonth);
                const m1 = d1.toLocaleString('default', { month: 'short' }).toUpperCase();
                const m2 = d2.toLocaleString('default', { month: 'short' }).toUpperCase();
                const year = d2.getFullYear(); 
                return `HT/CPS/${m1}-${m2}.${year}`; 
            };
            const uniqueRangeCode = getRangeDocCode();

            doc.setFontSize(22);
            doc.setTextColor(27, 106, 49); 
            doc.text("Monthly Cost of Production Summary", 45, 20);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            const startName = new Date(rangeStartMonth).toLocaleString('default', { month: 'short', year: 'numeric' });
            const endName = new Date(rangeEndMonth).toLocaleString('default', { month: 'short', year: 'numeric' });
            doc.text(`Period: ${startName} to ${endName}`, 45, 27);

            doc.setFontSize(10);
            doc.setTextColor(150); 
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(`Doc Ref: ${uniqueRangeCode}`, pageWidth - 14, 12, { align: 'right' });

            const headRow = ["Type of Cost", ...monthsArray.map(m => new Date(m).toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase())];
            
            let allRows = [];
            let overallGrandTotal = new Array(monthsArray.length).fill(0);
            let isShaded = false; // Shading toggle

            preferredOrder.forEach((teaType) => {
                const rowStyle = isShaded ? { fillColor: [245, 245, 245] } : {};
                const boldStyle = isShaded ? { fillColor: [230, 230, 230], fontStyle: 'bold' } : { fontStyle: 'bold' };

                let typeRow = [{ content: teaType, colSpan: monthsArray.length + 1, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' } }];
                allRows.push(typeRow);

                let glCostRow = [{content: "G/L Cost", styles: rowStyle}];
                let selCostRow = [{content: "G/L Selection Cost", styles: rowStyle}];
                let hrCostRow = [{content: "Hand Rolling Cost", styles: rowStyle}];
                let elecCostRow = [{content: "Electricity Cost", styles: rowStyle}];
                let supCostRow = [{content: "Supervision Cost", styles: rowStyle}];
                let mtRow = [{content: "MADE TEA (KG)", styles: rowStyle}];
                let costPerKgRow = [{content: "COST PER 1 KG (Rs.)", styles: rowStyle}];
                let totalCostRow = [{ content: "Total Cost", styles: boldStyle }];

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

                    const m_glRate = Number(monthlyGlRate || 0);
                    const m_labRate = Number(labourRate || 0);
                    const m_elecRate = Number(electricityRate || 0);

                    const m_glCost = m_selectedWeight * m_glRate;
                    const m_selectionCost = m_selectionWorkers * m_labRate;
                    const m_electricityCost = m_dryerUnits * m_elecRate;
                    const m_supCost = supervisionCosts[teaType] || 0; 
                    
                    const m_hrWorkers = m_hrWorkersCalc;
                    const m_handRollingCost = m_hrWorkers * m_labRate;

                    const m_totalCost = m_glCost + m_selectionCost + m_handRollingCost + m_electricityCost + m_supCost;
                    const m_costPerKg = m_madeTeaWeight > 0 ? (m_totalCost / m_madeTeaWeight) : 0;

                    glCostRow.push({content: m_glCost > 0 ? m_glCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: rowStyle});
                    selCostRow.push({content: m_selectionCost > 0 ? m_selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: rowStyle});
                    hrCostRow.push({content: m_handRollingCost > 0 ? m_handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: rowStyle});
                    elecCostRow.push({content: m_electricityCost > 0 ? m_electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: rowStyle});
                    supCostRow.push({content: m_supCost > 0 ? m_supCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: rowStyle});
                    totalCostRow.push({ content: m_totalCost > 0 ? m_totalCost.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: boldStyle });
                    
                    mtRow.push({content: m_madeTeaWeight > 0 ? m_madeTeaWeight.toFixed(3) : "-", styles: rowStyle});
                    costPerKgRow.push({ content: m_costPerKg > 0 ? m_costPerKg.toLocaleString(undefined, {minimumFractionDigits: 2}) : "-", styles: { fontStyle: 'bold', fillColor: [210, 230, 210] } });

                    overallGrandTotal[index] += m_totalCost;
                });

                allRows.push(glCostRow, selCostRow, hrCostRow, elecCostRow, supCostRow, totalCostRow, mtRow, costPerKgRow);
                isShaded = !isShaded; // Flip shading for the next tea type
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

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Page ${i} of ${pageCount} - Generated by HandMade Tea Factory`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

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

    const getCurrentMonthCode = () => {
        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `HT/CPS/${month}.${year}`; 
    };

    const uniqueCode = getCurrentMonthCode();

    return (
        <div className="p-8 max-w-6xl mx-auto font-sans bg-gray-50 dark:bg-zinc-950 min-h-screen relative transition-colors duration-300">
            
            {showRangeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm transition-colors">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-200 dark:border-zinc-800">
                        <button onClick={() => setShowRangeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold text-[#1B6A31] dark:text-green-500 mb-2">Download Range Summary</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select a date range to generate a combined PDF report for multiple months.</p>
                        
                        <div className="flex flex-col gap-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">FROM MONTH</label>
                                <input type="month" value={rangeStartMonth} onChange={(e) => setRangeStartMonth(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">TO MONTH</label>
                                <input type="month" value={rangeEndMonth} onChange={(e) => setRangeEndMonth(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-colors" />
                            </div>
                        </div>

                        <button 
                            onClick={() => generateRangePDF(false)}
                            disabled={isGeneratingRangePDF}
                            className={`w-full py-3 rounded-lg text-white font-bold flex justify-center items-center gap-2 transition-colors ${isGeneratingRangePDF ? 'bg-gray-400 dark:bg-zinc-700' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                        >
                            <FileDown size={18} /> {isGeneratingRangePDF ? "Generating PDF..." : "Download Report"}
                        </button>
                    </div>
                </div>
            )}

            <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md transition-colors">
                    <AlertDialogHeader>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Data Not Saved!</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                            You have unsaved changes. You must save the records to the database before generating a PDF. 
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel 
                            onClick={() => {
                                setShowUnsavedAlert(false);
                                setPendingPdfAction(null);
                            }} 
                            className="bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg px-6 font-semibold transition-colors"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleSaveAndDownload} 
                            className="bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                        >
                            Save & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="mb-8 border-b border-gray-200 dark:border-zinc-800 pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
                        <DollarSign /> Cost of Production
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Detailed monthly analysis per tea type</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar size={14}/> ACTIVE MONTH
                        </label>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="p-2.5 border border-green-200 dark:border-green-900/50 rounded-lg bg-white dark:bg-zinc-950 shadow-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700 dark:text-gray-200 transition-colors"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                        <button 
                            onClick={() => setShowRangeModal(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
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
                                className={`px-4 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${(loading || records.length === 0) ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                            >
                                <FileDown size={18} /> Single PDF
                            </button>
                        ) : (
                            <PDFDownloader 
                                title="Cost of Production Summary"
                                subtitle={`Month: ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })} | Global Rates -> G/L: Rs.${monthlyGlRate} | Labour: Rs.${labourRate} | Electricity: Rs.${electricityRate}`}
                                headers={["Tea Type", "Cost Category", "Basis", "Cost (LKR)"]}
                                data={getSinglePdfData()}
                                uniqueCode={uniqueCode}
                                fileName={`Cost_Of_Production_${selectedMonth}.pdf`}
                                orientation="portrait"
                                disabled={loading || records.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                            />
                        )}

                        <button 
                            onClick={handleSaveToDatabase}
                            disabled={isSaving || records.length === 0 || isSaved || isViewer}
                            className={`px-4 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                                (isSaving || records.length === 0 || isSaved || isViewer) ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600'
                            }`}
                        >
                            {isViewer ? <Eye size={18}/> : <Save size={18} />} 
                            {isViewer ? "View Only" : isSaving ? "Saving..." : isSaved ? "Saved to DB" : "Save to DB"}
                        </button>
                    </div>
                </div>
            </div>

            {isViewer && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                    <Info size={20} />
                    <p className="text-sm font-medium">You are logged in as a <strong className="dark:text-white">Viewer</strong>. You can only view the data and download reports. Editing and saving are disabled.</p>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400 font-bold">Processing Monthly Data...</div>
            ) : records.length > 0 ? (
                <>
                    <div className={`bg-white dark:bg-zinc-900 p-6 rounded-xl border shadow-sm mb-10 transition-colors duration-300 ${isViewer ? 'border-gray-200 dark:border-zinc-800 opacity-90' : 'border-gray-200 dark:border-zinc-800'}`}>
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                            <span className="text-orange-500 font-bold text-lg">⚯</span>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                                ADJUST RATES (LKR) {isViewer && "(Read Only)"}
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">G/L RATE (PER KG)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-sm font-bold">Rs.</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={monthlyGlRate === 0 ? '' : monthlyGlRate} 
                                        onChange={handleRateChange(setMonthlyGlRate)}
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isViewer}
                                        className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                                        placeholder="0.00" 
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">LABOUR RATE (PER HEAD)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-sm font-bold">Rs.</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={labourRate} 
                                        onChange={handleRateChange(setLabourRate)}
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isViewer}
                                        className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">ELECTRICITY RATE (PER UNIT)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-sm font-bold">Rs.</span>
                                    <input 
                                        type="number"
                                        min="0" 
                                        value={electricityRate} 
                                        onChange={handleRateChange(setElectricityRate)}
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isViewer}
                                        className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {records.map((item) => {
                            const glCost = item.selectedWeight * Number(monthlyGlRate || 0);
                            const selectionCost = item.selectionWorkers * Number(labourRate || 0);
                            const electricityCost = item.dryerUnits * Number(electricityRate || 0);
                            const supCost = supervisionCosts[item.teaType] || 0;
                            const handRollingCost = item.hrWorkers * Number(labourRate || 0);
                            const totalCost = glCost + selectionCost + handRollingCost + electricityCost + supCost;

                            return (
                                <div key={item.teaType} className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden border transition-colors duration-300 ${isViewer ? 'border-gray-200 dark:border-zinc-800 opacity-95' : 'border-gray-200 dark:border-zinc-800'}`}>
                                    <div className="bg-[#1B6A31] dark:bg-green-800 p-4 text-white flex justify-between items-center px-8 transition-colors">
                                        <h3 className="text-xl font-bold">{item.teaType}</h3>
                                        <span className="bg-white/20 dark:bg-white/10 px-4 py-1 rounded-full text-sm font-semibold">
                                            Total Output: {item.madeTeaWeight.toFixed(3)} kg
                                        </span>
                                    </div>

                                    <div className="p-8 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest border-b border-gray-100 dark:border-zinc-800">
                                                    <th className="pb-4 font-bold">Type of Cost</th>
                                                    <th className="pb-4 font-bold text-right">Basis</th>
                                                    <th className="pb-4 font-bold text-right">Cost (Rs.)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">Green Leaf (G/L) Cost</td>
                                                    <td className="py-4 text-right text-gray-500 dark:text-gray-400">{item.selectedWeight.toFixed(2)} kg @ Rs.{monthlyGlRate}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900 dark:text-gray-100">{glCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">G/L Selection Cost</td>
                                                    <td className="py-4 text-right text-gray-500 dark:text-gray-400">{item.selectionWorkers > 0 ? `${item.selectionWorkers} Worker days` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900 dark:text-gray-100">{selectionCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">Hand Rolling Cost</td>
                                                    <td className="py-4 text-right text-gray-500 dark:text-gray-400">{item.hrWorkers > 0 ? `${item.hrWorkers} Worker days` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900 dark:text-gray-100">{handRollingCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">Electricity Cost</td>
                                                    <td className="py-4 text-right text-gray-500 dark:text-gray-400">{item.dryerUnits > 0 ? `${item.dryerUnits} Units Used` : '-'}</td>
                                                    <td className="py-4 text-right font-bold text-gray-900 dark:text-gray-100">{electricityCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">Supervision Cost</td>
                                                    <td className="py-4 text-right">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            value={supervisionCosts[item.teaType] === 0 ? '' : (supervisionCosts[item.teaType] || '')}
                                                            placeholder="Manual Input"
                                                            disabled={isViewer}
                                                            className="w-32 p-1 border border-gray-300 dark:border-zinc-700 rounded text-right focus:ring-1 focus:ring-green-400 outline-none bg-white dark:bg-zinc-950 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors"
                                                            onChange={(e) => handleSupervisionChange(item.teaType, e.target.value)}
                                                            onWheel={(e) => e.target.blur()}
                                                        />
                                                    </td>
                                                    <td className="py-4 text-right font-bold text-gray-900 dark:text-gray-100">{supCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-green-50/50 dark:bg-green-900/10 transition-colors">
                                                    <td colSpan="2" className="py-5 px-4 text-lg font-bold text-[#1B6A31] dark:text-green-500">Total Production Cost ({item.teaType})</td>
                                                    <td className="py-5 px-4 text-right text-2xl font-black text-[#1B6A31] dark:text-green-400">
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

                    <div className="mt-10 bg-[#1B6A31] dark:bg-green-800 text-white rounded-2xl shadow-xl overflow-hidden border border-green-800 dark:border-green-900 transition-colors duration-300">
                        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 dark:bg-black/20 p-4 rounded-full">
                                    <Calculator size={25} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-wider">Grand Total</h2>
                                    <p className="text-green-100 dark:text-green-200 font-medium text-md">Sum of all production costs for {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-green-200 dark:text-green-300 font-bold uppercase tracking-widest block mb-1">Total LKR</span>
                                <span className="text-xl md:text-3xl font-black">
                                    Rs. {grandTotalAllTeas.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-zinc-900 p-20 text-center rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-gray-500 transition-colors duration-300">
                    No production records found for the selected month.
                </div>
            )}
        </div>
    );
}