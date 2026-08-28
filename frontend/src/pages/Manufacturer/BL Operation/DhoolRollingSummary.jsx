import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  Languages,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Clock,
  Scale,
  Filter,
  X,
  Package,
  Sparkles,
  TrendingUp,
  Leaf,
  FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader';

// Constant Standard Divisor
const STANDARD_BATCH_KG = 560;

// Helper to normalize date values
const normalizeDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.split('T')[0];
  try {
    return new Date(dateVal).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Helper to get local date in YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to convert duration string to decimal hours
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
  const [lang, setLang] = useState('EN');

  // Dynamic Translations
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
    total: lang === 'SI' ? "එකතුව" : "TOTAL"
  };

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
        const records = result.data || [];
        setAllRecords(records);

        if (records.length > 0) {
          const matchExists = records.some(
            r => normalizeDate(r.cropDate) === filterDate || normalizeDate(r.mfDate) === filterDate
          );
          if (!matchExists) {
            const latest = normalizeDate(records[0].cropDate) || normalizeDate(records[0].mfDate);
            if (latest) setFilterDate(latest);
          }
        }
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

  const currentRecord = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return null;
    if (!filterDate) return allRecords[0];

    return allRecords.find(r =>
      normalizeDate(r.cropDate) === filterDate ||
      normalizeDate(r.mfDate) === filterDate ||
      normalizeDate(r.createdAt) === filterDate
    ) || null;
  }, [allRecords, filterDate]);

  // 30-Day Rolling Benchmark Calculation
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

  const docRefCode = `RRS/${(currentRecord?.cropDate || filterDate || '').replace(/-/g, '')}`;

  // =========================================================================
  // 💡 MULTI-TIER HEADERS WITH ELEGANT SOFT PASTEL PALETTE (PDF)
  // =========================================================================
  const pdfHeaders = useMemo(() => [
    [
      { content: 'BADGE NO', rowSpan: 3, styles: { halign: 'center', valign: 'middle', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: '1ST DHOOL', colSpan: 4, styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: '2ND DHOOL', colSpan: 4, styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: 'BIG BULK', colSpan: 4, styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ],
    [
      { content: 'ROLL NO 01', colSpan: 4, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold' } },
      { content: 'ROLL NO 02', colSpan: 4, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' } },
      { content: 'ROLL NO 03', colSpan: 4, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [120, 53, 15], fontStyle: 'bold' } }
    ],
    [
      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },

      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold' } },

      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold' } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ]
  ], []);

  const pdfData = useMemo(() => {
    if (!currentRecord || !currentRecord.batches || currentRecord.batches.length === 0) {
      return [];
    }

    const rows = currentRecord.batches.map(b => [
      String(b.batchNo).padStart(2, '0'),
      b.dhool1?.startTime || '-',
      b.dhool1?.endTime || '-',
      b.dhool1?.wetDhoolKg ? Number(b.dhool1.wetDhoolKg).toFixed(2) : '-',
      b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-',
      b.dhool2?.startTime || '-',
      b.dhool2?.endTime || '-',
      b.dhool2?.wetDhoolKg ? Number(b.dhool2.wetDhoolKg).toFixed(2) : '-',
      b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-',
      b.bigBulk?.startTime || '-',
      b.bigBulk?.endTime || '-',
      b.bigBulk?.wetDhoolKg ? Number(b.bigBulk.wetDhoolKg).toFixed(2) : '-',
      b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'
    ]);

    // Total Row
    rows.push({
      data: [
        'TOTAL',
        '',
        '',
        sumD1Kg.toFixed(2),
        `${avgD1Pct}%`,
        '',
        '',
        sumD2Kg.toFixed(2),
        `${avgD2Pct}%`,
        '',
        '',
        sumBBKg.toFixed(2),
        `${avgBBPct}%`
      ],
      isFooter: true
    });

    return rows;
  }, [currentRecord, sumD1Kg, avgD1Pct, sumD2Kg, avgD2Pct, sumBBKg, avgBBPct]);

  // =========================================================================
  // 💡 VECTOR LAYOUT MATCHING THE PHYSICAL LOG SHEET
  // =========================================================================
  const autoTableOptions = useMemo(() => ({
    startY: 96,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    didDrawPage: (hookData) => {
      const { doc } = hookData;
      const startX = 14;

      // 1. Text Lines with Dotted Line Placeholders
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);

      // Left Column
      doc.setFont(undefined, 'bold');
      doc.text(`Crop Date `, startX, 37);
      doc.setFont(undefined, 'normal');
      doc.text(`-   ${currentRecord?.cropDate || '...........................................'}`, startX + 30, 37);

      doc.setFont(undefined, 'bold');
      doc.text(`Crop (Kg) `, startX, 43);
      doc.setFont(undefined, 'normal');
      doc.text(`-   ${currentRecord?.cropKg ? currentRecord.cropKg + ' kg' : '...........................................'}`, startX + 30, 43);

      // Right Column
      const midX = 150;
      doc.setFont(undefined, 'bold');
      doc.text(`M/F Date `, startX, 49);
      doc.setFont(undefined, 'normal');
      doc.text(`-   ${currentRecord?.mfDate || '...........................................'}`, startX + 30, 49);

      doc.setFont(undefined, 'bold');
      doc.text(`Other Leaf (Kg) `, startX, 55);
      doc.setFont(undefined, 'normal');
      doc.text(`-   ${currentRecord?.otherLeafKg ? currentRecord.otherLeafKg + ' kg' : '...........................................'}`, startX + 30, 55);

      // 2. Operations 2-Column Table Matching Template
      const tableX = startX;
      const tableY = 60;
      const col1W = 75;
      const col2W = 75;
      const rowH = 6;

      const opRows = [
        ['Rolling Start Time', currentRecord?.rollingStartTime || ''],
        ['Rolling End Time', currentRecord?.rollingEndTime || ''],
        ['Total Rolling Hours', currentRecord?.totalRollingHours || ''],
        ['Same Day/ Next Day', currentRecord?.dayType || 'Same Day'],
        ['No of Batches', String(batches.length || 1)]
      ];

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      opRows.forEach((r, i) => {
        const currentY = tableY + (i * rowH);

        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, currentY, col1W, rowH, 'FD');

        doc.setFillColor(255, 255, 255);
        doc.rect(tableX + col1W, currentY, col2W, rowH, 'FD');

        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(r[0], tableX + 3, currentY + 4.2);

        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(r[1], tableX + col1W + 3, currentY + 4.2);
      });

      // Overdue Notice
      if (analysis.isOverdue) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(`* Warning: Overdue rolling duration detected (+${analysis.diffPercentage}%)`, tableX + 160, tableY + 10);
      }
    }
  }), [currentRecord, batches.length, analysis]);

  return (
    <div className="min-h-screen bg-slate-900/5 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] p-4 md:p-8 font-sans text-slate-800">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Premium Header Bar --- */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-2xl shadow-md shadow-emerald-900/10 ring-4 ring-emerald-50">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {t.title}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Executive View
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end z-10">
            <PDFDownloader
              title="ATHUKORALA GROUP (PVT) LTD - ROLLING ROOM SHEET"
              subtitle={`Filter Applied: Date - ${currentRecord?.cropDate || filterDate}`}
              headers={pdfHeaders}
              data={pdfData}
              fileName={`Rolling_Room_Sheet_${currentRecord?.cropDate || filterDate || 'Report'}.pdf`}
              orientation="landscape"
              uniqueCode={docRefCode}
              userName={currentUsername}
              userRole={userRole}
              autoTableOptions={autoTableOptions}
              disabled={!currentRecord || pdfData.length === 0}
            />

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95"
            >
              <Languages size={15} className="text-slate-500" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>

            {/* Sync Button */}
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar --- */}
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{t.filterDay}</span>
              <p className="text-[11px] text-slate-500 font-medium">Filter production cycles by crop or manufacturing date</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none px-3.5 py-2 transition-all"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> {t.clear}
              </button>
            )}
          </div>
        </div>

        {/* --- 30-Day Benchmark Status Banner (Executive UI) --- */}
        {analysis.hasData && (
          <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 shadow-sm ${
            analysis.isOverdue
              ? 'bg-gradient-to-r from-rose-50 via-red-50/50 to-orange-50/30 border-rose-200 text-rose-950'
              : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border-emerald-200/80 text-emerald-950'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shadow-sm mt-0.5 ${
                  analysis.isOverdue ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-100' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-100'
                }`}>
                  {analysis.isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-sm font-black uppercase tracking-wide ${
                      analysis.isOverdue ? 'text-rose-900' : 'text-emerald-950'
                    }`}>
                      {analysis.isOverdue ? t.overtimeAlert : t.normalAlert}
                    </h3>
                    {analysis.isOverdue && (
                      <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full font-black text-[10px] uppercase tracking-wider shadow-xs">
                        Delayed Cycle
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${analysis.isOverdue ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {analysis.isOverdue ? t.overtimeDesc : t.normalDesc}
                  </p>
                </div>
              </div>

              {/* Metrics Cluster */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.actualDuration}</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{analysis.actualHoursFormatted}</p>
                </div>

                <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.expectedDuration}</p>
                  <p className="text-sm font-black text-slate-700 mt-0.5">{analysis.expectedHoursFormatted}</p>
                </div>

                <div className={`px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs ${
                  analysis.isOverdue ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white' : 'bg-white border border-emerald-300/80 text-emerald-900'
                }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${analysis.isOverdue ? 'text-rose-100' : 'text-emerald-600'}`}>
                    {t.delayDifference}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {analysis.diffHoursFormatted} ({analysis.diffPercentage}%)
                  </p>
                </div>

                <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[120px] shadow-2xs hidden md:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.rollingRate}</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">{analysis.ratePer1000Kg}h / 1k kg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Main Dashboard Content Card --- */}
        {loading && allRecords.length === 0 ? (
          <div className="text-center py-28 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Loading rolling room sheet...</p>
          </div>
        ) : !currentRecord ? (
          <div className="text-center py-24 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">{t.noRecordFound}</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto font-medium">{t.noRecordDesc}</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-10 overflow-hidden font-sans">
            
            {/* Title Header */}
            <div className="text-center pb-6 mb-8 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-2">
                Athukorala Tea Factory
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 uppercase">
                ROLLING ROOM SHEET
              </h2>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Dhool Fractionation & Operational Batch Control Report
              </p>
            </div>

            {/* 4 Premium Colored Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Crop Date */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{t.cropDate}</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{currentRecord.cropDate || '-'}</p>
                </div>
                <div className="p-2.5 bg-slate-200/70 text-slate-700 rounded-xl">
                  <Calendar size={18} />
                </div>
              </div>

              {/* M/F Date */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-200/70 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">{t.mfDate}</span>
                  <p className="text-sm font-black text-emerald-950 mt-0.5">{currentRecord.mfDate || '-'}</p>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Leaf size={18} />
                </div>
              </div>

              {/* Crop Kg */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-200/70 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">{t.cropKg}</span>
                  <p className="text-sm font-black text-blue-950 mt-0.5">
                    {currentRecord.cropKg ? `${Number(currentRecord.cropKg).toLocaleString()} kg` : '-'}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                  <Scale size={18} />
                </div>
              </div>

              {/* Other Leaf Kg */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-200/70 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">{t.otherLeafKg}</span>
                  <p className="text-sm font-black text-amber-950 mt-0.5">
                    {currentRecord.otherLeafKg ? `${Number(currentRecord.otherLeafKg).toLocaleString()} kg` : '-'}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                  <Layers size={18} />
                </div>
              </div>
            </div>

            {/* Operations Overview Card */}
            <div className="mb-8 rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-slate-50/40">
              <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Operations Summary</span>
                <span className="text-[10px] font-bold text-slate-500">Fixed Cycle Registry</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-3.5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.rollingStartTime}</span>
                  <span className="text-xs font-black text-slate-800 mt-1 block">{currentRecord.rollingStartTime || '-'}</span>
                </div>
                <div className="p-3.5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.rollingEndTime}</span>
                  <span className="text-xs font-black text-slate-800 mt-1 block">{currentRecord.rollingEndTime || '-'}</span>
                </div>
                <div className="p-3.5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalRollingHours}</span>
                  <span className="text-xs font-black text-emerald-700 mt-1 inline-flex items-center gap-1.5">
                    {currentRecord.totalRollingHours || '-'}
                    {analysis.isOverdue && (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-extrabold rounded">Delayed</span>
                    )}
                  </span>
                </div>
                <div className="p-3.5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.sameOrNext}</span>
                  <span className="text-xs font-black text-slate-800 mt-1 block">{currentRecord.dayType || 'Same Day'}</span>
                </div>
                <div className="p-3.5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.noOfBatches}</span>
                  <span className="text-xs font-black text-indigo-700 mt-1 block">{batches.length}</span>
                </div>
              </div>
            </div>

            {/* --- Main 3-Tier Dhool Table --- */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 rounded-2xl border border-slate-300 shadow-2xs">
              <table className="w-full min-w-[950px] border-collapse text-center text-xs">
                <thead>
                  {/* Tier 1 Header */}
                  <tr className="border-b border-slate-300 font-black">
                    <th rowSpan={3} className="border-r border-slate-300 p-2.5 w-16 bg-slate-200 text-slate-800 uppercase tracking-wider">
                      {t.badgeNo}
                    </th>
                    <th colSpan={4} className="border-r border-slate-300 p-2.5 bg-blue-100/90 text-blue-950 font-black text-xs tracking-wider uppercase">
                      {t.dhool1}
                    </th>
                    <th colSpan={4} className="border-r border-slate-300 p-2.5 bg-emerald-100/90 text-emerald-950 font-black text-xs tracking-wider uppercase">
                      {t.dhool2}
                    </th>
                    <th colSpan={4} className="p-2.5 bg-amber-100/90 text-amber-950 font-black text-xs tracking-wider uppercase">
                      {t.bigBulk}
                    </th>
                  </tr>

                  {/* Tier 2 Header */}
                  <tr className="border-b border-slate-300 text-[11px] font-extrabold">
                    <th colSpan={4} className="border-r border-slate-300 p-1.5 bg-blue-50 text-blue-800">{t.roll1}</th>
                    <th colSpan={4} className="border-r border-slate-300 p-1.5 bg-emerald-50 text-emerald-800">{t.roll2}</th>
                    <th colSpan={4} className="p-1.5 bg-amber-50 text-amber-800">{t.roll3}</th>
                  </tr>

                  {/* Tier 3 Sub-Headers */}
                  <tr className="border-b border-slate-300 bg-white text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    {/* 1st Dhool */}
                    <th className="border-r border-slate-300 p-2 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-300 p-2 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-300 p-2 w-16 text-blue-900">{t.kg}</th>
                    <th className="border-r border-slate-300 p-2 w-14 text-blue-900">{t.pct}</th>

                    {/* 2nd Dhool */}
                    <th className="border-r border-slate-300 p-2 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-300 p-2 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-300 p-2 w-16 text-emerald-900">{t.kg}</th>
                    <th className="border-r border-slate-300 p-2 w-14 text-emerald-900">{t.pct}</th>

                    {/* Big Bulk */}
                    <th className="border-r border-slate-300 p-2 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-300 p-2 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-300 p-2 w-16 text-amber-900">{t.kg}</th>
                    <th className="p-2 w-14 text-amber-900">{t.pct}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {batches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="border-r border-slate-300 p-2.5 font-black text-slate-800 bg-slate-100/60">
                        {String(b.batchNo).padStart(2, '0')}
                      </td>

                      {/* 1st Dhool */}
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.dhool1?.startTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.dhool1?.endTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 font-bold text-blue-700 bg-blue-50/20">{b.dhool1?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-slate-300 p-2 font-semibold text-slate-500">{b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}</td>

                      {/* 2nd Dhool */}
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.dhool2?.startTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.dhool2?.endTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 font-bold text-emerald-700 bg-emerald-50/20">{b.dhool2?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-slate-300 p-2 font-semibold text-slate-500">{b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}</td>

                      {/* Big Bulk */}
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.bigBulk?.startTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 text-slate-600 font-medium">{b.bigBulk?.endTime || '-'}</td>
                      <td className="border-r border-slate-300 p-2 font-bold text-amber-700 bg-amber-50/20">{b.bigBulk?.wetDhoolKg || '-'}</td>
                      <td className="p-2 font-semibold text-slate-500">{b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-extrabold text-slate-900">
                    <td className="border-r border-slate-300 p-3 uppercase text-xs font-black text-slate-700">{t.total}</td>

                    {/* 1st Dhool Totals */}
                    <td colSpan={2} className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2 font-black text-blue-900 text-sm bg-blue-50/60">{sumD1Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 p-2 text-blue-800 font-bold">{avgD1Pct}%</td>

                    {/* 2nd Dhool Totals */}
                    <td colSpan={2} className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2 font-black text-emerald-900 text-sm bg-emerald-50/60">{sumD2Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 p-2 text-emerald-800 font-bold">{avgD2Pct}%</td>

                    {/* Big Bulk Totals */}
                    <td colSpan={2} className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2 font-black text-amber-900 text-sm bg-amber-50/60">{sumBBKg.toFixed(2)}</td>
                    <td className="p-2 text-amber-800 font-bold">{avgBBPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Wet Dhool Output Banner */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    Grand Total Wet Dhool Quantity
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Cumulative batch yield</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-emerald-900 tracking-tight">
                  {grandTotalWetDhool.toFixed(2)} kg
                </span>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300/80 shadow-2xs">
                  {grandTotalPct}% Overall Capacity
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default RollingRoomSheetSummary;