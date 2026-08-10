import React, { useState, useEffect } from 'react';
import { Calendar, Package, RefreshCw, Edit, Trash2, Layers, Tag, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IssueTypeSummaryView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterIssueType, setFilterIssueType] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Backend එකෙන් දත්ත ලබාගැනීම
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/issue-summary`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch summaries');
      }

      setSummaries(data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Error fetching issue summaries. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [BACKEND_URL]);

  // Delete Handler (Placeholder for API call)
  const handleDelete = async (recordId, itemId) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    const toastId = toast.loading("Deleting record...");
    try {
      // TODO: ඔබේ backend delete route එක මෙහි දෙන්න (උදා: /api/summary/:recordId)
      // const response = await fetch(`${BACKEND_URL}/api/summary/${recordId}`, { method: 'DELETE' });
      
      // Temporary frontend update for demonstration
      setSummaries(prev => prev.map(rec => {
        if (rec._id === recordId) {
          return {
            ...rec,
            items: rec.items.filter(item => item._id !== itemId)
          };
        }
        return rec;
      }).filter(rec => rec.items.length > 0));

      toast.success("Record deleted successfully!", { id: toastId });
    } catch (error) {
      toast.error("Error occurred while deleting the record.", { id: toastId });
    }
  };

  // Edit Handler Placeholder
  const handleEdit = (record, item) => {
    toast(`Edit feature for ${item.categoryTitle} (${item.size}) coming soon!`, {
      icon: '✏️',
    });
  };

  // Filter logic
  const filteredSummaries = summaries.map(record => {
    if (filterDate && record.date !== filterDate) return null;
    if (filterIssueType && record.issueType !== filterIssueType) return null;
    return record;
  }).filter(Boolean);

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400">Issue Type Records View</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage and view issued product details</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter by Issue Type */}
          <select
            value={filterIssueType}
            onChange={(e) => setFilterIssueType(e.target.value)}
            className="p-2.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
          >
            <option value="">All Issue Types</option>
            <option value="Free issued">Free issued</option>
            <option value="Labour issued">Labour issued</option>
            <option value="Staff issued">Staff issued</option>
          </select>

          {/* Filter by Date */}
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="p-2.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
          )}

          {/* Refresh Button */}
          <button 
            onClick={fetchSummaries} 
            disabled={loading}
            className="p-2.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-800/60 text-green-700 dark:text-green-400 rounded-xl transition-colors flex items-center gap-1.5 font-bold text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <RefreshCw size={40} className="animate-spin mb-3 text-green-600" />
          <p className="text-sm font-bold">Loading records...</p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-green-100 dark:border-zinc-800 text-center">
          <Package size={48} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No records found</h3>
          <p className="text-sm text-gray-500 mt-1">No issue records match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-green-100 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-green-50/50 dark:bg-zinc-800 text-green-900 dark:text-green-300 font-bold border-b border-gray-200 dark:border-zinc-700 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Issue Type</th>
                <th className="py-3.5 px-4">Tea Type / Size</th>
                <th className="py-3.5 px-4 text-center">Amount (IN / OUT)</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
              {filteredSummaries.map((record) => (
                record.items?.map((item, idx) => {
                  const hasIn = item.in > 0;
                  const hasOut = item.out > 0;

                  return (
                    <tr key={`${record._id}-${item._id || idx}`} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      
                      {/* Date */}
                      <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={14} className="text-yellow-500" />
                        {record.date}
                      </td>

                      {/* Issue Type */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-1 rounded-md uppercase tracking-wider">
                          {record.issueType || 'N/A'}
                        </span>
                      </td>

                      {/* Tea Type / Size */}
                      <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Tag size={13} className="text-green-600" />
                        {item.categoryTitle} <span className="text-gray-400 font-normal">({item.size})</span>
                      </td>

                      {/* Amount (IN / OUT) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center items-center gap-2 font-bold text-xs">
                          {hasOut && (
                            <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-md">
                              OUT: {item.out}
                            </span>
                          )}
                          {hasIn && (
                            <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-md">
                              IN: {item.in}
                            </span>
                          )}
                          {!hasOut && !hasIn && <span className="text-gray-300">-</span>}
                        </div>
                      </td>

                      {/* Action Buttons (Edit & Delete) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(record, item)}
                            className="p-1.5 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors shadow-sm"
                            title="Edit Record"
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(record._id, item._id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors shadow-sm"
                            title="Delete Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}