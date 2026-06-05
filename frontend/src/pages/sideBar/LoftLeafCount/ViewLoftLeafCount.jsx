import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, AlertCircle, FileDown, Calendar } from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
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
import { useNavigate } from "react-router-dom";

// JS PDF Imports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ViewLoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // --- ROLE BASED ACCESS ---
  const userRole = localStorage.getItem("userRole") || "";
  const isViewer = userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";
  const currentUsername = localStorage.getItem("username") || "System Admin";

  // --- STATES ---
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterMonth, setFilterMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [recordToDelete, setRecordToDelete] = useState(null); 

  useEffect(() => {
    fetchRecords();
  }, [filterMonth]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = filterMonth
        ? `${BACKEND_URL}/api/loft-leaf?month=${filterMonth}`
        : `${BACKEND_URL}/api/loft-leaf`;

      const response = await fetch(url, {
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

  // --- DELETE LOGIC ---
  const handleDelete = async () => {
    if (!recordToDelete || recordToDelete.length === 0) return;
    const toastId = toast.loading("Deleting records for the selected date...");

    try {
      const token = localStorage.getItem("token");
      
      const deletePromises = recordToDelete.map(record => 
        fetch(`${BACKEND_URL}/api/loft-leaf/${record._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(deletePromises);

      toast.success("Records deleted successfully.", { id: toastId });
      fetchRecords();
    } catch (error) {
      toast.error("Failed to delete records.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  // --- FILTER & GROUP LOGIC ---
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;
    const recordDate = r.date.split("T")[0];
    const matchesStartDate = startDate ? recordDate >= startDate : true;
    const matchesEndDate = endDate ? recordDate <= endDate : true;
    return matchesStartDate && matchesEndDate;
  });

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const date = record.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  const calculateDaySummary = (dayRecords) => {
    let totalQ = 0, bestQ = 0, belowBestQ = 0, poorQ = 0, totalLeafQ = 0;
    
    dayRecords.forEach(r => {
        totalQ += (Number(r.totalQty) || 0);
        bestQ += (Number(r.bestQty) || 0);
        belowBestQ += (Number(r.belowBestQty) || 0);
        poorQ += (Number(r.poorQty) || 0);
        
        // Sum totalLeafQty only if it exists (mainly for Factory samples)
        if (r.totalLeafQty) {
            totalLeafQ += (Number(r.totalLeafQty) || 0);
        }
    });

    const bestPct = totalQ > 0 ? Math.round((bestQ / totalQ) * 100) : 0;
    const belowBestPct = totalQ > 0 ? Math.round((belowBestQ / totalQ) * 100) : 0;
    const poorPct = totalQ > 0 ? Math.round((poorQ / totalQ) * 100) : 0;

    return { totalQ, bestPct, belowBestPct, poorPct, totalLeafQ };
  };

  // =======================================================================
  // --- ADVANCED PDF GENERATOR ---
  // =======================================================================
  // =======================================================================
  // --- ADVANCED PDF GENERATOR ---
  // =======================================================================
  const generatePDFForDate = async (date, dayRecords) => {
    const toastId = toast.loading("Generating PDF Report...");
    
    try {
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const THEME_COLOR = [27, 106, 49]; // Dark Green Theme
        
        // --- 1. HEADER SECTION & LOGO ---
        const img = new Image();
        img.src = '/logo.png'; // Public folder logo
        
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => {
                console.warn("Logo not found at /logo.png");
                resolve(); 
            };
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

        // Title & Transaction Date
        doc.setFontSize(18);
        doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
        doc.text("Loft Leaf Production Report", 160, 42);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`Transaction Date: ${date}`, 160, 56);

        // Doc Ref & Generated Time
        const currentMonth = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();
        const currentYear = new Date().getFullYear();
        const docRef = `HT/LL/${currentMonth}.${currentYear}`;
        const dateObj = new Date();
        const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        const dateString = dateObj.toISOString().split("T")[0];
        
        doc.setFontSize(9);
        doc.text(`Doc Ref: ${docRef}`, pageWidth - 40, 38, { align: 'right' });
        doc.text(`Generated: ${dateString} ${timeString}`, pageWidth - 40, 50, { align: 'right' });

        // Line Separator
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(1);
        doc.line(40, 75, pageWidth - 40, 75);

        // --- 2. TABLE SECTION ---
        let currentY = 100;

        const routeOrder = ["c1", "c2", "c3", "c4", "c5", "c7", "c8", "fa", "e"];
        const sortRoutes = (a, b) => {
          const routeA = (a.route || "").toLowerCase().split(" ")[0];
          const routeB = (b.route || "").toLowerCase().split(" ")[0];
          const posA = routeOrder.indexOf(routeA) !== -1 ? routeOrder.indexOf(routeA) : 999;
          const posB = routeOrder.indexOf(routeB) !== -1 ? routeOrder.indexOf(routeB) : 999;
          return posA - posB;
        };

        const factoryRecords = dayRecords.filter(r => r.sampleType === 'Factory').sort(sortRoutes);
        const collectorRecords = dayRecords.filter(r => r.sampleType === 'LeafCollector').sort(sortRoutes);

        const drawTable = (title, records, startY, isFactory = false, officerName = "") => {
            doc.setFontSize(12);
            doc.setTextColor(THEME_COLOR[0], THEME_COLOR[1], THEME_COLOR[2]);
            doc.setFont("helvetica", "bold");
            doc.text(title, 40, startY);
            
            // Factory එකක් නම් Total Leaf Qty ගණනය කර දකුණු පසින් පෙන්වීම
            let tLeafQ = 0;
            if (isFactory) {
                records.forEach(r => {
                    if (r.totalLeafQty) tLeafQ += (Number(r.totalLeafQty) || 0);
                });
                
                doc.setFontSize(11);
                doc.setTextColor(27, 106, 49); // Dark Green for Total
                doc.text(`Total Leaf Count: ${tLeafQ.toFixed(2)} Kg`, pageWidth - 40, startY, { align: 'right' });
            }

            startY += 15;

            if (isFactory && officerName) {
                doc.setFontSize(10);
                doc.setTextColor(80, 80, 80);
                doc.text(`Selected Officer Name: ${officerName}`, 40, startY);
                startY += 12;
            }

            let totalQ = 0, bestQ = 0, belowBestQ = 0, poorQ = 0;
            const body = records.map(r => {
                totalQ += (Number(r.totalQty) || 0);
                bestQ += (Number(r.bestQty) || 0);
                belowBestQ += (Number(r.belowBestQty) || 0);
                poorQ += (Number(r.poorQty) || 0);

                return [
                    (r.route || "-").toUpperCase(),
                    Number(r.totalQty || 0).toFixed(2),
                    Number(r.bestQty || 0).toFixed(2),
                    `${r.bestPercentage || 0}%`,
                    Number(r.belowBestQty || 0).toFixed(2),
                    `${r.belowBestPercentage || 0}%`,
                    Number(r.poorQty || 0).toFixed(2),
                    `${r.poorPercentage || 0}%`
                ];
            });

            const tBestPct = totalQ > 0 ? Math.round((bestQ / totalQ) * 100) : 0;
            const tBelowBestPct = totalQ > 0 ? Math.round((belowBestQ / totalQ) * 100) : 0;
            const tPoorPct = totalQ > 0 ? Math.round((poorQ / totalQ) * 100) : 0;

            // Total Row
            body.push([
                { content: 'Total Sample:', styles: { fontStyle: 'bold', halign: 'right' } },
                { content: totalQ.toFixed(2), styles: { fontStyle: 'bold', textColor: THEME_COLOR, halign: 'center' } },
                { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180], halign: 'center' } },
                { content: `${tBestPct}%`, styles: { fontStyle: 'bold', halign: 'center' } }, 
                { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180], halign: 'center' } },
                { content: `${tBelowBestPct}%`, styles: { fontStyle: 'bold', halign: 'center' } }, 
                { content: "-", styles: { fontStyle: 'bold', textColor: [180, 180, 180], halign: 'center' } },
                { content: `${tPoorPct}%`, styles: { fontStyle: 'bold', halign: 'center' } }
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
                    7: { halign: 'center' }
                },
                styles: { fontSize: 9, cellPadding: 5 }
            });

            return doc.lastAutoTable.finalY + 30;
        };

        if (factoryRecords.length > 0) {
            const officer = factoryRecords.find(r => r.officerName)?.officerName || "";
            currentY = drawTable("Factory Sample", factoryRecords, currentY, true, officer);
        }

        if (factoryRecords.length > 0 && collectorRecords.length > 0) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(1.5);
            doc.line(40, currentY - 15, pageWidth - 40, currentY - 15);
            currentY += 10;
        }

        if (collectorRecords.length > 0) {
            currentY = drawTable("Leaf Collector's Sample", collectorRecords, currentY, false);
        }

        // --- 3. FOOTER SECTION ---
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        
        const footerY = pageHeight - 50;
        
        doc.text("Generated By:", 40, footerY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`${currentUsername} (${userRole || 'Admin'})`, 40, footerY + 15);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(".......................................................................................", pageWidth - 40, footerY, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        doc.text("Checked By / Signature", pageWidth - 100, footerY + 15, { align: 'center' });

        doc.save(`Loft_Leaf_Report_${date}.pdf`);
        toast.success("Report downloaded successfully!", { id: toastId });

    } catch (error) {
        console.error("PDF Generation Error: ", error);
        toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 max-w-[1400px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* --- HEADER SECTION --- */}
      <div className="mb-5 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <Leaf size={24} /> Loft Leaf Records Summary
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            View daily summarized leaf quantities and generate reports.
          </p>
        </div>

        <button
          onClick={fetchRecords} 
          disabled={loading}
          className={`px-4 py-2 sm:py-2.5 bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 border border-[#8CC63F] dark:border-green-800 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#F8FAF8] dark:hover:bg-zinc-800"}`}
        >
          <RefreshCw className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${loading ? "animate-spin" : ""}`} />
          Sync Data
        </button>
      </div>

      {/* --- FILTER SECTION --- */}
      <div className="mb-5 md:mb-6 grid grid-cols-1 min-[450px]:grid-cols-3 gap-3 sm:gap-4 bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">MONTH</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">FROM DATE</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">TO DATE</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-zinc-700 bg-transparent dark:text-gray-200 rounded-md p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 transition-colors"
          />
        </div>
      </div>

      {/* --- SUMMARY TABLE SECTION (REFINED) --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden self-start w-full max-w-full transition-colors duration-300">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-48 sm:h-64">
            <div className="w-6 sm:w-8 h-6 sm:h-8 border-4 border-[#8CC63F] dark:border-green-700 border-t-[#1B6A31] dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
            <p className="text-xs sm:text-sm font-medium">Loading summary records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 w-full">
            <table className="w-full text-xs sm:text-sm text-left border-collapse whitespace-nowrap min-w-[700px] md:min-w-max">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors">
                  {/* Sticky Date Column */}
                  <th className="sticky left-0 z-20 bg-gray-50 dark:bg-zinc-950/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-3 sm:px-4 py-2 sm:py-3 font-semibold border-r border-gray-200 dark:border-zinc-800 align-middle min-w-[120px]">
                    <div className="flex items-center gap-1"><Calendar size={14} className="text-[#1B6A31] dark:text-green-500"/> Date</div>
                  </th>
                  
                  {/* Total Leaf QTY */}
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-[#8CC63F]/10 dark:bg-green-900/20 align-middle text-center">
                    Total Leaf QTY (Kg)
                  </th>
                  
                  {/* Best */}
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-teal-700 dark:text-teal-500 border-r border-gray-200 dark:border-zinc-800 bg-teal-50 dark:bg-teal-950/30 text-center">
                    Best %
                  </th>
                  
                  {/* Below Best */}
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-orange-700 dark:text-orange-500 border-r border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/30 text-center">
                    Below Best %
                  </th>
                  
                  {/* Poor */}
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-red-700 dark:text-red-500 border-r border-gray-200 dark:border-zinc-800 bg-red-50 dark:bg-red-950/30 text-center">
                    Poor %
                  </th>
                  
                  {/* Action */}
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold align-middle text-center bg-gray-50 dark:bg-zinc-950/50">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {Object.keys(groupedRecords).length > 0 ? (
                  Object.keys(groupedRecords)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map((date) => {
                      const dayRecords = groupedRecords[date];
                      const summary = calculateDaySummary(dayRecords);

                      return (
                        <tr key={date} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                          
                          {/* Sticky Date Body */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] px-3 sm:px-4 py-3 border-r border-gray-100 dark:border-zinc-800 align-middle transition-colors font-semibold text-gray-800 dark:text-gray-200">
                            {date}
                          </td>
                          
                          <td className="px-2 sm:px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-black text-gray-900 dark:text-white align-middle">
                            {summary.totalLeafQ > 0 ? summary.totalLeafQ.toFixed(2) : '-'}
                          </td>
                          
                          <td className="px-2 sm:px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-teal-700 dark:text-teal-400 font-bold align-middle">
                            {summary.bestPct}%
                          </td>
                          
                          <td className="px-2 sm:px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-orange-600 dark:text-orange-400 font-bold align-middle">
                            {summary.belowBestPct}%
                          </td>
                          
                          <td className="px-2 sm:px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-red-600 dark:text-red-400 font-bold align-middle">
                            {summary.poorPct}%
                          </td>
                          
                          <td className="px-2 sm:px-3 py-3 text-center align-middle">
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              
                              {/* Download Button */}
                              <button
                                onClick={() => generatePDFForDate(date, dayRecords)}
                                className="p-1 sm:p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                                title="Download Report"
                              >
                                <FileDown className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                              </button>

                              {!isViewer && (
                                <>
                                  {/* Edit Button */}
                                  <button
                                    onClick={() => navigate('/edit-loft-leaf', { state: { date: date, recordsData: dayRecords } })}
                                    className="p-1 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-400 hover:bg-[#8CC63F]/20 dark:hover:bg-zinc-800 rounded transition-all"
                                    title="Edit Details"
                                  >
                                    <MdOutlineEdit className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                                  </button>
                                  
                                  {/* Delete Button */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button
                                        onClick={() => setRecordToDelete(dayRecords)} 
                                        className="p-1 sm:p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                        title="Delete Date Records"
                                      >
                                        <MdOutlineDeleteOutline className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-sm sm:max-w-md w-[90vw]">
                                      <AlertDialogHeader>
                                        <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3 sm:mb-4 border border-red-200 dark:border-red-800">
                                            <AlertCircle className="w-5 sm:w-6 h-5 sm:h-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <AlertDialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Delete Record</AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                                          Are you sure you want to delete ALL records for {date}?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="mt-4 sm:mt-6">
                                        <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 sm:p-16 text-center text-gray-400 dark:text-zinc-600">
                      <AlertCircle size={32} className="mx-auto mb-3 opacity-20 sm:w-10 sm:h-10" />
                      <p className="text-sm sm:text-lg font-medium text-gray-500 dark:text-zinc-500">No summary records found.</p>
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