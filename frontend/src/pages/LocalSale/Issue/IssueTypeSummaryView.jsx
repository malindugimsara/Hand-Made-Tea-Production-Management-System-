import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, FileText, Package, AlertCircle, RefreshCw, Edit, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ISSUE_TYPES = [
  "Free issued",
  "Labour issued",
  "Staff issued"
];

export default function IssueTypeSummaryView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // --- States ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // --- Action States ---
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // --- Fetch Data ---
  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/issue-summary?date=${date}`);      
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch summary data');
      }
      
      processSummaryData(result.data || []);
      
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Could not load summary data for this date.");
      setSummaryData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Process Data ---
  const processSummaryData = (records) => {
    const summaryMap = {};
    const totals = { total: 0 };
    ISSUE_TYPES.forEach(type => totals[type] = 0);

    records.forEach(record => {
      const type = record.issueType;
      
      record.items?.forEach(item => {
        const key = `${item.categoryId}-${item.size}`;
        
        // අදාළ පේළිය (Row) Initialize කිරීම
        if (!summaryMap[key]) {
          summaryMap[key] = {
            categoryTitle: item.categoryTitle || item.categoryId,
            size: item.size,
            rowTotal: 0,
            lastEditedBy: null, // පේළියට අදාළව Edit දත්ත
            lastEditedAt: null, 
            types: {
                "Free issued": { value: 0, recordId: null, itemId: null },
                "Labour issued": { value: 0, recordId: null, itemId: null },
                "Staff issued": { value: 0, recordId: null, itemId: null }
            }
          };
        }

        const outValue = Number(item.out) || 0;
        
        if (ISSUE_TYPES.includes(type)) {
          summaryMap[key].types[type] = {
              value: outValue,
              recordId: record._id,
              itemId: item._id
          };
          totals[type] += outValue;
        }
        
        summaryMap[key].rowTotal += outValue;
        totals.total += outValue;

        // අදාළ Item එක Edit කර ඇත්නම් එය පේළියට ලබා දීම
        if (item.lastEditedAt) {
          const itemEditTime = new Date(item.lastEditedAt).getTime();
          const currentEditTime = summaryMap[key].lastEditedAt ? new Date(summaryMap[key].lastEditedAt).getTime() : 0;

          // Free, Labour, Staff 3න් අවසන් වරටම Edit වුණ වෙලාව සහ කෙනාව තෝරාගනී
          if (itemEditTime > currentEditTime) {
              summaryMap[key].lastEditedBy = item.lastEditedBy;
              summaryMap[key].lastEditedAt = item.lastEditedAt;
          }
        }
      });
    });

    const sortedData = Object.values(summaryMap).sort((a, b) => 
      a.categoryTitle.localeCompare(b.categoryTitle)
    );

    setSummaryData(sortedData);
    setColumnTotals(totals);
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // --- Delete Row Logic ---
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    const toastId = toast.loading("Deleting record...");
    
    try {
        const promises = [];
        for (const type of ISSUE_TYPES) {
            const typeData = rowToDelete.types[type];
            if (typeData.recordId && typeData.itemId) {
                promises.push(fetch(`${BACKEND_URL}/api/issue-summary/${typeData.recordId}/item/${typeData.itemId}`, {
                    method: 'DELETE'
                }));
            }
        }
        
        const results = await Promise.all(promises);
        const hasError = results.some(res => !res.ok);
        if (hasError) throw new Error("Some items failed to delete.");
        
        toast.success("Deleted successfully!", { id: toastId });
        fetchSummary();
    } catch(err) {
        toast.error(err.message, { id: toastId });
    } finally {
        setRowToDelete(null);
    }
  };

  // --- Edit Logic ---
  const openEditModal = (row) => {
    setEditingItem(JSON.parse(JSON.stringify(row))); // Deep copy
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const username = localStorage.getItem('userName') || localStorage.getItem('username') || 'System User';
    const toastId = toast.loading("Updating record...");
    
    try {
        const promises = [];
        for (const type of ISSUE_TYPES) {
            const typeData = editingItem.types[type];
            if (typeData.recordId && typeData.itemId) {
                promises.push(fetch(`${BACKEND_URL}/api/issue-summary/${typeData.recordId}/item/${typeData.itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ out: Number(typeData.value), editedBy: username })
                }));
            }
        }
        
        const results = await Promise.all(promises);
        const hasError = results.some(res => !res.ok);
        if (hasError) throw new Error("Some items failed to update.");
        
        toast.success("Updated successfully!", { id: toastId });
        setIsEditModalOpen(false);
        fetchSummary();
    } catch(err) {
        toast.error(err.message, { id: toastId });
    }
  };

  // --- PDF Handlers ---
  const pdfHeaders = useMemo(() => [
    ['Category', 'Size / Type', ...ISSUE_TYPES.map(t => t.toUpperCase()), 'TOTAL OUT']
  ], []);

  const pdfData = useMemo(() => {
    const data = summaryData.map(row => [
      row.categoryTitle,
      row.size,
      ...ISSUE_TYPES.map(type => row.types[type].value > 0 ? row.types[type].value : '-'),
      row.rowTotal > 0 ? row.rowTotal : '-'
    ]);

    if (summaryData.length > 0) {
      data.push([
        'TOTAL',
        '-',
        ...ISSUE_TYPES.map(type => columnTotals[type] > 0 ? columnTotals[type] : '-'),
        columnTotals.total > 0 ? columnTotals.total : '-'
      ]);
    }
    return data;
  }, [summaryData, columnTotals]);


  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen relative">

      {/* Header Section */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 flex items-center gap-3">
            <FileText size={32} />
            Daily Issue Summary
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            View aggregated OUT records by category and issue type
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <PDFDownloader
            title="Daily Issue Summary"
            subtitle={`Records for ${date}`}
            headers={pdfHeaders}
            data={pdfData}
            fileName={`Issue_Summary_${date}.pdf`}
            orientation="landscape" 
            uniqueCode={`ISU-${date.replace(/-/g, '')}`}
            disabled={isLoading || summaryData.length === 0}
          />
          <PDFDownloader
            isWhatsApp={true}
            title="Daily Issue Summary"
            subtitle={`Records for ${date}`}
            headers={pdfHeaders}
            data={pdfData}
            fileName={`Issue_Summary_${date}.pdf`}
            orientation="landscape"
            uniqueCode={`ISU-${date.replace(/-/g, '')}`}
            disabled={isLoading || summaryData.length === 0}
          />
          <button 
            onClick={fetchSummary}
            disabled={isLoading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Date Picker Section */}
      <div className="mb-6 flex items-center gap-3 bg-white dark:bg-zinc-900 w-max p-2 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 px-2">
            <Calendar size={18} className="text-green-600" />
            <span className="text-sm font-bold text-gray-500">SELECT DATE:</span>
        </div>
        <input 
            type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
            className="p-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>

      
      
      {/* Data Table Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
        
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800/80 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center gap-3">
          <Package size={20} className="text-gray-500 dark:text-gray-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
            Details for {date}
          </h3>
        </div>

        <div className="overflow-x-auto">
          {summaryData.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <AlertCircle size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No records found for this date.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                  <th className="p-4 pl-6 w-[25%]">Category</th>
                  <th className="p-4 w-[15%]">Size / Type</th>
                  {ISSUE_TYPES.map(type => (
                    <th key={type} className="p-4 text-center">{type}</th>
                  ))}
                  <th className="p-4 text-center text-green-600 dark:text-green-500">Total OUT</th>
                  <th className="p-4 pr-6 text-center w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50 text-sm group">
                {summaryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    
                    {/* Category Title & Row Level Edit Badge */}
                    <td className="p-4 pl-6 font-bold text-gray-800 dark:text-gray-200">
                      <div className="flex flex-col">
                        <span>{row.categoryTitle}</span>
                        {row.lastEditedAt && (
                          <span className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 w-max leading-relaxed">
                            Edited: {new Date(row.lastEditedAt).toISOString().split('T')[0]} <br/>
                            by {row.lastEditedBy || 'User'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-semibold text-gray-600 dark:text-gray-400 align-top">
                      {row.size}
                    </td>

                    {ISSUE_TYPES.map(type => (
                      <td key={type} className="p-4 text-center font-medium text-gray-600 dark:text-gray-300 align-top">
                        {row.types[type].value > 0 ? (
                          <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {row.types[type].value}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-zinc-700">-</span>
                        )}
                      </td>
                    ))}

                    <td className="p-4 text-center font-black text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/10 align-top">
                      {row.rowTotal > 0 ? row.rowTotal : '-'}
                    </td>

                    {/* --- ACTIONS COLUMN --- */}
                    <td className="p-4 pr-6 text-center align-top">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(row)} 
                          className="p-1.5 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors shadow-sm"
                        >
                          <Edit size={16} />
                        </button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button 
                              onClick={() => setRowToDelete(row)} 
                              className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors shadow-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md border border-gray-200 dark:border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Record</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                                Are you sure you want to delete all entries for this item? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setRowToDelete(null)} className="border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Grand Totals Footer */}
              {summaryData.length > 0 && (
                <tfoot className="bg-green-50 dark:bg-green-950/30 border-t-2 border-green-200 dark:border-green-900/50 font-black">
                  <tr>
                    <td colSpan="2" className="p-4 pl-6 text-right uppercase tracking-wider text-green-800 dark:text-green-400 text-sm">
                      Grand Totals
                    </td>
                    {ISSUE_TYPES.map(type => (
                      <td key={type} className="p-4 text-center text-gray-800 dark:text-gray-200 font-black">
                        {columnTotals[type] || '-'}
                      </td>
                    ))}
                    <td className="p-4 text-center text-sm font-black text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20">
                      {columnTotals.total || '-'}
                    </td>
                    <td className="p-4 pr-6 bg-red-50/50 dark:bg-red-900/20"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 transform transition-all">
            <div className="bg-green-50 dark:bg-green-900/30 px-6 py-4 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
              <h3 className="font-bold text-green-800 dark:text-green-400 text-lg flex items-center gap-2">
                <Edit size={20} /> Edit Issue Items
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

              <div className="space-y-4 mb-6">
                {ISSUE_TYPES.map(type => {
                    const typeData = editingItem.types[type];
                    return (
                        <div key={type} className="flex items-center justify-between gap-4">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 w-1/2">{type}</label>
                            <input 
                                type="number" min="0" step="any"
                                disabled={!typeData.recordId} // අගයක් නැති ඒවා Edit කරන්න බැහැ
                                value={typeData.value}
                                onChange={(e) => setEditingItem({
                                    ...editingItem,
                                    types: {
                                        ...editingItem.types,
                                        [type]: { ...typeData, value: e.target.value }
                                    }
                                })}
                                className="w-1/2 p-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-center font-bold disabled:bg-gray-100 dark:disabled:bg-zinc-800/50 disabled:text-gray-400 outline-none focus:border-green-500 focus:ring-1 transition-colors"
                            />
                        </div>
                    )
                })}
                <p className="text-[10.5px] text-gray-400 dark:text-gray-500 text-center mt-3 font-medium">
                  * You can only edit fields that already have a value. To add a new issue type, please use the Data Entry page.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-sm flex justify-center items-center gap-2">
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