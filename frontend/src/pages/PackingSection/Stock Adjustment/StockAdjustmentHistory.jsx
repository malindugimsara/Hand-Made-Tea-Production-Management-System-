import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  History,
  Calendar,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  FilterX,
  Edit3,
  Trash2,
  ShieldAlert,
  Leaf, 
  Flame, 
  Package, 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PDFDownloader from "@/components/PDFDownloader";
import { createPortal } from "react-dom";

const THEME = {
  textPrimary: "#0d5e4d",
  textSecondary: "#0f766e",
};

// --- PRODUCT COLOR MAPPING (Updated for Dark Mode) ---
const getProductColor = (productName) => {
  const p = productName?.toLowerCase() || "";
  if (p.includes("premium")) return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
  if (p.includes("golden tips")) return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (p.includes("silver tips")) return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  if (p.includes("cinnamon")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  if (p.includes("green tea")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (p.includes("black tea")) return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-300";
  return "bg-transparent text-gray-800 dark:text-gray-200 font-semibold";
};

export default function StockAdjustmentHistory() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState("Tea"); 

  // Filters States
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/stock-adjustment/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch logs");

      const data = await res.json();
      const sortedData = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setLogs(sortedData);
    } catch (error) {
      toast.error("Error loading adjustment history!");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // --- Filter Logic to include Tabs ---
  const filteredLogs = logs.filter((log) => {
    // 1. Tab Filter
    const logType = log.itemType?.toLowerCase() || "";
    let matchesTab = false;
    
    if (activeTab === "Tea" && logType === "tea") matchesTab = true;
    if (activeTab === "Spicy" && logType === "spicy") matchesTab = true;
    if (activeTab === "Raw Materials" && logType === "raw") matchesTab = true;

    // 2. Other Filters
    const matchesSearch =
      log.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.reason &&
        log.reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const logDate = formatDateOnly(log.createdAt);
    const matchesFrom = fromDate ? logDate >= fromDate : true;
    const matchesTo = toDate ? logDate <= toDate : true;

    const matchesSource =
      sourceFilter === "All Sources" ? true : log.source === sourceFilter;

    return matchesTab && matchesSearch && matchesFrom && matchesTo && matchesSource;
  });

  const processLogsForTable = () => {
    return filteredLogs.map((log, index, arr) => {
      const date = formatDateOnly(log.createdAt);
      const prevDate =
        index > 0 ? formatDateOnly(arr[index - 1].createdAt) : null;
      const isFirstOfDate = date !== prevDate;

      let span = 1;
      if (isFirstOfDate) {
        for (let i = index + 1; i < arr.length; i++) {
          if (formatDateOnly(arr[i].createdAt) === date) span++;
          else break;
        }
      }
      return { ...log, formattedDate: date, isFirstOfDate, rowSpan: span };
    });
  };

  const tableData = processLogsForTable();

  const handleClearFilters = () => {
    setSearchQuery("");
    setSourceFilter("All Sources");
    setFromDate("");
    setToDate("");
  };

  const handleEdit = (id) => {
    navigate(`/packing/edit-stock-adjustment/${id}`);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    const toastId = toast.loading("Reversing stock and deleting record...");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/stock-adjustment/${recordToDelete._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        toast.success("Adjustment deleted and stock reversed successfully!", {
          id: toastId,
        });
        fetchLogs(); 
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete record.", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("Network error while deleting.", { id: toastId });
    } finally {
      setRecordToDelete(null); 
    }
  };

  const getPdfData = () => {
    const sortedLogs = [...filteredLogs].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    const tableRows = [];

    let i = 0;
    while (i < sortedLogs.length) {
      let j = i;
      const currentDate = new Date(sortedLogs[i].createdAt)
        .toISOString()
        .split("T")[0];

      while (
        j < sortedLogs.length &&
        new Date(sortedLogs[j].createdAt).toISOString().split("T")[0] ===
          currentDate
      ) {
        j++;
      }

      const count = j - i; 

      for (let k = i; k < j; k++) {
        const log = sortedLogs[k];
        const row = [];

        if (k === i) {
          row.push({
            content: currentDate,
            rowSpan: count,
            styles: { valign: "middle", halign: "center", fontStyle: "bold" },
          });
        }

        const formattedType = log.itemType 
          ? log.itemType.charAt(0).toUpperCase() + log.itemType.slice(1) 
          : "-";

        row.push(
          { content: log.itemName, styles: { valign: "middle" } },
          {
            content: formattedType,
            styles: { halign: "center", valign: "middle" },
          },
          {
            content:
              log.action === "add"
                ? `+${log.amount.toFixed(3)}`
                : `-${log.amount.toFixed(3)}`,
            styles: {
              halign: "right",
              valign: "middle",
              textColor: log.action === "add" ? [13, 148, 136] : [220, 38, 38],
            },
          },
          { content: log.reason || "-", styles: { valign: "middle" } },
          {
            content: log.adjustedBy || "System User",
            styles: { halign: "center", valign: "middle" },
          },
        );

        tableRows.push(row);
      }
      i = j;
    }

    return tableRows;
  };

  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 bg-[#f9fbfb] dark:bg-zinc-950"
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <History size={32} className="text-[#0d5e4d] dark:text-teal-500" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d] dark:text-teal-400">
                Stock Adjustment Records
              </h2>
              <p className="font-medium mt-1 text-sm text-gray-500 dark:text-gray-400">
                Overview of daily stock additions and issues
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <PDFDownloader
              title={`${activeTab} Stock Adjustment Records`}
              subtitle={`Filter: ${searchQuery ? searchQuery : "All"}`}
              headers={[
                "Date",
                "Product",
                "Type",
                "Amount (Kg)",
                "Reason",
                "User",
              ]}
              data={getPdfData()} 
              uniqueCode={`ADJ/LOG/${new Date().getFullYear()}`}
              fileName={`${activeTab.replace(" ", "_")}_Adjustment_History_${new Date().toISOString().split("T")[0]}.pdf`}
              orientation="portrait"
              disabled={logs.length === 0}
            />
            <button
              onClick={() => navigate("/packing/stock-adjustment-entry")}
              className="bg-[#0f766e] dark:bg-teal-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm hover:bg-[#0d5e4d] dark:hover:bg-teal-700 transition-colors"
            >
              + New Adjustment
            </button>
          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => { setActiveTab("Tea"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Tea"
                ? "bg-[#307a6a] dark:bg-teal-700 text-white shadow-sm"
                : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-[#307a6a] dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Leaf size={16} /> Tea Products Stock
          </button>
          
          <button
            onClick={() => { setActiveTab("Spicy"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Spicy"
                ? "bg-[#307a6a] dark:bg-teal-700 text-white shadow-sm"
                : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-[#307a6a] dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Flame size={16} /> Spicy Stock
          </button>

          <button
            onClick={() => { setActiveTab("Raw Materials"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Raw Materials"
                ? "bg-[#307a6a] dark:bg-teal-700 text-white shadow-sm"
                : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-[#307a6a] dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Package size={16} /> Packing Materials Stock
          </button>
        </div>

        {/* FILTER SECTION */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-5 mb-6 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Search Product
              </label>
              <input
                type="text"
                placeholder="e.g. BOPF, Premium..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/40 focus:border-teal-500 dark:focus:border-teal-500 outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Filter by Source
              </label>
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/40 focus:border-teal-500 dark:focus:border-teal-500 outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="All Sources">All Sources</option>
                  <option value="Internal">Internal</option>
                  <option value="Supplier A">Supplier A</option>
                  <option value="Supplier B">Supplier B</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/40 focus:border-teal-500 dark:focus:border-teal-500 outline-none cursor-pointer transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-500/40 focus:border-teal-500 dark:focus:border-teal-500 outline-none cursor-pointer transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 font-bold rounded-lg border border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm w-full md:w-auto justify-center"
              >
                <FilterX size={16} /> Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                <div className="w-8 h-8 border-4 border-teal-200 dark:border-teal-800 border-t-teal-700 dark:border-t-teal-500 rounded-full animate-spin mb-4"></div>
                Loading {activeTab} History...
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-[#0d5e4d] dark:text-teal-500 uppercase tracking-wider">
                    <th className="p-4 pl-6 border-r border-gray-200 dark:border-zinc-800 w-[120px]">
                      <Calendar size={14} className="inline mr-1 mb-0.5" /> Date
                    </th>
                    <th className="p-4 border-r border-gray-200 dark:border-zinc-800 w-[200px]">
                      Product
                    </th>
                    <th className="p-4 border-r border-gray-200 dark:border-zinc-800 w-[120px] text-center">
                      Type
                    </th>
                    <th className="p-4 border-r border-gray-200 dark:border-zinc-800 w-[120px] text-center">
                      Amount (Kg)
                    </th>
                    <th className="p-4 border-r border-gray-200 dark:border-zinc-800 min-w-[250px]">
                      Reason
                    </th>
                    <th className="p-4 border-r border-gray-200 dark:border-zinc-800 w-[150px] text-center">
                      User
                    </th>
                    <th className="p-4 w-[100px] text-center text-gray-500 dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        {/* DATE (Merged cells for same date) */}
                        {log.isFirstOfDate && (
                          <td
                            rowSpan={log.rowSpan}
                            className="p-4 pl-6 border-r border-gray-200 dark:border-zinc-800 align-top bg-white dark:bg-zinc-900"
                          >
                            <span className="text-gray-800 dark:text-gray-200 font-medium text-sm whitespace-nowrap">
                              {log.formattedDate}
                            </span>
                          </td>
                        )}

                        {/* PRODUCT */}
                        <td
                          className={`p-4 border-r border-gray-200 dark:border-zinc-800 ${getProductColor(log.itemName)}`}
                        >
                          <span className="text-sm font-bold">
                            {log.itemName}
                          </span>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal uppercase mt-0.5">
                            {log.itemType}
                          </div>
                        </td>

                        {/* ACTION TYPE */}
                        <td className="p-4 border-r border-gray-200 dark:border-zinc-800 text-center">
                          {log.action === "add" ? (
                            <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold text-xs bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded border border-teal-100 dark:border-teal-900/50">
                              <ArrowDownCircle size={14} /> Add
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-100 dark:border-red-900/50">
                              <ArrowUpCircle size={14} /> Issue
                            </span>
                          )}
                        </td>

                        {/* AMOUNT */}
                        <td className="p-4 border-r border-gray-200 dark:border-zinc-800 text-center">
                          <span
                            className={`text-sm font-black ${log.action === "add" ? "text-teal-700 dark:text-teal-400" : "text-red-700 dark:text-red-400"}`}
                          >
                            {log.amount.toFixed(3)}
                          </span>
                        </td>

                        {/* REASON */}
                        <td className="p-4 border-r border-gray-200 dark:border-zinc-800 text-sm text-gray-600 dark:text-gray-400 font-medium break-words">
                          {log.reason || (
                            <span className="italic text-gray-400 dark:text-gray-500">N/A</span>
                          )}
                        </td>

                        {/* USER */}
                        <td className="p-4 border-r border-gray-200 dark:border-zinc-800 text-center text-sm font-bold text-[#0f766e] dark:text-teal-500">
                          {log.adjustedBy || "System User"}
                        </td>

                        {/* ACTIONS (Edit/Delete) */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-3 text-gray-400 dark:text-gray-500">
                            <button
                              onClick={() => handleEdit(log._id)}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setRecordToDelete(log)}
                              className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-16 text-center text-gray-400 dark:text-gray-500 font-semibold text-sm"
                      >
                        No adjustment records found for {activeTab}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Confirmation Modal */}
            {recordToDelete &&
              createPortal(
                <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
                  <div
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                        <ShieldAlert size={24} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-gray-100">
                        Confirm Delete
                      </h3>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                      Are you sure you want to delete the adjustment for{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {recordToDelete.itemName}
                      </strong>
                      ?
                      <br />
                      <br />
                      <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded block mt-1 border border-red-100 dark:border-red-900/30">
                        ⚠️ This action will automatically reverse the stock
                        change in your inventory!
                      </span>
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setRecordToDelete(null)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                </div>,
                document.body, 
              )}
          </div>
        </div>
      </div>
    </div>
  );
}