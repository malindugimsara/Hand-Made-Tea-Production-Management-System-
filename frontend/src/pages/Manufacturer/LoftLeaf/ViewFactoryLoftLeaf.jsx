import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, AlertCircle, FileDown, Calendar, Factory, FileSpreadsheet, X, Save, Clock, Languages, Image, FileText, UserCheck, User, Info } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
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
  
  // 💡 Default Sinhala Language ("SI")
  const [lang, setLang] = useState("SI");

  // 💡 WhatsApp Dropdown State & Ref
  const [isWaMenuOpen, setIsWaMenuOpen] = useState(false);
  const waMenuRef = React.useRef(null);

  React.useEffect(() => {
      function handleClickOutside(event) {
          if (waMenuRef.current && !waMenuRef.current.contains(event.target)) {
              setIsWaMenuOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // States for Delete & Edit
  const [recordToDelete, setRecordToDelete] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
      _id: '', route: '', arrivalTime: '', arrivalAmPm: 'PM', totalLeafQtyKg: '',
      factoryBest: '', factoryBelow: '', collectorBest: '', collectorBelow: '',
      factorySupervisorName: '', leafCollectorName: ''
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
      const timeParts = (record.arrivalTime || "").split(" ");
      const timeVal = timeParts[0] || "";
      const amPmVal = timeParts[1] || "PM";

      setEditForm({
          _id: record._id,
          route: record.route || '',
          arrivalTime: timeVal,
          arrivalAmPm: amPmVal, 
          totalLeafQtyKg: record.totalLeafQtyKg || '',
          factoryBest: record.factorySample?.bestG || '',
          factoryBelow: record.factorySample?.belowBestG || '',
          collectorBest: record.collectorSample?.bestG || '',
          collectorBelow: record.collectorSample?.belowBestG || '',
          factorySupervisorName: record.factorySupervisorName || '', 
          leafCollectorName: record.leafCollectorName || '', 
      });
      setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
      const { name, value } = e.target;
      setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // ==============================================================
  // 💡 අලුතින් එකතු කළ යුතු TIME VALIDATION FUNCTION එක (මෙතනින් දාන්න)
  // ==============================================================
  const formatTime12Hour = (value) => {
      let raw = value.replace(/\D/g, ''); 
      raw = raw.substring(0, 4); 

      if (raw.length === 0) return '';

      let hours = raw.substring(0, 2);
      let minutes = raw.substring(2, 4);

      if (hours.length === 2) {
          let h = parseInt(hours, 10);
          if (h > 12) hours = '12'; 
          if (h === 0) hours = '12'; 
      } else if (hours.length === 1 && parseInt(hours, 10) > 1) {
          hours = `0${hours}`; 
      }

      if (minutes.length === 2) {
          let m = parseInt(minutes, 10);
          if (m > 59) minutes = '59'; 
      }

      if (raw.length >= 3) {
          return `${hours}:${minutes}`;
      } else {
          return hours;
      }
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
              arrivalTime: editForm.arrivalTime ? `${editForm.arrivalTime} ${editForm.arrivalAmPm}` : "", 
              totalLeafQtyKg: editForm.totalLeafQtyKg,
              factorySupervisorName: editForm.factorySupervisorName, 
              leafCollectorName: editForm.leafCollectorName, 
              factorySample: { bestG: fBest, belowBestG: fBelow, poorG: fPoor },
              collectorSample: { bestG: cBest, belowBestG: cBelow, poorG: cPoor },
              editedBy: currentUsername 
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

  // 💡 DYNAMIC RANKING CALCULATOR
  const rankedRecords = useMemo(() => {
      const processed = records.map(r => {
          const sample = r.factorySample?.isEntered ? r.factorySample : (r.collectorSample?.isEntered ? r.collectorSample : null);
          let goodScore = -1;
          let bestScore = -1;
          
          if (sample) {
              goodScore = Number(sample.bestPct || 0) + Number(sample.belowBestPct || 0);
              bestScore = Number(sample.bestPct || 0);
          }
          return { ...r, _goodScore: goodScore, _bestScore: bestScore };
      });

      const sorted = [...processed].sort((a, b) => {
          if (b._goodScore !== a._goodScore) return b._goodScore - a._goodScore;
          return b._bestScore - a._bestScore; 
      });

      let currentRank = 1;
      sorted.forEach((r, idx) => {
          if (r._goodScore === -1) {
              r._calculatedRank = "-";
          } else {
              if (idx > 0 && r._goodScore === sorted[idx - 1]._goodScore && r._bestScore === sorted[idx - 1]._bestScore) {
                  r._calculatedRank = sorted[idx - 1]._calculatedRank; 
              } else {
                  r._calculatedRank = currentRank;
              }
              currentRank++;
          }
      });

      return processed.map(r => {
          const rankedItem = sorted.find(s => s._id === r._id);
          return { ...r, _calculatedRank: rankedItem ? rankedItem._calculatedRank : "-" };
      });
  }, [records]);

  // Extract Global Supervisor Name for the day from the first available record
  const daySupervisorName = useMemo(() => {
      const recWithSupervisor = records.find(r => r.factorySupervisorName && r.factorySupervisorName.trim() !== "");
      return recWithSupervisor ? recWithSupervisor.factorySupervisorName : "-";
  }, [records]);

  const isTimeLate = (timeStr) => {
    if (!timeStr || timeStr === "-") return false;
    try {
        let hours = 0, minutes = 0;
        const cleanStr = timeStr.toUpperCase().trim();
        
        if (cleanStr.includes("PM") || cleanStr.includes("AM")) {
            const [time, modifier] = cleanStr.split(" ");
            let [h, m] = time.split(':').map(Number);
            if (modifier === "PM" && h !== 12) h += 12;
            if (modifier === "AM" && h === 12) h = 0;
            hours = h;
            minutes = m;
        } else {
            let [h, m] = cleanStr.split(':').map(Number);
            hours = h;
            minutes = m;
        }

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
    facSample: lang === 'SI' ? "කර්මාන්තශාලා නියැදිය" : "Factory Sample (%)",
    colSample: lang === 'SI' ? "එකතු කරන්නාගේ නියැදිය" : "Collector Sample (%)",
    rank: lang === 'SI' ? "ශ්‍රේණිගත\nකිරීම" : "Rank",
    actions: lang === 'SI' ? "ක්‍රියා" : "Actions",
    
    bestPct: lang === 'SI' ? "ගුණාත්මයෙන්\nඉහළ\n(%)" : "Best\n(%)",
    belowBestPct: lang === 'SI' ? "ගුණාත්මයෙන්\nමධ්‍යස්ථ\n(%)" : "Below Best\n(%)",
    poorPct: lang === 'SI' ? "ගුණාත්මයෙන්\nපහළ\n(%)" : "Poor\n(%)",

    bestKg: lang === 'SI' ? "ගුණාත්මයෙන්\nඉහළ (Kg)" : "Best (Kg)",
    belowBestKg: lang === 'SI' ? "ගුණාත්මයෙන්\nමධ්‍යස්ථ (Kg)" : "Below Best (Kg)",
    poorKg: lang === 'SI' ? "ගුණාත්මයෙන්\nපහළ (Kg)" : "Poor (Kg)",

    totalAvg: lang === 'SI' ? "මුළු එකතුව / සාමාන්‍ය" : "Total / Average",
    late: lang === 'SI' ? "ප්‍රමාදයි" : "Late",
    genBy: lang === 'SI' ? "සකස් කළේ:" : "Generated By:",
    authSig: lang === 'SI' ? "පරීක්ෂා කළේ / අත්සන" : "Checked By / Signature",
    transDate: lang === 'SI' ? "ගනුදෙනු දිනය :" : "Transaction Date :",
    docRef: lang === 'SI' ? "ලේඛන අංකය " : "Doc Ref ",
    genTime: lang === 'SI' ? "වේලාව " : "Generated ",
    noData: lang === 'SI' ? "තෝරාගත් දිනය සඳහා දත්ත නොමැත." : "No data available for the selected date.",

    supervisorHeader: lang === 'SI' ? "කර්මාන්තශාලා අධීක්ෂක :" : "Factory Supervisor :",
    colName: lang === 'SI' ? "දළු එකතු කරන්නාගේ\nනම" : "Collector\nName",

    shareWhatsapp: lang === 'SI' ? "WhatsApp යවන්න" : "Share WhatsApp",
    sharePDF: lang === 'SI' ?  "PDF යවන්න" : "Share PDF",
    shareImage: lang === 'SI' ? "පින්තූරය යවන්න" : "Share Image",

    // 💡 Legend Translations
    legendTime: lang === 'SI' ? "ප.ව 8.30 ට පසු පැමිණීම" : "Arrived after 8:30 PM",
    legendDiff: lang === 'SI' ? "නියැදි Best ප්‍රතිශතයන් අතර වෙනස 5% වඩා වැඩි වූ විට" : "Difference > 5% between sample Best %",
  };

  const now = new Date();
  const generatedDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;
  const uniqueCode = `LL-REP/${selectedDate.replace(/-/g, '')}`;

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

        // Use a high scale for quality, but ensure the container doesn't force a wrap
        printElement.style.width = '1400px'; 

        const canvas = await html2canvas(printElement, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: 1400
        });

        printElement.style.display = "none"; 
        printElement.style.width = ''; // reset
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0); 
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        
        const margin = 15; // Reduced margin slightly to maximize space
        const maxW = pdfPageWidth - (margin * 2);
        const maxH = pdfPageHeight - (margin * 2);

        let finalW = maxW;
        let finalH = (canvas.height * finalW) / canvas.width;

        // If height exceeds page height, scale down further based on height
        if (finalH > maxH) {
            finalH = maxH;
            finalW = (canvas.width * finalH) / canvas.height;
        }

        const x = (pdfPageWidth - finalW) / 2; 
        const y = margin; 
        
        pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);

        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pdfPageWidth / 2, pdfPageHeight - 10, { align: 'center' });
        }

        pdf.save(`Loft_Leaf_Report_${selectedDate}.pdf`);
        toast.success("Report downloaded successfully!", { id: toastId });

    } catch (error) {
        console.error("PDF Generation Error: ", error);
        toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  const shareOnWhatsApp = async (format) => {
      setIsWaMenuOpen(false);
      if (records.length === 0) {
          toast.error("No records available to share.");
          return;
      }

      const toastId = toast.loading(`Preparing ${format.toUpperCase()} for WhatsApp...`);

      try {
          const printElement = document.getElementById('pdf-print-area');
          
          const imgFooter = document.getElementById('sys-image-footer');
          if (format === 'image' && imgFooter) imgFooter.style.display = 'block';

          printElement.style.display = "block";
          printElement.style.position = "absolute";
          printElement.style.top = "-9999px";
          printElement.style.width = '1400px';

          const canvas = await html2canvas(printElement, { 
              scale: 2.5, 
              useCORS: true,
              backgroundColor: "#ffffff",
              logging: false,
              windowWidth: 1400
          });

          printElement.style.display = "none"; 
          printElement.style.width = '';
          if (imgFooter) imgFooter.style.display = 'none';

          let file;
          let fileName = `Loft_Leaf_Report_${selectedDate}`;

          if (format === 'pdf') {
              const imgData = canvas.toDataURL('image/jpeg', 1.0); 
              const pdf = new jsPDF('landscape', 'pt', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              
              const margin = 15; 
              const maxW = pdfWidth - (margin * 2);
              const maxH = pdf.internal.pageSize.getHeight() - (margin * 2); 

              let finalW = maxW;
              let finalH = (canvas.height * finalW) / canvas.width;
              
              if (finalH > maxH) {
                  finalH = maxH;
                  finalW = (canvas.width * finalH) / canvas.height;
              }

              const x = (pdfWidth - finalW) / 2;
              const y = margin;
              
              pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);

              const actualPageHeight = pdf.internal.pageSize.getHeight();
              const pageCount = pdf.internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                  pdf.setPage(i);
                  pdf.setFontSize(8);
                  pdf.setTextColor(128, 128, 128);
                  pdf.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pdfWidth / 2, actualPageHeight - 10, { align: 'center' });
              }

              const pdfBlob = pdf.output('blob');
              file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
          } else {
              const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
              file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
          }

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                  await navigator.share({
                      title: 'Loft Leaf Report',
                      text: `Loft Leaf Quality Report - ${selectedDate}`,
                      files: [file]
                  });
                  toast.success("Shared successfully!", { id: toastId });
              } catch (shareError) {
                  console.warn("Web Share API error:", shareError);
                  const fileUrl = URL.createObjectURL(file);
                  const a = document.createElement('a');
                  a.href = fileUrl;
                  a.download = file.name;
                  a.click();
                  URL.revokeObjectURL(fileUrl);
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Here is the Loft Leaf Quality Report for ${selectedDate}. Please attach the downloaded file.`)}`;
                  window.open(whatsappUrl, '_blank');
                  toast.success("File downloaded. Please attach it in WhatsApp.", { id: toastId });
              }
          } else {
              const fileUrl = URL.createObjectURL(file);
              const a = document.createElement('a');
              a.href = fileUrl;
              a.download = file.name;
              a.click();
              URL.revokeObjectURL(fileUrl);
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Here is the Loft Leaf Quality Report for ${selectedDate}. Please attach the downloaded file.`)}`;
              window.open(whatsappUrl, '_blank');
              toast.success("File downloaded. Please attach it in WhatsApp.", { id: toastId });
          }
      } catch (error) {
          console.error("WhatsApp Share Error: ", error);
          toast.error("Failed to share file.", { id: toastId });
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

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto h-10 sm:h-auto">
            <button
              onClick={generatePDFForDate}
              disabled={loading || records.length === 0}
              className="p-2.5 px-3 sm:px-4 flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              title="Download PDF"
            >
              <FileDown size={18} /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">PDF</span>
            </button>

            {/* 💡 WhatsApp Share Dropdown Button */}
            <div className="relative flex-1 sm:flex-none" ref={waMenuRef}>
              <button
                onClick={() => setIsWaMenuOpen(!isWaMenuOpen)}
                disabled={loading || records.length === 0}
                className="w-full h-full p-2.5 px-3 sm:px-4 justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <FaWhatsapp size={18} /> <span className="font-bold text-xs sm:text-sm hidden sm:inline">{t.shareWhatsapp}</span>
              </button>
              
              {isWaMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 overflow-hidden z-50 animate-in slide-in-from-top-2">
                  <button onClick={() => shareOnWhatsApp('image')} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3">
                    <Image size={18} className="text-[#25D366]" /> {t.shareImage}
                  </button>
                  <button onClick={() => shareOnWhatsApp('pdf')} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3 border-t border-gray-100 dark:border-zinc-700">
                    <FileText size={18} className="text-red-500" /> {t.sharePDF}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={fetchRecords} 
              disabled={loading}
              className={`p-2.5 flex-1 sm:flex-none flex justify-center bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>

          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          {/* 💡 SUPERVISOR BANNER */}
          {!loading && records.length > 0 && (
              <div className="bg-lime-50 dark:bg-lime-900/10 border border-lime-200 dark:border-lime-900/50 p-3 px-4 rounded-xl shadow-sm flex items-center gap-3">
                  <UserCheck className="text-lime-600 dark:text-lime-400" size={20} />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{t.supervisorHeader}</span>
                  <span className="text-base font-black text-lime-800 dark:text-lime-400">{daySupervisorName}</span>
              </div>
          )}

          {/* 💡 COLOR LEGEND FOR UI */}
          {!loading && records.length > 0 && (
              <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 block"></span> {t.legendTime}
                  </span>
                  <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400 dark:bg-lime-900/50 border border-green-300 block"></span> {t.legendDiff}
                  </span>
              </div>
          )}
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
            <table className="w-full text-xs sm:text-sm text-center border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-20 whitespace-pre-wrap">{t.route}</th>
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-32 whitespace-pre-wrap">{t.colName}</th>
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase whitespace-pre-wrap">{t.arrTime}</th>
                  <th rowSpan={2} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-400 whitespace-pre-wrap">{t.totalKg}</th>
                  
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-gray-200/50 dark:bg-zinc-700/50">{t.facSample}</th>
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-teal-50/50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">{t.colSample}</th>
                  <th colSpan={3} className="p-1.5 sm:p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400">{t.calcKgHeader}</th>
                  
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
                {rankedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 font-medium">
                      <AlertCircle size={36} className="mx-auto mb-3 opacity-30 text-gray-400" />
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  rankedRecords.map((row) => {
                  const routeCode = (row.route || "").split(" - ")[0].toUpperCase();
                  const hideArrivalTime = routeCode === "E" || routeCode === "FA";
                  
                  const displayTime = hideArrivalTime ? "-" : (row.arrivalTime || "-");
                  const isLate = !hideArrivalTime && isTimeLate(row.arrivalTime);

                  const facBest = row.factorySample?.isEntered ? Number(row.factorySample.bestPct) : 0;
                  const colBest = row.collectorSample?.isEntered ? Number(row.collectorSample.bestPct) : 0;
                  const showHighlight = (row.factorySample?.isEntered && row.collectorSample?.isEntered && Math.abs(facBest - colBest) > 5);

                  return (
                  <tr key={row._id} className={`transition-colors ${showHighlight ? 'bg-[#dcfce7] dark:bg-lime-900/30' : 'hover:bg-gray-50 dark:hover:bg-zinc-900'}`}>
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 text-left">
                        <div className="font-bold text-gray-800 dark:text-gray-200">
                            {(row.route || "-").toUpperCase()}
                        </div>
                        {row.editedBy && (
                            <div className="text-[9px] text-blue-400 dark:text-gray-500 mt-1 leading-tight border-t border-gray-100 dark:border-zinc-800 pt-1">
                                {lang === 'SI' ? "වෙනස් කළේ:" : "Edited:"} {row.editedBy}<br/>
                                <span className="text-[8px]">
                                  {new Date(row.updatedAt || row.date).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </td>
                    
                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-medium text-gray-700 dark:text-gray-300">
                        {row.leafCollectorName || "-"}
                    </td>

                    <td className={`p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 ${isLate ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                      <div className="flex flex-col items-center justify-center">
                          <span className="flex items-center gap-1">{isLate && <Clock size={12}/>} {displayTime}</span>
                          {isLate && <span className="text-[9px] uppercase mt-0.5 tracking-wide">{t.late}</span>}
                      </div>
                    </td>

                    <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800 font-black text-[#65a30d] dark:text-lime-400 bg-lime-50/10 dark:bg-lime-900/10">
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
                          {row._calculatedRank}
                      </span>
                    </td>

                    {!isViewer && (
                      <td className="p-2 sm:p-3 border border-gray-200 dark:border-zinc-800">
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
                );
                })
              )}
              </tbody>

                {records.length > 0 && (
                    <tfoot>
                        <tr className="bg-gray-100 dark:bg-zinc-800 font-bold text-gray-800 dark:text-gray-200">
                            <td colSpan={3} className="p-2 sm:p-3 border border-gray-300 dark:border-zinc-700 text-left pl-4 sm:pl-6">{t.totalAvg}</td>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
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
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Collector Name</label>
                            <input type="text" name="leafCollectorName" value={editForm.leafCollectorName} onChange={handleEditChange} placeholder="Optional" className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Arrival Time</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    name="arrivalTime" 
                                    placeholder="08:30"
                                    maxLength="5"
                                    value={editForm.arrivalTime} 
                                    onChange={(e) => {
                                        const formattedTime = formatTime12Hour(e.target.value);
                                        setEditForm(prev => ({ ...prev, arrivalTime: formattedTime }));
                                    }} 
                                    required 
                                    className="w-full p-2.5 text-center border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" 
                                />
                                <select
                                    name="arrivalAmPm"
                                    value={editForm.arrivalAmPm}
                                    onChange={handleEditChange}
                                    className="w-20 p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm font-bold bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none text-center"
                                >
                                    <option value="PM">PM</option>
                                    <option value="AM">AM</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Total Qty (Kg)</label>
                            <input type="number" name="totalLeafQtyKg" value={editForm.totalLeafQtyKg} onChange={handleEditChange} required min="0" step="any" className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" />
                        </div>
                    </div>

                    <div className="mb-6 border-t border-b py-4 border-gray-100 dark:border-zinc-800">
                         <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Factory Supervisor Name</label>
                         <input type="text" name="factorySupervisorName" value={editForm.factorySupervisorName} onChange={handleEditChange} className="w-full max-w-sm p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 focus:ring-2 focus:ring-lime-500 outline-none" />
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
      {/* 💡 HIDDEN PRINT AREA FOR PDF DIRECT DOWNLOAD */}
      {/* ========================================================================================= */}
      <div 
         id="pdf-print-area" 
         className="bg-[#ffffff] p-10 font-sans text-[#000000]" 
         style={{ width: '1122px', minHeight: '793px', display: 'none' }}
      >
            <div className="flex justify-between items-start mb-6 border-b border-[#d1d5db] pb-4">
                <div className="flex items-center gap-4">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="w-16 h-16 object-contain" 
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                    <div>
                        <h1 className="text-[26px] font-bold text-[#1B6A31] uppercase" style={{ fontFamily: 'sans-serif' }}>
                            Athukorala Group (Pvt) Ltd
                        </h1>
                        <h2 className="text-[24px] font-bold mt-1" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                            {t.title}
                        </h2>
                        <p className="text-[#4b5563] text-[18px] mt-1" style={{ fontFamily: 'sans-serif' }}>
                            Transaction Date: {selectedDate.replace(/-/g, '.')}
                        </p>
                    </div>
                </div>
                <div className="text-right text-[14px] text-[#6b7280] flex flex-col gap-1" style={{ fontFamily: 'sans-serif' }}>
                    <p><strong className="text-[#4b5563]">{t.docRef}:</strong> {uniqueCode}</p>
                    <p><strong className="text-[#4b5563]">{t.genTime}:</strong> {generatedDateTime}</p>
                </div>
            </div>

            {/* 💡 SUPERVISOR HEADER & LEGEND IN PDF */}
            <div className="flex justify-between items-end mb-4">
                <div className="text-[18px]" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                    <strong>{t.supervisorHeader}</strong> {daySupervisorName}
                </div>
                <div className="text-[14px] text-[#4b5563] flex gap-4" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#E60202] block"></span> {t.legendTime}
                  </span>
                  <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#1AF475]"></span> {t.legendDiff}
                  </span>
                </div>
            </div>
              
            <table className="w-full border-collapse border border-[#8F8F8F] text-center" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                <thead>
                    <tr className="text-[#000000]">
                        <th rowSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.route}</th>
                        <th rowSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 d">{t.colName}</th>
                        <th rowSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.arrTime}</th>
                        <th rowSpan={3} className="border border-[#8F8F8F] text-[18px] p-2d">{t.totalKg}</th>
                        <th colSpan={6} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.title}</th>
                        <th colSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.calcKgHeader}</th>
                        <th rowSpan={3} className="border border-[#8F8F8F] text-[18px]  p-2 d">{t.rank}</th>
                    </tr>
                    <tr className="text-[#000000]">
                        <th colSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.facSample}</th>
                        <th colSpan={3} className="border border-[#8F8F8F] text-[18px] p-2 ">{t.colSample}</th>
                        <th rowSpan={2} className="border border-[#8F8F8F] text-[16px] p-2 text-[#087034]">{t.bestKg}</th>
                        <th rowSpan={2} className="border border-[#8F8F8F]  text-[16px]p-2 text-[#CE950E]">{t.belowBestKg}</th>
                        <th rowSpan={2} className="border border-[#8F8F8F] text-[16px] p-2 text-[#DE2E17]">{t.poorKg}</th>
                    </tr>
                    <tr className="text-[#000000]">
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#087034]">{t.bestPct}</th>
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#CE950E]">{t.belowBestPct}</th>
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#DE2E17]">{t.poorPct}</th>
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#087034]">{t.bestPct}</th>
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#CE950E]">{t.belowBestPct}</th>
                        <th className="border border-[#8F8F8F] p-2 font-bold text-[#DE2E17]">{t.poorPct}</th>
                    </tr>
                </thead>
                <tbody>
                    {rankedRecords.length === 0 ? (
                        <tr>
                            <td colSpan={15} className="border border-[#8F8F8F] p-6 text-[14px] text-center text-[#4b5563] italic">
                                {t.noData}
                            </td>
                        </tr>
                    ) : (
                        rankedRecords.map((r, idx) => {
                        const routeCode = (r.route || "").split(" - ")[0].toUpperCase();
                        const hideArrivalTime = routeCode === "E" || routeCode === "FA";
                        
                        const displayTime = hideArrivalTime ? "-" : (r.arrivalTime || "-");
                        const isLate = !hideArrivalTime && isTimeLate(r.arrivalTime);

                        const facBest = r.factorySample?.isEntered ? Number(r.factorySample.bestPct) : 0;
                        const colBest = r.collectorSample?.isEntered ? Number(r.collectorSample.bestPct) : 0;
                        const showHighlight = (r.factorySample?.isEntered && r.collectorSample?.isEntered && Math.abs(facBest - colBest) > 5);

                        return (
                        <tr key={idx} style={showHighlight ? { backgroundColor: '#dcfce7' } : {}}>
                            {/* p-2 වෙනුවට p-1 යොදා text-[14px] මගින් අකුරු ලොකු කර ඇත */}
                            <td className="border border-[#8F8F8F] p-1 text-[18px] font-bold font-sans">
                                {((r.route || "-").split(" - ")[0]).toUpperCase()}
                            </td>                            
                            <td className="border border-[#8F8F8F] pb-2 text-[14px] font-sans font-medium text-[#374151]">{r.leafCollectorName || "-"}</td>
                            <td 
                                className={`border border-[#8F8F8F] pb-1 text-[14px] font-sans ${isLate ? 'text-[#dc2626] font-bold' : ''}`}
                                style={isLate ? { backgroundColor: '#fef08a' } : {}}
                            >
                                {displayTime}
                                {isLate && <div className="text-[10px] uppercase mt-0.5" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>{t.late}</div>}
                            </td>

                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans font-semibold">{Number(r.totalLeafQtyKg || 0)}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#087034] ">{r.factorySample?.isEntered ? r.factorySample.bestPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#CE950E] ">{r.factorySample?.isEntered ? r.factorySample.belowBestPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#DE2E17] ">{r.factorySample?.isEntered ? r.factorySample.poorPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#087034] ">{r.collectorSample?.isEntered ? r.collectorSample.bestPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#CE950E] ">{r.collectorSample?.isEntered ? r.collectorSample.belowBestPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans text-[#DE2E17] ">{r.collectorSample?.isEntered ? r.collectorSample.poorPct : "-"}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans font-semibold">{Number(r.calculatedKg?.bestKg || 0).toFixed(2)}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans font-semibold">{Number(r.calculatedKg?.belowBestKg || 0).toFixed(2)}</td>
                            <td className="border border-[#8F8F8F] pb-1 text-[18px] font-sans font-semibold">{Number(r.calculatedKg?.poorKg || 0).toFixed(2)}</td>
                            
                            <td className="border border-[#8F8F8F] p-1 text-[16px] font-bold font-sans text-[#1B6A31]">
                                {r._calculatedRank}
                            </td>
                        </tr>
                    );
                })
              )}
              </tbody>

                {records.length > 0 && (
                    <tfoot>
                        <tr className="bg-[#E6F0E6] text-[#1B6A31]">
                            <td colSpan={3} className="border border-[#8F8F8F] p-2 pb-3 text-right font-bold font-sans">{t.totalAvg}</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.tQty}</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.avgFacBest} %</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.avgFacBelow} %</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.avgFacPoor} %</td>
                            <td colSpan={3} className="border border-[#8F8F8F] p-2"></td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.bestKg}</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.belowBestKg}</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px] font-bold font-sans">{totals.poorKg}</td>
                            <td className="border border-[#8F8F8F] p-2 pb-3 text-[18px]"></td>
                        </tr>
                    </tfoot>
                )}
            </table>

            <div className="mt-6 pt-6 flex justify-between items-end text-sm font-bold font-sans text-[#374151]">
                <div>
                    <p className="text-[#4b5563]">{t.genBy}:</p>
                    <p className="text-[#2C3A3A]">{currentUsername}</p>
                </div>
                <div className="text-center">
                    <p className="text-[#4b5563] mb-1">.................................................................</p>
                    <p className="text-[#4b5563]">{t.authSig}</p>
                </div>
            </div>
      </div>

    </div>
  );
}