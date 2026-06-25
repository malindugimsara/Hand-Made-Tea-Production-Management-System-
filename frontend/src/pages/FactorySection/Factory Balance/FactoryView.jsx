import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  AlertCircle,
  RefreshCcw,
  Filter,
  Sun,
  Moon,
} from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

// IMPORT YOUR CUSTOM PDF DOWNLOADER
import PDFDownloader from "@/components/PDFDownloader";

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

export default function FactoryView() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [records, setRecords] = useState([]);
  const [bfBalance, setBfBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || false;
  });

  // Filter States
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Dark Mode Toggle Effect
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
      fetchFactoryLogs();
    }
  }, [filterMonth, fromDate, toDate]);

  const fetchFactoryLogs = async () => {
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
        },
      );

      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Unauthorized: Please log in.");
        throw new Error("Failed to fetch data from database");
      }

      const data = await response.json();

      let runningBalance = data.bfFromLastMonth || 0;

      // 1. මුලින්ම දින අනුපිළිවෙලට (පරණ දවසේ ඉඳන් අලුත් දවසට) Sort කරනවා - Calculations සඳහා
      let sortedRecordsAsc = [...(data.records || [])].sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      );

      let currentMonthTracker = "";
      let glToDate = 0;
      let mtToDate = 0;

      const processedRecordsAsc = sortedRecordsAsc.map((record) => {
        const recordMonth = record.date
          ? record.date.split("T")[0].substring(0, 7)
          : "";

        if (currentMonthTracker !== recordMonth) {
          currentMonthTracker = recordMonth;
          glToDate = 0;
          mtToDate = 0;
        }

        const glToday = record.greenLeaf?.today || record.greenLeafToday || 0;
        const mtToday = record.madeTea?.today || record.madeTeaToday || 0;
        const disp = record.dispatch || 0;
        const loc = record.localSaleAndGratis || 0;
        const ret = record.returnAmount || 0;

        const tOut = disp + loc;

        glToDate += glToday;
        mtToDate += mtToday;

        runningBalance = runningBalance + mtToday - tOut + ret;

        return {
          ...record,
          greenLeaf: { today: glToday, toDate: glToDate },
          madeTea: { today: mtToday, toDate: mtToDate },
          dispatch: disp,
          localSaleAndGratis: loc,
          totalOut: tOut,
          returnAmount: ret,
          factoryBalance: runningBalance,
          isEdited: record.isEdited || false,
          editedBy: record.editedBy || "",
        };
      });

      setBfBalance(data.bfFromLastMonth || 0);

      // --- NEW LOGIC: Days to Zero Calculation ---
      for (let i = 0; i < processedRecordsAsc.length; i++) {
        let tempBal = processedRecordsAsc[i].factoryBalance;
        let days = 0;

        // වත්මන් දිනයේ සිට පසුපසට ගණනය කිරීම
        for (let j = i; j >= 0; j--) {
          if (tempBal <= 0) break;
          days++;
          
          const mt = processedRecordsAsc[j].madeTea?.today || 0;
          const disp = processedRecordsAsc[j].totalOut || 0;
          const ret = processedRecordsAsc[j].returnAmount || 0;

          // ඔබ සඳහන් කළ පරිදි: Made Tea අඩු කර, Dispatch අඩු කර, Return එකතු කරයි
          tempBal = tempBal - mt - disp + ret;
        }

        processedRecordsAsc[i].daysToZero = days;
      }
      // ------------------------------------------

      // 2. Calculations ඉවර උනාට පස්සේ, අලුත්ම දවස උඩට එන විදියට Array එක රිවර්ස් (Reverse) කරනවා
      setRecords(processedRecordsAsc.reverse());
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Could not load data from database.");
    } finally {
      setLoading(false);
    }
  };

  // අවසාන Factory Balance එක ලබා ගැනීම සඳහා (PDF එකට යැවීමට)
  const getLastFactoryBalance = () => {
    if (records.length > 0) {
      return records[0].factoryBalance;
    }
    return bfBalance;
  };

  const getCleanTableData = () => {
    const formatVal = (val) => {
      const num = Number(val);
      if (num === 0) return "-";
      return num.toFixed(2);
    };

    return [
      ["B/F", "-", "-", "-", "-", "-", "-", "-", "-", bfBalance.toFixed(2)],
      ...records.map((r) => [
        r.date ? r.date.split("T")[0] : "-",
        formatVal(r.greenLeaf?.today || 0),
        formatVal(r.greenLeaf?.toDate || 0),
        formatVal(r.madeTea?.today || 0),
        formatVal(r.madeTea?.toDate || 0),
        formatVal(r.dispatch || 0),
        formatVal(r.localSaleAndGratis || 0),
        formatVal(r.totalOut || 0),
        formatVal(r.returnAmount || 0),
        r.factoryBalance ? r.factoryBalance.toFixed(2) : "0.00", 
      ]),
    ];
  };

  const handleEditClick = (record) => {
    navigate("/factory/edit", { state: { recordData: record } });
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const toastId = toast.loading("Deleting factory log...");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/factory-logs/${recordToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Unauthorized: Please log in again.");
        throw new Error("Failed to delete");
      }

      toast.success("Record deleted successfully!", { id: toastId });
      fetchFactoryLogs();
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  const exportToExcel = () => {
    const periodText = getPeriodText();
    const dataRows = records.map((r) => [
      r.date ? r.date.split("T")[0] : "-",
      Number((r.greenLeaf?.today || 0).toFixed(2)),
      Number((r.greenLeaf?.toDate || 0).toFixed(2)),
      Number((r.madeTea?.today || 0).toFixed(2)),
      Number((r.madeTea?.toDate || 0).toFixed(2)),
      Number((r.dispatch || 0).toFixed(2)),
      Number((r.localSaleAndGratis || 0).toFixed(2)),
      Number((r.totalOut || 0).toFixed(2)),
      Number((r.returnAmount || 0).toFixed(2)),
      Number((r.factoryBalance || 0).toFixed(2)),
    ]);

    const tableData = [
      [
        `FACTORY PRODUCTION REPORT: ${periodText}`,
        "", "", "", "", "", "", "", "", "",
      ],
      [
        `Generated by Unified Management System on ${new Date().toLocaleString()}`,
        "", "", "", "", "", "", "", "", "",
      ],
      ["", "", "", "", "", "", "", "", "", ""],
      [
        "DATE", "G/L", "", "M/T", "", "DISPATCH", "LOCAL SALES & GRATIS", "TOTAL", "RETURN INVOICE", "FACTORY BALANCE",
      ],
      ["", "Today", "To Date", "Today", "To Date", "", "", "", "", ""],
      [
        "B/F", "-", "-", "-", "-", "-", "-", "-", "-", Number(bfBalance.toFixed(2)),
      ],
      ...dataRows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(tableData);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } },
      { s: { r: 3, c: 5 }, e: { r: 4, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 4, c: 6 } },
      { s: { r: 3, c: 7 }, e: { r: 4, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 4, c: 8 } },
      { s: { r: 3, c: 9 }, e: { r: 4, c: 9 } },
    ];

    const borderAll = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } },
    };

    const stdAlign = { horizontal: "center", vertical: "center" };
    const titleStyle = {
      font: { bold: true, sz: 16, color: { rgb: "1B6A31" } },
      alignment: stdAlign,
    };
    const subtitleStyle = {
      font: { italic: true, sz: 10, color: { rgb: "6B7280" } },
      alignment: stdAlign,
    };
    const topHeaderSolidStyle = {
      fill: { fgColor: { rgb: "1B6A31" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: borderAll,
    };
    const glHeaderStyle = {
      fill: { fgColor: { rgb: "D9F99D" } },
      font: { color: { rgb: "1B6A31" }, bold: true, sz: 10 },
      alignment: stdAlign,
      border: borderAll,
    };
    const mtHeaderStyle = {
      fill: { fgColor: { rgb: "E9D5FF" } },
      font: { color: { rgb: "6B21A8" }, bold: true, sz: 10 },
      alignment: stdAlign,
      border: borderAll,
    };
    const bfStyle = {
      fill: { fgColor: { rgb: "FEF9C3" } },
      font: { bold: true, color: { rgb: "111827" } },
      alignment: stdAlign,
      border: borderAll,
    };
    const bodyStyleEven = { alignment: stdAlign, border: borderAll };
    const bodyStyleOdd = {
      fill: { fgColor: { rgb: "F9FAFB" } },
      alignment: stdAlign,
      border: borderAll,
    };

    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: "s", v: "" };

        if (R === 0) worksheet[cellAddress].s = titleStyle;
        else if (R === 1) worksheet[cellAddress].s = subtitleStyle;
        else if (R === 2) continue;
        else if (R === 3 || R === 4) {
          if (C === 1 || C === 2) worksheet[cellAddress].s = glHeaderStyle;
          else if (C === 3 || C === 4) worksheet[cellAddress].s = mtHeaderStyle;
          else worksheet[cellAddress].s = topHeaderSolidStyle;
        } else if (R === 5) worksheet[cellAddress].s = bfStyle;
        else {
          const isOddRow = R % 2 !== 0;
          let currentStyle = isOddRow
            ? { ...bodyStyleOdd }
            : { ...bodyStyleEven };

          if (C === 1 || C === 2)
            currentStyle.font = { color: { rgb: "1B6A31" } };
          else if (C === 3 || C === 4)
            currentStyle.font = { color: { rgb: "6B21A8" } };
          else if (C === 8)
            currentStyle.font = { color: { rgb: "B91C1C" }, bold: true };
          else if (C === 9)
            currentStyle.font = { color: { rgb: "1E40AF" }, bold: true };

          worksheet[cellAddress].s = currentStyle;
          if (C > 0 && typeof worksheet[cellAddress].v === "number")
            worksheet[cellAddress].z = "#,##0.00";
        }
      }
    }

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
    ];
    worksheet["!rows"] = [
      { hpt: 30 },
      { hpt: 20 },
      { hpt: 10 },
      { hpt: 25 },
      { hpt: 20 },
      { hpt: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Factory Logs");
    XLSX.writeFile(
      workbook,
      `Factory_Logs_${periodText.replace(/ /g, "_")}.xlsx`,
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto font-sans flex flex-col min-h-screen bg-[#f3faf7] dark:bg-gray-950 transition-colors duration-300">
      {/* --- TOP HEADER & BUTTONS --- */}
      <div className="mb-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-400 flex items-center gap-2">
            Factory Logs View
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Master overview of Green Leaf, Production, & Labour
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchFactoryLogs}
            disabled={loading}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>

          <button
            onClick={exportToExcel}
            className="px-4 py-2 h-[42px] bg-white dark:bg-gray-800 text-[#1B6A31] dark:text-green-400 border border-[#1B6A31] dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <FileSpreadsheet size={18} /> Export Excel
          </button>

          <PDFDownloader
            title="Factory Production Report"
            subtitle={`Period: ${getPeriodText()}`}
            data={getCleanTableData()}
            headers={[
              [
                {
                  content: "DATE",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
                { content: "G/L", colSpan: 2, styles: { halign: "center" } },
                { content: "M/T", colSpan: 2, styles: { halign: "center" } },
                {
                  content: "DISPATCH",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
                {
                  content: "LOCAL SALES &\nGRATIS",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
                {
                  content: "TOTAL\n(LOCAL SALE + DISPATCH)",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
                {
                  content: "RETURN\nINVOICE",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
                {
                  content: "FACTORY\nBALANCE",
                  rowSpan: 2,
                  styles: { halign: "center", valign: "middle" },
                },
              ],
              [
                { content: "Today", styles: { halign: "center" } },
                { content: "To Date", styles: { halign: "center" } },
                { content: "Today", styles: { halign: "center" } },
                { content: "To Date", styles: { halign: "center" } },
              ],
            ]}
            uniqueCode={`FLV-${getPeriodText().replace(/ /g, "")}`}
            fileName={`Factory_Report_${getPeriodText().replace(/ /g, "_")}.pdf`}
            orientation="landscape"
            disabled={loading || records.length === 0}
            autoTableOptions={{
              theme: "grid",
              didDrawPage: (data) => {
                const doc = data.doc;
                doc.setFontSize(10);
                doc.setTextColor(220, 38, 38);
                doc.text(
                  `Factory Balance: ${getLastFactoryBalance().toFixed(2)} Kg`,
                  data.settings.margin.left,
                  37,
                );
              },
              headStyles: {
                fillColor: [243, 244, 246],
                textColor: [55, 65, 81],
                lineColor: [209, 213, 219],
                lineWidth: 0.1,
                fontStyle: "bold",
              },
            }}
          />
        </div>
      </div>

      {/* --- BEAUTIFUL FILTER BAR --- */}
      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 transition-colors">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pb-3 md:pb-0 md:pr-6 w-full md:w-auto">
          <Filter size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Filter Records
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Month
            </label>
            <div className="relative">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setFromDate("");
                  setToDate("");
                }}
                className="w-full sm:w-44 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center px-2">
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 my-1 uppercase">
              OR
            </span>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setFilterMonth("");
                }}
                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setFilterMonth("");
                }}
                className="w-full sm:w-40 outline-none text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1B6A31] dark:focus:border-green-500 focus:ring-2 focus:ring-[#1B6A31]/20 dark:focus:ring-green-500/20 transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- TABLE CONTAINER --- */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden w-full transition-colors">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] dark:border-green-600 dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Fetching logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs tracking-wider border-b border-gray-300 dark:border-gray-700 transition-colors">
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle w-24 bg-gray-200 dark:bg-gray-800/80"
                  >
                    Date
                  </th>
                  <th
                    colSpan="2"
                    className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 bg-[#8CC63F]/20 dark:bg-green-900/40 text-[#1B6A31] dark:text-green-400"
                  >
                    G/L
                  </th>
                  <th
                    colSpan="2"
                    className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300"
                  >
                    M/T
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30"
                  >
                    Dispatch
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 whitespace-normal min-w-[120px]"
                  >
                    Local Sales &<br />
                    Gratis
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-orange-900 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 font-extrabold whitespace-normal min-w-[140px]"
                  >
                    Total
                    <br />
                    <span className="text-[10px] font-normal text-orange-700 dark:text-orange-300">
                      (Local Sale + Dispatch)
                    </span>
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
                  >
                    Return
                    <br />
                    Invoice
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 border-r border-gray-300 dark:border-gray-700 align-middle text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-extrabold"
                  >
                    Factory
                    <br />
                    Balance
                  </th>
                  <th
                    rowSpan="2"
                    className="px-4 py-4 align-middle text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 w-24"
                  >
                    Action
                  </th>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs border-b-2 border-gray-400 dark:border-gray-600 transition-colors">
                  <th className="px-3 py-2 border-r border-gray-300 dark:border-gray-700 font-semibold">
                    Today
                  </th>
                  <th className="px-3 py-2 border-r border-gray-300 dark:border-gray-700 font-semibold">
                    To Date
                  </th>
                  <th className="px-3 py-2 border-r border-gray-300 dark:border-gray-700 font-semibold">
                    Today
                  </th>
                  <th className="px-3 py-2 border-r border-gray-300 dark:border-gray-700 font-semibold">
                    To Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {/* B/F ROW */}
                <tr className="bg-gray-100 dark:bg-gray-800/80 font-bold text-gray-800 dark:text-gray-200 border-b-2 border-red-400 dark:border-red-500/50">
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-700/50">
                    B/F
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 bg-orange-50/50 dark:bg-orange-900/10 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                    -
                  </td>
                  <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300">
                    {bfBalance > 0 ? bfBalance.toFixed(2) : "0.00"}
                  </td>
                  <td className="px-3 py-3 bg-gray-100 dark:bg-gray-800/80"></td>
                </tr>

                {/* DYNAMIC DATA ROWS */}
                {records.length > 0 ? (
                  records.map((record) => {
                    const displayDay = record.date
                      ? record.date.split("T")[0]
                      : "";

                    return (
                      <tr
                        key={record._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      >
                        <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 relative text-left">
                          <div className="flex flex-col items-center justify-center">
                            <span>{displayDay}</span>
                            {record.isEdited && (
                              <span className="text-[10px] text-orange-500 dark:text-orange-400 font-medium whitespace-nowrap">
                                *Edited{" "}
                                {record.editedBy ? `by ${record.editedBy}` : ""}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                          {(record.greenLeaf?.today || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-200">
                          {(record.greenLeaf?.toDate || 0).toFixed(2)}
                        </td>

                        <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200">
                          {(record.madeTea?.today || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-200">
                          {(record.madeTea?.toDate || 0).toFixed(2)}
                        </td>

                        <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          {(record.dispatch || 0) === 0
                            ? "-"
                            : record.dispatch.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                          {(record.localSaleAndGratis || 0) === 0
                            ? "-"
                            : record.localSaleAndGratis.toFixed(2)}
                        </td>

                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 bg-orange-50/30 dark:bg-orange-900/20">
                          {(record.totalOut || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400">
                          {(record.returnAmount || 0) === 0
                            ? "-"
                            : record.returnAmount.toFixed(2)}
                        </td>
                        
                        {/* --- යාවත්කාලීන කළ Factory Balance තීරුව --- */}
                        <td className="px-3 py-3 border-r border-gray-300 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/20 align-middle">
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-bold text-blue-800 dark:text-blue-400">
                              {(record.factoryBalance || 0).toFixed(2)}
                            </span>
                            {record.daysToZero !== undefined && (
                              <span
                                className={`text-[11px] font-extrabold mt-0.5 ${
                                  record.daysToZero > 10
                                    ? "text-red-600 dark:text-red-400"
                                    : record.daysToZero < 10
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {record.daysToZero} Days
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS CELL */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(record)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-green-900/30 rounded transition-all"
                              title="Edit Record"
                            >
                              <MdOutlineEdit size={20} />
                            </button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => setRecordToDelete(record)}
                                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete Record"
                                >
                                  <MdOutlineDeleteOutline size={20} />
                                </button>
                              </AlertDialogTrigger>

                              <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl border-gray-100 dark:border-gray-700 shadow-xl max-w-md">
                                <AlertDialogHeader>
                                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                  </div>
                                  <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Delete Factory Log
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                    Are you sure you want to permanently delete
                                    the log for{" "}
                                    <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">
                                      {displayDay}
                                    </span>
                                    ?<br />
                                    <br />
                                    This action cannot be undone and will affect
                                    running balances.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6">
                                  <AlertDialogCancel
                                    onClick={() => setRecordToDelete(null)}
                                    className="border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-6 font-semibold"
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleConfirmDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 rounded-lg px-6 font-semibold shadow-sm transition-colors"
                                  >
                                    Delete Record
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <AlertCircle size={40} className="mb-3 opacity-20" />
                        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                          No factory logs found for {getPeriodText()}
                        </p>
                        <p className="text-sm mt-1">
                          Submit new data from the entry form.
                        </p>
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