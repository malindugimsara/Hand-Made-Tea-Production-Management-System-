import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, FileDown, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function SummaryLoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const currentUsername = localStorage.getItem("username") || "System Admin";
  const userRole = localStorage.getItem("userRole") || "Admin";

  // --- STATES ---
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("");

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
  }, []);

  // සියලුම දත්ත backend එකෙන් ලබාගැනීම
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/loft-leaf`, {
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

  // --- FILTER & CALCULATE SUMMARY ---
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;
    const recordDate = r.date.split("T")[0];

    const matchesStartDate = startDate ? recordDate >= startDate : true;
    const matchesEndDate = endDate ? recordDate <= endDate : true;
    
    const rRoute = (r.route || "").toLowerCase().trim();
    const fRoute = filterRoute.toLowerCase().trim();
    const matchesRoute = filterRoute ? rRoute.startsWith(fRoute) : true;

    return matchesStartDate && matchesEndDate && matchesRoute;
  });

  // ගණනය කිරීම් (UI එක සඳහා සම්පූර්ණ එකතුව)
  let totalQty = 0, bestQty = 0, belowBestQty = 0, poorQty = 0;
  filteredRecords.forEach((r) => {
    totalQty += Number(r.totalQty) || 0;
    bestQty += Number(r.bestQty) || 0;
    belowBestQty += Number(r.belowBestQty) || 0;
    poorQty += Number(r.poorQty) || 0;
  });

  const bestPct = totalQty > 0 ? Math.round((bestQty / totalQty) * 100) : 0;
  const belowBestPct = totalQty > 0 ? Math.round((belowBestQty / totalQty) * 100) : 0;
  const poorPct = totalQty > 0 ? Math.round((poorQty / totalQty) * 100) : 0;

  // =======================================================================
  // --- GENERATE DETAILED SUMMARY PDF (NEW TEMPLATE) ---
  // =======================================================================
  const generateSummaryPDF = async () => {
    if (filteredRecords.length === 0) {
      toast.error("No data available to generate report!");
      return;
    }

    const toastId = toast.loading("Generating Summary Report...");
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const THEME_COLOR = [27, 106, 49]; // Dark Green Theme

      // --- 1. HEADER SECTION & LOGO ---
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
      doc.text("Loft Leaf Summary Report", 160, 42);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      const filterText = `Filters -> From: ${startDate || "All"} | To: ${endDate || "All"} | Route: ${filterRoute ? filterRoute.toUpperCase() : "All"}`;
      doc.text(filterText, 160, 56);

      const currentMonth = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();
      const currentYear = new Date().getFullYear();
      const docRef = `HT/LL/SUM.${currentMonth}.${currentYear}`;
      const dateObj = new Date();
      const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
      const dateString = dateObj.toISOString().split("T")[0];

      doc.setFontSize(9);
      doc.text(`Doc Ref: ${docRef}`, pageWidth - 40, 38, { align: 'right' });
      doc.text(`Generated: ${dateString} ${timeString}`, pageWidth - 40, 50, { align: 'right' });

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.line(40, 75, pageWidth - 40, 75);

      // --- 2. DATA AGGREGATION BY ROUTE ---
      const routeOrder = ["c1", "c2", "c3", "c4", "c5", "c7", "c8", "fa", "e"];
      const sortRoutes = (a, b) => {
        const routeA = (a.route || "").toLowerCase().split(" ")[0];
        const routeB = (b.route || "").toLowerCase().split(" ")[0];
        const posA = routeOrder.indexOf(routeA) !== -1 ? routeOrder.indexOf(routeA) : 999;
        const posB = routeOrder.indexOf(routeB) !== -1 ? routeOrder.indexOf(routeB) : 999;
        return posA - posB;
      };

      const aggregateByRoute = (records) => {
        const aggregated = {};
        records.forEach(r => {
            const route = (r.route || "-").toUpperCase();
            if(!aggregated[route]) {
                aggregated[route] = { route, bestQty: 0, belowBestQty: 0, poorQty: 0, totalQty: 0 };
            }
            aggregated[route].bestQty += Number(r.bestQty) || 0;
            aggregated[route].belowBestQty += Number(r.belowBestQty) || 0;
            aggregated[route].poorQty += Number(r.poorQty) || 0;
            aggregated[route].totalQty += Number(r.totalQty) || 0;
        });
        
        return Object.values(aggregated).map(r => {
            r.bestPercentage = r.totalQty > 0 ? Math.round((r.bestQty / r.totalQty) * 100) : 0;
            r.belowBestPercentage = r.totalQty > 0 ? Math.round((r.belowBestQty / r.totalQty) * 100) : 0;
            r.poorPercentage = r.totalQty > 0 ? Math.round((r.poorQty / r.totalQty) * 100) : 0;
            return r;
        }).sort(sortRoutes);
      };

      const factoryRecords = aggregateByRoute(filteredRecords.filter(r => r.sampleType === 'Factory'));
      const collectorRecords = aggregateByRoute(filteredRecords.filter(r => r.sampleType === 'LeafCollector'));

      // --- 3. DRAW TABLES ---
      let currentY = 100;

      const drawTable = (title, records, startY) => {
          doc.setFontSize(12);
          doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
          doc.setFont("helvetica", "bold");
          doc.text(title, 40, startY);
          startY += 15;

          let totalQ = 0, bestQ = 0, belowBestQ = 0, poorQ = 0;
          const body = records.map(r => {
              totalQ += r.totalQty;
              bestQ += r.bestQty;
              belowBestQ += r.belowBestQty;
              poorQ += r.poorQty;

              return [
                  r.route,
                  r.totalQty.toFixed(2),
                  r.bestQty.toFixed(2),
                  `${r.bestPercentage}%`,
                  r.belowBestQty.toFixed(2),
                  `${r.belowBestPercentage}%`,
                  r.poorQty.toFixed(2),
                  `${r.poorPercentage}%`
              ];
          });

          // Table Totals
          const tBestPct = totalQ > 0 ? Math.round((bestQ / totalQ) * 100) : 0;
          const tBelowBestPct = totalQ > 0 ? Math.round((belowBestQ / totalQ) * 100) : 0;
          const tPoorPct = totalQ > 0 ? Math.round((poorQ / totalQ) * 100) : 0;

          body.push([
              { content: 'Total Sample:', styles: { fontStyle: 'bold', halign: 'right' } },
              { content: totalQ.toFixed(2), styles: { fontStyle: 'bold', textColor: THEME_COLOR } },
              { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180] } },
              { content: `${tBestPct}%`, styles: { fontStyle: 'bold' } },
              { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180] } },
              { content: `${tBelowBestPct}%`, styles: { fontStyle: 'bold' } },
              { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180] } },
              { content: `${tPoorPct}%`, styles: { fontStyle: 'bold' } },
          ]);

          autoTable(doc, {
              startY: startY,
              head: [
                [
                  { content: 'Route', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                  { content: 'Total Qty', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                  { content: 'Best', colSpan: 2, styles: { halign: 'center' } },
                  { content: 'Below Best', colSpan: 2, styles: { halign: 'center' } },
                  { content: 'Poor', colSpan: 2, styles: { halign: 'center' } }
                ],
                [
                  'Count', 'Percentage', 'Count', 'Percentage', 'Count', 'Percentage'
                ]
              ],
              body: body,
              theme: 'grid',
              headStyles: { 
                  fillColor: THEME_COLOR, 
                  textColor: [255, 255, 255], 
                  fontStyle: 'bold', 
                  halign: 'center',
                  lineColor: [220, 220, 220],
                  lineWidth: 0.5
              },
              bodyStyles: { 
                  textColor: [60, 60, 60],
                  lineColor: [220, 220, 220],
                  lineWidth: 0.5
              },
              columnStyles: {
                  0: { halign: 'left', fontStyle: 'bold' },
                  1: { halign: 'center', fontStyle: 'bold' },
                  2: { halign: 'center' },
                  3: { halign: 'center' },
                  4: { halign: 'center' },
                  5: { halign: 'center' },
                  6: { halign: 'center' },
                  7: { halign: 'center' },
              },
              styles: { fontSize: 9, cellPadding: 5 }
          });

          return doc.lastAutoTable.finalY + 30;
      };

      if (factoryRecords.length > 0) {
          // Summary එකක් නිසා Officer name එකක් පෙන්වන්නේ නැත.
          currentY = drawTable("Factory Sample", factoryRecords, currentY);
      }

      if (factoryRecords.length > 0 && collectorRecords.length > 0) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(1.5);
          doc.line(40, currentY - 15, pageWidth - 40, currentY - 15);
          currentY += 10;
      }

      if (collectorRecords.length > 0) {
          currentY = drawTable("Leaf Collector's Sample", collectorRecords, currentY);
      }

      // --- 4. FOOTER SECTION ---
      const footerY = pageHeight - 50;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Generated By:", 40, footerY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${currentUsername} (${userRole})`, 40, footerY + 15);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(".......................................................................................", pageWidth - 40, footerY, { align: 'right' });
      doc.setTextColor(100, 100, 100);
      doc.text("Checked By / Signature", pageWidth - 100, footerY + 15, { align: 'center' });

      doc.save(`Loft_Leaf_Summary_${dateString}.pdf`);
      toast.success("Detailed Summary Report downloaded!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans relative min-h-screen transition-colors duration-300">
      
      {/* HEADER */}
      <div className="mb-5 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <Leaf size={24} /> Loft Leaf Aggregated Summary
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Filter by date range and route to view overall leaf quality performance.
          </p>
        </div>

        <button
          onClick={fetchRecords} 
          disabled={loading}
          className={`px-4 py-2.5 bg-white dark:bg-zinc-800 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#F8FAF8] dark:hover:bg-zinc-700"}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Sync Data
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
            FROM DATE
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-[#8CC63F] bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
            TO DATE
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-[#8CC63F] bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
            ROUTE
          </label>
          <select
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-[#8CC63F] bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          >
            <option value="">All Routes</option>
            {routeOptions.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY RESULT DISPLAY */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Filter size={20} className="text-[#1B6A31]" /> Filtered Result
          </h3>
          <button
            onClick={generateSummaryPDF}
            disabled={filteredRecords.length === 0}
            className="px-5 py-2.5 bg-[#1B6A31] hover:bg-green-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:bg-gray-400"
          >
            <FileDown size={18} /> Download Detailed Report
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-gray-500 font-medium bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
            No records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
            <table className="w-full text-center whitespace-nowrap">
              <thead>
                <tr className="bg-[#276932] text-white">
                  <th className="px-6 py-5 font-bold uppercase tracking-wider w-1/5">Route</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider w-1/5">Total Qty (G)</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider w-1/5">Best %</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider w-1/5">Below Best %</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider w-1/5">Poor %</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900">
                <tr>
                  <td className="px-6 py-6 text-xl font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-zinc-800">
                    {filterRoute ? filterRoute.toUpperCase() : "ALL ROUTES"}
                  </td>
                  <td className="px-6 py-6 text-xl font-black text-gray-900 dark:text-white border-b border-gray-200 dark:border-zinc-800">
                    {totalQty.toFixed(2)}
                  </td>
                  <td className="px-6 py-6 text-xl font-bold text-green-700 dark:text-green-500 border-b border-gray-200 dark:border-zinc-800">
                    {bestPct}%
                  </td>
                  <td className="px-6 py-6 text-xl font-bold text-yellow-600 dark:text-yellow-500 border-b border-gray-200 dark:border-zinc-800">
                    {belowBestPct}%
                  </td>
                  <td className="px-6 py-6 text-xl font-bold text-red-600 dark:text-red-500 border-b border-gray-200 dark:border-zinc-800">
                    {poorPct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Aggregated from {filteredRecords.length} individual entries based on current filters.
          </p>
        )}
      </div>

    </div>
  );
}