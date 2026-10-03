import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, RefreshCw, FileText, Download, Save, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Predefined grades removed as requested
const PREDEFINED_GRADES = [];

const createDefaultSec8 = () => {
    const rows = PREDEFINED_GRADES.map(grade => ({
        grade,
        auction: '',
        private: '',
        forward: '',
        exFactory: '',
        direct: '',
        gifts: '',
        other: '',
        total: 0
    }));
    while (rows.length < 17) {
        rows.push({ grade: '', auction: '', private: '', forward: '', exFactory: '', direct: '', gifts: '', other: '', total: 0 });
    }
    return rows.slice(0, 17);
};

export default function TC5ManualReport() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const getCurrentMonth = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [loading, setLoading] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [savingDb, setSavingDb] = useState(false);

    const [refuseTea, setRefuseTea] = useState({ bf: "", manufactured: "", sold: "", manure: "", other: "" });
    const [reportData, setReportData] = useState({
        sec2: { bf: '', ownLeaf: '', boughtLeaf: '', otherEstate: '', otherFactory: '', total: 0, disposals: '', closing: 0 },
        sec3: { best: '', below: '', poor: '' },
        sec8: createDefaultSec8()
    });

    useEffect(() => {
        fetchSavedReport();
    }, [selectedMonth]);

    const fetchSavedReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BACKEND_URL}/api/tc5manualreport?month=${selectedMonth}`, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            });

            if (res.ok) {
                const savedReport = await res.json();
                if (savedReport) {
                    if (savedReport.section5_refuseTea) {
                        setRefuseTea({
                            bf: savedReport.section5_refuseTea.bf ?? "",
                            manufactured: savedReport.section5_refuseTea.manufactured ?? "",
                            sold: savedReport.section5_refuseTea.sold ?? "",
                            manure: savedReport.section5_refuseTea.manure ?? "",
                            other: savedReport.section5_refuseTea.other ?? ""
                        });
                    }

                    const sec2 = savedReport.section2_manufacture || {
                        bf: '', ownLeaf: '', boughtLeaf: '', otherEstate: '', otherFactory: '', total: 0, disposals: '', closing: 0
                    };

                    const sec3 = savedReport.section3_averageLeaf || { best: '', below: '', poor: '' };

                    let baseSec8 = createDefaultSec8();

                    if (Array.isArray(savedReport.section8_disposals) && savedReport.section8_disposals.length > 0) {
                        const savedValidRows = savedReport.section8_disposals.filter(r => r.grade && r.grade.trim() !== '');

                        if (savedValidRows.length > 0) {
                            const savedMap = new Map();
                            savedValidRows.forEach(r => savedMap.set(r.grade.trim().toUpperCase(), r));

                            baseSec8 = baseSec8.map(defaultRow => {
                                if (!defaultRow.grade) return defaultRow;
                                const matched = savedMap.get(defaultRow.grade.toUpperCase());
                                if (matched) {
                                    savedMap.delete(defaultRow.grade.toUpperCase());
                                    return {
                                        ...defaultRow,
                                        ...matched,
                                        auction: matched.auction || '',
                                        private: matched.private || '',
                                        forward: matched.forward || '',
                                        exFactory: matched.exFactory || '',
                                        direct: matched.direct || '',
                                        gifts: matched.gifts || '',
                                        other: matched.other || '',
                                    };
                                }
                                return defaultRow;
                            });

                            savedMap.forEach(customRow => {
                                const emptyIdx = baseSec8.findIndex(r => !r.grade);
                                if (emptyIdx !== -1) {
                                    baseSec8[emptyIdx] = customRow;
                                } else {
                                    baseSec8.push(customRow);
                                }
                            });
                        }
                    }

                    while (baseSec8.length < 17) {
                        baseSec8.push({ grade: '', auction: '', private: '', forward: '', exFactory: '', direct: '', gifts: '', other: '', total: 0 });
                    }

                    setReportData({ sec2, sec3, sec8: baseSec8.slice(0, 17) });
                    return;
                }
            }
            resetToDefaults();
        } catch (error) {
            console.error("Failed to load saved report:", error);
            resetToDefaults();
        } finally {
            setLoading(false);
        }
    };

    const resetToDefaults = () => {
        setReportData({
            sec2: { bf: '', ownLeaf: '', boughtLeaf: '', otherEstate: '', otherFactory: '', total: 0, disposals: '', closing: 0 },
            sec3: { best: '', below: '', poor: '' },
            sec8: createDefaultSec8()
        });
        setRefuseTea({ bf: "", manufactured: "", sold: "", manure: "", other: "" });
    };

    const handleRefuseChange = (e) => {
        setRefuseTea({ ...refuseTea, [e.target.name]: e.target.value });
    };

    const handleSec2Change = (field, val) => {
        const updatedSec2 = { ...reportData.sec2, [field]: val };
        const bf = Number(updatedSec2.bf) || 0;
        const ownLeaf = Number(updatedSec2.ownLeaf) || 0;
        const boughtLeaf = Number(updatedSec2.boughtLeaf) || 0;
        const otherEstate = Number(updatedSec2.otherEstate) || 0;
        const otherFactory = Number(updatedSec2.otherFactory) || 0;
        const disposals = Number(updatedSec2.disposals) || 0;

        updatedSec2.total = bf + ownLeaf + boughtLeaf + otherEstate + otherFactory;
        updatedSec2.closing = updatedSec2.total - disposals;

        setReportData({ ...reportData, sec2: updatedSec2 });
    };

    const handleSec3Change = (field, val) => {
        setReportData({
            ...reportData,
            sec3: { ...reportData.sec3, [field]: val }
        });
    };

    const handleSec8Change = (index, field, val) => {
        const updatedSec8 = [...reportData.sec8];
        updatedSec8[index][field] = val;

        if (field !== 'grade') {
            const auction = Number(updatedSec8[index].auction) || 0;
            const priv = Number(updatedSec8[index].private) || 0;
            const forward = Number(updatedSec8[index].forward) || 0;
            const exFactory = Number(updatedSec8[index].exFactory) || 0;
            const direct = Number(updatedSec8[index].direct) || 0;
            const gifts = Number(updatedSec8[index].gifts) || 0;
            const other = Number(updatedSec8[index].other) || 0;

            updatedSec8[index].total = auction + priv + forward + exFactory + direct + gifts + other;
        }

        setReportData({ ...reportData, sec8: updatedSec8 });
    };

    const removeGradeRow = (index) => {
        const filtered = reportData.sec8.filter((_, idx) => idx !== index);
        while (filtered.length < 17) {
            filtered.push({ grade: '', auction: '', private: '', forward: '', exFactory: '', direct: '', gifts: '', other: '', total: 0 });
        }
        setReportData({ ...reportData, sec8: filtered.slice(0, 17) });
    };

    const refBalance = (Number(refuseTea.bf) || 0) + (Number(refuseTea.manufactured) || 0) - ((Number(refuseTea.sold) || 0) + (Number(refuseTea.manure) || 0) + (Number(refuseTea.other) || 0));

    const clearForm = () => {
        if (window.confirm("Are you sure you want to reset all data back to defaults?")) {
            resetToDefaults();
            toast.success("Form reset to defaults!");
        }
    };

    const saveToDB = async () => {
        setSavingDb(true);
        const toastId = toast.loading("Saving Manual Report to Database...");
        try {
            const token = localStorage.getItem("token");

            const payload = {
                month: selectedMonth,
                section2_manufacture: reportData.sec2,
                section3_averageLeaf: reportData.sec3,
                section5_refuseTea: refuseTea,
                section8_disposals: reportData.sec8,
                refuseBalance: refBalance,
                isManualEntry: true
            };

            const response = await fetch(`${BACKEND_URL}/api/tc5manualreport`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to save report to database");
            }

            toast.success("Report Saved Successfully!", { id: toastId });
            await fetchSavedReport();
            return true;
        } catch (err) {
            console.error("Save Error: ", err);
            toast.error("Error saving to database.", { id: toastId });
            return false;
        } finally {
            setSavingDb(false);
        }
    };

    const generatePDF = async () => {
        setGeneratingPdf(true);
        const saveSuccess = await saveToDB();
        if (!saveSuccess) {
            setGeneratingPdf(false);
            return;
        }

        const toastId = toast.loading("Generating PDF...");

        window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 250));

        try {
            const page1 = document.getElementById("tc5-page-1");
            const page2 = document.getElementById("tc5-page-2");

            const shiftTextUpInDoc = (clonedDoc) => {
                ["tc5-page-1", "tc5-page-2"].forEach((id) => {
                    const el = clonedDoc.getElementById(id);
                    if (!el) return;
                    const walker = clonedDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                    const nodes = [];
                    while (walker.nextNode()) {
                        if (walker.currentNode.nodeValue && walker.currentNode.nodeValue.trim()) {
                            nodes.push(walker.currentNode);
                        }
                    }
                    nodes.forEach((node) => {
                        const p = node.parentElement;
                        if (p && p.tagName !== "STYLE" && p.tagName !== "SCRIPT" && !p.classList.contains("pdf-shifted")) {
                            const s = clonedDoc.createElement("span");
                            s.className = "pdf-shifted";
                            s.style.position = "relative";
                            s.style.top = "-2pt";
                            s.style.display = "inline";
                            node.parentNode.insertBefore(s, node);
                            s.appendChild(node);
                        }
                    });
                });
            };

            const canvas1 = await html2canvas(page1, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => shiftTextUpInDoc(clonedDoc),
            });

            const canvas2 = await html2canvas(page2, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => shiftTextUpInDoc(clonedDoc),
            });

            const pdf = new jsPDF("p", "mm", "a4");

            const img1 = canvas1.toDataURL("image/png");
            pdf.addImage(img1, "PNG", 0, 0, 210, 297, undefined, "FAST");

            pdf.addPage();
            const img2 = canvas2.toDataURL("image/png");
            pdf.addImage(img2, "PNG", 0, 0, 210, 297, undefined, "FAST");

            pdf.save(`TC5_Manual_Report_${selectedMonth}.pdf`);
            toast.success("PDF Downloaded Successfully!", { id: toastId });
        } catch (err) {
            console.error("PDF screenshot failed:", err);
            toast.error("Failed to generate PDF.", { id: toastId });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const reportMonthText = new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const reportYearText = selectedMonth.substring(2, 4);

    const sec8Totals = reportData.sec8.reduce((acc, row) => {
        acc.auction += Number(row.auction) || 0;
        acc.private += Number(row.private) || 0;
        acc.forward += Number(row.forward) || 0;
        acc.exFactory += Number(row.exFactory) || 0;
        acc.direct += Number(row.direct) || 0;
        acc.gifts += Number(row.gifts) || 0;
        acc.other += Number(row.other) || 0;
        acc.total += Number(row.total) || 0;
        return acc;
    }, { auction: 0, private: 0, forward: 0, exFactory: 0, direct: 0, gifts: 0, other: 0, total: 0 });

    let lastDataRowIndex = -1;
    reportData.sec8.forEach((row, idx) => {
        if (row.grade && row.grade.trim() !== '') {
            lastDataRowIndex = idx;
        }
    });
    // Ensure TOTAL row renders at the bottom if the table is completely empty
    if (lastDataRowIndex === -1) lastDataRowIndex = 16; 

    return (
        <div className="w-full min-h-screen bg-slate-100 p-3 md:p-6 font-sans overflow-x-auto">

            {/* --- HEADER --- */}
            <div className="w-full max-w-[1200px] mx-auto mb-5 md:mb-8 flex flex-col gap-4 sm:gap-5 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-colors">

                <div className="w-full text-center sm:text-left border-b border-gray-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-gray-100 flex items-center justify-center sm:justify-start gap-2 uppercase tracking-tight">
                        <FileText className="text-blue-600 dark:text-blue-500" size={24} /> T.C.5 Manual Document Editor
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 font-medium mt-1">
                        Fully manual data entry mode. Enter all production values manually and download verified PDFs.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full">

                    <div className="relative flex-1 sm:flex-none w-full sm:w-auto sm:mr-auto">
                        <Calendar size={18} className="absolute left-3 top-3 text-slate-500 dark:text-gray-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-gray-200 cursor-pointer transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={saveToDB}
                            disabled={loading || savingDb || generatingPdf}
                            className="p-2.5 px-3 sm:px-4 flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            <Save size={18} />
                            <span className="font-bold text-xs sm:text-sm hidden sm:inline">{savingDb ? "Saving..." : "Save to DB"}</span>
                        </button>

                        <button
                            onClick={generatePDF}
                            disabled={loading || savingDb || generatingPdf}
                            className="p-2.5 px-3 sm:px-4 flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            <Download size={18} />
                            <span className="font-bold text-xs sm:text-sm hidden sm:inline">{generatingPdf ? "Processing..." : "Download PDF"}</span>
                        </button>

                        <button
                            onClick={fetchSavedReport}
                            disabled={loading || savingDb || generatingPdf}
                            className={`p-2.5 flex-1 sm:flex-none flex justify-center bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-gray-300 rounded-lg transition-colors shadow-sm ${(loading || savingDb || generatingPdf) ? "opacity-70 cursor-not-allowed" : ""}`}
                            title="Reload / Sync Saved Data"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin text-blue-600" : ""} />
                        </button> 
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold">Loading TC5 Report data...</p>
                </div>
            ) : (
                <div className="w-full flex flex-col gap-10 pb-12 items-center tc5-container" style={{ zoom: 1.15 }}>

                    <style>{`
                .tc5-paper * { box-sizing: border-box !important; }
                .tc5-paper { 
                  background-color: #ffffff !important; 
                  color: #000000 !important; 
                  font-family: "Times New Roman", Times, serif !important; 
                  font-size: 13px; 
                  line-height: 1.2; 
                  width: 794px !important; 
                  min-width: 794px !important; 
                  max-width: 794px !important; 
                  height: 1123px !important; 
                  padding: 20px 24px !important; 
                  box-sizing: border-box !important; 
                  position: relative; 
                  overflow: hidden; 
                }
                
                table.tc5-table { 
                  width: 100% !important; 
                  table-layout: fixed !important; 
                  border-collapse: separate !important; 
                  border-spacing: 0 !important; 
                  border-top: 1px solid #000000 !important; 
                  border-left: 1px solid #000000 !important; 
                  margin-top: 0 !important; 
                }
                table.tc5-table.no-top { border-top: none !important; }
                
                td.tc5-td { 
                  border-right: 1px solid #000000 !important; 
                  border-bottom: 1px solid #000000 !important; 
                  border-top: none !important; 
                  border-left: none !important; 
                  padding: 2px 3px !important; 
                  vertical-align: top; 
                  font-weight: normal; 
                }
                td.tc5-td-c { 
                  border-right: 1px solid #000000 !important; 
                  border-bottom: 1px solid #000000 !important; 
                  border-top: none !important; 
                  border-left: none !important; 
                  padding: 2px 3px !important; 
                  vertical-align: middle; 
                  text-align: center; 
                }
                th.tc5-th { 
                  border-right: 1px solid #000000 !important; 
                  border-bottom: 1px solid #000000 !important; 
                  border-top: none !important; 
                  border-left: none !important; 
                  padding: 2px 3px !important; 
                  vertical-align: top; 
                  font-weight: normal; 
                }
                
                .tc5-input { 
                  width: 100%; 
                  text-align: center; 
                  border: none; 
                  outline: none; 
                  background: transparent; 
                  font-weight: bold; 
                  font-family: inherit; 
                  font-size: 14px; 
                  color: #000000; 
                  padding: 1px 0; 
                }
                
                .bg-shade { background-color: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .border-left-fix { border-left: 1px solid #000000 !important; }
              `}</style>

                    {/* ============================== PAGE 1 ============================== */}
                    <div className="bg-white shadow-2xl border border-gray-300 overflow-hidden" style={{ width: '794px', height: '1123px' }}>
                        <div id="tc5-page-1" className="tc5-paper h-full flex flex-col relative">

                            {/* TABLE 1: TOP HEADER */}
                            <table className="tc5-table">
                                <tbody>
                                    <tr>
                                        <td className="tc5-td" style={{ padding: '4px 8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold', fontSize: '14px' }}>
                                                <div>
                                                    <span>MONTHLY TEA PRODUCTION RETURN FOR THE MONTH OF </span>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '90px', textAlign: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                                                        {reportMonthText}
                                                    </span>
                                                    <span> 20</span>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '35px', textAlign: 'center', fontWeight: 'bold', padding: '0 4px' }}>
                                                        {reportYearText}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>T.C.5/2008-1</div>
                                            </div>

                                            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', margin: '4px 0' }}>
                                                UNDER THE TEA CONTROL ACT NO 51 OF 1957
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px' }}>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline' }}>
                                                    <span style={{ fontWeight: 'bold' }}>20</span>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '30px', textAlign: 'center', fontWeight: 'bold', padding: '0 2px' }}></span>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', flex: 1, maxWidth: '240px', textAlign: 'center', fontWeight: 'bold', padding: '0 8px' }}></span>
                                                    <span style={{ marginLeft: '6px' }}>මස තේ නිෂ්පාදනය පිළිබඳ මාසික වාර්තාව</span>
                                                </div>
                                                <div style={{ fontSize: '12px', textAlign: 'right', minWidth: '80px' }}>
                                                    ටීසී 5/2008-1
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '2px' }}>
                                                1957 අංක 51 දරණ තේ පාලන පනත
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 2: SECTION 1 & SECTION 2 */}
                            <table className="tc5-table no-top">
                                <tbody>
                                    <tr>
                                        <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px' }}>1</td>
                                        <td className="tc5-td" style={{ width: '37%' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>1.1</span>
                                                <div>
                                                    <span style={{ fontSize: '13px' }}>Name of Factory :</span><br />
                                                    <span style={{ fontSize: '12px' }}>කම්හලේ නම</span>
                                                    <strong style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}>ATHUKORALA &nbsp;HANDMADE &nbsp;TEA &nbsp;FACTORY</strong>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tc5-td" style={{ width: '35%' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>1.2</span>
                                                <div>
                                                    <span style={{ fontSize: '13px' }}>Registered No</span><br />
                                                    <span style={{ fontSize: '12px' }}>ලියාපදිංචි අංකය</span>
                                                    <strong style={{ display: 'block', marginTop: '4px', letterSpacing: '1px', fontSize: '13px' }}>HT0049</strong>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tc5-td" style={{ width: '25%' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>1.3</span>
                                                <div>
                                                    <span style={{ fontSize: '13px' }}>Elevation</span><br />
                                                    <span style={{ fontSize: '12px' }}>පිහිටීම</span>
                                                    <strong style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}>Low Grown</strong>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '13px' }}>2</td>
                                        <td className="tc5-td">
                                            <span style={{ fontSize: '13px' }}>Production and stock position of orthodox made tea:</span><br />
                                            <span style={{ fontSize: '12px' }}>පාරම්පරික සකස් කළ තේ නිෂ්පාදනය සහ තොග තත්වය</span>
                                        </td>
                                        <td className="tc5-td bg-shade" style={{ verticalAlign: 'middle' }}>
                                            <span style={{ fontSize: '12px' }}>Management Type</span><br />
                                            <span style={{ fontSize: '11px' }}>කළමනාකරණ කාණ්ඩය</span>
                                        </td>
                                        <td className="tc5-td" style={{ padding: 0 }}>
                                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '20%' }}>
                                                            Plan<br />tation<br />
                                                            <span style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>☐</span>
                                                        </td>
                                                        <td style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '20%' }}>
                                                            Private<br /><br />
                                                            <strong style={{ fontSize: '12px' }}>[X]</strong>
                                                        </td>
                                                        <td style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '20%' }}>
                                                            Co-op<br /><br />
                                                            <span style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>☐</span>
                                                        </td>
                                                        <td style={{ borderRight: '1px solid #000', padding: '2px 4px', width: '20%' }}>
                                                            Tea<br />Shakthi<br />
                                                            <span style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>☐</span>
                                                        </td>
                                                        <td style={{ padding: '2px 4px', width: '20%' }}>
                                                            Other<br /><br />
                                                            <span style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>☐</span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 3: STOCK & MANUFACTURE */}
                            <table className="tc5-table no-top" style={{ textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th className="tc5-th" rowSpan="3" style={{ width: '3%', textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '10px', lineHeight: '1.2', letterSpacing: '1px' }}>
                                                OD<br />
                                                RO<br />
                                                TX<br />
                                                H<br />
                                                O
                                            </div>
                                        </th>
                                        <th className="tc5-th" rowSpan="3" style={{ width: '13%' }}>
                                            <span style={{ fontSize: '11px' }}>Stock of tea at the beginning of the month</span><br /><br />
                                            <span style={{ fontSize: '10px' }}>මාසය ආරම්භයේ දී තේ තොගය</span>
                                        </th>
                                        <th className="tc5-th" colSpan="4" style={{ textAlign: 'left', padding: '2px', fontSize: '12px' }}>
                                            Tel No / දුරකථන අංකය : <strong></strong>
                                        </th>
                                        <th className="tc5-th" colSpan="3" style={{ textAlign: 'left', padding: '2px' }}>
                                            <span style={{ fontSize: '11px' }}>Miscellaneous receipt of made tea</span><br />
                                            <span style={{ fontSize: '10px' }}>වෙනත් සකස් කල තේ ලබා ගත් මාර්ග</span>
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="tc5-th bg-shade border-left-fix" colSpan="4" style={{ textAlign: 'center', padding: '2px', fontSize: '13px' }}>
                                            <strong>Manufacture / නිෂ්පාදනය කිරීම</strong>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '11%' }}>
                                            <span style={{ fontSize: '11px' }}>Total</span><br /><br />
                                            <span style={{ fontSize: '10px' }}>එකතුව</span><br /><br />
                                            <center><strong>5</strong></center>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '13%' }}>
                                            <span style={{ fontSize: '11px' }}>Disposals during the month</span><br />
                                            <span style={{ fontSize: '10px' }}>මාසය තුල අපහරණය කළ ප්‍රමාණය</span><br />
                                            <center style={{ marginTop: '8px' }}><strong>6</strong></center>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '14%' }}>
                                            <span style={{ fontSize: '11px' }}>Stock of tea at the end of the month</span><br />
                                            <span style={{ fontSize: '10px' }}>මාසය අවසානයේ ඉතිරි තේ තොගය</span><br />
                                            <center style={{ marginTop: '8px' }}><strong>7</strong></center>
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="tc5-th border-left-fix" style={{ width: '11%' }}>
                                            <span style={{ fontSize: '11px' }}>From own leaf</span><br /><br />
                                            <span style={{ fontSize: '10px' }}>තම වත්තේ දළු වලින්</span><br />
                                            <center style={{ marginTop: '4px' }}><strong>1</strong></center>
                                        </th>
                                        <th className="tc5-th" style={{ width: '11%' }}>
                                            <span style={{ fontSize: '11px' }}>From leaf of other estates</span><br />
                                            <span style={{ fontSize: '10px' }}>වෙනත් වතුවල දළු වලින්</span><br />
                                            <center style={{ marginTop: '4px' }}><strong>2</strong></center>
                                        </th>
                                        <th className="tc5-th" style={{ width: '11%' }}>
                                            <span style={{ fontSize: '11px' }}>From bought leaf</span><br /><br />
                                            <span style={{ fontSize: '10px' }}>මිලට ගත් දළු වලින්</span><br />
                                            <center style={{ marginTop: '4px' }}><strong>3</strong></center>
                                        </th>
                                        <th className="tc5-th" style={{ width: '13%' }}>
                                            <span style={{ fontSize: '11px' }}>Manufactured by other factories</span><br />
                                            <span style={{ fontSize: '10px' }}>වෙනත් කම්හල් මගින් නිපදවාගත්</span><br />
                                            <center style={{ marginTop: '4px' }}><strong>4</strong></center>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-shade" style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>
                                        <td className="tc5-td-c" style={{ padding: '4px 2px', fontSize: '10px' }}>&nbsp;</td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.bf !== '' ? Number(reportData.sec2.bf).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.bf ?? ""} onChange={(e) => handleSec2Change('bf', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.ownLeaf !== '' ? Number(reportData.sec2.ownLeaf).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.ownLeaf ?? ""} onChange={(e) => handleSec2Change('ownLeaf', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.otherEstate !== '' ? Number(reportData.sec2.otherEstate).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.otherEstate ?? ""} onChange={(e) => handleSec2Change('otherEstate', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.boughtLeaf !== '' ? Number(reportData.sec2.boughtLeaf).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.boughtLeaf ?? ""} onChange={(e) => handleSec2Change('boughtLeaf', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.otherFactory !== '' ? Number(reportData.sec2.otherFactory).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.otherFactory ?? ""} onChange={(e) => handleSec2Change('otherFactory', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '4px' }}>{reportData.sec2.total > 0 ? Number(reportData.sec2.total).toFixed(1) : '-'}</td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{reportData.sec2.disposals !== '' ? Number(reportData.sec2.disposals).toFixed(1) : '-'}</span> : <input type="number" value={reportData.sec2.disposals ?? ""} onChange={(e) => handleSec2Change('disposals', e.target.value)} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '4px' }}>{reportData.sec2.closing > 0 ? Number(reportData.sec2.closing).toFixed(1) : '-'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 4: AVERAGE GREEN LEAF */}
                            <table className="tc5-table no-top">
                                <tbody>
                                    <tr>
                                        <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px' }}>3</td>
                                        <td className="tc5-td" style={{ width: '55%', verticalAlign: 'middle' }}>
                                            <span style={{ fontSize: '13px' }}>Average Green Tea Leaf Standard</span><br />
                                            <span style={{ fontSize: '12px' }}>සාමාන්‍ය අමු තේ දළු ප්‍රමිතිය</span>
                                        </td>
                                        <td className="tc5-td-c" style={{ width: '14%', padding: '2px' }}>
                                            <span style={{ fontSize: '12px' }}>Best</span><br /><span style={{ fontSize: '11px' }}>හොඳ</span><br />
                                            {generatingPdf ? (
                                                <span style={{ display: 'block', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }}>{reportData.sec3.best !== '' ? `${reportData.sec3.best}%` : '-'}</span>
                                            ) : (
                                                <div className="flex items-center justify-center mt-1">
                                                    <input type="number" value={reportData.sec3.best ?? ""} onChange={(e) => handleSec3Change('best', e.target.value)} className="tc5-input text-center text-base py-1" style={{ width: '50px' }} placeholder="-" />
                                                    <span className="font-bold text-base">%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="tc5-td-c" style={{ width: '14%', padding: '2px' }}>
                                            <span style={{ fontSize: '12px' }}>Below Best</span><br /><span style={{ fontSize: '11px' }}>සාමාන්‍ය</span><br />
                                            {generatingPdf ? (
                                                <span style={{ display: 'block', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }}>{reportData.sec3.below !== '' ? `${reportData.sec3.below}%` : '-'}</span>
                                            ) : (
                                                <div className="flex items-center justify-center mt-1">
                                                    <input type="number" value={reportData.sec3.below ?? ""} onChange={(e) => handleSec3Change('below', e.target.value)} className="tc5-input text-center text-base py-1" style={{ width: '50px' }} placeholder="-" />
                                                    <span className="font-bold text-base">%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="tc5-td-c" style={{ width: '14%', padding: '2px' }}>
                                            <span style={{ fontSize: '12px' }}>Poor</span><br /><span style={{ fontSize: '11px' }}>දුර්වල</span><br />
                                            {generatingPdf ? (
                                                <span style={{ display: 'block', fontWeight: 'bold', marginTop: '2px', fontSize: '16px' }}>{reportData.sec3.poor !== '' ? `${reportData.sec3.poor}%` : '-'}</span>
                                            ) : (
                                                <div className="flex items-center justify-center mt-1">
                                                    <input type="number" value={reportData.sec3.poor ?? ""} onChange={(e) => handleSec3Change('poor', e.target.value)} className="tc5-input text-center text-base py-1" style={{ width: '50px' }} placeholder="-" />
                                                    <span className="font-bold text-base">%</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 5: DETAILS OF PRIVATE SALES */}
                            <table className="tc5-table no-top" style={{ textAlign: 'center' }}>
                                <tbody>
                                    <tr>
                                        <td className="tc5-td-c" rowSpan="6" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px', borderRight: '1px solid #000000 !important' }}>4</td>
                                        <td className="tc5-td" colSpan="8" style={{ textAlign: 'left', fontWeight: 'bold' }}>
                                            <span style={{ fontSize: '13px' }}>Details of Private Sales</span><br /><span style={{ fontSize: '12px', fontWeight: 'normal' }}>පෞද්ගලික විකිණීම් පිළිබඳ විස්තර</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td-c bg-shade" style={{ width: '12%', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Garden marks</div>
                                            <div style={{ fontSize: '10px' }}>වෙළඳ ලකුණ</div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '10%', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Invoice No</div>
                                            <div style={{ fontSize: '10px' }}>ඉන්වොයිස් අංකය</div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '9%', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Grade</div>
                                            <div style={{ fontSize: '10px' }}>වර්ගය</div>
                                        </td>
                                        <td className="tc5-td bg-shade" style={{ width: '23%', textAlign: 'left', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Name of buyers</div>
                                            <div style={{ fontSize: '10px' }}>ගැණුම්කරුවන්ගේ නම</div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '10%', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Date of sale</div>
                                            <div style={{ fontSize: '10px' }}>විකුණුම් දිනය</div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '11%', lineHeight: '1.1', verticalAlign: 'middle', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Date of panel approved</div>
                                            <div style={{ fontSize: '10px', marginTop: '1px' }}>මණ්ඩල අනුමත...</div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '11%', padding: 0, verticalAlign: 'top' }}>
                                            <div style={{ padding: '2px', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '11px', lineHeight: '1.1' }}>
                                                <div>Price per Kg</div>
                                                <div style={{ fontSize: '10px', fontWeight: 'normal' }}>මිල කිලෝ එකකට</div>
                                            </div>
                                            <div style={{ display: 'flex', fontSize: '10px', fontWeight: 'bold' }}>
                                                <div style={{ width: '50%', borderRight: '1px solid #000', padding: '2px 0', textAlign: 'center' }}>Rs. රු.</div>
                                                <div style={{ width: '50%', padding: '2px 0', textAlign: 'center' }}>Cts ශත</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ width: '10%', lineHeight: '1.2', padding: '2px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Weight</div>
                                            <div style={{ fontSize: '10px' }}>Kgs බර</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td border-left-fix" style={{ height: '20px' }}>&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td" style={{ padding: 0 }}>
                                            <div style={{ display: 'flex', height: '100%', minHeight: '20px' }}>
                                                <div style={{ width: '50%', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div style={{ width: '50%' }}>&nbsp;</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td border-left-fix" style={{ height: '20px' }}>&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td-c" style={{ color: '#6a737f', fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.3em' }}>
                                            NIL
                                        </td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td" style={{ padding: 0 }}>
                                            <div style={{ display: 'flex', height: '100%', minHeight: '20px' }}>
                                                <div style={{ width: '50%', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div style={{ width: '50%' }}>&nbsp;</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td border-left-fix" style={{ height: '20px' }}>&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td" style={{ padding: 0 }}>
                                            <div style={{ display: 'flex', height: '100%', minHeight: '20px' }}>
                                                <div style={{ width: '50%', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div style={{ width: '50%' }}>&nbsp;</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td border-left-fix" colSpan="4" style={{ height: '20px' }}>&nbsp;</td>
                                        <td className="tc5-td-c" colSpan="2" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '8px', fontSize: '13px' }}>Total / එකතුව</td>
                                        <td className="tc5-td bg-shade" style={{ padding: 0 }}>
                                            <div style={{ display: 'flex', height: '100%', minHeight: '20px' }}>
                                                <div style={{ width: '50%', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div style={{ width: '50%' }}>&nbsp;</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td bg-shade">&nbsp;</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 6: REFUSE TEA */}
                            <table className="tc5-table no-top" style={{ textAlign: 'center' }}>
                                <tbody>
                                    <tr>
                                        <td className="tc5-td-c" rowSpan="3" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px', borderRight: '1px solid #000000 !important' }}>5</td>
                                        <td className="tc5-td" colSpan="6" style={{ textAlign: 'left' }}>
                                            <strong style={{ fontSize: '13px' }}>Refuse Tea</strong> <span style={{ fontSize: '12px' }}>කසල තේ</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td bg-shade" style={{ width: '16%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Stock brought<br />forward from previous month<br /><span style={{ fontSize: '10px' }}>ඉකුත් මාසයෙන් ඉදිරියට ගෙන ආ තොගය</span><br /><br /><center><strong>1</strong></center></div></td>
                                        <td className="tc5-td bg-shade" style={{ width: '16%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Manufactured<br />during the month<br /><span style={{ fontSize: '10px' }}>මාසය තුල නිපැයුම</span><br /><br /><br /><center><strong>2</strong></center></div></td>
                                        <td className="tc5-td bg-shade" style={{ width: '16%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Quantity<br />sold<br /><span style={{ fontSize: '10px' }}>විකුණු ප්‍රමාණය</span><br /><br /><br /><center><strong>3</strong></center></div></td>
                                        <td className="tc5-td bg-shade" style={{ width: '16%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Quantity used<br />as manure<br /><span style={{ fontSize: '10px' }}>පොහොර ලෙස යෙදූ ප්‍රමාණය</span><br /><br /><center><strong>4</strong></center></div></td>
                                        <td className="tc5-td bg-shade" style={{ width: '18%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Other disposals<br /><br /><span style={{ fontSize: '10px' }}>වෙනත් අපහරණයන්</span><br /><br /><br /><center><strong>5</strong></center></div></td>
                                        <td className="tc5-td bg-shade" style={{ width: '15%', textAlign: 'left', padding: '2px' }}><div style={{ fontSize: '11px' }}>Balance stock<br /><br /><span style={{ fontSize: '10px' }}>ඉතිරි තොගය</span><br /><br /><br /><center><strong>6</strong></center></div></td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td-c border-left-fix" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{refuseTea.bf !== '' ? refuseTea.bf : "-"}</span> : <input type="number" name="bf" value={refuseTea.bf ?? ""} onChange={handleRefuseChange} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{refuseTea.manufactured !== '' ? refuseTea.manufactured : "-"}</span> : <input type="number" name="manufactured" value={refuseTea.manufactured ?? ""} onChange={handleRefuseChange} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{refuseTea.sold !== '' ? refuseTea.sold : "-"}</span> : <input type="number" name="sold" value={refuseTea.sold ?? ""} onChange={handleRefuseChange} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{refuseTea.manure !== '' ? refuseTea.manure : "-"}</span> : <input type="number" name="manure" value={refuseTea.manure ?? ""} onChange={handleRefuseChange} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c" style={{ padding: '0' }}>
                                            {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '4px 0', fontSize: '14px' }}>{refuseTea.other !== '' ? refuseTea.other : "-"}</span> : <input type="number" name="other" value={refuseTea.other ?? ""} onChange={handleRefuseChange} className="tc5-input py-1" placeholder="-" />}
                                        </td>
                                        <td className="tc5-td-c bg-shade" style={{ fontWeight: 'bold', fontSize: '14px' }}>{refBalance > 0 ? refBalance.toFixed(2) : '-'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* TABLE 7: DETAILS & BROKERS */}
                            <table className="tc5-table no-top" style={{ marginBottom: '8px' }}>
                                <tbody>
                                    <tr>
                                        <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px' }}>6</td>
                                        <td className="tc5-td" colSpan="2" style={{ padding: '2px 4px' }}>
                                            <strong style={{ fontSize: '13px' }}>Details of Disposal of Refuse Tea:</strong><br />
                                            <span style={{ fontSize: '12px' }}>කසල තේ අපහරණය පිළිබඳ වැඩිමනත් විස්තර:</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', fontSize: '13px' }}>7</td>
                                        <td className="tc5-td" style={{ width: '48%', height: '75px', verticalAlign: 'top', padding: '4px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Name of brokers</div>
                                            <div style={{ fontSize: '11px', marginBottom: '2px' }}>තැරැව්කරුවන්ගේ නම</div>
                                            <div style={{ lineHeight: '1.4', fontSize: '12px' }}>
                                                <div>1. Lanka Commodity Brokers Ltd.</div>
                                                <div>2. Bartleet Produce Marketing (Pvt) Ltd.</div>
                                                <div style={{ color: '#4b5563' }}>3.........................................................................</div>
                                                <div style={{ color: '#4b5563' }}>4.........................................................................</div>
                                            </div>
                                        </td>
                                        <td className="tc5-td" style={{ width: '49%', verticalAlign: 'top', padding: '4px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Selling marks</div>
                                            <div style={{ fontSize: '11px', marginBottom: '2px' }}>වෙළඳ සලකුණ</div>
                                            <div style={{ lineHeight: '1.4', fontSize: '12px' }}>
                                                <div>1. Athukorala Group Super</div>
                                                <div>2. Athukorala Group</div>
                                                <div>3. Pitigala Tea</div>
                                                <div>4. Athukorala</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* COLOR CODE FOOTER */}
                            <div style={{ fontSize: '11px', marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '24px', borderTop: '1px solid #000', paddingTop: '8px' }}>
                                <div>
                                    <span style={{ fontSize: '12px' }}>Color code</span><br />
                                    <div style={{ marginLeft: '16px', lineHeight: '1.3' }}>
                                        &#10022; White paper = Orthodox tea Manufacture<br /><span style={{ marginLeft: '16px', fontSize: '10px' }}>සුදු කඩදාසිය=පාරම්පරික තේ නිෂ්පාදනය</span><br />
                                        &#10022; Green Paper = Green tea Manufacture<br /><span style={{ marginLeft: '16px', fontSize: '10px' }}>කොළ කඩදාසිය=හරිත තේ</span>
                                    </div>
                                </div>
                                <div>
                                    <br />
                                    <div style={{ marginLeft: '16px', lineHeight: '1.3' }}>
                                        &#10022; Blue paper = Orthodox + CT C or C. T. C Manufacture<br /><span style={{ marginLeft: '16px', fontSize: '10px' }}>නිල් කඩදාසිය=පාරම්පරික සහ සී ටී සී නිෂ්පාදනය හෝ සී ටී සී නිෂ්පාදනය</span><br />
                                        &#10022; Yellow Paper = Bio tea<br /><span style={{ marginLeft: '16px', fontSize: '10px' }}>කහ කඩදාසිය=ජීව තේ</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ============================== PAGE 2 ============================== */}
                    <div className="bg-white shadow-xl overflow-hidden mt-8 mb-24" style={{ width: '794px', height: '1123px' }}>
                        <div id="tc5-page-2" className="tc5-paper h-full flex flex-col relative box-border">

                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
                                08. Details of disposals of made tea<br />
                                <span style={{ fontSize: '13px', fontWeight: 'normal' }}>සකස් කළ තේ අපහරණය කිරීම පිළිබඳ විස්තරය</span>
                            </div>

                            {/* TABLE 8: DISPOSALS OF MADE TEA */}
                            <div className="relative" style={{ marginBottom: '8px' }}>
                                <table className="tc5-table tc5-table-first" style={{ textAlign: 'center', fontSize: '13px', margin: 0 }}>
                                    <thead className="bg-shade">
                                        <tr>
                                            <th className="tc5-th" style={{ width: '8%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Invoice<br />No</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>ඉන්වොයිස්<br />අංකය</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>1</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '10%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Grade</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>තේ<br />වර්ගය</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>2</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '12%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>For sale at colombo<br />auction</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>කොළඹ<br />වෙන්දේසියේ<br />විකිණීම සඳහා</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>3</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '7%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Private<br />sales<br />scheme</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>පුද්ගලික<br />විකිණීම<br />මත<br />විකිණීම<br />සඳහා</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>4</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '7%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Forward<br />contracts</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>මතු අදාල<br />ගිවිසුම් මත<br />විකිණීම සඳහා</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>5</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '7%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Ex<br />factory<br />sales</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>කර්මාන්ත<br />ශාලාවේදී<br />විකිණීම</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>6</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '10%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Exported<br />direct<br />in value<br />added form</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>එකතු කල<br />අගය සහිත<br />සෘජු<br />අපනයනය</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>7</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '10%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Gifts to<br />employee &<br />others</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>සේවකයන්ට<br />සහ වෙනත්<br />ප්‍රදානය<br />කිරීම්</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>8</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '12%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Tea<br />manufactured<br />for other estates<br />and returned</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>වෙනත් වතු වල<br />තේ දළු වලින්<br />නිපදවා ආපසු<br />භාරදුන් ප්‍රමාණය</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>9</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '7%', padding: '2px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Direct<br />sales</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>සෘජු<br />විකිණීම්</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>10</strong></div>
                                                </div>
                                            </th>
                                            <th className="tc5-th" style={{ width: '10%', padding: '2px', backgroundColor: '#f3f4f6' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                                                    <div style={{ textAlign: 'left', fontSize: '13px', lineHeight: '1.1' }}>Total</div>
                                                    <div style={{ textAlign: 'left', fontSize: '12px', lineHeight: '1.1', marginTop: '2px', flex: 1 }}>මුළු<br />එකතුව</div>
                                                    <div style={{ textAlign: 'center', marginTop: 'auto', fontSize: '13px' }}><strong>11</strong></div>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.sec8.map((row, idx) => (
                                            <React.Fragment key={idx}>
                                                <tr style={{ height: '20px' }} className="group">
                                                    <td className="tc5-td">&nbsp;</td>
                                                    <td className="tc5-td-c relative"  style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>{row.grade}</span>
                                                        ) : (
                                                            <div className="relative flex items-center justify-center">
                                                                <input
                                                                    type="text"
                                                                    value={row.grade || ""}
                                                                    onChange={(e) => handleSec8Change(idx, 'grade', e.target.value)}
                                                                    className="tc5-input relative z-10 bg-transparent"
                                                                    style={{ textTransform: 'uppercase' }}
                                                                    placeholder="-"
                                                                />
                                                                {row.grade && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeGradeRow(idx)}
                                                                        className="absolute right-0.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 z-20"
                                                                        title="Remove grade"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.auction !== '' ? Number(row.auction).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.auction ?? ""} onChange={(e) => handleSec8Change(idx, 'auction', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.private !== '' ? Number(row.private).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.private ?? ""} onChange={(e) => handleSec8Change(idx, 'private', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.forward !== '' ? Number(row.forward).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.forward ?? ""} onChange={(e) => handleSec8Change(idx, 'forward', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.exFactory !== '' ? Number(row.exFactory).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.exFactory ?? ""} onChange={(e) => handleSec8Change(idx, 'exFactory', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.direct !== '' ? Number(row.direct).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.direct ?? ""} onChange={(e) => handleSec8Change(idx, 'direct', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.gifts !== '' ? Number(row.gifts).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.gifts ?? ""} onChange={(e) => handleSec8Change(idx, 'gifts', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c" style={{ padding: 0 }}>
                                                        {generatingPdf ? (
                                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{row.other !== '' ? Number(row.other).toFixed(1) : '-'}</span>
                                                        ) : (
                                                            <input type="number" value={row.other ?? ""} onChange={(e) => handleSec8Change(idx, 'other', e.target.value)} className="tc5-input relative z-10 bg-transparent" placeholder="-" />
                                                        )}
                                                    </td>
                                                    <td className="tc5-td-c">&nbsp;</td>
                                                    <td className="tc5-td-c bg-shade" style={{ fontWeight: 'bold', fontSize: '14px' }}>{row.total > 0 ? Number(row.total).toFixed(1) : '-'}</td>
                                                </tr>

                                                {/* DYNAMIC TOTAL ROW */}
                                                {idx === lastDataRowIndex && (
                                                    <tr style={{ height: '20px' }} className="bg-shade">
                                                        <td className="tc5-td">&nbsp;</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>TOTAL</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.auction > 0 ? sec8Totals.auction.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.private > 0 ? sec8Totals.private.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.forward > 0 ? sec8Totals.forward.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.exFactory > 0 ? sec8Totals.exFactory.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.direct > 0 ? sec8Totals.direct.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.gifts > 0 ? sec8Totals.gifts.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.other > 0 ? sec8Totals.other.toFixed(1) : '-'}</td>
                                                        <td className="tc5-td-c">&nbsp;</td>
                                                        <td className="tc5-td-c" style={{ fontWeight: 'bold', fontSize: '14px' }}>{sec8Totals.total > 0 ? sec8Totals.total.toFixed(1) : '-'}</td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {/* NIL Overlay for Table 8 */}
                                {reportData.sec8.every(r => !r.grade || r.grade.trim() === '') && (
                                    <div className="absolute flex items-center justify-center pointer-events-none" style={{ top: '144px', bottom: '20px', left: 0, right: 0, zIndex: 5 }}>
                                        <span style={{ color: '#727d8a', fontWeight: 'bold', fontSize: '24px', letterSpacing: '0.4em', opacity: 0.7 }}>NIL</span>
                                    </div>
                                )}
                            </div>

                            {/* TABLE 9: DIRECT SALES */}
                            <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px', marginTop: '-6px' }}>
                                09. Direct sales - Sales made without the services of a broker<br />
                                <span style={{ fontSize: '12px', fontWeight: 'normal' }}>සෘජු විකිණීම් - තැරැව්කරුවෙකුගේ සේවාවකින් තොරව විකිණෙන ලද සකස් කළ තේ</span>
                            </div>

                            <table className="tc5-table" style={{ textAlign: 'left', fontSize: '12px', marginBottom: '0' }}>
                                <thead>
                                    <tr>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '13%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Garden marks</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>වෙළඳ ලකුණ</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '11%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Invoice No</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>ඉන්වොයිස්<br />අංකය</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '9%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Grade</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>වර්ගය</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '21%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Name of buyers</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>ගැණුම්කරුවන්ගේ<br />නම</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '10%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Date of sale</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>විකුණුම්<br />දිනය</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '12%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Date of panel<br />approve</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>මණ්ඩල අනුමත<br />කළ දිනය</div>
                                        </th>
                                        <th className="tc5-th" colSpan="2" style={{ width: '12%', textAlign: 'center', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Price per Kg.<br />(Rs. Rs./Cts.)</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>මිල කිලෝ එකකට<br />(රු./ශත)</div>
                                        </th>
                                        <th className="tc5-th" rowSpan="2" style={{ width: '12%', verticalAlign: 'top', padding: '2px' }}>
                                            <div style={{ fontSize: '13px', lineHeight: '1.1' }}>Weight Kgs</div>
                                            <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.1' }}>බර කිලෝ</div>
                                        </th>
                                    </tr>
                                    <tr>
                                        <th className="tc5-th" style={{ width: '6%', textAlign: 'center', padding: '2px', fontSize: '12px' }}>Rs. රු.</th>
                                        <th className="tc5-th" style={{ width: '6%', textAlign: 'center', padding: '2px', fontSize: '12px' }}>Cts. ශත</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className="tc5-td" style={{ height: '22px' }}>&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td></tr>
                                    <tr>
                                        <td className="tc5-td" style={{ height: '22px' }}>&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td-c" style={{ color: '#727d8a', fontWeight: 'bold', fontSize: '18px', letterSpacing: '0.3em' }}>
                                            NIL
                                        </td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                    </tr>
                                    <tr><td className="tc5-td" style={{ height: '22px' }}>&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td><td className="tc5-td">&nbsp;</td></tr>
                                    <tr>
                                        <td className="tc5-td" colSpan="6" style={{ textAlign: 'right', paddingRight: '8px', fontSize: '14px', fontWeight: 'bold' }}>Total එකතුව</td>
                                        <td className="tc5-td" colSpan="2">&nbsp;</td>
                                        <td className="tc5-td">&nbsp;</td>
                                    </tr>

                                    {/* DECLARATIONS BOX */}
                                    <tr>
                                        <td className="tc5-td" colSpan="9" style={{ padding: '6px 8px' }}>
                                            <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>I/We hereby declare that all the particulars furnished in this return are true and accurate.<br /><span style={{ fontSize: '12px' }}>මෙම වාර්තාවේ සපයා ඇති සියලු විස්තර සත්‍ය බවත් නිවැරදි බවත් මම / අපි මෙයින් ප්‍රකාශ කර සිටිමු / සිටිමි.</span></p>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px', marginBottom: '0px', textAlign: 'center', fontSize: '13px' }}>
                                                <div style={{ textAlign: 'left', width: '20%' }}>
                                                    Date :<br /><span style={{ fontSize: '12px' }}>දිනය</span>
                                                </div>
                                                <div style={{ width: '50%' }}>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginBottom: '-6px' }}></span><br />
                                                    Name of registered Manufacture / Superintendent<br />
                                                    <span style={{ fontSize: '12px' }}>ලි.ප නිෂ්පාදකයාගේ / අධිකාරීගේ නම</span>
                                                </div>
                                                <div style={{ width: '25%' }}>
                                                    <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginBottom: '-6px' }}></span><br />
                                                    Signature<br />
                                                    <span style={{ fontSize: '12px' }}>අත්සන</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td" colSpan="9" style={{ padding: '6px 8px' }}>
                                            <div style={{ fontSize: '13px' }}>
                                                State if any special remarks<br />
                                                <span style={{ fontSize: '12px' }}>විශේෂ විමර්ශන ඇත්නම් දක්වන්න</span>
                                                <br />
                                                <br />
                                                <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginTop: '1px' }}></span>
                                                <br />
                                                Date :<br />
                                                <span style={{ fontSize: '12px' }}>දිනය</span>
                                                <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '150px', marginLeft: '16px' }}></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="tc5-td" colSpan="9" style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            <p style={{ margin: 0, fontSize: '12px' }}>
                                                This return should be addressed to the assistant tea commissioner of your region on or before the fifth of the following month.<br />
                                                මෙම වාර්තාව ඔබ ප්‍රදේශයේ සහකාර තේ කොමසාරිස් වෙත ඊළඟ මාසයේ 05 දිනට හෝ ඊට පෙර එවිය යුතුය.
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}