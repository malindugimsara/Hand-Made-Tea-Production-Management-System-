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
  Leaf
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
    filterDay: lang === 'SI' ? "නිෂ්පාදිත දිනය අනුව තෝරන්න (M/F Date):" : "Filter by M/F Date:",
    clear: lang === 'SI' ? "මකන්න" : "Clear",
    noRecordFound: lang === 'SI' ? "තෝරාගත් නිෂ්පාදිත දිනය සඳහා වාර්තා හමු නොවීය" : "No Rolling Sheet Found for Selected M/F Date",
    noRecordDesc: lang === 'SI' ? "මෙම නිෂ්පාදිත දිනය සඳහා තවමත් රෝලිං කාමර සටහනක් ඇතුලත් කර නොමැත." : "There is no rolling room sheet recorded for the selected manufacturing date.",

    // Anomaly Banner
    overtimeAlert: lang === 'SI' ? "අවධානයයි: රෝලිං කාලය සාමාන්‍ය කාලයට වඩා වැඩිය!" : "ATTENTION: ROLLING TOOK LONGER THAN USUAL!",
    overtimeDesc: lang === 'SI' ? "මෙම දිනයේ රෝලිං ක්‍රියාවලිය සඳහා පසුගිය දින 30 සාමාන්‍යයට වඩා වැඩි කාලයක් ගතවී ඇත." : "Rolling operations on this date took significantly more time than the 30-day baseline average.",
    normalAlert: lang === 'SI' ? "රෝලිං කාලය සාමාන්‍ය මට්ටමේ පවතී" : "NORMAL ROLLING OPERATION DURATION",
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

        // Auto-select latest available M/F date if current filterDate has no match
        if (records.length > 0) {
          const matchExists = records.some(
            r => normalizeDate(r.mfDate) === filterDate
          );
          if (!matchExists) {
            const latestMfDate = normalizeDate(records[0].mfDate);
            if (latestMfDate) setFilterDate(latestMfDate);
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

  // Filter the specific record by M/F Date
  const currentRecord = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return null;
    if (!filterDate) return allRecords[0];

    return allRecords.find(r =>
      normalizeDate(r.mfDate) === filterDate
    ) || null;
  }, [allRecords, filterDate]);

  // 30-Day Rolling Benchmark Calculation
  const analysis = useMemo(() => {
    if (!currentRecord) {
      return { hasData: false, isOverdue: false };
    }

    const currentDateObj = new Date(currentRecord.mfDate || currentRecord.cropDate || currentRecord.createdAt);
    const thirtyDaysAgo = new Date(currentDateObj);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const past30DayRecords = allRecords.filter(r => {
      const rDate = new Date(r.mfDate || r.cropDate || r.createdAt);
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

  const docRefCode = `RRS/${(currentRecord?.mfDate || filterDate || '').replace(/-/g, '')}`;

  // =========================================================================
  // 💡 MULTI-TIER HEADERS WITH ELEGANT SOFT PASTEL PALETTE (PDF)
  // =========================================================================
  const pdfHeaders = useMemo(() => [
    [
      { content: 'BADGE NO', rowSpan: 3, styles: { halign: 'center', valign: 'middle', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: '1ST DHOOL', colSpan: 4, styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: '2ND DHOOL', colSpan: 4, styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'BIG BULK', colSpan: 4, styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
    ],
    [
      { content: 'ROLL NO 01', colSpan: 4, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'ROLL NO 02', colSpan: 4, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'ROLL NO 03', colSpan: 4, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [120, 53, 15], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
    ],
    [
      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },

      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },

      { content: 'START', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'END', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: 'KG', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: '%', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
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
  // 💡 AUTO-TABLE OPTIONS: 4 SEPARATE STACKED LINES + SUBTLE WARNING ABOVE TABLE
  // =========================================================================
  const autoTableOptions = useMemo(() => {
    // Dynamic starting point based on presence of subtle warning banner
    const startYCalculated = analysis.isOverdue ? 97 : 89;

    return {
      startY: startYCalculated,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: 'middle',
        lineColor: [100, 116, 139],
        lineWidth: 0.2
      },
      didDrawPage: (hookData) => {
        const { doc } = hookData;
        const startX = 14;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - 28;

        // ==============================================================
        // 1. METADATA: 4 SEPARATE VERTICAL STACKED LINES
        // ==============================================================
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        const metaItems = [
          { label: 'Crop Date', value: currentRecord?.cropDate || '...........................................' },
          { label: 'Crop (Kg)', value: currentRecord?.cropKg ? `${currentRecord.cropKg} kg` : '...........................................' },
          { label: 'M/F Date', value: currentRecord?.mfDate || '...........................................' },
          { label: 'Other Leaf (Kg)', value: currentRecord?.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '...........................................' }
        ];

        let currentMetaY = 35;
        metaItems.forEach((item) => {
          doc.setFont(undefined, 'bold');
          doc.text(item.label, startX, currentMetaY);
          doc.setFont(undefined, 'normal');
          doc.text(`-   ${item.value}`, startX + 28, currentMetaY);
          currentMetaY += 4.8;
        });

        // ==============================================================
        // 2. OPERATIONS 2-COLUMN TABLE
        // ==============================================================
        const tableX = startX;
        const tableY = currentMetaY + 2; // Starts at Y = 56.2
        const col1W = 68;
        const col2W = 68;
        const rowH = 5.5; // Finishes at Y = 56.2 + 27.5 = 83.7

        const opRows = [
          ['Rolling Start Time', currentRecord?.rollingStartTime || '-'],
          ['Rolling End Time', currentRecord?.rollingEndTime || '-'],
          ['Total Rolling Hours', currentRecord?.totalRollingHours || '-'],
          ['Same Day/ Next Day', currentRecord?.dayType || 'Same Day'],
          ['No of Batches', String(batches.length || 1)]
        ];

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);

        opRows.forEach((r, i) => {
          const currentY = tableY + (i * rowH);

          doc.setFillColor(248, 250, 252);
          doc.rect(tableX, currentY, col1W, rowH, 'FD');

          doc.setFillColor(255, 255, 255);
          doc.rect(tableX + col1W, currentY, col2W, rowH, 'FD');

          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text(r[0], tableX + 3, currentY + 3.8);

          doc.setFont(undefined, 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(String(r[1] || '-'), tableX + col1W + 3, currentY + 3.8);
        });

        // ==============================================================
        // 3. SUBTLE, LESS VISIBLE WARNING BANNER (JUST ABOVE MAIN TABLE)
        // ==============================================================
        if (analysis.isOverdue) {
          const alertY = tableY + (opRows.length * rowH) + 3; // ~86.7
          const alertH = 6;

          doc.setDrawColor(254, 202, 202);
          doc.setFillColor(254, 242, 242);
          doc.setLineWidth(0.15);
          doc.rect(startX, alertY, contentWidth, alertH, 'FD');

          doc.setFontSize(7.5);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(185, 28, 28);
          doc.text("! ATTENTION:", startX + 3, alertY + 4.1);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(153, 27, 27);
          doc.text(
            `Rolling duration took longer than usual (+${analysis.diffPercentage}% / ${analysis.diffHoursFormatted}). Actual: ${analysis.actualHoursFormatted} | Expected (30d): ${analysis.expectedHoursFormatted}`,
            startX + 24,
            alertY + 4.1
          );
        }
      }
    };
  }, [currentRecord, batches.length, analysis]);

  return (
    <div className="min-h-screen bg-slate-900/5 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] p-4 md:p-8 font-sans text-slate-800">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Header Bar --- */}
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
              subtitle={`Filter Applied: M/F Date - ${currentRecord?.mfDate || filterDate}`}
              headers={pdfHeaders}
              data={pdfData}
              fileName={`Rolling_Room_Sheet_MF_${currentRecord?.mfDate || filterDate || 'Report'}.pdf`}
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
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <Languages size={15} className="text-slate-500" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>

            {/* Sync Button */}
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar (Filtered by M/F Date) --- */}
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{t.filterDay}</span>
              <p className="text-[11px] text-slate-500 font-medium">Filter production logs according to tea manufacturing date (M/F Date)</p>
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
          <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 shadow-sm ${analysis.isOverdue
              ? 'bg-gradient-to-r from-rose-50 via-red-50/50 to-orange-50/30 border-rose-200 text-rose-950'
              : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border-emerald-200/80 text-emerald-950'
            }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shadow-sm mt-0.5 ${analysis.isOverdue ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-100' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-100'
                  }`}>
                  {analysis.isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-sm font-black uppercase tracking-wide ${analysis.isOverdue ? 'text-rose-900' : 'text-emerald-950'
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

                <div className={`px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs ${analysis.isOverdue ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white' : 'bg-white border border-emerald-300/80 text-emerald-900'
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

        {/* --- Main Dashboard View --- */}
        {loading && allRecords.length === 0 ? (
          <div className="text-center py-28 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Loading rolling room sheet records...</p>
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

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">{t.cropDate}</span>
                <span className="text-sm font-extrabold text-slate-900">{currentRecord.cropDate || '-'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">{t.mfDate}</span>
                <span className="text-sm font-extrabold text-emerald-950">{currentRecord.mfDate || '-'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700 uppercase">{t.cropKg}</span>
                <span className="text-sm font-extrabold text-blue-900">{currentRecord.cropKg ? `${currentRecord.cropKg} kg` : '-'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">{t.otherLeafKg}</span>
                <span className="text-sm font-extrabold text-slate-900">{currentRecord.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '-'}</span>
              </div>
            </div>

            {/* Operations Parameters */}
            <div className="mb-8 rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-slate-200 bg-white">
                    <td className="p-3 font-bold w-1/2 bg-slate-50/80 text-slate-700 border-r border-slate-200">{t.rollingStartTime}</td>
                    <td className="p-3 font-semibold text-slate-900">{currentRecord.rollingStartTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    <td className="p-3 font-bold bg-slate-50/80 text-slate-700 border-r border-slate-200">{t.rollingEndTime}</td>
                    <td className="p-3 font-semibold text-slate-900">{currentRecord.rollingEndTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    <td className="p-3 font-bold bg-slate-50/80 text-slate-700 border-r border-slate-200">{t.totalRollingHours}</td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900">{currentRecord.totalRollingHours || '-'}</span>
                      {analysis.isOverdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-xs rounded border border-red-200">
                          Overdue (+{analysis.diffPercentage}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    <td className="p-3 font-bold bg-slate-50/80 text-slate-700 border-r border-slate-200">{t.sameOrNext}</td>
                    <td className="p-3 font-semibold text-slate-900">{currentRecord.dayType || 'Same Day'}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-bold bg-slate-50/80 text-slate-700 border-r border-slate-200">{t.noOfBatches}</td>
                    <td className="p-3 font-bold text-slate-900">{batches.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Main Batch Grid */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 rounded-xl border border-slate-200">
              <table className="w-full min-w-[950px] border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-800 font-extrabold uppercase">
                    <th rowSpan={3} className="border-r border-slate-200 p-2.5 w-20 bg-slate-200/70 text-slate-700">
                      {t.badgeNo}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 p-2.5 tracking-wider text-xs">
                      {t.dhool1}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 p-2.5 tracking-wider text-xs">
                      {t.dhool2}
                    </th>
                    <th colSpan={4} className="p-2.5 tracking-wider text-xs">
                      {t.bigBulk}
                    </th>
                  </tr>

                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold text-[11px]">
                    <th colSpan={4} className="border-r border-slate-200 p-1.5">{t.roll1}</th>
                    <th colSpan={4} className="border-r border-slate-200 p-1.5">{t.roll2}</th>
                    <th colSpan={4} className="p-1.5">{t.roll3}</th>
                  </tr>

                  <tr className="border-b border-slate-200 bg-white text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="border-r border-slate-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20 text-slate-800">{t.kg}</th>
                    <th className="border-r border-slate-200 p-1.5 w-16 text-slate-800">{t.pct}</th>

                    <th className="border-r border-slate-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20 text-slate-800">{t.kg}</th>
                    <th className="border-r border-slate-200 p-1.5 w-16 text-slate-800">{t.pct}</th>

                    <th className="border-r border-slate-200 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 p-1.5 w-20 text-slate-800">{t.kg}</th>
                    <th className="p-1.5 w-16 text-slate-800">{t.pct}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {batches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="border-r border-slate-200 p-2.5 font-bold text-slate-800 bg-slate-50/50">
                        {String(b.batchNo).padStart(2, '0')}
                      </td>
                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.dhool1?.startTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.dhool1?.endTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 font-bold text-slate-900">{b.dhool1?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-slate-200 p-2 font-semibold text-slate-500">{b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}</td>

                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.dhool2?.startTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.dhool2?.endTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 font-bold text-slate-900">{b.dhool2?.wetDhoolKg || '-'}</td>
                      <td className="border-r border-slate-200 p-2 font-semibold text-slate-500">{b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}</td>

                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.bigBulk?.startTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 text-slate-600">{b.bigBulk?.endTime || '-'}</td>
                      <td className="border-r border-slate-200 p-2 font-bold text-slate-900">{b.bigBulk?.wetDhoolKg || '-'}</td>
                      <td className="p-2 font-semibold text-slate-500">{b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-extrabold text-slate-900">
                    <td className="border-r border-slate-300 p-2.5 uppercase text-xs text-slate-600">{t.total}</td>

                    <td colSpan={2} className="border-r border-slate-200 p-2"></td>
                    <td className="border-r border-slate-200 p-2 font-black text-slate-900 text-sm">{sumD1Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 p-2 text-slate-700 font-bold">{avgD1Pct}%</td>

                    <td colSpan={2} className="border-r border-slate-200 p-2"></td>
                    <td className="border-r border-slate-200 p-2 font-black text-slate-900 text-sm">{sumD2Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 p-2 text-slate-700 font-bold">{avgD2Pct}%</td>

                    <td colSpan={2} className="border-r border-slate-200 p-2"></td>
                    <td className="border-r border-slate-200 p-2 font-black text-slate-900 text-sm">{sumBBKg.toFixed(2)}</td>
                    <td className="p-2 text-slate-700 font-bold">{avgBBPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Wet Dhool Card */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Grand Total Wet Dhool Quantity:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-slate-900">
                  {grandTotalWetDhool.toFixed(2)} kg
                </span>
                <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
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