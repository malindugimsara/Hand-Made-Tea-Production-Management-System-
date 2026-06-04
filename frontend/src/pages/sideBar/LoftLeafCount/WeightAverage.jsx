import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Calendar, Table as TableIcon, LayoutList, LayoutGrid, FileSpreadsheet, FileDown } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function WeightAverage() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const currentUsername = localStorage.getItem("username") || "System Admin";
  const userRole = localStorage.getItem("userRole") || "Admin";

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [viewMode, setViewMode] = useState("simplified"); 

  const routeOptions = [
    "c1 - MATHTHAKA",
    "c2 - walallawita",
    "c3 - pelawaththa",
    "c4 - polgampala",
    "c5 - manampita",
    "c7 - ganegoda",
    "c8 - thundola",
    "fa - factory",
    "e - estate tea",
  ];

  useEffect(() => {
    fetchRecords();
  }, [selectedMonth]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/loft-leaf?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch records.");

      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Could not load records.");
    } finally {
      setLoading(false);
    }
  };

  // --- MATRIX GENERATION LOGIC ---
  const [yearStr, monthStr] = selectedMonth.split("-");
  const daysInMonth = new Date(yearStr, monthStr, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 1. Initialize empty matrix for all routes and days
  const matrixData = {};
  routeOptions.forEach((r) => {
    const routeKey = r.split(" - ")[0].toLowerCase(); 
    matrixData[routeKey] = { fullName: r.toUpperCase() };
    daysArray.forEach((day) => {
      matrixData[routeKey][day] = { totalQty: 0, bestQty: 0, belowBestQty: 0, poorQty: 0 };
    });
  });

  // 2. Populate matrix with database records
  records.forEach((r) => {
    if (!r.date) return;
    const recordRouteKey = (r.route || "").split(" - ")[0].toLowerCase();
    const dDate = new Date(r.date);
    const day = dDate.getDate();

    if (matrixData[recordRouteKey] && matrixData[recordRouteKey][day]) {
      matrixData[recordRouteKey][day].totalQty += Number(r.totalQty) || 0;
      matrixData[recordRouteKey][day].bestQty += Number(r.bestQty) || 0;
      matrixData[recordRouteKey][day].belowBestQty += Number(r.belowBestQty) || 0;
      matrixData[recordRouteKey][day].poorQty += Number(r.poorQty) || 0;
    }
  });

  // --- PDF EXPORT LOGIC (SIMPLIFIED ONLY) ---
  const generateSimplifiedPDF = async () => {
    if (Object.keys(matrixData).length === 0) {
      toast.error("No data available to generate report!");
      return;
    }

    const toastId = toast.loading("Generating PDF Report...");
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const THEME_COLOR = [27, 106, 49]; 

      // Header Section & Logo
      const img = new Image();
      img.src = '/logo.png'; 
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => resolve();
      });

      if (img.width) {
        const maxH = 55;
        const maxW = 120;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        doc.addImage(img, 'PNG', 40, 25, img.width * ratio, img.height * ratio);
      } else {
        doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.text("AG", 40, 50);
        doc.setFontSize(8);
        doc.text("ATHUKORALA GROUP", 40, 62);
      }

      doc.setFontSize(18);
      doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
      doc.text("Loft Leaf Summary Averages", 160, 42);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Reporting Month: ${selectedMonth}`, 160, 56);

      const dateObj = new Date();
      const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
      const dateString = dateObj.toISOString().split("T")[0];

      doc.setFontSize(9);
      doc.text(`Generated: ${dateString} ${timeString}`, pageWidth - 40, 50, { align: 'right' });

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(40, 75, pageWidth - 40, 75);

      let currentY = 100;

      // Helper function to draw each simplified table category
      const drawPdfTable = (title, dataKey, themeColorRgb) => {
          doc.setFontSize(12);
          doc.setTextColor(themeColorRgb[0], themeColorRgb[1], themeColorRgb[2]);
          doc.setFont("helvetica", "bold");
          doc.text(title, 40, currentY);
          currentY += 15;

          const body = [];
          Object.keys(matrixData).forEach((routeKey) => {
              const data = matrixData[routeKey];
              let rowSumTotalQty = 0;
              let rowSumProduct = 0;

              daysArray.forEach((day) => {
                  rowSumTotalQty += data[day].totalQty;
                  rowSumProduct += data[day][dataKey]; 
              });

              const finalAvgPct = rowSumTotalQty > 0 ? (rowSumProduct / rowSumTotalQty) * 100 : 0;

              body.push([
                  data.fullName,
                  rowSumTotalQty > 0 ? rowSumTotalQty.toFixed(1) : "-",
                  rowSumTotalQty > 0 ? Math.round(rowSumProduct) : "-",
                  rowSumTotalQty > 0 ? `${Math.round(finalAvgPct)}%` : "-"
              ]);
          });

          autoTable(doc, {
              startY: currentY,
              head: [['Route', 'Sum Qty (g)', 'Sum Product', 'Final Average %']],
              body: body,
              theme: 'grid',
              headStyles: { 
                  fillColor: themeColorRgb, 
                  textColor: [255, 255, 255], 
                  fontStyle: 'bold', 
                  halign: 'center'
              },
              columnStyles: {
                  0: { halign: 'left', fontStyle: 'bold' },
                  1: { halign: 'center' },
                  2: { halign: 'center' },
                  3: { halign: 'center', fontStyle: 'bold' }
              },
              styles: { fontSize: 10, cellPadding: 5 }
          });

          currentY = doc.lastAutoTable.finalY + 30;
          
          if(currentY > pageHeight - 100) {
              doc.addPage();
              currentY = 40;
          }
      };

      drawPdfTable("1. BEST TEA MATRIX SUMMARY", "bestQty", [27, 106, 49]); // Green
      drawPdfTable("2. BELOW BEST TEA MATRIX SUMMARY", "belowBestQty", [217, 119, 6]); // Orange
      drawPdfTable("3. POOR TEA MATRIX SUMMARY", "poorQty", [220, 38, 38]); // Red

      // Footer
      const footerY = pageHeight - 50;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Generated By:", 40, footerY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${currentUsername} (${userRole})`, 40, footerY + 15);
      
      doc.save(`Loft_Leaf_Simplified_Summary_${selectedMonth}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  // --- EXCEL EXPORT LOGIC (WITH BEAUTIFUL STYLES) ---
  const exportToExcel = () => {
    if (Object.keys(matrixData).length === 0) {
      toast.error("No data to export!");
      return;
    }

    const toastId = toast.loading("Generating styled Excel file...");
    try {
      const wb = XLSX.utils.book_new();

      const createSheetData = (dataKey, sheetTitle, themeColor) => {
        const aoa = []; 
        
        const titleStyle = { font: { bold: true, sz: 16, color: { rgb: themeColor } } };
        const headerStyle = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: themeColor } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
        };
        const subHeaderStyle = {
          font: { bold: true, color: { rgb: "4B5563" } },
          fill: { fgColor: { rgb: "F3F4F6" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
        };
        const cellStyle = {
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: {style: "thin", color:{rgb:"E5E7EB"}}, right: {style: "thin", color:{rgb:"E5E7EB"}}, left: {style: "thin", color:{rgb:"E5E7EB"}} }
        };
        const boldCell = { ...cellStyle, font: { bold: true } };
        const summaryCell = { ...cellStyle, font: { bold: true }, fill: { fgColor: { rgb: "ECFDF5" } } };

        aoa.push([{ v: sheetTitle, s: titleStyle }]);
        aoa.push([]); 

        const header1 = [{ v: "Route", s: headerStyle }];
        daysArray.forEach(d => { 
          header1.push({ v: `Date ${d}`, s: headerStyle }, { v: "", s: headerStyle }, { v: "", s: headerStyle }); 
        });
        header1.push({ v: "Monthly Summary", s: headerStyle }, { v: "", s: headerStyle }, { v: "", s: headerStyle });
        aoa.push(header1);

        const header2 = [{ v: "", s: subHeaderStyle }];
        daysArray.forEach(() => { 
          header2.push({ v: "Qty", s: subHeaderStyle }, { v: "%", s: subHeaderStyle }, { v: "Prod", s: subHeaderStyle }); 
        });
        header2.push({ v: "Sum Qty", s: subHeaderStyle }, { v: "Sum Prod", s: subHeaderStyle }, { v: "Final Avg %", s: subHeaderStyle });
        aoa.push(header2);

        Object.keys(matrixData).forEach(routeKey => {
          const data = matrixData[routeKey];
          const row = [{ v: data.fullName, s: boldCell }];
          let rowSumTotalQty = 0;
          let rowSumProduct = 0;

          daysArray.forEach(day => {
            const dayData = data[day];
            const totalQty = dayData.totalQty;
            const specificQty = dayData[dataKey];
            
            rowSumTotalQty += totalQty;
            rowSumProduct += specificQty; 

            const pct = totalQty > 0 ? (specificQty / totalQty) * 100 : 0;
            
            row.push(
              { v: totalQty > 0 ? totalQty : "-", s: cellStyle },
              { v: totalQty > 0 ? `${Math.round(pct)}%` : "-", s: { ...cellStyle, font: { bold: true, color: { rgb: themeColor } } } },
              { v: totalQty > 0 ? Math.round(specificQty) : "-", s: cellStyle }
            );
          });

          const finalAvgPct = rowSumTotalQty > 0 ? (rowSumProduct / rowSumTotalQty) * 100 : 0;
          row.push(
            { v: rowSumTotalQty > 0 ? rowSumTotalQty : "-", s: summaryCell },
            { v: rowSumTotalQty > 0 ? Math.round(rowSumProduct) : "-", s: summaryCell },
            { v: rowSumTotalQty > 0 ? `${Math.round(finalAvgPct)}%` : "-", s: { ...summaryCell, font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: themeColor } } } }
          );
          aoa.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } });
        
        let colIndex = 1;
        daysArray.forEach(() => {
          ws['!merges'].push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 2 } });
          colIndex += 3;
        });
        ws['!merges'].push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 2 } });

        const colWidths = [{ wch: 18 }]; 
        for(let i=0; i<daysArray.length; i++){
           colWidths.push({ wch: 5 }, { wch: 6 }, { wch: 6 }); 
        }
        colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 12 }); 
        ws['!cols'] = colWidths;

        return ws;
      };

      XLSX.utils.book_append_sheet(wb, createSheetData("bestQty", `BEST TEA MATRIX - ${selectedMonth}`, "1B6A31"), "Best Tea");
      XLSX.utils.book_append_sheet(wb, createSheetData("belowBestQty", `BELOW BEST TEA - ${selectedMonth}`, "D97706"), "Below Best");
      XLSX.utils.book_append_sheet(wb, createSheetData("poorQty", `POOR TEA MATRIX - ${selectedMonth}`, "DC2626"), "Poor Tea");

      XLSX.writeFile(wb, `Loft_Leaf_Matrices_${selectedMonth}.xlsx`);
      toast.success("Excel file downloaded!", { id: toastId });
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to generate Excel file.", { id: toastId });
    }
  };

  // --- REUSABLE TABLE RENDERER ---
  const renderTable = (title, dataKey, theme) => {
    return (
      <div className="mb-10 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 w-full overflow-hidden">
        <div className={`px-4 py-3 border-b ${theme.headerBorder} ${theme.headerBg}`}>
            <h3 className={`font-black text-lg ${theme.titleText}`}>{title}</h3>
        </div>

        <div className="overflow-x-auto custom-scrollbar w-full max-h-[60vh]">
          <table className="w-full text-xs text-center border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-600 dark:text-gray-300">
                <th
                  rowSpan={2}
                  className={`bg-gray-100 dark:bg-zinc-950 border-b border-r border-gray-300 dark:border-zinc-700 px-4 py-3 font-bold uppercase ${viewMode === "detailed" ? "sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}`}
                >
                  Route
                </th>

                {viewMode === "detailed" && daysArray.map((day) => (
                  <th
                    key={day}
                    colSpan={3}
                    className="border-b border-r border-gray-300 dark:border-zinc-700 py-2 font-black text-sm bg-gray-50 dark:bg-zinc-900/50"
                  >
                    {day}
                  </th>
                ))}

                <th
                  colSpan={3}
                  className={`border-b border-l py-2 font-black text-sm ${theme.summaryBg} ${theme.summaryText} ${theme.summaryBorder} ${viewMode === "detailed" ? "sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}`}
                >
                  Monthly Summary
                </th>
              </tr>

              <tr className="bg-gray-50 dark:bg-zinc-900/50 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">
                {viewMode === "detailed" && daysArray.map((day) => (
                  <React.Fragment key={`sub-${day}`}>
                    <th className="border-b border-r border-gray-200 dark:border-zinc-700 px-2 py-2">Total Qty</th>
                    <th className="border-b border-r border-gray-200 dark:border-zinc-700 px-2 py-2">%</th>
                    <th className="border-b border-r border-gray-300 dark:border-zinc-600 px-2 py-2 bg-black/5">Prod</th>
                  </React.Fragment>
                ))}
                
                <th className={`border-b border-l px-3 py-2 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[160px] z-20" : ""}`}>Sum Qty</th>
                <th className={`border-b border-l px-3 py-2 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[80px] z-20" : ""}`}>Sum Prod</th>
                <th className={`text-white border-b border-l px-3 py-2 ${theme.finalAvgBg} ${theme.finalAvgBorder} ${viewMode === "detailed" ? "sticky right-0 z-20" : ""}`}>Final Avg %</th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-zinc-950">
              {Object.keys(matrixData).map((routeKey) => {
                const data = matrixData[routeKey];
                
                let rowSumTotalQty = 0;
                let rowSumProduct = 0;

                daysArray.forEach((day) => {
                  rowSumTotalQty += data[day].totalQty;
                  rowSumProduct += data[day][dataKey]; 
                });

                const finalAvgPct = rowSumTotalQty > 0 ? (rowSumProduct / rowSumTotalQty) * 100 : 0;

                return (
                  <tr key={routeKey} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className={`bg-white dark:bg-zinc-950 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-b border-r border-gray-200 dark:border-zinc-800 px-4 py-3 font-bold text-gray-800 dark:text-gray-200 text-left whitespace-nowrap ${viewMode === "detailed" ? "sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {data.fullName}
                    </td>

                    {viewMode === "detailed" && daysArray.map((day) => {
                      const dayData = data[day];
                      const totalQty = dayData.totalQty;
                      const specificQty = dayData[dataKey];
                      const pct = totalQty > 0 ? (specificQty / totalQty) * 100 : 0;
                      const product = specificQty; 

                      return (
                        <React.Fragment key={`${routeKey}-${day}`}>
                          <td className="border-b border-r border-gray-100 dark:border-zinc-800 px-2 py-3 text-gray-700 dark:text-gray-300">
                            {totalQty > 0 ? totalQty.toFixed(1) : "-"}
                          </td>
                          <td className={`border-b border-r border-gray-100 dark:border-zinc-800 px-2 py-3 font-semibold ${theme.pctColor}`}>
                            {totalQty > 0 ? `${Math.round(pct)}%` : "-"}
                          </td>
                          <td className="border-b border-r border-gray-300 dark:border-zinc-700 px-2 py-3 bg-black/5 text-gray-800 dark:text-gray-200 font-mono">
                            {totalQty > 0 ? Math.round(product) : "-"}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className={`border-b border-l px-3 py-3 font-bold text-gray-800 dark:text-gray-200 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[160px] z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {rowSumTotalQty > 0 ? rowSumTotalQty.toFixed(1) : "-"}
                    </td>
                    
                    <td className={`border-b border-l px-3 py-3 font-bold text-gray-800 dark:text-gray-200 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[80px] z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {rowSumTotalQty > 0 ? Math.round(rowSumProduct) : "-"}
                    </td>
                    
                    <td className={`border-b border-l px-3 py-3 font-black text-white text-base ${theme.finalAvgBg} ${theme.finalAvgBorder} ${viewMode === "detailed" ? "sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "text-lg"}`}>
                      {rowSumTotalQty > 0 ? `${Math.round(finalAvgPct)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[95vw] mx-auto font-sans relative min-h-screen transition-colors duration-300">
      {/* HEADER CONTROLS */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <TableIcon size={24} /> Weight Average View
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Categorized Weighted Averages (Best, Below Best, Poor)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* CONDITIONALLY RENDERED PDF BUTTON (SIMPLIFIED ONLY) */}
          {viewMode === "simplified" && (
            <button
              onClick={generateSimplifiedPDF}
              disabled={loading}
              className={`px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${
                loading ? "opacity-70 cursor-not-allowed" : "hover:bg-red-700"
              }`}
            >
              <FileDown size={16} /> Download PDF
            </button>
          )}

          {/* EXPORT TO EXCEL BUTTON */}
          {viewMode === "detailed" && (
          <button
            onClick={exportToExcel}
            disabled={loading}
            className={`px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          )}

          {/* VIEW TOGGLE */}
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm">
            <button
              onClick={() => setViewMode("simplified")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                viewMode === "simplified" 
                  ? "bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 shadow" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutList size={16} /> Simplified
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                viewMode === "detailed" 
                  ? "bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 shadow" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={16} /> Detailed
            </button>
          </div>

          <div className="flex items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-1 shadow-sm">
            <div className="pl-3 pr-2 text-gray-400"><Calendar size={18} /></div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-200 p-2 cursor-pointer"
            />
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className={`px-4 py-2.5 bg-[#1B6A31] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-green-800"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Sync
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Calculating Matrices...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. BEST TEA TABLE */}
          {renderTable("1. BEST TEA MATRIX", "bestQty", {
            headerBg: "bg-green-100 dark:bg-green-950/50",
            headerBorder: "border-green-200 dark:border-green-800",
            titleText: "text-[#1B6A31] dark:text-green-500",
            summaryBg: "bg-green-100 dark:bg-green-950/80",
            summaryText: "text-[#1B6A31] dark:text-green-400",
            summaryBorder: "border-green-300 dark:border-green-800",
            subSummaryBg: "bg-green-50 dark:bg-green-950/40",
            subSummaryBorder: "border-green-200 dark:border-green-800/50",
            finalAvgBg: "bg-[#1B6A31] dark:bg-green-700",
            finalAvgBorder: "border-green-800",
            pctColor: "text-green-600 dark:text-green-400"
          })}

          {/* 2. BELOW BEST TEA TABLE */}
          {renderTable("2. BELOW BEST TEA MATRIX", "belowBestQty", {
            headerBg: "bg-orange-100 dark:bg-orange-950/50",
            headerBorder: "border-orange-200 dark:border-orange-800",
            titleText: "text-orange-700 dark:text-orange-500",
            summaryBg: "bg-orange-100 dark:bg-orange-950/80",
            summaryText: "text-orange-700 dark:text-orange-400",
            summaryBorder: "border-orange-300 dark:border-orange-800",
            subSummaryBg: "bg-orange-50 dark:bg-orange-950/40",
            subSummaryBorder: "border-orange-200 dark:border-orange-800/50",
            finalAvgBg: "bg-orange-500 dark:bg-orange-700",
            finalAvgBorder: "border-orange-600",
            pctColor: "text-orange-600 dark:text-orange-400"
          })}

          {/* 3. POOR TEA TABLE */}
          {renderTable("3. POOR TEA MATRIX", "poorQty", {
            headerBg: "bg-red-100 dark:bg-red-950/50",
            headerBorder: "border-red-200 dark:border-red-800",
            titleText: "text-red-700 dark:text-red-500",
            summaryBg: "bg-red-100 dark:bg-red-950/80",
            summaryText: "text-red-700 dark:text-red-400",
            summaryBorder: "border-red-300 dark:border-red-800",
            subSummaryBg: "bg-red-50 dark:bg-red-950/40",
            subSummaryBorder: "border-red-200 dark:border-red-800/50",
            finalAvgBg: "bg-red-600 dark:bg-red-700",
            finalAvgBorder: "border-red-800",
            pctColor: "text-red-600 dark:text-red-400"
          })}
        </div>
      )}
    </div>
  );
}