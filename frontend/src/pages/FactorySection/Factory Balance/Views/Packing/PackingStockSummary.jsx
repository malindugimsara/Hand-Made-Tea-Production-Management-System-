import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  AlertCircle,
  RefreshCcw,
  Filter,
  Package,
  TrendingUp,
} from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import PDFDownloader from "@/components/PDFDownloader";

// Essential Dialog Components from your UI directory
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

export default function PackingStockView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const location = useLocation();
  const navigate = useNavigate();

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Dark Mode State
  const [isDarkMode] = useState(() => localStorage.getItem("theme") === "dark" || false);

  // Filter States
  const [filterMonth, setFilterMonth] = useState(() => location.state?.returnMonth || currentMonthStr);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  const getPeriodText = () => {
    if (fromDate && toDate) return `${fromDate} to ${toDate}`;
    if (filterMonth) return filterMonth;
    return "All Time";
  };

  useEffect(() => {
    fetchLedgerData();
  }, [filterMonth, fromDate, toDate]);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-packs`);
      if (!response.ok) throw new Error("Failed to fetch data from database");
      const res = await response.json();
      setRecords(res.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-packs/${recordToDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message);
      }
      toast.success("Ledger row deleted successfully");
      setRecordToDelete(null);
      fetchLedgerData();
    } catch (error) {
      toast.error(error.message || "Failed to delete record");
    }
  };

  const handleEditClick = (record) => {
    navigate(`/factory/packing/edit/${record.date}`, { state: { record } });
  };

  // --- Calculations (Running Balances & Filters) ---
  const { filteredData, totals } = useMemo(() => {
    const sortedRows = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    let agSuperBal = 0, aGroupBal = 0, sampleBagsBal = 0;

    const processedRows = sortedRows.map(row => {
      agSuperBal += (row.agSuper?.received || 0) - (row.agSuper?.used || 0);
      aGroupBal += (row.aGroup?.received || 0) - (row.aGroup?.used || 0);
      sampleBagsBal += (row.sampleBags?.received || 0) - (row.sampleBags?.used || 0);

      return {
        ...row,
        calculatedBalances: { agSuper: agSuperBal, aGroup: aGroupBal, sampleBags: sampleBagsBal }
      };
    });

    let finalData = processedRows;
    if (filterMonth) {
      finalData = finalData.filter(row => row.date.startsWith(filterMonth));
    } else if (fromDate && toDate) {
      finalData = finalData.filter(row => row.date >= fromDate && row.date <= toDate);
    }

    finalData.sort((a, b) => new Date(b.date) - new Date(a.date));

    const periodTotals = { agSuperRec: 0, agSuperUsed: 0, aGroupRec: 0, aGroupUsed: 0, sampleRec: 0, sampleUsed: 0 };
    finalData.forEach(r => {
      periodTotals.agSuperRec += (r.agSuper?.received || 0);
      periodTotals.agSuperUsed += (r.agSuper?.used || 0);
      periodTotals.aGroupRec += (r.aGroup?.received || 0);
      periodTotals.aGroupUsed += (r.aGroup?.used || 0);
      periodTotals.sampleRec += (r.sampleBags?.received || 0);
      periodTotals.sampleUsed += (r.sampleBags?.used || 0);
    });

    return { filteredData: finalData, totals: periodTotals };
  }, [records, filterMonth, fromDate, toDate]);

  // --- PDF Export Structuring ---
  const getCleanTableData = () => {
    const tableRows = filteredData.map((r) => [
      r.date,
      r.agSuper?.received || "-", r.agSuper?.used || "-", String(r.calculatedBalances.agSuper),
      r.aGroup?.received || "-", r.aGroup?.used || "-", String(r.calculatedBalances.aGroup),
      r.sampleBags?.received || "-", r.sampleBags?.used || "-", String(r.calculatedBalances.sampleBags),
    ]);

    if (filteredData.length > 0) {
      tableRows.push([
        "TOTAL PERIOD", 
        String(totals.agSuperRec), String(totals.agSuperUsed), "-",
        String(totals.aGroupRec), String(totals.aGroupUsed), "-",
        String(totals.sampleRec), String(totals.sampleUsed), "-"
      ]);
    }
    return tableRows;
  };

  // --- EXPORT TO EXCEL (With Clean Border and Color Formatting) ---
  const exportToExcel = () => {
    const periodText = getPeriodText();
    
    const dataRows = filteredData.map((r) => [
      r.date,
      r.agSuper?.received || 0, r.agSuper?.used || 0, r.calculatedBalances.agSuper,
      r.aGroup?.received || 0, r.aGroup?.used || 0, r.calculatedBalances.aGroup,
      r.sampleBags?.received || 0, r.sampleBags?.used || 0, r.calculatedBalances.sampleBags,
    ]);

    if (filteredData.length > 0) {
      dataRows.push([
        "TOTAL PERIOD", 
        totals.agSuperRec, totals.agSuperUsed, "-",
        totals.aGroupRec, totals.aGroupUsed, "-",
        totals.sampleRec, totals.sampleUsed, "-"
      ]);
    }

    const tableData = [
      [`FACTORY PACKING LEDGER: ${periodText}`, "", "", "", "", "", "", "", "", ""],
      [`Generated on ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", ""],
      ["DATE", "A/G/SUPER REC", "A/G/SUPER USED", "A/G/SUPER BALA", "A/GROUP REC", "A/GROUP USED", "A/GROUP BALA", "SAMPLES REC", "SAMPLES USED", "SAMPLES BALA"],
      ...dataRows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(tableData);
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ];

    const borderAll = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } },
    };
    const stdAlign = { horizontal: "center", vertical: "center" };
    
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: "s", v: "" };

        if (R === 0) worksheet[cellAddress].s = { font: { bold: true, sz: 14, color: { rgb: "1B6A31" } }, alignment: stdAlign };
        else if (R === 1) worksheet[cellAddress].s = { font: { italic: true, sz: 10, color: { rgb: "6B7280" } }, alignment: stdAlign };
        else if (R === 3) worksheet[cellAddress].s = { fill: { fgColor: { rgb: "1B6A31" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: stdAlign, border: borderAll };
        else if (R > 3) {
          let currentStyle = { alignment: stdAlign, border: borderAll };
          if (worksheet[XLSX.utils.encode_cell({ r: R, c: 0 })]?.v === "TOTAL PERIOD") {
            currentStyle.font = { bold: true };
            currentStyle.fill = { fgColor: { rgb: "FDE68A" } };
          }
          worksheet[cellAddress].s = currentStyle;
        }
      }
    }

    worksheet["!cols"] = Array(10).fill({ wch: 15 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Packing Ledger");
    XLSX.writeFile(workbook, `Packing_Ledger_${periodText.replace(/ /g, "_")}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto font-sans flex flex-col min-h-screen bg-[#f3faf7] dark:bg-gray-950 transition-colors duration-300">
      
      {/* TOP HEADER & BUTTONS */}
      <div className="mb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-400 flex items-center gap-2">
            Factory Packing Ledger
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Running stock balances for factory packs and sample bags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLedgerData}
            disabled={loading}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            onClick={exportToExcel}
            disabled={filteredData.length === 0}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-[#1B6A31] dark:text-green-400 border border-[#1B6A31] dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>

          <PDFDownloader
            title="Factory Packing Ledger"
            subtitle={`Period: ${getPeriodText()}`}
            data={getCleanTableData()}
            headers={[
              ["DATE", "A/G/SUPER\nREC", "A/G/SUPER\nUSED", "A/G/SUPER\nBALA", "A/GROUP\nREC", "A/GROUP\nUSED", "A/GROUP\nBALA", "SAMPLES\nREC", "SAMPLES\nUSED", "SAMPLES\nBALA"]
            ]}
            uniqueCode={`PCK-${getPeriodText().replace(/ /g, "")}`}
            fileName={`Packing_Ledger_${getPeriodText().replace(/ /g, "_")}.pdf`}
            orientation="landscape"
            disabled={loading || filteredData.length === 0}
            autoTableOptions={{
              theme: "grid",
              headStyles: { fillColor: [27, 106, 49], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
              columnStyles: {
                1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' },
                4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' },
                7: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'center' },
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
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">A / G / Super</h3>
            <div className="text-xl font-black text-teal-700 dark:text-teal-400">
              Rec: {totals.agSuperRec} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Used: {totals.agSuperUsed}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">A / Group</h3>
            <div className="text-xl font-black text-blue-700 dark:text-blue-400">
              Rec: {totals.aGroupRec} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Used: {totals.aGroupUsed}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <TrendingUp size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Sample Bags</h3>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-400">
              Rec: {totals.sampleRec} <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> Used: {totals.sampleUsed}
            </div>
          </div>
        </div>
      </div>

      {/* TABLE MATRIX CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden w-full transition-colors">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Fetching ledger records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] tracking-wider border-b border-gray-300 dark:border-gray-700">
                  <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle min-w-[110px]">Date</th>
                  <th colSpan="3" className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 align-middle text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20">A / G / Super</th>
                  <th colSpan="3" className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 align-middle text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">A / Group</th>
                  <th colSpan="3" className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 align-middle text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20">Sample Bags</th>
                  <th rowSpan="2" className="px-4 py-4 align-middle text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 w-24 print:hidden">Action</th>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-300 dark:border-gray-700">
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Rec</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Used</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700 bg-gray-200/50 dark:bg-gray-900/40 font-black">Bala</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Rec</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Used</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700 bg-gray-200/50 dark:bg-gray-900/40 font-black">Bala</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Rec</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700">Used</th>
                  <th className="py-2.5 px-2 border-r border-gray-300 dark:border-gray-700 bg-gray-200/50 dark:bg-gray-900/40 font-black">Bala</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium">
                {filteredData.length > 0 ? (
                  <>
                    {filteredData.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300">
                          {row.date}
                        </td>
                        
                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.agSuper?.received || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 font-semibold">{row.agSuper?.used || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-300 dark:border-gray-700 font-bold text-teal-800 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-900/10">{row.calculatedBalances.agSuper}</td>

                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.aGroup?.received || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 font-semibold">{row.aGroup?.used || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-300 dark:border-gray-700 font-bold text-blue-800 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10">{row.calculatedBalances.aGroup}</td>

                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.sampleBags?.received || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 font-semibold">{row.sampleBags?.used || "-"}</td>
                        <td className="py-3 px-2 border-r border-gray-300 dark:border-gray-700 font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/10">{row.calculatedBalances.sampleBags}</td>

                        <td className="px-3 py-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(row)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-all"
                              title="Edit Record"
                            >
                              <MdOutlineEdit size={20} />
                            </button>
                            
                            {/* Shadcn Alert Dialog wrapped around delete button functionality */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => setRecordToDelete(row._id)}
                                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete Record"
                                >
                                  <MdOutlineDeleteOutline size={20} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this day's packing ledger data from the server database records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-gray-200 dark:bg-gray-700 font-black border-t-2 border-gray-300 dark:border-gray-600">
                      <td className="px-4 py-4 border-r border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300 uppercase text-[11px]">
                        Period Totals:
                      </td>
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-teal-800 dark:text-teal-300">{totals.agSuperRec || "-"}</td>
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-400">{totals.agSuperUsed || "-"}</td>
                      <td className="border-r border-gray-300 dark:border-gray-600 bg-gray-300/50 dark:bg-gray-800/50"></td>
                      
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-blue-800 dark:text-blue-300">{totals.aGroupRec || "-"}</td>
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-400">{totals.aGroupUsed || "-"}</td>
                      <td className="border-r border-gray-300 dark:border-gray-600 bg-gray-300/50 dark:bg-gray-800/50"></td>
                      
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-indigo-800 dark:text-indigo-300">{totals.sampleRec || "-"}</td>
                      <td className="py-4 px-2 border-r border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-400">{totals.sampleUsed || "-"}</td>
                      <td className="border-r border-gray-300 dark:border-gray-600 bg-gray-300/50 dark:bg-gray-800/50"></td>
                      <td className="bg-gray-200 dark:bg-gray-700"></td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan="11" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={40} className="mb-3 opacity-20" />
                        <p className="text-lg font-medium">No ledger records found for {getPeriodText()}</p>
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