import React, { useState, useEffect } from 'react';
import { FileWarning, Trash2, Edit3, Save, Plus, RefreshCw, Database, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MissingRecords = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // Filter States
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [section, setSection] = useState('All Sections'); 
    
    const [generatedTables, setGeneratedTables] = useState([]);
    const [savedLogs, setSavedLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSavedLogs();
    }, []);

    const handleAutoGenerate = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const sectionsToFetch = section === 'All Sections' 
                ? ['H/T Factory', 'Packing Section', 'Local Sale','Manufacturer', 'Factory'] 
                : [section];

            const newTables = [];

            await Promise.all(sectionsToFetch.map(async (sec) => {
                const res = await fetch(`${BACKEND_URL}/api/system-audit/auto-generate?startDate=${startDate}&endDate=${endDate}&section=${sec}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (res.ok) {
                    newTables.push({
                        id: Date.now() + Math.random(),
                        section: sec,
                        startDate: startDate,
                        endDate: endDate,
                        records: result.data,
                        editingLogId: null
                    });
                } else {
                    toast.error(`Failed to generate data for ${sec}`);
                }
            }));

            setGeneratedTables(prev => [...newTables, ...prev]);
            toast.success("Data generated successfully");
            
        } catch (error) {
            toast.error("Error generating data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddManualRow = (tableId) => {
        setGeneratedTables(prev => prev.map(table => {
            if (table.id === tableId) {
                return { ...table, records: [...table.records, { id: Date.now(), date: '', moduleName: '', details: '' }] };
            }
            return table;
        }));
    };

    const handleRowChange = (tableId, rowId, field, value) => {
        setGeneratedTables(prev => prev.map(table => {
            if (table.id === tableId) {
                const updatedRecords = table.records.map(row => row.id === rowId ? { ...row, [field]: value } : row);
                return { ...table, records: updatedRecords };
            }
            return table;
        }));
    };

    const handleRemoveRow = (tableId, rowId) => {
        setGeneratedTables(prev => prev.map(table => {
            if (table.id === tableId) {
                return { ...table, records: table.records.filter(row => row.id !== rowId) };
            }
            return table;
        }));
    };

    const handleRemoveTable = (tableId) => {
        setGeneratedTables(prev => prev.filter(table => table.id !== tableId));
    };

    const handleSaveLog = async (tableId) => {
        const tableToSave = generatedTables.find(t => t.id === tableId);
        if (!tableToSave || tableToSave.records.length === 0) return toast.error("No data to save!");
        
        const payload = { 
            startDate: tableToSave.startDate, 
            endDate: tableToSave.endDate, 
            section: tableToSave.section, 
            records: tableToSave.records 
        };
        
        const toastId = toast.loading(`Saving ${tableToSave.section} log...`);
        try {
            const token = localStorage.getItem('token');
            const url = tableToSave.editingLogId 
                ? `${BACKEND_URL}/api/system-audit/logs/${tableToSave.editingLogId}` 
                : `${BACKEND_URL}/api/system-audit/logs`;
            const method = tableToSave.editingLogId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(`Log ${tableToSave.editingLogId ? 'updated' : 'saved'} successfully!`, { id: toastId });
                fetchSavedLogs();
                handleRemoveTable(tableId);
            } else {
                toast.error("Failed to save log", { id: toastId });
            }
        } catch (error) {
            toast.error("Error saving log", { id: toastId });
        }
    };

    const fetchSavedLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-audit/logs`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (res.ok) setSavedLogs(result.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditSavedLog = (log) => {
        const newTable = {
            id: Date.now() + Math.random(),
            section: log.section,
            startDate: log.startDate,
            endDate: log.endDate,
            records: log.records.map(r => ({ ...r, id: r._id || Date.now() + Math.random() })),
            editingLogId: log._id
        };
        setGeneratedTables(prev => [newTable, ...prev]);
    };

    const handleDeleteSavedLog = async (id) => {
        if (!window.confirm("Delete this saved record?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-audit/logs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                toast.success("Deleted!");
                fetchSavedLogs();
            }
        } catch (error) { 
            toast.error("Error deleting"); 
        }
    };

// =====================================================================
    // 💡 PDF Generate කරන ප්‍රධාන Function එක (වෙන වෙනම Tables සෑදීම)
    // =====================================================================
    const handleDownloadPDF = async (isCombined, singleTableData = null) => {
        const toastId = toast.loading("Generating PDF...");
        const doc = new jsPDF('portrait');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            // 1. Logo එක Load කිරීම
            try {
                const res = await fetch("/logo.png");
                if (res.ok) {
                    const blob = await res.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    doc.addImage(dataUrl, "PNG", 14, 10, 24, 24, "", "FAST");
                }
            } catch (err) {
                console.warn("Logo not found");
            }

            // 2. Company Name සහ මාතෘකා
            doc.setFontSize(18);
            doc.setTextColor(27, 106, 49); // Theme Green
            doc.setFont(undefined, 'bold');
            doc.text("ATHUKORALA GROUP (PVT) LTD", 42, 18);

            const docTitle = isCombined ? "COMBINED DATA AUDIT REPORT" : "SYSTEM DATA AUDIT REPORT";
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40); 
            doc.text(docTitle, 42, 26);

            const docSubtitle = isCombined 
                ? "Missing records across selected sections" 
                : `Section: ${singleTableData.section} | ${singleTableData.startDate} to ${singleTableData.endDate}`;
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80); 
            doc.setFont(undefined, 'normal');
            doc.text(docSubtitle, 42, 33);

            // 3. Date & Time සහ Ref Number
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            hours = hours % 12 || 12;
            const generatedDateTime = `${year}/${month}/${day} ${hours}.${minutes}${ampm}`;

            const uniqueCode = isCombined ? "AUDIT-ALL" : `AUDIT-${singleTableData.section.substring(0, 3).toUpperCase()}`;

            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Doc Ref: ${uniqueCode}`, pageWidth - 14, 20, { align: 'right' });
            doc.text(`Generated: ${generatedDateTime}`, pageWidth - 14, 25, { align: 'right' });

            const formatSafeDate = (text) => (text || '').replace(/-/g, '/');
            const finalHeaders = [["Date Range", "Module / Subject", "Missing Details"]];

            // =========================================================
            // 💡 4. Tables Generate කිරීමේ ප්‍රධාන තර්කය (වෙන වෙනම)
            // =========================================================
            if (isCombined) {
                let currentY = 45; // පළමු Table එක පටන් ගන්නා තැන

                generatedTables.forEach((table) => {
                    // 💡 අලුත් තර්කය: Table එකේ මාතෘකාව සහ පේළි කිහිපයක් සඳහා ප්‍රමාණවත් ඉඩක් (Space) නැත්නම් අලුත් පිටුවක් ගන්න.
                    // කලින් තිබුණේ 30යි. දැන් එය 50ක් කර ඇත, එවිට Header එක පමණක් පහළින් ඉතිරි නොවේ.
                    if (currentY > pageHeight - 50) { 
                        doc.addPage();
                        currentY = 20; // අලුත් පිටුවේ පටන් ගන්නා උස
                    }

                    // 💡 Table එකට උඩින් අදාළ Section එකේ නම (මාතෘකාව) මුද්‍රණය කිරීම
                    doc.setFontSize(11);
                    doc.setTextColor(40, 40, 40);
                    doc.setFont(undefined, 'bold');
                    const sectionTitle = `--- ${table.section.toUpperCase()} (${formatSafeDate(table.startDate)} to ${formatSafeDate(table.endDate)}) ---`;
                    doc.text(sectionTitle, 14, currentY);

                    currentY += 5; // මාතෘකාව සහ Table එක අතර පරතරය

                    // Table එකේ Data ටික සකස් කිරීම
                    const tableBody = table.records.map(r => [formatSafeDate(r.date), r.moduleName, r.details]);

                    // 💡 වෙනම Table එකක් ලෙස Generate කිරීම
                    autoTable(doc, {
                        startY: currentY,
                        head: finalHeaders,
                        body: tableBody,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [35, 164, 74], // Theme Green
                            textColor: 255,
                            fontSize: 9,
                            halign: 'center',
                            valign: 'middle'
                        },
                        bodyStyles: { fontSize: 8, halign: 'center' },
                        columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
                        margin: { bottom: 20 }
                    });

                    // ඊළඟ Table එක පටන් ගන්නා තැන (අවසන් වූ Table එකට පහළින්)
                    currentY = doc.lastAutoTable.finalY + 15; 
                });
            } else {
                // තනි Section එකක් පමණක් Download කරන විට (Single Table)
                const tableBody = singleTableData.records.map(r => [formatSafeDate(r.date), r.moduleName, r.details]);
                autoTable(doc, {
                    startY: 45,
                    head: finalHeaders,
                    body: tableBody,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [35, 164, 74],
                        textColor: 255,
                        fontSize: 9,
                        halign: 'center',
                        valign: 'middle'
                    },
                    bodyStyles: { fontSize: 8, halign: 'center' },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
                    margin: { bottom: 20 }
                });
            }

            // 5. පිටු අංක (Page Numbers)
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            // 6. PDF එක ඩවුන්ලෝඩ් කිරීම
            const outFileName = isCombined 
                ? `Combined_Audit_Report.pdf` 
                : `Audit_Report_${singleTableData.section.replace(/\s+/g, '_')}.pdf`;
                
            doc.save(outFileName);
            toast.success("PDF Downloaded successfully!", { id: toastId });

        } catch (error) {
            console.error("PDF Processing Error: ", error);
            toast.error("Failed to generate PDF.", { id: toastId });
        }
    };

    return (
        <div className="p-4 sm:p-8 w-full min-h-[600px] font-sans">
            
            {/* Top Control Bar */}
            {/* Top Control Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                
                {/* Left Side: Title */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex-shrink-0">
                        <FileWarning size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-tight">System Data Audit</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Track & Manage Missing Data Logs</p>
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full xl:w-auto bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    
                    {/* Date Inputs */}
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 p-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none w-36" />
                        <span className="text-slate-400 font-bold text-sm">To</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 p-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none w-36" />
                    </div>
                    
                    {/* Section Dropdown */}
                    <select value={section} onChange={(e) => setSection(e.target.value)} className="bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 p-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none min-w-[140px] flex-grow xl:flex-grow-0">
                        <option value="All Sections">All Sections</option>
                        <option value="H/T Factory">H/T Factory</option>
                        <option value="Packing Section">Packing Section</option>
                        <option value="Local Sale">Local Sale Section</option>
                        <option value="Factory">Factory Section</option>
                        <option value="Manufacturer">Manufacturer Section           </option>
                    </select>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-grow xl:flex-grow-0">
                        <button onClick={handleAutoGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 flex-grow xl:flex-grow-0 whitespace-nowrap">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Generate
                        </button>
                        
                        {/* 💡 Common Download PDF button for ALL generated tables */}
                        {generatedTables.length > 0 && (
                            <button onClick={() => handleDownloadPDF(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-sm font-bold flex-grow xl:flex-grow-0 whitespace-nowrap">
                                <Download size={16} /> All PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Multiple Generated Tables */}
            {generatedTables.map((table) => (
                <div key={table.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 mb-6 animate-in fade-in zoom-in-95">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div>
                            <h2 className="text-lg font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Missing Records : {table.section}
                            </h2>
                            <p className="text-sm font-semibold text-slate-500">{table.startDate} to {table.endDate}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            
                            {/* 💡 තනි Table එකක් පමණක් Download කිරීමේ Button එක */}
                            <button onClick={() => handleDownloadPDF(false, table)} className="px-3 py-2 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200">
                                <Download size={16} /> PDF
                            </button>

                            <button onClick={() => handleAddManualRow(table.id)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                <Plus size={16} /> Add Row
                            </button>
                            <button onClick={() => handleSaveLog(table.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center gap-2">
                                <Save size={16} /> Save
                            </button>
                            <button onClick={() => handleRemoveTable(table.id)} className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-sm rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-2">
                                <X size={16} /> Remove
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="px-4 py-3 w-60">Date Range</th>
                                    <th className="px-4 py-3 w-48">Module / Subject</th>
                                    <th className="px-4 py-3">Missing Details & Remark</th>
                                    <th className="px-4 py-3 w-20 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {table.records.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400">No missing data found!</td></tr>}
                                {table.records.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="p-2">
                                            <input type="text" placeholder="e.g. 2026-10-21 to 2026-10-31" value={row.date} onChange={(e) => handleRowChange(table.id, row.id, 'date', e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded p-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" placeholder="e.g. Green Leaf" value={row.moduleName} onChange={(e) => handleRowChange(table.id, row.id, 'moduleName', e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" />
                                        </td>
                                        <td className="p-2">
                                            <input type="text" placeholder="Explain missing data..." value={row.details} onChange={(e) => handleRowChange(table.id, row.id, 'details', e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded p-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500" />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleRemoveRow(table.id, row.id)} className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Saved Logs Database Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6">
                <h2 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-blue-500" /> Saved Audit Logs
                </h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">Section</th>
                                <th className="px-4 py-3">Date Range</th>
                                <th className="px-4 py-3">Missing Items Count</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {savedLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm">
                                    <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{log.section}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{log.startDate} to {log.endDate}</td>
                                    <td className="px-4 py-3 text-rose-500 font-bold">{log.records.length} items</td>
                                    <td className="px-4 py-3 flex justify-center gap-2">
                                        <button onClick={() => handleEditSavedLog(log)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit3 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteSavedLog(log._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {savedLogs.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-400">No saved audit logs.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MissingRecords;