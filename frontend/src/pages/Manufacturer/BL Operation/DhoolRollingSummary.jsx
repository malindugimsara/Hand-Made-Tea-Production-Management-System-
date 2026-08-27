import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  RefreshCw, 
  FileDown, 
  Languages, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Scale, 
  Filter, 
  X, 
  Package
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from "jspdf";

// Constant Standard Divisor
const STANDARD_BATCH_KG = 560;

// Helper to get local date in YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to convert "Xh Ym" or "HH:MM" string to decimal hours
const parseDurationToDecimalHours = (durationStr, startTime, endTime) => {
  if (!durationStr && startTime && endTime) {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  }
  if (!durationStr) return 0;
  let hours = 0;
  const hMatch = durationStr.match(/(\d+)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  if (hMatch) hours += parseInt(hMatch[1], 10);
  if (mMatch) hours += parseInt(mMatch[1], 10) / 60;
  return hours || 0;
};

// Helper to format decimal hours back into "Xh Ym"
const formatDecimalHoursToHms = (decimalHours) => {
  if (!decimalHours || decimalHours <= 0) return '0h 00m';
  const totalMins = Math.round(decimalHours * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
};

const RollingRoomSheetSummary = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  const userRole = localStorage.getItem("userRole") || "Admin";
  const currentUsername = localStorage.getItem("username") || "admin";

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [lang, setLang] = useState('EN');

  // 💡 --- DYNAMIC TRANSLATIONS ---
  const t = {
    title: lang === 'SI' ? "රෝලිං කාමර වාර්තා පත්‍රිකාව" : "ROLLING ROOM SHEET",
    subtitle: lang === 'SI' ? "දෛනික රෝලිං වාර්තාව සහ පසුගිය දින 30 සාමාන්‍ය කාල සංසන්දනය." : "Daily rolling room summary with 30-day operational rolling benchmark analysis.",
    sync: lang === 'SI' ? "යාවත්කාලීන කරන්න" : "Sync",
    refreshing: lang === 'SI' ? "යාවත්කාලීන වෙමින්..." : "Refreshing...",
    downloadPdf: lang === 'SI' ? "PDF බාගත කරන්න" : "Download PDF",
    filterDay: lang === 'SI' ? "දිනය අනුව තෝරන්න:" : "Filter by Date:",
    clear: lang === 'SI' ? "මකන්න" : "Clear",
    noRecordFound: lang === 'SI' ? "තෝරාගත් දිනය සඳහා වාර්තා හමු නොවීය" : "No Rolling Sheet Found",
    noRecordDesc: lang === 'SI' ? "මෙම දිනය සඳහා තවමත් රෝලිං කාමර සටහනක් ඇතුලත් කර නොමැත." : "There is no rolling room sheet recorded for the selected date.",

    // Anomaly Banner
    overtimeAlert: lang === 'SI' ? "අවධානයයි: රෝලිං කාලය සාමාන්‍ය කාලයට වඩා වැඩිය!" : "ATTENTION: ROLLING TOOK LONGER THAN USUAL!",
    overtimeDesc: lang === 'SI' ? "මෙම දිනයේ රෝලිං ක්‍රියාවලිය සඳහා පසුගිය දින 30 සාමාන්‍යයට වඩා වැඩි කාලයක් ගතවී ඇත." : "Rolling operations on this date took significantly more time than the 30-day baseline average.",
    normalAlert: lang === 'SI' ? "රෝලිං කාලය සාමාන්‍ය මට්ටමේ පවතී" : "Normal Rolling Operation Duration",
    normalDesc: lang === 'SI' ? "රෝලිං කාලය පසුගිය දින 30 සම්මත කාල පරාසය තුළ සාර්ථකව අවසන් කර ඇත." : "Rolling operations duration was completed within the expected 30-day baseline time.",
    actualDuration: lang === 'SI' ? "ගතවූ සත්‍ය කාලය" : "Actual Duration",
    expectedDuration: lang === 'SI' ? "අපේක්ෂිත කාලය (30d Avg)" : "Expected (30d Avg)",
    delayDifference: lang === 'SI' ? "අතිරේක ප්‍රමාදය" : "Variance / Delay",
    rollingRate: lang === 'SI' ? "දින 30 රෝලිං වේගය" : "30-Day Avg Rate",

    // Sheet Headers
    cropDate: lang === 'SI' ? "අස්වැන්න දිනය" : "Crop Date",
    mfDate: lang === 'SI' ? "නිෂ්පාදිත දිනය" : "M/F Date",
    cropKg: lang === 'SI' ? "අස්වැන්න (Kg)" : "Crop (Kg)",
    otherLeafKg: lang === 'SI' ? "වෙනත් දළු (Kg)" : "Other Leaf (Kg)",
    rollingStartTime: lang === 'SI' ? "රෝලිං ආරම්භක වේලාව" : "Rolling Start Time",
    rollingEndTime: lang === 'SI' ? "රෝලිං අවසන් වේලාව" : "Rolling End Time",
    totalRollingHours: lang === 'SI' ? "මුළු රෝලිං පැය ගණන" : "Total Rolling Hours",
    sameOrNext: lang === 'SI' ? "එම දිනය / ඊළඟ දිනය" : "Same Day/ Next Day",
    noOfBatches: lang === 'SI' ? "කාණ්ඩ ගණන" : "No of Batches",

    badgeNo: lang === 'SI' ? "කාණ්ඩ අංකය" : "BADGE NO",
    dhool1: lang === 'SI' ? "1 වන ධූල් (1ST DHOOL)" : "1ST DHOOL",
    roll1: lang === 'SI' ? "රෝල් අංක: 01" : "ROLL NO 01",
    dhool2: lang === 'SI' ? "2 වන ධූල් (2ND DHOOL)" : "2ND DHOOL",
    roll2: lang === 'SI' ? "රෝල් අංක: 02" : "ROLL NO 02",
    bigBulk: lang === 'SI' ? "බිග් බල්ක් (BIG BULK)" : "BIG BULK",
    roll3: lang === 'SI' ? "රෝල් අංක: 03" : "ROLL NO 03",

    startTime: lang === 'SI' ? "ආරම්භය" : "START TIME",
    endTime: lang === 'SI' ? "අවසානය" : "END TIME",
    wetDhool: lang === 'SI' ? "තෙත් ධූල්" : "WET DHOOL",
    kg: "KG",
    pct: "%",
    total: lang === 'SI' ? "එකතුව" : "TOTAL",
    genBy: lang === 'SI' ? "සකස් කළේ:" : "Generated By:",
    authSig: lang === 'SI' ? "පරීක්ෂා කළේ / අත්සන" : "Checked By / Signature",
    docRef: lang === 'SI' ? "ලේඛන අංකය" : "Doc Ref",
    generated: lang === 'SI' ? "ජනනය කළ වේලාව" : "Generated"
  };

  // Fetch all records from backend
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/rolling-room-sheet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setAllRecords(result.data || []);
      } else {
        toast.error("Failed to load rolling records.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Connection error while fetching rolling records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter the specific record for the selected day
  const currentRecord = useMemo(() => {
    if (!filterDate) return allRecords[0] || null;
    return allRecords.find(r => r.cropDate === filterDate || r.mfDate === filterDate) || null;
  }, [allRecords, filterDate]);

  // =========================================================================
  // 💡 30-DAY ROLLING BENCHMARK & OVERTIME ANOMALY CALCULATION
  // =========================================================================
  const analysis = useMemo(() => {
    if (!currentRecord) {
      return { hasData: false, isOverdue: false };
    }

    const currentDateObj = new Date(currentRecord.cropDate || currentRecord.createdAt);
    const thirtyDaysAgo = new Date(currentDateObj);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const past30DayRecords = allRecords.filter(r => {
      const rDate = new Date(r.cropDate || r.createdAt);
      return rDate >= thirtyDaysAgo && rDate <= currentDateObj && r._id !== currentRecord._id;
    });

    let total30dKg = 0;
    let total30dHours = 0;

    past30DayRecords.forEach(r => {
      const totalLeaf = (Number(r.cropKg) || 0) + (Number(r.otherLeafKg) || 0);
      const hours = parseDurationToDecimalHours(r.totalRollingHours, r.rollingStartTime, r.rollingEndTime);
      if (totalLeaf > 0 && hours > 0) {
        total30dKg += totalLeaf;
        total30dHours += hours;
      }
    });

    // Fallback if low historical data
    if (total30dKg === 0 && allRecords.length > 0) {
      allRecords.forEach(r => {
        const totalLeaf = (Number(r.cropKg) || 0) + (Number(r.otherLeafKg) || 0);
        const hours = parseDurationToDecimalHours(r.totalRollingHours, r.rollingStartTime, r.rollingEndTime);
        if (totalLeaf > 0 && hours > 0) {
          total30dKg += totalLeaf;
          total30dHours += hours;
        }
      });
    }

    const hoursPer1000Kg = total30dKg > 0 ? (total30dHours / total30dKg) * 1000 : 1.35;
    const currentDayTotalKg = (Number(currentRecord.cropKg) || 0) + (Number(currentRecord.otherLeafKg) || 0);
    const actualHours = parseDurationToDecimalHours(
      currentRecord.totalRollingHours, 
      currentRecord.rollingStartTime, 
      currentRecord.rollingEndTime
    );

    const expectedHours = (currentDayTotalKg / 1000) * hoursPer1000Kg;
    const isOverdue = actualHours > (expectedHours * 1.05) && expectedHours > 0;
    const diffHours = actualHours - expectedHours;
    const diffPercentage = expectedHours > 0 ? ((diffHours / expectedHours) * 100).toFixed(1) : 0;

    return {
      hasData: true,
      isOverdue,
      actualHoursFormatted: formatDecimalHoursToHms(actualHours),
      expectedHoursFormatted: formatDecimalHoursToHms(expectedHours),
      diffHoursFormatted: `${diffHours > 0 ? '+' : ''}${formatDecimalHoursToHms(Math.abs(diffHours))}`,
      diffPercentage,
      ratePer1000Kg: hoursPer1000Kg.toFixed(2),
      pastRecordsCount: past30DayRecords.length
    };
  }, [allRecords, currentRecord]);

  // Batch summary totals
  const batches = currentRecord?.batches || [];
  const sumD1Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool1?.wetDhoolKg) || 0), 0);
  const sumD2Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool2?.wetDhoolKg) || 0), 0);
  const sumBBKg = batches.reduce((sum, b) => sum + (parseFloat(b.bigBulk?.wetDhoolKg) || 0), 0);
  const grandTotalWetDhool = sumD1Kg + sumD2Kg + sumBBKg;

  const totalCapacityKg = (batches.length || 1) * STANDARD_BATCH_KG;
  const avgD1Pct = totalCapacityKg > 0 ? ((sumD1Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgD2Pct = totalCapacityKg > 0 ? ((sumD2Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgBBPct = totalCapacityKg > 0 ? ((sumBBKg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const grandTotalPct = totalCapacityKg > 0 ? ((grandTotalWetDhool / totalCapacityKg) * 100).toFixed(2) : '0.00';

  // =========================================================
  // --- DIRECT PDF DOWNLOAD (Official Athukorala Format) ---
  // =========================================================
  const handleDownloadPDF = async () => {
    const printElement = document.getElementById('rolling-summary-pdf-print');
    if (!printElement) return;

    setGeneratingPdf(true);
    const toastId = toast.loading("Generating Official PDF Report...");

    try {
      printElement.style.display = "block";
      printElement.style.position = "absolute";
      printElement.style.top = "-9999px";

      const canvas = await html2canvas(printElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const stylesheets = clonedDoc.querySelectorAll('link[rel="stylesheet"], style');
          stylesheets.forEach(sheet => sheet.remove());
        }
      });

      printElement.style.display = "none";

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();

      const margin = 20;
      const maxW = pdfPageWidth - (margin * 2);
      const maxH = pdfPageHeight - (margin * 2);

      let finalW = maxW;
      let finalH = (canvas.height * finalW) / canvas.width;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = (canvas.width * finalH) / canvas.height;
      }

      const x = (pdfPageWidth - finalW) / 2;
      const y = margin;

      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
      pdf.save(`Rolling_Room_Sheet_${currentRecord?.cropDate || filterDate}.pdf`);

      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const docRefCode = `RRS/${(currentRecord?.cropDate || filterDate || '').replace(/-/g, '')}`;
  const currentTimestamp = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}`;

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans">
      <Toaster position="bottom-right" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Page Header Bar --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2.5 bg-green-50 text-green-700 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                {t.title}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-11">{t.subtitle}</p>
          </div>

          {/* Action Buttons & Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
            
            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={generatingPdf || !currentRecord}
              className="p-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
              title="Download PDF"
            >
              <FileDown size={16} />
              {t.downloadPdf}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="p-2.5 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors font-bold text-xs flex items-center gap-2"
            >
              <Languages size={16} />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>

            {/* Sync Button */}
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="p-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar --- */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-bold text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-green-600" />
            {t.filterDay}
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-lg focus:ring-2 focus:ring-green-500 outline-none p-2"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate("")}
                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-2 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" /> {t.clear}
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 💡 30-DAY ROLLING BENCHMARK STATUS (RED OVERTIME ALERT BANNER)             */}
        {/* ========================================================================= */}
        {analysis.hasData && (
          <div className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
            analysis.isOverdue 
              ? 'bg-red-50 border-red-300 text-red-900 shadow-red-100/50' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              
              {/* Alert Header & Details */}
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  analysis.isOverdue ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white'
                }`}>
                  {analysis.isOverdue ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black uppercase tracking-wide ${
                      analysis.isOverdue ? 'text-red-700' : 'text-emerald-800'
                    }`}>
                      {analysis.isOverdue ? t.overtimeAlert : t.normalAlert}
                    </h3>
                    {analysis.isOverdue && (
                      <span className="px-2.5 py-0.5 bg-red-600 text-white rounded-full font-black text-[10px] uppercase tracking-wider">
                        Overdue Delay
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${analysis.isOverdue ? 'text-red-600' : 'text-emerald-700'}`}>
                    {analysis.isOverdue ? t.overtimeDesc : t.normalDesc}
                  </p>
                </div>
              </div>

              {/* 30-Day Key Metrics Breakdown */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                
                {/* Actual Duration */}
                <div className="bg-white/80 border border-current/10 px-3.5 py-2 rounded-xl text-center flex-1 sm:flex-none min-w-[110px]">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{t.actualDuration}</p>
                  <p className="text-sm font-black text-gray-900">{analysis.actualHoursFormatted}</p>
                </div>

                {/* Expected Duration based on 30 days */}
                <div className="bg-white/80 border border-current/10 px-3.5 py-2 rounded-xl text-center flex-1 sm:flex-none min-w-[110px]">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{t.expectedDuration}</p>
                  <p className="text-sm font-black text-gray-700">{analysis.expectedHoursFormatted}</p>
                </div>

                {/* Difference / Variance */}
                <div className={`px-3.5 py-2 rounded-xl text-center flex-1 sm:flex-none min-w-[110px] text-white font-bold ${
                  analysis.isOverdue ? 'bg-red-600' : 'bg-emerald-600'
                }`}>
                  <p className="text-[10px] opacity-90 uppercase">{t.delayDifference}</p>
                  <p className="text-sm font-black">
                    {analysis.diffHoursFormatted} ({analysis.diffPercentage}%)
                  </p>
                </div>

                {/* 30-Day Avg Rate */}
                <div className="bg-white/80 border border-current/10 px-3.5 py-2 rounded-xl text-center flex-1 sm:flex-none min-w-[120px] hidden md:block">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{t.rollingRate}</p>
                  <p className="text-sm font-black text-blue-700">{analysis.ratePer1000Kg}h / 1,000 kg</p>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* --- MAIN ROLLING ROOM SHEET VIEW (WEB UI DASHBOARD COMPONENT) ---         */}
        {/* ========================================================================= */}
        {loading && allRecords.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">Loading rolling room sheet records...</p>
          </div>
        ) : !currentRecord ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700">{t.noRecordFound}</h3>
            <p className="text-gray-500 text-xs mt-1">{t.noRecordDesc}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10 overflow-hidden font-sans">

            {/* Document Title Header */}
            <div className="text-center pb-6 mb-6 border-b border-gray-200">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-green-900 uppercase">
                ROLLING ROOM SHEET
              </h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Athukorala Tea Factory - Operational Log
              </p>
            </div>

            {/* Metadata Section - 4 Polished Colored Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">{t.cropDate}</span>
                <span className="text-sm font-black text-slate-900">{currentRecord.cropDate || '-'}</span>
              </div>
              <div className="bg-green-50/60 border border-green-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-green-700 uppercase">{t.mfDate}</span>
                <span className="text-sm font-black text-green-950">{currentRecord.mfDate || '-'}</span>
              </div>
              <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700 uppercase">{t.cropKg}</span>
                <span className="text-sm font-black text-blue-900">{currentRecord.cropKg ? `${currentRecord.cropKg} kg` : '-'}</span>
              </div>
              <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700 uppercase">{t.otherLeafKg}</span>
                <span className="text-sm font-black text-amber-950">{currentRecord.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '-'}</span>
              </div>
            </div>

            {/* Operations 2-Column Table */}
            <div className="mb-8 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="p-3 font-bold w-1/2 bg-gray-50/80 text-gray-700 border-r border-gray-200">{t.rollingStartTime}</td>
                    <td className="p-3 font-bold text-gray-900">{currentRecord.rollingStartTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="p-3 font-bold bg-gray-50/80 text-gray-700 border-r border-gray-200">{t.rollingEndTime}</td>
                    <td className="p-3 font-bold text-gray-900">{currentRecord.rollingEndTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="p-3 font-bold bg-gray-50/80 text-gray-700 border-r border-gray-200">{t.totalRollingHours}</td>
                    <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-base font-black text-green-800">{currentRecord.totalRollingHours || '-'}</span>
                      {analysis.isOverdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-xs rounded border border-red-200">
                          Overdue (+{analysis.diffPercentage}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-white">
                    <td className="p-3 font-bold bg-gray-50/80 text-gray-700 border-r border-gray-200">{t.sameOrNext}</td>
                    <td className="p-3 font-bold text-gray-900">{currentRecord.dayType || 'Same Day'}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-bold bg-gray-50/80 text-gray-700 border-r border-gray-200">{t.noOfBatches}</td>
                    <td className="p-3 font-black text-blue-700">{batches.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Main Rolling Sheet 3-Tier Grid with Web Colors */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full min-w-[950px] border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th rowSpan={3} className="border-r border-gray-200 p-2.5 w-20 bg-gray-100 font-black text-gray-700 uppercase">
                      {t.badgeNo}
                    </th>
                    <th colSpan={4} className="border-r border-gray-200 p-2.5 bg-blue-50 text-blue-900 font-extrabold text-sm uppercase">
                      {t.dhool1}
                    </th>
                    <th colSpan={4} className="border-r border-gray-200 p-2.5 bg-emerald-50 text-emerald-900 font-extrabold text-sm uppercase">
                      {t.dhool2}
                    </th>
                    <th colSpan={4} className="p-2.5 bg-amber-50 text-amber-900 font-extrabold text-sm uppercase">
                      {t.bigBulk}
                    </th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th colSpan={4} className="border-r border-gray-200 p-1.5 bg-blue-100/50 text-blue-800 font-bold">{t.roll1}</th>
                    <th colSpan={4} className="border-r border-gray-200 p-1.5 bg-emerald-100/50 text-emerald-800 font-bold">{t.roll2}</th>
                    <th colSpan={4} className="p-1.5 bg-amber-100/50 text-amber-800 font-bold">{t.roll3}</th>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                    <th className="border-r border-gray-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20 text-blue-700">{t.kg}</th>
                    <th className="border-r border-gray-200 p-1.5 w-16 text-blue-700">{t.pct}</th>

                    <th className="border-r border-gray-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20 text-emerald-700">{t.kg}</th>
                    <th className="border-r border-gray-200 p-1.5 w-16 text-emerald-700">{t.pct}</th>

                    <th className="border-r border-gray-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-gray-200 p-1.5 w-20 text-amber-700">{t.kg}</th>
                    <th className="p-1.5 w-16 text-amber-700">{t.pct}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {batches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="border-r border-gray-200 p-2.5 font-black text-gray-800 bg-gray-50/60">
                        {String(b.batchNo).padStart(2, '0')}
                      </td>

                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.dhool1?.startTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.dhool1?.endTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 font-bold text-blue-700">{b.dhool1?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-gray-200 p-2 font-semibold text-gray-600">{b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}</td>

                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.dhool2?.startTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.dhool2?.endTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 font-bold text-emerald-700">{b.dhool2?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-gray-200 p-2 font-semibold text-gray-600">{b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}</td>

                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.bigBulk?.startTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 text-gray-700">{b.bigBulk?.endTime || '-'}</td>
                      <td className="border-r border-gray-200 p-2 font-bold text-amber-700">{b.bigBulk?.wetDhoolKg || '-'}</td>
                      <td className="p-2 font-semibold text-gray-600">{b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                    <td className="border-r border-gray-300 p-2.5 font-black uppercase text-xs text-gray-700">{t.total}</td>
                    
                    <td colSpan={2} className="border-r border-gray-200 p-2"></td>
                    <td className="border-r border-gray-200 p-2 font-black text-blue-800 text-sm">{sumD1Kg.toFixed(2)}</td>
                    <td className="border-r border-gray-300 p-2 text-blue-900 font-bold">{avgD1Pct}%</td>

                    <td colSpan={2} className="border-r border-gray-200 p-2"></td>
                    <td className="border-r border-gray-200 p-2 font-black text-emerald-800 text-sm">{sumD2Kg.toFixed(2)}</td>
                    <td className="border-r border-gray-300 p-2 text-emerald-900 font-bold">{avgD2Pct}%</td>

                    <td colSpan={2} className="border-r border-gray-200 p-2"></td>
                    <td className="border-r border-gray-200 p-2 font-black text-amber-800 text-sm">{sumBBKg.toFixed(2)}</td>
                    <td className="p-2 text-amber-900 font-bold">{avgBBPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Wet Dhool Summary Card */}
            <div className="mt-6 p-4 bg-green-50/70 border border-green-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-xs font-bold text-green-900 uppercase">
                Grand Total Wet Dhool Quantity:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-green-800">
                  {grandTotalWetDhool.toFixed(2)} kg
                </span>
                <span className="text-xs font-bold text-green-700 bg-green-100/80 px-3 py-1 rounded-lg border border-green-200">
                  {grandTotalPct}% Overall Capacity
                </span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 💡 PERFECTED HIDDEN PDF TEMPLATE (Strict 1px Gridlines, Zero CSS Glitches) */}
      {/* ========================================================================= */}
      {currentRecord && (
        <div 
          id="rolling-summary-pdf-print"
          style={{ 
            width: '1080px', 
            minHeight: '750px', 
            display: 'none', 
            backgroundColor: '#ffffff', 
            color: '#000000', 
            padding: '36px 44px', 
            fontFamily: 'sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Forest Green Bar */}
          <div style={{ height: '4px', backgroundColor: '#15803d', width: '100%', marginBottom: '18px' }}></div>

          {/* Standard Athukorala Header with Logo & Meta Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #000000', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img 
                src="/logo.png" 
                alt="Logo" 
                style={{ width: '56px', height: '56px', objectFit: 'contain' }} 
                onError={(e) => e.target.style.display = 'none'} 
              />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#15803d', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
                  ATHUKORALA GROUP (PVT) LTD
                </h1>
                <h2 style={{ fontSize: '18px', fontWeight: '900', marginTop: '3px', color: '#000000', margin: 0 }}>
                  {t.title}
                </h2>
                <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '3px', margin: 0 }}>
                  Filter Applied: Date - {currentRecord.cropDate || filterDate}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '3px', border: '1px solid #94a3b8', padding: '8px 14px', backgroundColor: '#f8fafc' }}>
              <p style={{ margin: 0 }}><strong style={{ color: '#000000' }}>{t.docRef}:</strong> {docRefCode}</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#000000' }}>{t.generated}:</strong> {currentTimestamp}</p>
            </div>
          </div>

          {/* Overtime Alert Badge on PDF if Overdue */}
          {analysis.isOverdue && (
            <div style={{ backgroundColor: '#fee2e2', border: '1.5px solid #ef4444', color: '#991b1b', padding: '6px 14px', marginBottom: '14px', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ ATTENTION: ROLLING TOOK LONGER THAN 30-DAY USUAL AVERAGE</span>
              <span>Actual: {analysis.actualHoursFormatted} vs Expected: {analysis.expectedHoursFormatted} ({analysis.diffHoursFormatted})</span>
            </div>
          )}

          {/* 4-Item Metadata Box (Clean 1px Borders, NO Border Radius) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginBottom: '14px', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  Crop Date: <span style={{ fontWeight: 'normal', color: '#000000' }}>{currentRecord.cropDate || '-'}</span>
                </td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  M/F Date: <span style={{ fontWeight: 'normal', color: '#000000' }}>{currentRecord.mfDate || '-'}</span>
                </td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  Crop (Kg): <span style={{ fontWeight: 'normal', color: '#000000' }}>{currentRecord.cropKg ? `${currentRecord.cropKg} kg` : '-'}</span>
                </td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  Other Leaf: <span style={{ fontWeight: 'normal', color: '#000000' }}>{currentRecord.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Operations Parameters 2-Column Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginBottom: '16px', fontSize: '11.5px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold', width: '40%', backgroundColor: '#f8fafc' }}>Rolling Start Time</td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px' }}>{currentRecord.rollingStartTime || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Rolling End Time</td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px' }}>{currentRecord.rollingEndTime || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Total Rolling Hours</td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold' }}>{currentRecord.totalRollingHours || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Same Day / Next Day</td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px' }}>{currentRecord.dayType || 'Same Day'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>No of Batches</td>
                <td style={{ border: '1px solid #000000', padding: '6px 12px', fontWeight: 'bold' }}>{batches.length}</td>
              </tr>
            </tbody>
          </table>

          {/* Main 3-Tier Grid with Complete Clean Gridlines (No Broken Borders) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', textAlign: 'center', fontSize: '10.5px' }}>
            <thead>
              {/* Level 1 Header */}
              <tr>
                <th rowSpan={3} style={{ border: '1px solid #000000', padding: '6px 2px', width: '55px', backgroundColor: '#e2e8f0', fontWeight: '900' }}>
                  BADGE NO
                </th>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '6px 4px', backgroundColor: '#eff6ff', fontWeight: '900', fontSize: '11px', color: '#1e3a8a' }}>
                  1<sup>ST</sup> DHOOL
                </th>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '6px 4px', backgroundColor: '#ecfdf5', fontWeight: '900', fontSize: '11px', color: '#065f46' }}>
                  2<sup>ND</sup> DHOOL
                </th>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '6px 4px', backgroundColor: '#fffbeb', fontWeight: '900', fontSize: '11px', color: '#92400e' }}>
                  BIG BULK
                </th>
              </tr>

              {/* Level 2 Header */}
              <tr>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '4px', backgroundColor: '#dbeafe', fontWeight: 'bold', color: '#1e40af' }}>ROLL NO 01</th>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '4px', backgroundColor: '#d1fae5', fontWeight: 'bold', color: '#065f46' }}>ROLL NO 02</th>
                <th colSpan={4} style={{ border: '1px solid #000000', padding: '4px', backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#92400e' }}>ROLL NO 03</th>
              </tr>

              {/* Level 3 Sub-Headers */}
              <tr style={{ backgroundColor: '#ffffff', fontSize: '9.5px', fontWeight: 'bold' }}>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>START</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>END</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>KG</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>%</th>

                <th style={{ border: '1px solid #000000', padding: '4px' }}>START</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>END</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>KG</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>%</th>

                <th style={{ border: '1px solid #000000', padding: '4px' }}>START</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>END</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>KG</th>
                <th style={{ border: '1px solid #000000', padding: '4px' }}>%</th>
              </tr>
            </thead>

            <tbody>
              {batches.map((b, idx) => (
                <tr key={`pdf-b-${idx}`} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px', fontWeight: 'bold' }}>{String(b.batchNo).padStart(2, '0')}</td>

                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool1?.startTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool1?.endTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px', fontWeight: 'bold', color: '#1d4ed8' }}>{b.dhool1?.wetDhoolKg || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}</td>

                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool2?.startTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool2?.endTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px', fontWeight: 'bold', color: '#059669' }}>{b.dhool2?.wetDhoolKg || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}</td>

                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.bigBulk?.startTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.bigBulk?.endTime || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px', fontWeight: 'bold', color: '#d97706' }}>{b.bigBulk?.wetDhoolKg || '-'}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>{b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'}</td>
                </tr>
              ))}
            </tbody>

            {/* Total Row */}
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: '900', borderTop: '1.5px solid #000000' }}>
                <td style={{ border: '1px solid #000000', padding: '6px 2px' }}>TOTAL</td>
                <td colSpan={2} style={{ border: '1px solid #000000' }}></td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', fontSize: '11px', color: '#1e3a8a' }}>{sumD1Kg.toFixed(2)}</td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', color: '#1e3a8a' }}>{avgD1Pct}%</td>

                <td colSpan={2} style={{ border: '1px solid #000000' }}></td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', fontSize: '11px', color: '#065f46' }}>{sumD2Kg.toFixed(2)}</td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', color: '#065f46' }}>{avgD2Pct}%</td>

                <td colSpan={2} style={{ border: '1px solid #000000' }}></td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', fontSize: '11px', color: '#92400e' }}>{sumBBKg.toFixed(2)}</td>
                <td style={{ border: '1px solid #000000', padding: '6px 2px', color: '#92400e' }}>{avgBBPct}%</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Signatures */}
          <div style={{ marginTop: '28px', paddingTop: '12px', borderTop: '1px solid #94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', fontWeight: 'bold' }}>
            <div>
              <p style={{ color: '#64748b', margin: '0 0 3px 0', textTransform: 'uppercase' }}>{t.genBy}</p>
              <p style={{ margin: 0, color: '#000000', fontSize: '12px' }}>{currentUsername} ({userRole})</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', margin: '0 0 3px 0', letterSpacing: '2px' }}>.................................................................</p>
              <p style={{ color: '#64748b', margin: 0, textTransform: 'uppercase' }}>{t.authSig}</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default RollingRoomSheetSummary;