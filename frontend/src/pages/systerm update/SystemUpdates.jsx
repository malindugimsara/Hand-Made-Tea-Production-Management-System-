import React, { useState, useEffect } from 'react';
import { 
    Calendar, Plus, FileDown, Edit3, Trash2, 
    Bug, Wrench, Sparkles, LayoutDashboard, X, FileText, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SystemUpdates = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const currentUsername = localStorage.getItem("username") || "System Developer";

    const getCurrentMonth = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
    };

    const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        _id: '',
        assignDate: new Date().toISOString().split('T')[0],
        completeDate: '',
        type: 'New Feature',
        section: '',
        title: '',
        description: ''
    });

    const updateTypes = ['Bug Fix', 'New Feature', 'System Optimization', 'Maintenance'];

    useEffect(() => {
        fetchUpdates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterMonth]);

    const fetchUpdates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-updates?month=${filterMonth}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setUpdates(result.data || []);
            } else {
                toast.error(result.message || "Failed to fetch updates");
            }
        } catch (error) {
            console.error(error);
            toast.error("Server error while fetching data");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (update = null) => {
        if (update) {
            setFormData(update);
            setIsEditing(true);
        } else {
            setFormData({
                _id: '',
                assignDate: new Date().toISOString().split('T')[0],
                completeDate: '',
                type: 'New Feature',
                section: '',
                title: '',
                description: ''
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading("Saving update record...");
        try {
            const token = localStorage.getItem('token');
            const url = isEditing 
                ? `${BACKEND_URL}/api/system-updates/${formData._id}` 
                : `${BACKEND_URL}/api/system-updates`;
            
            const method = isEditing ? 'PUT' : 'POST';
            
            // 💡 FIX: අලුත් වාර්තාවක් (New Record) සාදන විට හිස් _id එක ඉවත් කිරීම
            const payload = { ...formData };
            if (!isEditing) {
                delete payload._id;
            }
            
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload) // 💡 මෙතනට formData වෙනුවට 'payload' යොදා ඇත
            });

            const result = await res.json();
            if (res.ok && result.success) {
                toast.success(`Record ${isEditing ? 'updated' : 'added'} successfully!`, { id: toastId });
                setIsModalOpen(false);
                fetchUpdates();
            } else {
                toast.error(result.message || "Failed to save record", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error communicating with server", { id: toastId });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        
        const toastId = toast.loading("Deleting record...");
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-updates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (res.ok && result.success) {
                toast.success("Record deleted successfully!", { id: toastId });
                fetchUpdates();
            } else {
                toast.error(result.message || "Failed to delete record", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error communicating with server", { id: toastId });
        }
    };

    // 💡 Generate Monthly PDF Report
    const generatePDF = () => {
        if (updates.length === 0) {
            toast.error("No records found for the selected month to generate a report.");
            return;
        }

        // 💡 FIX 1: Enable built-in PDF compression
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true 
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Beautiful Header with Logos
        // 💡 FIX 2: Added 'FAST' compression alias to images to reduce file size
        try {
            doc.addImage('/logo.png', 'PNG', 14, 10, 26, 26, '', 'FAST');
        } catch (e) {
            console.warn("Company logo not found");
        }
        try {
            doc.addImage('/codecraftlogo.png', 'PNG', pageWidth - 40, 12, 24, 24, '', 'FAST');
        } catch (e) {
            console.warn("CodeCraft logo not found");
        }

        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 101, 52); 
        doc.text("ATHUKORALA GROUP (PVT) LTD", pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55); 
        doc.text("System Updates & Maintenance Report", pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(107, 114, 128); 
        const monthName = new Date(`${filterMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
        doc.text(`Reporting Period: ${monthName}   |   Generated On: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: 'center' });

        doc.setDrawColor(22, 101, 52); 
        doc.setLineWidth(0.5);
        doc.line(14, 42, pageWidth - 14, 42);

        // 💡 Data Separation
        const featureUpdates = updates.filter(u => u.type === 'New Feature');
        const maintenanceUpdates = updates.filter(u => u.type !== 'New Feature');

        let currentY = 52;

        // --- TABLE 1: NEW FEATURES ---
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(13, 148, 136); // Teal color
        doc.text("1. New Features & Enhancements", 14, currentY);
        currentY += 5;

        if (featureUpdates.length > 0) {
            const featureBody = featureUpdates.map((item, index) => [
                index + 1, item.assignDate, item.completeDate || 'Pending', item.section, item.title, item.description
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['No', 'Assign Date', 'Complete Date', 'Section', 'Title / Summary', 'Description']],
                body: featureBody,
                theme: 'grid',
                headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 25 }, 3: { cellWidth: 35 }, 4: { cellWidth: 50 }, 5: { cellWidth: 'auto' } },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
                alternateRowStyles: { fillColor: [240, 253, 250] } // Light Teal
            });
            currentY = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(156, 163, 175);
            doc.text("No new features recorded for this month.", 14, currentY + 5);
            currentY += 20;
        }

        // --- TABLE 2: MAINTENANCE & BUG FIXES ---
        // Add new page if space is too low
        if (currentY > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(217, 119, 6); // Amber color
        doc.text("2. System Maintenance & Bug Fixes", 14, currentY);
        currentY += 5;

        if (maintenanceUpdates.length > 0) {
            const maintBody = maintenanceUpdates.map((item, index) => [
                index + 1, item.assignDate, item.completeDate || 'Pending', item.type, item.section, item.title, item.description
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['No', 'Assign Date', 'Complete Date', 'Type', 'Section', 'Title / Summary', 'Description']],
                body: maintBody,
                theme: 'grid',
                headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'center', cellWidth: 25 }, 3: { halign: 'center', cellWidth: 35 }, 4: { cellWidth: 35 }, 5: { cellWidth: 50 }, 6: { cellWidth: 'auto' } },
                styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
                alternateRowStyles: { fillColor: [255, 251, 235] } // Light Amber
            });
            currentY = doc.lastAutoTable.finalY + 25;
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(156, 163, 175);
            doc.text("No maintenance records for this month.", 14, currentY + 5);
            currentY += 25;
        }

        // 3. Footer Signatures
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            currentY = 30;
        }

        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        
        doc.text("...........................................................", 40, currentY);
        doc.setFont(undefined, 'bold');
        doc.text("Checked By", 62, currentY + 6);
        doc.setFont(undefined, 'normal');
        doc.text("Authorized Officer / Manager", 47, currentY + 11);

        doc.text("...........................................................", pageWidth - 90, currentY);
        doc.setFont(undefined, 'bold');
        doc.text("Checked By", pageWidth - 68, currentY + 6);
        doc.setFont(undefined, 'normal');
        doc.text("Director / General Manager", pageWidth - 76, currentY + 11);

        const dateStr = new Date().toLocaleString();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Powered by CodeCraft  |  Unified Management System  |  ${dateStr}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

        doc.save(`System_Maintenance_Report_${filterMonth}.pdf`);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Bug Fix': return <Bug size={16} className="text-rose-500" />;
            case 'New Feature': return <Sparkles size={16} className="text-emerald-500" />;
            case 'System Optimization': return <Wrench size={16} className="text-blue-500" />;
            case 'Maintenance': return <LayoutDashboard size={16} className="text-amber-500" />;
            default: return <FileText size={16} />;
        }
    };

    const getTypeBadgeColor = (type) => {
        switch (type) {
            case 'Bug Fix': return "bg-rose-100 text-rose-700 border-rose-200";
            case 'New Feature': return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case 'System Optimization': return "bg-blue-100 text-blue-700 border-blue-200";
            case 'Maintenance': return "bg-amber-100 text-amber-700 border-amber-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
            
            {/* Header Area */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">System Updates & Notes</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Track bugs, new features, and maintenance logs</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                        <Calendar size={16} className="text-slate-500 mr-2" />
                        <input 
                            type="month" 
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        />
                    </div>
                    
                    <button 
                        onClick={generatePDF}
                        disabled={updates.length === 0}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                        <FileDown size={16} /> Monthly Report
                    </button>
                    
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                        <Plus size={16} /> Add Record
                    </button>
                </div>
            </div>

            {/* Updates List */}
            {/* 💡 Data Split for UI */}
            {(() => {
                const featureUpdates = updates.filter(u => u.type === 'New Feature');
                const maintenanceUpdates = updates.filter(u => u.type !== 'New Feature');

                // 💡 Reusable Row Renderer to avoid code duplication
                const renderRows = (items) => (
                    items.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4 align-top w-48">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{item.assignDate}</div>
                                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{item.section}</div>
                            </td>
                            <td className="px-6 py-4 align-top w-40">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${getTypeBadgeColor(item.type)}`}>
                                    {getTypeIcon(item.type)} {item.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 align-top max-w-md">
                                <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</div>
                                <div className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed whitespace-pre-line">
                                    {item.description}
                                </div>
                            </td>
                            <td className="px-6 py-4 align-top text-center w-36">
                                {item.completeDate ? (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                        Done: {item.completeDate}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                        Pending
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 align-top text-center w-24">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                );

                return loading ? (
                    <div className="flex justify-center items-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
                    </div>
                ) : updates.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
                        <CheckCircle2 size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400">No updates found for {filterMonth}</p>
                        <p className="text-sm">Click "Add Record" to log a new update.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Section 1: New Features Table */}
                        <div>
                            <h2 className="text-lg font-black text-teal-600 dark:text-teal-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                                <Sparkles size={20} /> 1. New Features & Enhancements
                            </h2>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                {featureUpdates.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-medium">No new features recorded for this month.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-teal-50 dark:bg-slate-800/80 border-b border-teal-100 dark:border-slate-700">
                                                <tr className="text-xs uppercase text-teal-700 dark:text-slate-400 tracking-wider">
                                                    <th className="px-6 py-4 font-bold">Date & Section</th>
                                                    <th className="px-6 py-4 font-bold">Type</th>
                                                    <th className="px-6 py-4 font-bold">Title / Description</th>
                                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                                    <th className="px-6 py-4 font-bold text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {renderRows(featureUpdates)}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 2: Maintenance & Bug Fixes Table */}
                        <div>
                            <h2 className="text-lg font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                                <Wrench size={20} /> 2. System Maintenance & Bug Fixes
                            </h2>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                {maintenanceUpdates.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-medium">No maintenance records for this month.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-amber-50 dark:bg-slate-800/80 border-b border-amber-100 dark:border-slate-700">
                                                <tr className="text-xs uppercase text-amber-700 dark:text-slate-400 tracking-wider">
                                                    <th className="px-6 py-4 font-bold">Date & Section</th>
                                                    <th className="px-6 py-4 font-bold">Type</th>
                                                    <th className="px-6 py-4 font-bold">Title / Description</th>
                                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                                    <th className="px-6 py-4 font-bold text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {renderRows(maintenanceUpdates)}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* End of Data Split logic */}

            {/* --- ADD / EDIT MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                {isEditing ? <Edit3 size={18} className="text-blue-500"/> : <Plus size={18} className="text-emerald-500"/>}
                                {isEditing ? 'Edit System Record' : 'Add New System Record'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className={labelClass}>Assign Date <span className="text-rose-500">*</span></label>
                                    <input type="date" name="assignDate" value={formData.assignDate} onChange={handleChange} required className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Complete Date</label>
                                    <input type="date" name="completeDate" value={formData.completeDate} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Update Type <span className="text-rose-500">*</span></label>
                                    <select name="type" value={formData.type} onChange={handleChange} required className={inputClass}>
                                        {updateTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>System Section <span className="text-rose-500">*</span></label>
                                    <input type="text" name="section" placeholder="e.g. B/L Operations" value={formData.section} onChange={handleChange} required className={inputClass} />
                                </div>
                            </div>
                            
                            <div className="mb-5">
                                <label className={labelClass}>Title / Short Summary <span className="text-rose-500">*</span></label>
                                <input type="text" name="title" placeholder="What was added or fixed?" value={formData.title} onChange={handleChange} required className={inputClass} />
                            </div>

                            <div className="mb-6">
                                <label className={labelClass}>Detailed Description</label>
                                <textarea 
                                    name="description" 
                                    rows="4" 
                                    placeholder="Explain the changes in detail..." 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    className={`${inputClass} resize-none`}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm">
                                    {isEditing ? 'Save Changes' : 'Submit Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SystemUpdates;