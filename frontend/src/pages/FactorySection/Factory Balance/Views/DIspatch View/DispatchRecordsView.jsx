import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  AlertCircle,
  RefreshCcw,
  Filter,
  Truck,
  Store,
  FileText,
  Tag,
  TrendingDown
} from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import PDFDownloader from "@/components/PDFDownloader";

// අත්‍යවශ්‍ය Dialog Components (UI Folder එකෙන්)
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

export default function DispatchRecordsView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const navigate = useNavigate();

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Delete State
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || false;
  });

  // Filter States
  const [filterMonth, setFilterMonth] = useState(() => {
    return location.state?.returnMonth || currentMonthStr;
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const getPeriodText = () => {
    if (fromDate && toDate) return `${fromDate} to ${toDate}`;
    if (filterMonth) return filterMonth;
    return "All Time";
  };

  useEffect(() => {
    if (filterMonth || (fromDate && toDate)) {
      fetchDispatchLogs();
    }
  }, [filterMonth, fromDate, toDate]);

  const fetchDispatchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const queryParams = new URLSearchParams();
      if (filterMonth) queryParams.append("month", filterMonth);
      if (fromDate) queryParams.append("startDate", fromDate);
      if (toDate) queryParams.append("endDate", toDate);

      const response = await fetch(
        `${BACKEND_URL}/api/factory-logs?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data from database");
      }

      const data = await response.json();
      
      // Filter out records that have NO dispatch and NO local sale (keep only relevant rows)
      const dispatchRecords = (data.records || []).filter(
          r => (r.dispatch > 0 || r.localSaleAndGratis > 0 || r.returnAmount > 0)
      );

      // Sort descending (newest first)
      setRecords(dispatchRecords.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS: EDIT & DELETE ---
  const handleEditClick = (record) => {
    navigate("/factory/dispatch/edit", { state: { recordData: record } });
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    const toastId = toast.loading("Deleting record...");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/factory-logs/${recordToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete record");
      }

      toast.success("Record deleted successfully", { id: toastId });
      setRecords(records.filter((r) => r._id !== recordToDelete._id));
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(error.message || "An error occurred while deleting.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  // Calculations for Summary
  const totalDispatch = records.reduce((sum, r) => sum + (r.dispatch || 0), 0);
  const totalLocalSale = records.reduce((sum, r) => sum + (r.localSaleAndGratis || 0), 0);
  const totalReturns = records.reduce((sum, r) => sum + (r.returnAmount || 0), 0);
  const totalOut = totalDispatch + totalLocalSale;

  // Helpers for Array formatting (For PDF & Excel)
  const getArrayInfo = (arr, key) => (arr && arr.length > 0) ? arr.map(i => i[key] || "-").join("\n") : "-";

  const getCleanTableData = () => {
    const formatVal = (val) => {
      const num = Number(val);
      if (num === 0) return "-";
      return num.toFixed(2);
    };

    const tableRows = records.map((r) => [
      r.date ? r.date.split("T")[0] : "-",
      getArrayInfo(r.dispatches, 'invoiceNo'),
      getArrayInfo(r.dispatches, 'teaType'),
      formatVal(r.dispatch || 0),
      getArrayInfo(r.localSales, 'teaType'),
      formatVal(r.localSaleAndGratis || 0),
      formatVal(r.totalOut || 0),
      getArrayInfo(r.returns, 'teaType'), 
      formatVal(r.returnAmount || 0),
    ]);

    if (records.length > 0) {
      tableRows.push([
        "TOTAL", "-", "-",
        totalDispatch > 0 ? totalDispatch.toFixed(2) : "-",
        "-",
        totalLocalSale > 0 ? totalLocalSale.toFixed(2) : "-",
        totalOut > 0 ? totalOut.toFixed(2) : "-",
        "-",                        
        totalReturns > 0 ? totalReturns.toFixed(2) : "-",
      ]);
    }

    return tableRows;
  };

  const exportToExcel = () => {
    const periodText = getPeriodText();
    const dataRows = records.map((r) => [
      r.date ? r.date.split("T")[0] : "-",
      getArrayInfo(r.dispatches, 'invoiceNo').replace(/\n/g, ", "),
      getArrayInfo(r.dispatches, 'teaType').replace(/\n/g, ", "),
      Number((r.dispatch || 0).toFixed(2)),
      getArrayInfo(r.localSales, 'teaType').replace(/\n/g, ", "),
      Number((r.localSaleAndGratis || 0).toFixed(2)),
      Number((r.totalOut || 0).toFixed(2)),
      getArrayInfo(r.returns, 'teaType').replace(/\n/g, ", "),
      Number((r.returnAmount || 0).toFixed(2)),
    ]);

    if (records.length > 0) {
      dataRows.push([
        "TOTAL", "-", "-",
        Number(totalDispatch.toFixed(2)),
        "-",
        Number(totalLocalSale.toFixed(2)),
        Number(totalOut.toFixed(2)),
        "-", 
        Number(totalReturns.toFixed(2)),
      ]);
    }

    const tableData = [
      [`DISPATCH & SALES REPORT: ${periodText}`, "", "", "", "", "", "", "", ""],
      [`Generated on ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["DATE", "INVOICE NOs", "DISPATCH TEA TYPEs", "DISPATCH QTY (KG)", "LOCAL SALE TEA TYPEs", "LOCAL SALE QTY (KG)", "TOTAL OUT (KG)", "RETURN TEA TYPEs", "RETURNS (KG)"],
      ...dataRows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(tableData);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, 
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, 
    ];

    const borderAll = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } },
    };

    const stdAlign = { horizontal: "center", vertical: "center" };
    const titleStyle = { font: { bold: true, sz: 16, color: { rgb: "1B6A31" } }, alignment: stdAlign };
    const subtitleStyle = { font: { italic: true, sz: 10, color: { rgb: "6B7280" } }, alignment: stdAlign };
    
    const headerStyle = {
      fill: { fgColor: { rgb: "1B6A31" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
      alignment: stdAlign,
      border: borderAll,
    };

    const bodyStyleEven = { alignment: stdAlign, border: borderAll };
    const bodyStyleOdd = { fill: { fgColor: { rgb: "F9FAFB" } }, alignment: stdAlign, border: borderAll };

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: "s", v: "" };

        if (R === 0) worksheet[cellAddress].s = titleStyle;
        else if (R === 1) worksheet[cellAddress].s = subtitleStyle;
        else if (R === 2) continue;
        else if (R === 3) worksheet[cellAddress].s = headerStyle;
        else {
          const isOddRow = R % 2 !== 0;
          let currentStyle = isOddRow ? { ...bodyStyleOdd } : { ...bodyStyleEven };

          if (worksheet[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v === "TOTAL") {
             currentStyle.font = { bold: true };
             currentStyle.fill = { fgColor: { rgb: "FDE68A" } }; 
          }
          worksheet[cellAddress].s = currentStyle;

          if (C > 2 && typeof worksheet[cellAddress].v === "number") {
             worksheet[cellAddress].z = "#,##0.00";
          }
        }
      }
    }

    worksheet["!cols"] = [
      { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, 
      { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 15 } 
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dispatch Records");
    XLSX.writeFile(workbook, `Dispatch_Report_${periodText.replace(/ /g, "_")}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto font-sans flex flex-col min-h-screen bg-[#f3faf7] dark:bg-gray-950 transition-colors duration-300">
      
      {/* TOP HEADER & BUTTONS */}
      <div className="mb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-400 flex items-center gap-2">
            Dispatch & Local Sales Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed view of all outgoing tea and returns
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDispatchLogs}
            disabled={loading}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            onClick={exportToExcel}
            disabled={records.length === 0}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-[#1B6A31] dark:text-green-400 border border-[#1B6A31] dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>

          <PDFDownloader
            title="Dispatch & Local Sales Report"
            subtitle={`Period: ${getPeriodText()}`}
            data={getCleanTableData()}                                          
            headers={[
              ["DATE", "INVOICE NOs", "DISPATCH\nTEA TYPEs", "DISPATCH\n(KG)", "LOCAL SALE\nTEA TYPEs", "LOCAL SALE\n(KG)", "TOTAL OUT\n(KG)", "RETURN\nTEA TYPEs", "RETURNS\n(KG)"]
            ]}
            uniqueCode={`DSP-${getPeriodText().replace(/ /g, "")}`}
            fileName={`Dispatch_Report_${getPeriodText().replace(/ /g, "_")}.pdf`}
            orientation="landscape"
            disabled={loading || records.length === 0}
            autoTableOptions={{
              theme: "grid",
              headStyles: { fillColor: [27, 106, 49], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
              columnStyles: {
                3: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                8: { halign: 'right' }, 
              }
            }}
          />
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 transition-colors">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pb-3 md:pb-0 md:pr-6 w-full md:w-auto">
          <Filter size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Filter Period
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setFromDate("");
                setToDate("");
              }}
              className="w-full sm:w-44 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer"
            />
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center px-2">
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 my-1 uppercase">OR</span>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setFilterMonth("");
                }}
                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">To Date</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setFilterMonth("");
                }}
                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B6A31]/20 transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
            <Truck size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Dispatch</h3>
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400">{totalDispatch.toFixed(2)} <span className="text-sm font-semibold text-gray-400">kg</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
            <Store size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Local Sales</h3>
            <div className="text-2xl font-black text-orange-700 dark:text-orange-400">{totalLocalSale.toFixed(2)} <span className="text-sm font-semibold text-gray-400">kg</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
            <TrendingDown size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Outgoing</h3>
            <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{totalOut.toFixed(2)} <span className="text-sm font-semibold text-gray-400">kg</span></div>
          </div>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden w-full transition-colors">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Fetching dispatch records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] tracking-wider border-b border-gray-300 dark:border-gray-700">
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Date</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Invoice No</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Dispatch Type</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20">Dispatch (kg)</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Local Type</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-orange-800 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20">Local Sale (kg)</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle font-black bg-gray-200 dark:bg-gray-800">Total Out (kg)</th>
                  
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Return Type</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20">Return (kg)</th>
                  
                  <th className="px-4 py-4 align-middle text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 w-24">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.length > 0 ? (
                  <>
                    {records.map((record) => {
                      const dispatches = record.dispatches || [];
                      const localSales = record.localSales || [];
                      const returns = record.returns || [];

                      return (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 align-top">
                          {record.date ? record.date.split("T")[0] : "-"}
                        </td>
                        
                        {/* INVOICE NOS */}
                        <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 align-top">
                          {dispatches.length > 0 ? dispatches.map((d, i) => (
                            <div key={i} className="py-1 flex items-center justify-center gap-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                               <FileText size={14} className="text-gray-400"/> {d.invoiceNo || "-"}
                            </div>
                          )) : "-"}
                        </td>
                        
                        {/* DISPATCH TYPES */}
                        <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 align-top">
                          {dispatches.length > 0 ? dispatches.map((d, i) => (
                            <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                               {d.teaType ? <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-[11px] border border-gray-200 dark:border-gray-600">{d.teaType}</span> : "-"}
                            </div>
                          )) : "-"}
                        </td>
                        
                        {/* DISPATCH KG */}
                        <td className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 font-bold text-teal-800 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-900/10 align-top">
                          {dispatches.length > 0 ? (
                            <div className="flex flex-col h-full">
                              {dispatches.map((d, i) => (
                                <div key={i} className="py-1 border-b border-teal-100 dark:border-teal-900/30 font-medium text-sm text-teal-700 dark:text-teal-400 last:border-0">
                                  {d.weight ? d.weight.toFixed(2) : "-"}
                                </div>
                              ))}
                              {dispatches.length > 1 && (
                                <div className="mt-2 pt-1 border-t-2 border-teal-200 dark:border-teal-800 font-black">
                                  {record.dispatch.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        
                        {/* LOCAL TYPES */}
                        <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 align-top">
                           {localSales.length > 0 ? localSales.map((l, i) => (
                             <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                               {l.teaType ? <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-[11px] border border-gray-200 dark:border-gray-600">{l.teaType}</span> : "-"}
                             </div>
                           )) : "-"}
                        </td>
                        
                        {/* LOCAL KG */}
                        <td className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 font-bold text-orange-800 dark:text-orange-300 bg-orange-50/30 dark:bg-orange-900/10 align-top">
                          {localSales.length > 0 ? (
                            <div className="flex flex-col h-full">
                              {localSales.map((l, i) => (
                                <div key={i} className="py-1 border-b border-orange-100 dark:border-orange-900/30 font-medium text-sm text-orange-700 dark:text-orange-400 last:border-0">
                                  {l.weight ? l.weight.toFixed(2) : "-"}
                                </div>
                              ))}
                              {localSales.length > 1 && (
                                <div className="mt-2 pt-1 border-t-2 border-orange-200 dark:border-orange-800 font-black">
                                  {record.localSaleAndGratis.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : "-"}
                        </td>

                        {/* TOTAL OUT */}
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-black text-gray-800 dark:text-gray-200 bg-gray-100/50 dark:bg-gray-800/50 align-top">
                          {(record.totalOut || 0).toFixed(2)}
                        </td>
                        
                        {/* RETURN TYPES */}
                        <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 align-top">
                           {returns.length > 0 ? returns.map((rItem, i) => (
                             <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                               {rItem.teaType ? <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-[11px] border border-gray-200 dark:border-gray-600">{rItem.teaType}</span> : "-"}
                             </div>
                           )) : "-"}
                        </td>

                        {/* RETURN KG */}
                        <td className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 font-medium align-top bg-red-50/30 dark:bg-red-900/10">
                           {returns.length > 0 ? (
                            <div className="flex flex-col h-full">
                              {returns.map((rItem, i) => (
                                <div key={i} className="py-1 border-b border-red-100 dark:border-red-900/30 font-medium text-sm text-red-600 dark:text-red-400 last:border-0">
                                  {rItem.amount ? rItem.amount.toFixed(2) : "-"}
                                </div>
                              ))}
                              {returns.length > 1 && (
                                <div className="mt-2 pt-1 border-t-2 border-red-200 dark:border-red-800 font-black">
                                  {record.returnAmount.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : "-"}
                        </td>

                        {/* ACTION CELL */}
                        <td className="px-3 py-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(record)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-all"
                              title="Edit Record"
                            >
                              <MdOutlineEdit size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(record)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                              title="Delete Record"
                            >
                              <MdOutlineDeleteOutline size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}

                    <tr className="bg-gray-200 dark:bg-gray-700 font-black border-t-2 border-gray-300 dark:border-gray-600">
                      <td colSpan="3" className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300 uppercase">
                        Total for Period:
                      </td>
                      <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-teal-800 dark:text-teal-300">
                        {totalDispatch > 0 ? totalDispatch.toFixed(2) : "-"}
                      </td>
                      <td className="border-r border-gray-300 dark:border-gray-600"></td>
                      <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-orange-800 dark:text-orange-300">
                        {totalLocalSale > 0 ? totalLocalSale.toFixed(2) : "-"}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        {totalOut > 0 ? totalOut.toFixed(2) : "-"}
                      </td>
                      <td className="border-r border-gray-300 dark:border-gray-600"></td>
                      <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-300">
                         {totalReturns > 0 ? totalReturns.toFixed(2) : "-"}
                      </td>
                      <td className="bg-gray-200 dark:bg-gray-700"></td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="10" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={40} className="mb-3 opacity-20" />
                        <p className="text-lg font-medium">No dispatch records found for {getPeriodText()}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              This action cannot be undone. This will permanently delete the dispatch record for{" "}
              <span className="font-bold text-gray-700 dark:text-gray-300">
                {recordToDelete?.date ? recordToDelete.date.split("T")[0] : ""}
              </span>{" "}
              and remove any associated pending transfers from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}