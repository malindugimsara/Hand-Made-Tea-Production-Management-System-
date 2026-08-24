import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, AlertCircle, FileDown, Calendar, Factory, FileSpreadsheet, X, Save, Clock, Languages } from "lucide-react";
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

// PDF & HTML to Image Imports
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const routeOptions = [
  "C1 - MATHTHAKA", "C2 - WALALLAWITA", "C3 - PELAWATHTHA", "C4 - POLGAMPALA",
  "C5 - MANAMPITA", "C7 - GANEGODA", "C8 - THUNDOLA", "FA - FACTORY", "E - ESTATE TEA",
];

export default function ViewLoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const userRole = localStorage.getItem("userRole") || "";
  const isViewer = userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";
  const isAdmin = userRole === "Admin"; 
  const currentUsername = localStorage.getItem("username") || "Unknown User";

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 💡 Language Toggle State ("EN" or "SI")
  const [lang, setLang] = useState("EN");

  // States for Delete & Edit
  const [recordToDelete, setRecordToDelete] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
      _id: '', route: '', arrivalTime: '', totalLeafQtyKg: '',
      factoryBest: '', factoryBelow: '', collectorBest: '', collectorBelow: ''
  });

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  // --- FETCH DATA ---
  const fetchRecords = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?date=${selectedDate}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch records.");

      const result = await response.json();
      setRecords(result.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Could not load records.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE LOGIC ---
  const handleDelete = async () => {
    if (!recordToDelete) return;
    const toastId = toast.loading("Deleting record...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/${recordToDelete}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (response.ok) {
        toast.success("Record deleted successfully.", { id: toastId });
        fetchRecords();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete record.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  // --- EDIT LOGIC ---
  const openEditModal = (record) => {
      setEditForm({
          _id: record._id,
          route: record.route || '',
          arrivalTime: record.arrivalTime || '',
          totalLeafQtyKg: record.totalLeafQtyKg || '',
          factoryBest: record.factorySample?.bestG || '',
          factoryBelow: record.factorySample?.belowBestG || '',
          collectorBest: record.collectorSample?.bestG || '',
          collectorBelow: record.collectorSample?.belowBestG || '',
      });
      setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
      const { name, value } = e.target;
      setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
      e.preventDefault();
      const toastId = toast.loading("Updating record...");

      try {
          const fBest = Number(editForm.factoryBest) || 0;
          const fBelow = Number(editForm.factoryBelow) || 0;
          const fPoor = Math.max(0, 100 - (fBest + fBelow));

          const cBest = Number(editForm.collectorBest) || 0;
          const cBelow = Number(editForm.collectorBelow) || 0;
          const cPoor = Math.max(0, 100 - (cBest + cBelow));

          const payload = {
              route: editForm.route,
              arrivalTime: editForm.arrivalTime,
              totalLeafQtyKg: editForm.totalLeafQtyKg,
              factorySample: { bestG: fBest, belowBestG: fBelow, poorG: fPoor },
              collectorSample: { bestG: cBest, belowBestG: cBelow, poorG: cPoor }
          };

          const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/${editForm._id}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify(payload)
          });

          if (response.ok) {
              toast.success("Record updated successfully!", { id: toastId });
              setIsEditModalOpen(false);
              fetchRecords();
          } else {
              throw new Error("Failed to update");
          }
      } catch (error) {
          toast.error("Failed to update record.", { id: toastId });
      }
  };

  // --- CALCULATIONS ---
  const totals = useMemo(() => {
    let tQty = 0, bestKg = 0, belowBestKg = 0, poorKg = 0;
    
    records.forEach(r => {
        tQty += Number(r.totalLeafQtyKg) || 0;
        bestKg += Number(r.calculatedKg?.bestKg) || 0;
        belowBestKg += Number(r.calculatedKg?.belowBestKg) || 0;
        poorKg += Number(r.calculatedKg?.poorKg) || 0;
    });

    const avgFacBest = tQty > 0 ? ((bestKg / tQty) * 100).toFixed(2) : "0.00";
    const avgFacBelow = tQty > 0 ? ((belowBestKg / tQty) * 100).toFixed(2) : "0.00";
    const avgFacPoor = tQty > 0 ? ((poorKg / tQty) * 100).toFixed(2) : "0.00";

    return {
        tQty: tQty.toFixed(2), 
        bestKg: bestKg.toFixed(2),
        belowBestKg: belowBestKg.toFixed(2),
        poorKg: poorKg.toFixed(2),
        avgFacBest,
        avgFacBelow,
        avgFacPoor,
    };
  }, [records]);

  // 💡 TIME CHECK HELPER
  const isTimeLate = (timeStr) => {
    if (!timeStr || timeStr === "-") return false;
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (hours > 20) return true;
        if (hours === 20 && minutes > 30) return true;
        return false;
    } catch(e) {
        return false;
    }
  };

 // 💡 --- DYNAMIC TRANSLATIONS FOR UI & PDF (EN / SI) ---
  const t = {
    title: lang === 'SI' ? "අමු තේ දළු ගුණාත්මය" : "Loft Leaf Quality Summary",
    subtitle: lang === 'SI' ? "සවිස්තරාත්මක දෛනික අමු තේ දළු ගුණාත්මක වාර්තාව" : "Review detailed daily loft leaf count, sample percentages, and calculated weights.",
    route: lang === 'SI' ? "සැපයුම්\nමාර්ගය" : "Route",
    arrTime: lang === 'SI' ? "පැමිණි\nවේලාව" : "Arrival\nTime",
    totalKg: lang === 'SI' ? "මුළු අමු දළු\nප්‍රමාණය\n(Kg)" : "Total Leaf\nQty (Kg)",
    qualityHeader: lang === 'SI' ? "අමු තේ දළු ගුණාත්මය" : "Loft Leaf Quality Summary",
    calcKgHeader: lang === 'SI' ? "කිලෝ ප්‍රමාණය (කර්මාන්තශාලාව)" : "Calculated KG (Factory)",
    facSample: lang === 'SI' ? "කර්මාන්තශාලා නියැදිය\n(Factory Sample)" : "Factory Sample (%)",
    colSample: lang === 'SI' ? "එකතු කරන්නාගේ නියැදිය\n(Leaf Collector Sample)" : "Collector Sample (%)",
    rank: lang === 'SI' ? "ශ්‍රේණිගත\nකිරීම" : "Rank",
    actions: lang === 'SI' ? "ක්‍රියා" : "Actions",
    
    bestPct: lang === 'SI' ? "ගුණාත්මයෙන්\nඉහළ\n(%)" : "Best\n(%)",
    belowBestPct: lang === 'SI' ? "ගුණාත්මයෙන්\nමධ්‍යස්ථ\n(%)" : "Below Best\n(%)",
    poorPct: lang === 'SI' ? "ගුණාත්මයෙන්\nපහළ\n(%)" : "Poor\n(%)",

    bestKg: lang === 'SI' ? "ගුණාත්මයෙන්\nඉහළ (Kg)" : "Best (Kg)",
    belowBestKg: lang === 'SI' ? "ගුණාත්මයෙන්\nමධ්‍යස්ථ (Kg)" : "Below Best (Kg)",
    poorKg: lang === 'SI' ? "ගුණාත්මයෙන්\nපහළ (Kg)" : "Poor (Kg)",

    totalAvg: lang === 'SI' ? "Total" : "Total",
    late: lang === 'SI' ? "ප්‍රමාදයි" : "Late",
    genBy: lang === 'SI' ? "සකස් කළේ:" : "Generated By:",
    authSig: lang === 'SI' ? "පරීක්ෂා කළේ / අත්සන" : "Checked By / Signature",
    transDate: lang === 'SI' ? "ගනුදෙනු දිනය :" : "Transaction Date :",
    docRef: lang === 'SI' ? "ලේඛන අංකය :" : "Doc Ref :",
    genTime: lang === 'SI' ? "වේලාව :" : "Generated :"
  };

  // --- PDF GENERATOR VARS ---
  const now = new Date();
  const generatedDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;
  const uniqueCode = `LL-REP/${selectedDate.replace(/-/g, '')}`;

  // =======================================================================
  // --- DIRECT DOWNLOAD PDF (NO CUT-OFF, HIGH QUALITY) ---
  // =======================================================================
  const generatePDFForDate = async () => {
    if (records.length === 0) {
        toast.error("No records available to generate PDF.");
        return;
    }

    const toastId = toast.loading("Generating PDF Report...");

    try {
        const printElement = document.getElementById('pdf-print-area');
        
        printElement.style.display = "block";
        printElement.style.position = "absolute";
        printElement.style.top = "-9999px";

        const canvas = await html2canvas(printElement, { 
            scale: 2.5, // Best balance between quality and file size
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        });

        printElement.style.display = "none"; 
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85); 
        
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        // 💡 Calculate aspect ratio to fit the entire table on one page (Prevent cut-offs)
        const margin = 20; 
        const maxW = pdfPageWidth - (margin * 2);
        const maxH = pdfPageHeight - (margin * 2);

        let finalW = maxW;
        let finalH = (canvas.height * finalW) / canvas.width;

        // If it's still too tall, scale it down by height
        if (finalH > maxH) {
            finalH = maxH;
            finalW = (canvas.width * finalH) / canvas.height;
        }

        const x = (pdfPageWidth - finalW) / 2; // Center horizontally
        const y = margin; // Top margin
        
        pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
        pdf.save(`Loft_Leaf_Report_${selectedDate}.pdf`);
        toast.success("Report downloaded successfully!", { id: toastId });

    } catch (error) {
        console.error("PDF Generation Error: ", error);
        toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">

      {/* --- HEADER SECTION --- */}
      <div className="mb-5 md:mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div className="w-full xl:w-auto text-center xl:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-[#3f6212] dark:text-lime-500 flex items-center justify-center xl:justify-start gap-2">
            <FileSpreadsheet size={24} className="text-[#65a30d]" /> {t.title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">

          {/* 💡 LANGUAGE TOGGLE BUTTON */}
          <button
            onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
            className="p-2.5 px-4 justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/50 rounded-lg transition-colors shadow-sm font-bold text-sm flex items-center gap-2 w-full sm:w-auto"
            title="Toggle Language"
          >
            <Languages size={18} />
            {lang === 'EN' ? "සිංහල" : "English"}
          </button>

          <div className="relative flex-1 w-full sm:w-auto">
            <Calendar size={18} className="absolute left-3 top-3 text-[#65a30d]" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-lime-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#84cc16] outline-none bg-lime-50/30 dark:bg-zinc-800 text-[#3f6212] dark:text-lime-400 cursor-pointer transition-all shadow-inner"
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto h-10 sm:h-auto">
            <button
              onClick={fetchRecords} 
              disabled={loading}
              className={`p-2.5 flex-1 sm:flex-none flex justify-center bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={generatePDFForDate}
              disabled={loading || records.length === 0}
              className="p-2.5 px-4 flex-1 sm:flex-none justify-center bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              title="Download PDF"
            >
              <FileDown size={18} /> <span className="font-bold text-xs sm:text-sm">Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- UI TABLE SECTION --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-48 sm:h-64">
            <div className="w-6 sm:w-8 h-6 sm:h-8 border-4 border-[#84cc16] dark:border-lime-700 border-t-[#3f6212] dark:border-t-lime-400 rounded-full animate-spin mb-4"></div>
            <p className="text-xs sm:text-sm font-medium">Loading summary records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full text-xs sm:text-sm text-center border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-20 whitespace-pre-wrap">{t.route}</th>
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase whitespace-pre-wrap">{t.arrTime}</th>
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-400 whitespace-pre-wrap">{t.totalKg}</th>
                  
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-gray-200/50 dark:bg-zinc-700/50">{t.facSample}</th>
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-teal-50/50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">{t.colSample}</th>
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400">{t.calcKg}</th>
                  
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase text-blue-600 dark:text-blue-400 w-16 whitespace-pre-wrap">{t.rank}</th>
                  {!isViewer && <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-24">{t.actions}</th>}
                </tr>
                <tr className="bg-gray-50 dark:bg-zinc-800/80 text-[10px] sm:text-[11px] uppercase text-gray-600 dark:text-gray-400 font-bold">
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-green-600 whitespace-pre-wrap">{t.bestPct}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600 whitespace-pre-wrap">{t.belowBestPct}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-red-500 whitespace-pre-wrap">{t.poorPct}</th>
                  
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-green-600 whitespace-pre-wrap">{t.bestPct}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600 whitespace-pre-wrap">{t.belowBestPct}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-red-500 whitespace-pre-wrap">{t.poorPct}</th>
                  
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-green-600 whitespace-pre-wrap">{t.bestKg}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600 whitespace-pre-wrap">{t.belowBestKg}</th>
                  <th className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 text-red-500 whitespace-pre-wrap">{t.poorKg}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-950">
                {records.length > 0 ? records.map((row) => {
                  // 💡 Route කේතය වෙන් කරගැනීම (E සහ FA හඳුනාගැනීමට)
                  const routeCode = (row.route || "").split(" - ")[0].toUpperCase();
                  const hideArrivalTime = routeCode === "E" || routeCode === "FA";
                  
                  const displayTime = hideArrivalTime ? "-" : (row.arrivalTime || "-");
                  const isLate = !hideArrivalTime && isTimeLate(row.arrivalTime);

                  return (
                  <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-800 dark:text-gray-200">
                        {(row.route || "-").toUpperCase()}
                    </td>
                    
                    {/* 💡 LATE ARRIVAL HIGHLIGHT & HIDDEN TIME FOR E/FA */}
                    <td className={`p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 ${isLate ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                      <div className="flex flex-col items-center justify-center">
                          <span className="flex items-center gap-1">{isLate && <Clock size={12}/>} {displayTime}</span>
                          {isLate && <span className="text-[9px] uppercase mt-0.5 tracking-wide">{t.late}</span>}
                      </div>
                    </td>

                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-black text-[#65a30d] dark:text-lime-400 bg-lime-50/30 dark:bg-lime-900/10">
                      {row.totalLeafQtyKg || '-'}
                    </td>
                    
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-green-700 dark:text-green-500">{row.factorySample?.isEntered ? `${row.factorySample.bestPct}%` : '-'}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-yellow-600 dark:text-yellow-500">{row.factorySample?.isEntered ? `${row.factorySample.belowBestPct}%` : '-'}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-red-600 dark:text-red-400">{row.factorySample?.isEntered ? `${row.factorySample.poorPct}%` : '-'}</td>

                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-green-700 dark:text-green-500">{row.collectorSample?.isEntered ? `${row.collectorSample.bestPct}%` : '-'}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-yellow-600 dark:text-yellow-500">{row.collectorSample?.isEntered ? `${row.collectorSample.belowBestPct}%` : '-'}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-red-600 dark:text-red-400">{row.collectorSample?.isEntered ? `${row.collectorSample.poorPct}%` : '-'}</td>

                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.bestKg || 0).toFixed(2)}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.belowBestKg || 0).toFixed(2)}</td>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.poorKg || 0).toFixed(2)}</td>

                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800">
                      <span className="px-3 py-1 rounded-full font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 text-[10px] sm:text-sm">
                          {row.gradeRank}
                      </span>
                    </td>

                    {!isViewer && (
                      <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800">
                        {/* Actions buttons */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <button
                            onClick={() => openEditModal(row)}
                            className="p-1.5 text-gray-500 hover:text-[#3f6212] dark:hover:text-lime-400 hover:bg-lime-50 dark:hover:bg-zinc-800 rounded transition-all"
                            title="Edit Record"
                          >
                            <MdOutlineEdit size={18} />
                          </button>

                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => setRecordToDelete(row._id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete Record"
                                >
                                  <MdOutlineDeleteOutline size={18} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl w-[90%] sm:max-w-sm">
                                <AlertDialogHeader>
                                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800">
                                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                  </div>
                                  <AlertDialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Delete Record</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                                    Are you sure you want to delete the record for route <strong>{(row.route || '').toUpperCase()}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 sm:mt-6">
                                  <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )}): null}
              </tbody>
              {records.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-zinc-800 font-bold text-gray-800 dark:text-gray-200">
                  <tr>
                    <td colSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-left pl-4 sm:pl-6">{t.totalAvg}</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-[#3f6212] dark:text-lime-400">{totals.tQty}</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-green-700 dark:text-green-500">{totals.avgFacBest}%</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-yellow-700 dark:text-yellow-500">{totals.avgFacBelow}%</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-red-600 dark:text-red-400">{totals.avgFacPoor}%</td>
                    <td colSpan={3} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 bg-gray-200 dark:bg-zinc-700/50 text-gray-400 font-normal"></td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-green-700 dark:text-green-500">{totals.bestKg}</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-yellow-700 dark:text-yellow-500">{totals.belowBestKg}</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-red-600 dark:text-red-400">{totals.poorKg}</td>
                    <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700"></td>
                    {!isViewer && <td className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================================= */}
      {/* 💡 EDIT MODAL POPUP */}
      {/* ========================================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-zinc-800">
                
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
                    <h3 className="text-lg sm:text-xl font-bold text-[#3f6212] dark:text-lime-500 flex items-center gap-2">
                        <MdOutlineEdit size={22} /> Edit Loft Leaf Record
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleEditSubmit} className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Route</label>
                            <select 
                                name="route" 
                                value={editForm.route} 
                                onChange={handleEditChange} 
                                required 
                                className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none"
                            >
                                <option value="" disabled>Select route...</option>
                                {routeOptions.map((r, i) => {
                                    const val = r.split(' - ')[0]; 
                                    return <option key={i} value={val}>{r}</option>
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Arrival Time</label>
                            <input type="time" name="arrivalTime" value={editForm.arrivalTime} onChange={handleEditChange} required className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Total Qty (Kg)</label>
                            <input type="number" name="totalLeafQtyKg" value={editForm.totalLeafQtyKg} onChange={handleEditChange} required min="0" step="any" className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="p-4 sm:p-5 rounded-xl border border-[#d9f99d] bg-[#f7fee7]/50 dark:border-lime-900/50 dark:bg-lime-900/10">
                            <h4 className="font-bold text-[#3f6212] dark:text-lime-500 mb-4 border-b border-[#d9f99d] dark:border-lime-900/50 pb-2 flex items-center gap-2">
                                <Factory size={16} /> Factory Sample (g)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-green-700 dark:text-green-500 mb-1">Best (g)</label>
                                    <input type="number" name="factoryBest" value={editForm.factoryBest} onChange={handleEditChange} className="w-full p-2.5 border border-green-200 dark:border-green-800/50 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-zinc-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-1">Below Best (g)</label>
                                    <input type="number" name="factoryBelow" value={editForm.factoryBelow} onChange={handleEditChange} className="w-full p-2.5 border border-yellow-200 dark:border-yellow-800/50 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white dark:bg-zinc-800" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 rounded-xl border border-teal-200 bg-teal-50/30 dark:border-teal-900/50 dark:bg-teal-900/10">
                            <h4 className="font-bold text-teal-800 dark:text-teal-400 mb-4 border-b border-teal-200 dark:border-teal-900/50 pb-2 flex items-center gap-2">
                                <Leaf size={16} /> Collector Sample (g)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-green-700 dark:text-green-500 mb-1">Best (g)</label>
                                    <input type="number" name="collectorBest" value={editForm.collectorBest} onChange={handleEditChange} className="w-full p-2.5 border border-green-200 dark:border-green-800/50 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-zinc-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-1">Below Best (g)</label>
                                    <input type="number" name="collectorBelow" value={editForm.collectorBelow} onChange={handleEditChange} className="w-full p-2.5 border border-yellow-200 dark:border-yellow-800/50 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white dark:bg-zinc-800" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-gray-100 dark:border-zinc-800 pt-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-300 font-bold rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-[#3f6212] hover:bg-[#4d7c0f] text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 💡 HIDDEN PRINT AREA FOR PDF DIRECT DOWNLOAD (Auto-scales to prevent cut-offs) */}
      {/* ========================================================================================= */}
      <div 
         id="pdf-print-area" 
         className="bg-[#ffffff] p-10 font-sans text-[#000000]" 
         style={{ width: '1122px', minHeight: '793px', display: 'none' }}
      >
            {/* 💡 MATCHED HEADER STYLE */}
            <div className="flex justify-between items-start mb-6 border-b border-[#d1d5db] pb-4">
                <div className="flex items-center gap-4">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="w-16 h-16 object-contain" 
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-[#1B6A31] uppercase" style={{ fontFamily: 'sans-serif' }}>
                            Athukorala Group (Pvt) Ltd
                        </h1>
                        <h2 className="text-xl font-bold mt-1" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                            {t.title}
                        </h2>
                        <p className="text-[#4b5563] text-sm mt-1" style={{ fontFamily: 'sans-serif' }}>
                            Transaction Date: {selectedDate.replace(/-/g, '.')}
                        </p>
                    </div>
                </div>
                <div className="text-right text-xs text-[#6b7280] flex flex-col gap-1" style={{ fontFamily: 'sans-serif' }}>
                    <p><strong className="text-[#000000]">{t.docRef}:</strong> {uniqueCode}</p>
                    <p><strong className="text-[#000000]">{t.generated}:</strong> {generatedDateTime}</p>
                </div>
            </div>

            {/* Table matched to your image */}
            <table className="w-full border-collapse border border-[#000000] text-center text-[12px]" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                <thead>
                    <tr className="text-[#000000]">
                        <th rowSpan={3} className="border border-[#000000] p-2 font-bold">{t.route}</th>
                        <th rowSpan={3} className="border border-[#000000] p-2 font-bold">{t.arrTime}</th>
                        <th rowSpan={3} className="border border-[#000000] p-2 font-bold">{t.totalKg}</th>
                        <th colSpan={6} className="border border-[#000000] p-2 font-bold">{t.title}</th>
                        <th colSpan={3} className="border border-[#000000] p-2 font-bold">{t.calcKg}</th>
                        <th rowSpan={3} className="border border-[#000000] p-2 font-bold">{t.rank}</th>
                    </tr>
                    <tr className="text-[#000000]">
                        <th colSpan={3} className="border border-[#000000] p-2 font-bold">{t.facSample}</th>
                        <th colSpan={3} className="border border-[#000000] p-2 font-bold">{t.colSample}</th>
                        <th rowSpan={2} className="border border-[#000000] p-2 font-bold text-[#087034]">{t.bestKg}</th>
                        <th rowSpan={2} className="border border-[#000000] p-2 font-bold text-[#CE950E]">{t.belowBestKg}</th>
                        <th rowSpan={2} className="border border-[#000000] p-2 font-bold text-[#DE2E17]">{t.poorKg}</th>
                    </tr>
                    <tr className="text-[#000000]">
                        <th className="border border-[#000000] p-2 font-bold text-[#087034]">{t.bestPct}</th>
                        <th className="border border-[#000000] p-2 font-bold text-[#CE950E]">{t.belowBestPct}</th>
                        <th className="border border-[#000000] p-2 font-bold text-[#DE2E17]">{t.poorPct}</th>
                        <th className="border border-[#000000] p-2 font-bold text-[#087034]">{t.bestPct}</th>
                        <th className="border border-[#000000] p-2 font-bold text-[#CE950E]">{t.belowBestPct}</th>
                        <th className="border border-[#000000] p-2 font-bold text-[#DE2E17]">{t.poorPct}</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, idx) => {
                        // 💡 PDF එකට අදාළව Route කේතය වෙන් කරගැනීම
                        const routeCode = (r.route || "").split(" - ")[0].toUpperCase();
                        const hideArrivalTime = routeCode === "E" || routeCode === "FA";
                        
                        const displayTime = hideArrivalTime ? "-" : (r.arrivalTime || "-");
                        const isLate = !hideArrivalTime && isTimeLate(r.arrivalTime);

                        return (
                        <tr key={idx}>
                            <td className="border border-[#000000] p-2 font-bold font-sans text-left">{(r.route || "-").toUpperCase()}</td>
                            
                            {/* 💡 LATE ARRIVAL HIGHLIGHT & HIDDEN TIME FOR E/FA IN PDF */}
                            <td className={`border border-[#000000] p-2 font-sans ${isLate ? 'text-[#dc2626] font-bold' : ''}`}>
                                {displayTime}
                                {isLate && <div className="text-[9px] uppercase mt-0.5" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>{t.late}</div>}
                            </td>

                            <td className="border border-[#000000] p-2 font-sans font-bold">{Number(r.totalLeafQtyKg || 0)}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#087034] font-bold">{r.factorySample?.isEntered ? r.factorySample.bestPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#CE950E] font-bold">{r.factorySample?.isEntered ? r.factorySample.belowBestPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#DE2E17] font-bold">{r.factorySample?.isEntered ? r.factorySample.poorPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#087034] font-bold">{r.collectorSample?.isEntered ? r.collectorSample.bestPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#CE950E] font-bold">{r.collectorSample?.isEntered ? r.collectorSample.belowBestPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans text-[#DE2E17] font-bold">{r.collectorSample?.isEntered ? r.collectorSample.poorPct : "-"}</td>
                            <td className="border border-[#000000] p-2 font-sans">{Number(r.calculatedKg?.bestKg || 0).toFixed(2)}</td>
                            <td className="border border-[#000000] p-2 font-sans">{Number(r.calculatedKg?.belowBestKg || 0).toFixed(2)}</td>
                            <td className="border border-[#000000] p-2 font-sans">{Number(r.calculatedKg?.poorKg || 0).toFixed(2)}</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans text-[#1B6A31]">{r.gradeRank || "-"}</td>
                        </tr>
                    )})}
                </tbody>
                {records.length > 0 && (
                    <tfoot>
                        <tr className="bg-[#E6F0E6] text-[#1B6A31]">
                            <td colSpan={2} className="border border-[#000000] p-2 text-right font-bold font-sans">{t.totalAvg}</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.tQty}</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.avgFacBest} %</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.avgFacBelow} %</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.avgFacPoor} %</td>
                            <td colSpan={3} className="border border-[#000000] p-2"></td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.bestKg}</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.belowBestKg}</td>
                            <td className="border border-[#000000] p-2 font-bold font-sans">{totals.poorKg}</td>
                            <td className="border border-[#000000] p-2"></td>
                        </tr>
                    </tfoot>
                )}
            </table>

            {/* 💡 MATCHED FOOTER STYLE */}
            <div className="mt-6 pt-6 flex justify-between items-end text-sm font-bold font-sans text-[#374151]">
                <div>
                    <p className="text-[#888C88]">{t.genBy}:</p>
                    <p className="text-[#000000]">{currentUsername} ({userRole || 'Admin'})</p>
                </div>
                <div className="text-center">
                    <p className="text-[#9ca3af] mb-1">.................................................................</p>
                    <p className="text-[#888C88]">{t.authSig}</p>
                </div>
            </div>
      </div>

    </div>
  );
}