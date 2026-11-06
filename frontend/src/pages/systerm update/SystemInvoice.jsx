import React, { useState, useEffect } from 'react';
import { Calendar, FileDown, Receipt, Sparkles, X, CheckCircle2, Trash2, Edit3, Save, AlertTriangle, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SystemInvoice = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const getCurrentMonth = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    };

    const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
    const [updates, setUpdates] = useState([]);
    const [savedInvoices, setSavedInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal States
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceFeatures, setInvoiceFeatures] = useState([]);
    const [editInvoiceId, setEditInvoiceId] = useState(null); 
    
    // 💡 Animated Delete Modal State
    const [invoiceToDelete, setInvoiceToDelete] = useState(null); 

    useEffect(() => {
        fetchUpdates();
        fetchSavedInvoices();
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
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-invoices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (res.ok && result.success) {
                setSavedInvoices(result.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch invoices", error);
        }
    };

    const handleOpenInvoiceModal = () => {
        if (updates.length === 0) {
            toast.error("No records found to generate an invoice.");
            return;
        }
        const featureUpdates = updates.filter(u => u.type === 'New Feature');
        setInvoiceFeatures(featureUpdates.map(f => ({ title: f.title, cost: '' })));
        setEditInvoiceId(null);
        setIsInvoiceModalOpen(true);
    };

    const handleEditInvoice = (invoice) => {
        setFilterMonth(invoice.month);
        setInvoiceFeatures(invoice.features.map(f => ({ title: f.title, cost: f.cost })));
        setEditInvoiceId(invoice._id);
        setIsInvoiceModalOpen(true);
    };

    // 💡 Confirm Delete Function (Modal එකේ 'Yes, Delete' එබූ විට ක්‍රියාත්මක වේ)
    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        const toastId = toast.loading("Deleting invoice...");
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/system-invoices/${invoiceToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success("Invoice deleted successfully!", { id: toastId });
                fetchSavedInvoices();
            } else {
                toast.error("Failed to delete invoice.", { id: toastId });
            }
        } catch (error) {
            toast.error("Error communicating with server.", { id: toastId });
        } finally {
            setInvoiceToDelete(null); // Modal එක වසා දමයි
        }
    };

    const handleInvoiceCostChange = (index, value) => {
        const updated = [...invoiceFeatures];
        updated[index].cost = value;
        setInvoiceFeatures(updated);
    };

    const handleSaveAndGeneratePDF = async () => {
        const MAINTENANCE_FEE = 10000;
        let totalFeaturesCost = 0;
        
        const formattedFeatures = invoiceFeatures.map(f => {
            const cost = Number(f.cost) || 0;
            totalFeaturesCost += cost;
            return { title: f.title, cost: cost };
        });

        const grandTotal = MAINTENANCE_FEE + totalFeaturesCost;
        const invoiceNo = `INV-${filterMonth.replace('-', '')}`;
        const currentDate = new Date().toLocaleDateString();

        const payload = {
            invoiceNo,
            month: filterMonth,
            date: currentDate,
            maintenanceFee: MAINTENANCE_FEE,
            features: formattedFeatures,
            grandTotal
        };

        const toastId = toast.loading("Saving Invoice...");
        try {
            const token = localStorage.getItem('token');
            const url = editInvoiceId 
                ? `${BACKEND_URL}/api/system-invoices/${editInvoiceId}` 
                : `${BACKEND_URL}/api/system-invoices`;
            const method = editInvoiceId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(`Invoice ${editInvoiceId ? 'Updated' : 'Saved'} Successfully!`, { id: toastId });
                fetchSavedInvoices();
                setIsInvoiceModalOpen(false);
                generatePDF(invoiceNo, currentDate, formattedFeatures, MAINTENANCE_FEE, grandTotal);
            } else {
                toast.error("Failed to save invoice", { id: toastId });
            }
        } catch (error) {
            toast.error("Server Error", { id: toastId });
        }
    };

   const generatePDF = (invoiceNo, dateStr, features, maintenanceFee, grandTotal) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = doc.internal.pageSize.getWidth();
        const monthName = new Date(`${filterMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });

        try { doc.addImage('/codecraftlogo.png', 'PNG', 14, 12, 26, 26, '', 'FAST'); } catch (e) {}

        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42); 
        doc.text("INVOICE", pageWidth - 14, 22, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 116, 139); 
        doc.text(`Invoice No:`, pageWidth - 42, 29, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.setTextColor(15, 23, 42); 
        doc.text(invoiceNo, pageWidth - 14, 29, { align: 'right' });

        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(`Date:`, pageWidth - 42, 35, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(dateStr, pageWidth - 14, 35, { align: 'right' });

        doc.setDrawColor(226, 232, 240); 
        doc.setLineWidth(0.5);
        doc.line(14, 45, pageWidth - 14, 45);

        let currentY = 55;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(148, 163, 184); 
        doc.text("FROM:", 14, currentY);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); 
        doc.text("CodeCraft", 14, currentY + 6);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105); 
        doc.text("Software Development & IT Consultancy", 14, currentY + 12);
        doc.text("Sri Lanka", 14, currentY + 17);

        doc.setFillColor(248, 250, 252); 
        doc.setDrawColor(226, 232, 240); 
        doc.roundedRect(pageWidth / 2 - 5, currentY - 6, (pageWidth / 2) - 9, 30, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(148, 163, 184); 
        doc.text("BILL TO:", pageWidth / 2, currentY);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("Athukorala Group (Pvt) Ltd", pageWidth / 2, currentY + 6);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text("Manufacturing & Tea Exports", pageWidth / 2, currentY + 12);
        doc.text("No.1, Pitigala, Sri Lanka", pageWidth / 2, currentY + 17);

        currentY += 36; 

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 101, 52); // Blue Color
        doc.text(`Billing Period: ${monthName}`, 14, currentY);
        currentY += 6;

        const tableBody = [];
        tableBody.push(['1', `System Maintenance & Bug Fixes`, maintenanceFee.toFixed(2)]); 

        features.forEach((feature, index) => {
            if (feature.cost > 0) { 
                tableBody.push([`${tableBody.length + 1}`, `New Feature: ${feature.title}`, feature.cost.toFixed(2)]);
            }
        });

        autoTable(doc, {
            startY: currentY,
            head: [['No', 'Description', 'Amount (Rs)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [31, 41, 55], fontStyle: 'bold', lineWidth: 0.1, lineColor: [210, 210, 210] },
            columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 1: { cellWidth: 'auto' }, 2: { halign: 'right', cellWidth: 45 } },
            styles: { fontSize: 10, cellPadding: 5, lineWidth: 0.1, lineColor: [210, 210, 210] },
            alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        currentY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text("Grand Total:", pageWidth - 60, currentY, { align: 'right' }); 
        doc.setTextColor(22, 101, 52); 
        doc.text(`Rs. ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`, pageWidth - 14, currentY, { align: 'right' });

        // 💡 2. වෙනස: පිටුවේ පහළින් බැංකු විස්තර (Bank Details) එකතු කිරීම
        let footerY = doc.internal.pageSize.getHeight() - 45; // පහළින් පටන් ගන්නා තැන

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, footerY, pageWidth - 14, footerY); // ඉරි කෑල්ලක් උඩින් ගහනවා
        footerY += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Payment Details:", 14, footerY);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);

        // බැංකු විස්තර
        doc.text("Bank Name:", 14, footerY + 6);
        doc.setFont(undefined, 'bold');
        doc.text("COMMERCIAL BANK", 40, footerY + 6);

        doc.setFont(undefined, 'normal');
        doc.text("Account Name:", 14, footerY + 11);
        doc.setFont(undefined, 'bold');
        doc.text("M G S Amarasekara", 40, footerY + 11);

        doc.setFont(undefined, 'normal');
        doc.text("Account No:", 14, footerY + 16);
        doc.setFont(undefined, 'bold');
        doc.text("8006976343", 40, footerY + 16);

        doc.setFont(undefined, 'normal');
        doc.text("Branch:", 14, footerY + 21);
        doc.setFont(undefined, 'bold');
        doc.text("Elpitiya", 40, footerY + 21);

        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(148, 163, 184);
        

        doc.save(`${invoiceNo}.pdf`);
    };

    const featureUpdates = updates.filter(u => u.type === 'New Feature');

    return (
        <div className="p-4 sm:p-8 w-full min-h-[600px] font-sans transition-colors duration-300">
            
            {/* Top Control Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Invoice Manager</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Generate & manage monthly billing records</p>
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
                        onClick={handleOpenInvoiceModal}
                        disabled={featureUpdates.length === 0 && updates.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 text-sm"
                    >
                        <Sparkles size={18} /> Create New Invoice
                    </button>
                </div>
            </div>

            {/* Saved Invoices Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-6 mb-6">
                <h2 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Database size={20} className="text-blue-500" /> Saved Invoices Record
                </h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">Invoice No</th>
                                <th className="px-4 py-3">Month</th>
                                <th className="px-4 py-3">Created Date</th>
                                <th className="px-4 py-3 text-right">Grand Total (Rs)</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {savedInvoices.length > 0 ? savedInvoices.map((inv) => (
                                <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm">
                                    <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNo}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{inv.month}</td>
                                    <td className="px-4 py-3 text-slate-500">{inv.date}</td>
                                    <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 text-right">
                                        {inv.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                                        <button onClick={() => handleEditInvoice(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit & Download">
                                            <Edit3 size={16} />
                                        </button>
                                        
                                        {/* 💡 Delete Button එක වෙනස් කර ඇත (Click කළ විට State එක Update වේ) */}
                                        <button onClick={() => setInvoiceToDelete(inv._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-medium">No saved invoices found in the database.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 💡 1. Edit/Create Invoice Modal */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Receipt className="text-blue-600" /> {editInvoiceId ? 'Edit Invoice Costs' : 'Enter Feature Costs'}
                            </h2>
                            <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm">
                                <p className="font-bold text-amber-800 mb-1">Fixed Maintenance Fee</p>
                                <p className="text-amber-600">Rs. 10,000.00 will be added automatically.</p>
                            </div>

                            {invoiceFeatures.length > 0 ? (
                                <div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm">Costs for Features:</h3>
                                    <div className="space-y-3">
                                        {invoiceFeatures.map((feature, idx) => (
                                            <div key={idx} className="flex flex-col gap-1">
                                                <label className="text-xs font-semibold text-slate-500 line-clamp-1">{idx + 1}. {feature.title}</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-slate-400 font-bold">Rs.</span>
                                                    <input 
                                                        type="number"
                                                        placeholder="Leave empty if free"
                                                        value={feature.cost}
                                                        onChange={(e) => handleInvoiceCostChange(idx, e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No features recorded. Only the maintenance fee will be billed.</p>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                            <button onClick={() => setIsInvoiceModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm">
                                Cancel
                            </button>
                            <button onClick={handleSaveAndGeneratePDF} className="px-5 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm shadow-blue-600/20">
                                <Save size={16} /> {editInvoiceId ? 'Update & Download' : 'Save & Download'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 💡 2. Animated Custom Delete Confirmation Modal */}
            {invoiceToDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 p-6 text-center flex flex-col items-center">
                        
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Delete Invoice?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 px-2">
                            Are you sure you want to delete this invoice record? This action cannot be undone.
                        </p>
                        
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setInvoiceToDelete(null)} 
                                className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteInvoice} 
                                className="flex-1 py-3 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm shadow-rose-600/20 text-sm"
                            >
                                Yes, Delete
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default SystemInvoice;