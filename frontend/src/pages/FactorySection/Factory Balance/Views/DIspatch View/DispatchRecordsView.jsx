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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DispatchRecordsView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();
  const navigate = useNavigate(); // Navigate Hook

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null); // Delete State

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
    // Navigate to the newly created Edit Dispatch Log page
    navigate("/factory/dispatch/edit", { state: { recordData: record } });
  };

  
  // ------------------------------

  // Calculations for Summary
  const totalDispatch = records.reduce((sum, r) => sum + (r.dispatch || 0), 0);
  const totalLocalSale = records.reduce((sum, r) => sum + (r.localSaleAndGratis || 0), 0);
  const totalReturns = records.reduce((sum, r) => sum + (r.returnAmount || 0), 0);
  const totalOut = totalDispatch + totalLocalSale;

  const getCleanTableData = () => {
    const formatVal = (val) => {
      const num = Number(val);
      if (num === 0) return "-";
      return num.toFixed(2);
    };

    const tableRows = records.map((r) => [
      r.date ? r.date.split("T")[0] : "-",
      r.invoiceNo || "-",
      r.dispatchTeaType || "-",
      formatVal(r.dispatch || 0),
      r.localSaleTeaType || "-",
      formatVal(r.localSaleAndGratis || 0),
      formatVal(r.totalOut || 0),
      r.returnTeaType || "-",       // 👈 NEW: Return Tea Type
      formatVal(r.returnAmount || 0),
    ]);

    if (records.length > 0) {
      tableRows.push([
        "TOTAL", "-", "-",
        totalDispatch > 0 ? totalDispatch.toFixed(2) : "-",
        "-",
        totalLocalSale > 0 ? totalLocalSale.toFixed(2) : "-",
        totalOut > 0 ? totalOut.toFixed(2) : "-",
        "-",                        // 👈 NEW: Empty column for total return tea type
        totalReturns > 0 ? totalReturns.toFixed(2) : "-",
      ]);
    }

    return tableRows;
  };

  const exportToExcel = () => {
    const periodText = getPeriodText();
    const dataRows = records.map((r) => [
      r.date ? r.date.split("T")[0] : "-",
      r.invoiceNo || "-",
      r.dispatchTeaType || "-",
      Number((r.dispatch || 0).toFixed(2)),
      r.localSaleTeaType || "-",
      Number((r.localSaleAndGratis || 0).toFixed(2)),
      Number((r.totalOut || 0).toFixed(2)),
      r.returnTeaType || "-",       // 👈 NEW
      Number((r.returnAmount || 0).toFixed(2)),
    ]);

    if (records.length > 0) {
      dataRows.push([
        "TOTAL", "-", "-",
        Number(totalDispatch.toFixed(2)),
        "-",
        Number(totalLocalSale.toFixed(2)),
        Number(totalOut.toFixed(2)),
        "-",                        // 👈 NEW
        Number(totalReturns.toFixed(2)),
      ]);
    }

    const tableData = [
      [`DISPATCH & SALES REPORT: ${periodText}`, "", "", "", "", "", "", "", ""],
      [`Generated on ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["DATE", "INVOICE NO", "DISPATCH TEA TYPE", "DISPATCH QTY (KG)", "LOCAL SALE TEA TYPE", "LOCAL SALE QTY (KG)", "TOTAL OUT (KG)", "RETURN TEA TYPE", "RETURNS (KG)"],
      ...dataRows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(tableData);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // 👈 Updated to c: 8 (9 columns)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // 👈 Updated to c: 8 (9 columns)
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
      { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, 
      { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 15 } // 👈 Extra width added
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
              // 👈 PDF headers update කර ඇත
              ["DATE", "INVOICE NO", "DISPATCH\nTEA TYPE", "DISPATCH\n(KG)", "LOCAL SALE\nTEA TYPE", "LOCAL SALE\n(KG)", "TOTAL OUT\n(KG)", "RETURN\nTEA TYPE", "RETURNS\n(KG)"]
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
                8: { halign: 'right' }, // 👈 Return (kg) is now index 8
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
                  
                  {/* 👈 NEW RETURN TEA TYPE HEADER */}
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle">Return Type</th>
                  <th className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20">Return (kg)</th>
                  
                  <th className="px-4 py-4 align-middle text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 w-24">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.length > 0 ? (
                  <>
                    {records.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300">
                          {record.date ? record.date.split("T")[0] : "-"}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          {record.invoiceNo ? (
                            <div className="flex items-center justify-center gap-1"><FileText size={14} className="text-gray-400"/> {record.invoiceNo}</div>
                          ) : "-"}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          {record.dispatchTeaType ? (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-gray-600">{record.dispatchTeaType}</span>
                          ) : "-"}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-bold text-teal-800 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-900/10">
                          {(record.dispatch || 0) === 0 ? "-" : record.dispatch.toFixed(2)}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                           {record.localSaleTeaType ? (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-gray-600">{record.localSaleTeaType}</span>
                          ) : "-"}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-bold text-orange-800 dark:text-orange-300 bg-orange-50/30 dark:bg-orange-900/10">
                          {(record.localSaleAndGratis || 0) === 0 ? "-" : record.localSaleAndGratis.toFixed(2)}
                        </td>

                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 font-black text-gray-800 dark:text-gray-200 bg-gray-100/50 dark:bg-gray-800/50">
                          {(record.totalOut || 0).toFixed(2)}
                        </td>

                        {/* 👈 NEW RETURN TEA TYPE CELL */}
                        <td className="px-4 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                           {record.returnTeaType ? (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-gray-600">{record.returnTeaType}</span>
                          ) : "-"}
                        </td>
                        
                        <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 font-medium">
                          {(record.returnAmount || 0) === 0 ? "-" : record.returnAmount.toFixed(2)}
                        </td>

                        {/* ACTION CELL */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(record)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-all"
                              title="Edit Record"
                            >
                              <MdOutlineEdit size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

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
                      {/* 👈 NEW EMPTY CELL FOR RETURN TYPE TOTAL */}
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
    </div>
  );
}