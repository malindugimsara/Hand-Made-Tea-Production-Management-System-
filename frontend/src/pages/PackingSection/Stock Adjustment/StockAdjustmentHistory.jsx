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
  Leaf, // Using Leaf for Tea icon
  Flame, // Using Flame for Spicy icon
  Package, // Using Package for Raw Materials icon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PDFDownloader from "@/components/PDFDownloader";
import { createPortal } from "react-dom";

const THEME = {
  pageBg: "#f9fbfb",
  textPrimary: "#0d5e4d",
  textSecondary: "#0f766e",
};

// --- PRODUCT COLOR MAPPING ---
const getProductColor = (productName) => {
  const p = productName?.toLowerCase() || "";
  if (p.includes("premium")) return "bg-pink-100 text-pink-800";
  if (p.includes("golden tips")) return "bg-yellow-200 text-yellow-800";
  if (p.includes("silver tips")) return "bg-slate-100 text-slate-800";
  if (p.includes("cinnamon")) return "bg-orange-100 text-orange-800";
  if (p.includes("green tea")) return "bg-green-100 text-green-800";
  if (p.includes("black tea")) return "bg-gray-100 text-gray-800";
  return "bg-transparent text-gray-800 font-semibold";
};

export default function StockAdjustmentHistory() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: Active Tab State ---
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

  // --- UPDATED: Filter Logic to include Tabs ---
  const filteredLogs = logs.filter((log) => {
    // 1. Tab Filter
    // Ensure these strings match the exact itemType values saved in your database (e.g., "tea", "spicy", "raw")
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

        // Format item type dynamically for the PDF
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
      className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300"
      style={{ backgroundColor: THEME.pageBg }}
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <History size={32} className="text-[#0d5e4d]" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d]">
                Stock Adjustment Records
              </h2>
              <p className="font-medium mt-1 text-sm text-gray-500">
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
              className="bg-[#0f766e] text-white font-bold py-2.5 px-5 rounded-lg shadow-sm hover:bg-[#0d5e4d] transition-colors"
            >
              + New Adjustment
            </button>
          </div>
        </div>

        {/* --- NEW: TABS SECTION --- */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab("Tea"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Tea"
                ? "bg-[#307a6a] text-white shadow-sm"
                : "bg-transparent text-gray-500 hover:text-[#307a6a] hover:bg-gray-100"
            }`}
          >
            <Leaf size={16} /> Tea Products Stock
          </button>
          
          <button
            onClick={() => { setActiveTab("Spicy"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Spicy"
                ? "bg-[#307a6a] text-white shadow-sm"
                : "bg-transparent text-gray-500 hover:text-[#307a6a] hover:bg-gray-100"
            }`}
          >
            <Flame size={16} /> Spicy Stock
          </button>

          <button
            onClick={() => { setActiveTab("Raw Materials"); handleClearFilters(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
              activeTab === "Raw Materials"
                ? "bg-[#307a6a] text-white shadow-sm"
                : "bg-transparent text-gray-500 hover:text-[#307a6a] hover:bg-gray-100"
            }`}
          >
            <Package size={16} /> Packing Materials Stock
          </button>
        </div>

        {/* FILTER SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Search Product
              </label>
              <input
                type="text"
                placeholder="e.g. BOPF, Premium..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Filter by Source
              </label>
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="All Sources">All Sources</option>
                  <option value="Internal">Internal</option>
                  <option value="Supplier A">Supplier A</option>
                  <option value="Supplier B">Supplier B</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg border border-transparent hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm w-full md:w-auto justify-center"
              >
                <FilterX size={16} /> Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin mb-4"></div>
                Loading {activeTab} History...
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-[11px] font-bold text-[#0d5e4d] uppercase tracking-wider">
                    <th className="p-4 pl-6 border-r border-gray-200 w-[120px]">
                      <Calendar size={14} className="inline mr-1 mb-0.5" /> Date
                    </th>
                    <th className="p-4 border-r border-gray-200 w-[200px]">
                      Product
                    </th>
                    <th className="p-4 border-r border-gray-200 w-[120px] text-center">
                      Type
                    </th>
                    <th className="p-4 border-r border-gray-200 w-[120px] text-center">
                      Amount (Kg)
                    </th>
                    <th className="p-4 border-r border-gray-200 min-w-[250px]">
                      Reason
                    </th>
                    <th className="p-4 border-r border-gray-200 w-[150px] text-center">
                      User
                    </th>
                    <th className="p-4 w-[100px] text-center text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((log) => (
                      <tr
                        key={log._id}
                        className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* DATE (Merged cells for same date) */}
                        {log.isFirstOfDate && (
                          <td
                            rowSpan={log.rowSpan}
                            className="p-4 pl-6 border-r border-gray-200 align-top bg-white"
                          >
                            <span className="text-gray-800 font-medium text-sm whitespace-nowrap">
                              {log.formattedDate}
                            </span>
                          </td>
                        )}

                        {/* PRODUCT */}
                        <td
                          className={`p-4 border-r border-gray-200 ${getProductColor(log.itemName)}`}
                        >
                          <span className="text-sm font-bold">
                            {log.itemName}
                          </span>
                          <div className="text-[10px] text-gray-500 font-normal uppercase mt-0.5">
                            {log.itemType}
                          </div>
                        </td>

                        {/* ACTION TYPE */}
                        <td className="p-4 border-r border-gray-200 text-center">
                          {log.action === "add" ? (
                            <span className="inline-flex items-center gap-1 text-teal-600 font-bold text-xs bg-teal-50 px-2 py-1 rounded border border-teal-100">
                              <ArrowDownCircle size={14} /> Add
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">
                              <ArrowUpCircle size={14} /> Issue
                            </span>
                          )}
                        </td>

                        {/* AMOUNT */}
                        <td className="p-4 border-r border-gray-200 text-center">
                          <span
                            className={`text-sm font-black ${log.action === "add" ? "text-teal-700" : "text-red-700"}`}
                          >
                            {log.amount.toFixed(3)}
                          </span>
                        </td>

                        {/* REASON */}
                        <td className="p-4 border-r border-gray-200 text-sm text-gray-600 font-medium break-words">
                          {log.reason || (
                            <span className="italic text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* USER */}
                        <td className="p-4 border-r border-gray-200 text-center text-sm font-bold text-[#0f766e]">
                          {log.adjustedBy || "System User"}
                        </td>

                        {/* ACTIONS (Edit/Delete) */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-3 text-gray-400">
                            <button
                              onClick={() => handleEdit(log._id)}
                              className="hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setRecordToDelete(log)}
                              className="hover:text-red-600 transition-colors"
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
                        className="py-16 text-center text-gray-400 font-semibold text-sm"
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
                    className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-red-100 text-red-600 rounded-full">
                        <ShieldAlert size={24} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800">
                        Confirm Delete
                      </h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      Are you sure you want to delete the adjustment for{" "}
                      <strong className="text-gray-900">
                        {recordToDelete.itemName}
                      </strong>
                      ?
                      <br />
                      <br />
                      <span className="text-red-600 font-bold bg-red-50 p-2 rounded block mt-1 border border-red-100">
                        ⚠️ This action will automatically reverse the stock
                        change in your inventory!
                      </span>
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setRecordToDelete(null)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors"
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