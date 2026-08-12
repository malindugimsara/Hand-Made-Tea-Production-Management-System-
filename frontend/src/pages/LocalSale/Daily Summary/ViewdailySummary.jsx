import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Package, RefreshCw, Edit, Trash2, ArrowUpRight, ArrowDownRight, X, Save, AlertCircle, FileText } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminOnly from '@/components/AdminOnly';

export default function DailySummaryManageView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  
  // --- ROLE BASED ACCESS ---
  const userRole = localStorage.getItem("userRole") || localStorage.getItem("role") || "";
  const isViewer = userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";

  // --- States ---
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemToDelete, setItemToDelete] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState({
    recordId: null,
    itemId: null,
    categoryTitle: '',
    size: '',
    in: 0,
    out: 0
  });

  // --- Fetch Data ---
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // 👈 Token එක ලබා ගැනීම
      const response = await fetch(`${BACKEND_URL}/api/summary`, {
        headers: {
          'Authorization': `Bearer ${token}` // 👈 Token එක යැවීම
        }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch summaries');

      setSummaries(data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Failed to fetch data!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BACKEND_URL]);

  // --- Delete Logic ---
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    const { recordId, itemId } = itemToDelete;
    const toastId = toast.loading("Deleting record...");
    
    try {
      const token = localStorage.getItem("token"); // 👈 Token එක ලබා ගැනීම
      const response = await fetch(`${BACKEND_URL}/api/summary/${recordId}/item/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // 👈 Token එක යැවීම
        }
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to delete item');
      
      toast.success("Deleted successfully!", { id: toastId });
      fetchSummaries(); 
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Error deleting item.", { id: toastId });
    } finally {
      setItemToDelete(null); // Modal එක වැසීමට State එක හිස් කිරීම
    }
  };

  // --- Edit Logic ---
  const openEditModal = (recordId, item) => {
    setEditingItem({
      recordId,
      itemId: item._id,
      categoryTitle: item.categoryTitle || item.categoryId,
      size: item.size,
      in: item.in || 0,
      out: item.out || 0
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Updating record...");
    
    // Edit කරන කෙනාගේ නම ලබාගැනීම
    const username = localStorage.getItem('userName') || localStorage.getItem('username') || 'System User';

    try {
      const token = localStorage.getItem("token"); // 👈 Token එක ලබා ගැනීම
      const response = await fetch(`${BACKEND_URL}/api/summary/${editingItem.recordId}/item/${editingItem.itemId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 👈 Token එක යැවීම
        },
        // Backend එකට editedBy අගය යැවීම
        body: JSON.stringify({ 
            in: Number(editingItem.in), 
            out: Number(editingItem.out),
            editedBy: username
        })
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to update item');

      toast.success("Updated successfully!", { id: toastId });
      setIsEditModalOpen(false);
      fetchSummaries(); 
    } catch (error) {
      console.error("Update Error:", error);
      toast.error(error.message || "Error updating item.", { id: toastId });
    }
  };

  // --- Derived State (Optimized with useMemo) ---
  const currentRecord = useMemo(() => summaries.find(record => record.date === filterDate), [summaries, filterDate]);
  const displayItems = useMemo(() => currentRecord?.items || [], [currentRecord]);

  const pdfHeaders = useMemo(() => [['Category / Title', 'Size / Type', 'OUT (Issued)', 'IN (Received)']], []);
  const pdfData = useMemo(() => displayItems.map(item => [
    item.categoryTitle || item.categoryId,
    item.size,
    item.out > 0 ? item.out : '-',
    item.in > 0 ? item.in : '-'
  ]), [displayItems]);

  // --- WhatsApp Share Logic ---
  const handleWhatsAppShare = async () => {
    const toastId = toast.loading("Preparing PDF for WhatsApp...");
    try {
      const doc = new jsPDF('portrait');
      doc.setFontSize(16);
      doc.setTextColor(27, 106, 49); 
      doc.text("Daily IN/OUT Details", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Record Date: ${filterDate}`, 14, 26);

      autoTable(doc, {
        startY: 32,
        head: pdfHeaders,
        body: pdfData,
        theme: 'grid',
        headStyles: { fillColor: [57, 106, 49], textColor: 255 }, 
        styles: { fontSize: 10, cellPadding: 2 }
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Daily_Details_${filterDate}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Daily Report - ${filterDate}`,
          text: `Daily IN/OUT Report for ${filterDate}. Please find the attached PDF.`,
          files: [file]
        });
        toast.success("Shared successfully!", { id: toastId });
      } else {
        doc.save(`Daily_Details_${filterDate}.pdf`);
        const message = `Here is the Daily IN/OUT Report for ${filterDate}. Please find the downloaded PDF document.`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast.success("PDF Downloaded! Please attach it in WhatsApp.", { id: toastId });
      }
    } catch (error) {
      console.error("WhatsApp Share Error:", error);
      toast.error("Failed to share. Trying to download instead.", { id: toastId });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen relative">
      
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 flex items-center gap-3">
            <FileText size={32} />
            Daily IN/OUT Details
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">View, Edit, and Delete your daily product records</p>
        </div>

        {/* --- Top Action Buttons --- */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <PDFDownloader
            title="Daily IN/OUT Details"
            subtitle={`Records for ${filterDate}`}
            headers={pdfHeaders}
            data={pdfData}
            fileName={`Daily_Details_${filterDate}.pdf`}
            orientation="portrait"
            uniqueCode={`DID-${filterDate.replace(/-/g, '')}`}
            disabled={loading || displayItems.length === 0}
            autoTableOptions={{
              theme: 'grid',
              headStyles: { fillColor: [57, 106, 49], textColor: 255 }
            }}
          />

          <PDFDownloader
            isWhatsApp={true}
            title="Daily IN/OUT Details"
            subtitle={`Records for ${filterDate}`}
            headers={pdfHeaders}
            data={pdfData}
            fileName={`Daily_Details_${filterDate}.pdf`}
            orientation="portrait"
            uniqueCode={`DID-${filterDate.replace(/-/g, '')}`}
            disabled={loading || displayItems.length === 0}
            autoTableOptions={{
              theme: 'grid',
              headStyles: { fillColor: [57, 106, 49], textColor: 255 }
            }}
          />

          <button 
            onClick={fetchSummaries} 
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Date Filter Section */}
      <div className="mb-6 flex items-center gap-3 bg-white dark:bg-zinc-900 w-max p-2 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 px-2">
            <Calendar size={18} className="text-green-600" />
            <span className="text-sm font-bold text-gray-500">SELECT DATE:</span>
        </div>
        <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="p-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white dark:bg-zinc-900 rounded-2xl border border-green-100 dark:border-zinc-800">
          <RefreshCw size={40} className="animate-spin mb-3 text-green-600" />
          <p className="text-sm font-bold">Loading records...</p>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-16 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800 text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No records found for {filterDate}</h3>
          <p className="text-sm text-gray-500 mt-1">Try selecting a different date or saving new entries.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-green-100 dark:border-zinc-800 overflow-hidden">
          
          <div className="bg-green-200/40 dark:bg-zinc-900 border-b border-green-500 dark:border-zinc-800 px-6 py-4 flex items-center gap-2">
            <Package size={20} className="text-green-600 dark:text-green-500" />
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
              Details for {filterDate}
            </h3>
            <span className="ml-auto bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">
              {displayItems.length} Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-800 uppercase tracking-wider text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <th className="py-4 px-6 w-[30%]">Category / Title</th>
                  <th className="py-4 px-4 w-[20%]">Size / Type</th>
                  <th className="py-4 px-4 text-center text-red-500 w-[15%]">OUT</th>
                  <th className="py-4 px-4 text-center text-green-500 w-[15%]">IN</th>
                  {/* Action Column Hidden if Viewer */}
                  {!isViewer && <th className="py-4 px-6 text-center w-[20%]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/60 text-sm">
                {displayItems.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    
                    {/* Category Title & Edited By Badge */}
                    <td className="py-3.5 px-6 font-bold text-gray-800 dark:text-gray-200 align-top">
                      <div className="flex flex-col">
                        <span>{item.categoryTitle || item.categoryId}</span>
                        {item.lastEditedAt && (
                          <span className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 w-max leading-relaxed">
                            Edited: {new Date(item.lastEditedAt).toISOString().split('T')[0]} <br/>
                            by {item.lastEditedBy || 'User'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-semibold align-top">
                      {item.size}
                    </td>

                    <td className="py-3.5 px-4 text-center align-top">
                      {item.out > 0 ? (
                        <span className="inline-flex items-center justify-center font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 min-w-[3rem] py-1 rounded">
                          {item.out}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center align-top">
                      {item.in > 0 ? (
                        <span className="inline-flex items-center justify-center font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 min-w-[3rem] py-1 rounded">
                          {item.in}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-zinc-700">-</span>
                      )}
                    </td>

                    {/* Action Column Hidden if Viewer */}
                    {!isViewer && (
                        <td className="py-3.5 px-6 text-center align-top">
                        <div className="flex items-center justify-center gap-2">
                            <button 
                            onClick={() => openEditModal(currentRecord._id, item)}
                            className="p-1.5 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors shadow-sm"
                            title="Edit Item"
                            >
                            <Edit size={16} />
                            </button>
                            <AdminOnly>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <button 
                                    onClick={() => setItemToDelete({ recordId: currentRecord._id, itemId: item._id })} 
                                    className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors shadow-sm"
                                    title="Delete Item"
                                >
                                    <Trash2 size={16} />
                                </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-gray-200 dark:border-zinc-800">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Record</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                                    Are you sure you want to delete this item? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setItemToDelete(null)} className="border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            </AdminOnly>
                            
                        </div>
                        </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EDIT POPUP MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 transform transition-all">
            <div className="bg-green-50 dark:bg-green-900/30 px-6 py-4 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
              <h3 className="font-bold text-green-800 dark:text-green-400 text-lg flex items-center gap-2">
                <Edit size={20} /> Edit Item
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="mb-5 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-700 text-center">
                <p className="font-bold text-gray-800 dark:text-gray-200 text-base">
                  {editingItem.categoryTitle} <span className="text-gray-500 font-semibold">({editingItem.size})</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight size={14} /> OUT
                  </label>
                  <input 
                    type="number" min="0" step="any"
                    value={editingItem.out}
                    onChange={(e) => setEditingItem({ ...editingItem, out: e.target.value })}
                    className="w-full p-3 border border-red-200 dark:border-red-900/50 rounded-xl focus:ring-2 focus:ring-red-400/50 outline-none bg-red-50/30 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-bold text-center transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownRight size={14} /> IN
                  </label>
                  <input 
                    type="number" min="0" step="any"
                    value={editingItem.in}
                    onChange={(e) => setEditingItem({ ...editingItem, in: e.target.value })}
                    className="w-full p-3 border border-green-200 dark:border-green-900/50 rounded-xl focus:ring-2 focus:ring-green-400/50 outline-none bg-green-50/30 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-bold text-center transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-sm flex justify-center items-center gap-2">
                  <Save size={18} /> Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}