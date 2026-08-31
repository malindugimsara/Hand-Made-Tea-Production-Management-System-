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
  const t = useMemo(() => ({
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
    actualDuration: lang === 'SI' ? "ගතවූ කාලය" : "Actual Duration",
    expectedDuration: lang === 'SI' ? "අපේක්ෂිත කාලය" : "Expected (30d)",
    delayDifference: lang === 'SI' ? "ප්‍රමාදය" : "Variance / Delay",
    rollingRate: lang === 'SI' ? "සාමාන්‍ය වේගය" : "30-Day Rate",

    // Sheet Headers
    cropDate: lang === 'SI' ? "අස්වැන්න දිනය" : "Crop Date",
    mfDate: lang === 'SI' ? "නිෂ්පාදිත දිනය" : "M/F Date",
    cropKg: lang === 'SI' ? "අස්වැන්න (Kg)" : "Crop (Kg)",
    otherLeafKg: lang === 'SI' ? "වෙනත් දළු (Kg)" : "Other Leaf (Kg)",
    rollingStartTime: lang === 'SI' ? "රෝලිං ආරම්භක වේලාව" : "Rolling Start Time",
    rollingEndTime: lang === 'SI' ? "රෝලිං අවසන් වේලාව" : "Rolling End Time",
    totalRollingHours: lang === 'SI' ? "මුළු රෝලිං පැය ගණන" : "Total Rolling Hours",
    sameOrNext: lang === 'SI' ? "එම දිනය / ඊළඟ දිනය" : "Same Day/ Next Day",
    sameDay: lang === 'SI' ? "එම දිනය" : "Same Day",
    nextDay: lang === 'SI' ? "ඊළඟ දිනය" : "Next Day",
    noOfBatches: lang === 'SI' ? "කාණ්ඩ ගණන" : "No of Batches",

    badgeNo: lang === 'SI' ? "කාණ්ඩ අංකය" : "BADGE NO",
    dhool1: lang === 'SI' ? "1 වන ධූල් (1ST DHOOL)" : "1ST DHOOL",
    roll1: lang === 'SI' ? "රෝල් අංක: 01" : "ROLL NO 01",
    dhool2: lang === 'SI' ? "2 වන ධූල් (2ND DHOOL)" : "2ND DHOOL",
    roll2: lang === 'SI' ? "රෝල් අංක: 02" : "ROLL NO 02",
    bigBulk: lang === 'SI' ? "බිග් බල්ක් (BIG BULK)" : "BIG BULK",
    roll3: lang === 'SI' ? "රෝල් අංක: 03" : "ROLL NO 03",
    totalWetDhoolHeader: lang === 'SI' ? "මුළු තෙත් ධූල් (TOTAL WET DHOOL)" : "TOTAL WET DHOOL",

    startTime: lang === 'SI' ? "ආරම්භය" : "START",
    endTime: lang === 'SI' ? "අවසානය" : "END",
    wetDhool: lang === 'SI' ? "තෙත් ධූල්" : "WET DHOOL",
    kg: lang === 'SI' ? "කි.ග්‍රෑ." : "KG",
    pct: "%",
    total: lang === 'SI' ? "එකතුව" : "TOTAL"
  }), [lang]);

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

  // Multi-tier PDF table headers
  const pdfHeaders = useMemo(() => [
    [
      { content: t.badgeNo, rowSpan: 3, styles: { halign: 'center', valign: 'middle', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.dhool1, colSpan: 4, styles: { halign: 'center', fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.dhool2, colSpan: 4, styles: { halign: 'center', fillColor: [209, 250, 229], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.bigBulk, colSpan: 4, styles: { halign: 'center', fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.totalWetDhoolHeader, colSpan: 2, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
    ],
    [
      { content: t.roll1, colSpan: 4, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.roll2, colSpan: 4, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.roll3, colSpan: 4, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [120, 53, 15], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
    ],
    [
      { content: t.startTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.endTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.kg, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },

      { content: t.startTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.endTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.kg, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },

      { content: t.startTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.endTime, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [71, 85, 105], lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.kg, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },

      { content: t.kg, styles: { halign: 'center', fillColor: [250, 245, 255], textColor: [107, 33, 168], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [250, 245, 255], textColor: [107, 33, 168], fontStyle: 'bold', lineWidth: 0.2, lineColor: [148, 163, 184] } }
    ]
  ], [t]);

  const pdfData = useMemo(() => {
    if (!currentRecord || !currentRecord.batches || currentRecord.batches.length === 0) {
      return [];
    }

    const rows = currentRecord.batches.map(b => {
      const bD1 = parseFloat(b.dhool1?.wetDhoolKg) || 0;
      const bD2 = parseFloat(b.dhool2?.wetDhoolKg) || 0;
      const bBB = parseFloat(b.bigBulk?.wetDhoolKg) || 0;
      const batchWetDhool = bD1 + bD2 + bBB;
      const batchWetDhoolPct = STANDARD_BATCH_KG > 0 ? ((batchWetDhool / STANDARD_BATCH_KG) * 100).toFixed(2) : '0.00';

      return [
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
        b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-',
        batchWetDhool > 0 ? batchWetDhool.toFixed(2) : '-',
        batchWetDhool > 0 ? `${batchWetDhoolPct}%` : '-'
      ];
    });

    // Total Row
    rows.push({
      data: [
        t.total,
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
        `${avgBBPct}%`,
        grandTotalWetDhool.toFixed(2),
        `${grandTotalPct}%`
      ],
      isFooter: true
    });

    return rows;
  }, [currentRecord, sumD1Kg, avgD1Pct, sumD2Kg, avgD2Pct, sumBBKg, avgBBPct, grandTotalWetDhool, grandTotalPct, t]);

  const autoTableOptions = useMemo(() => ({
    startY: 88,
    margin: { top: 25, bottom: 25, left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [100, 116, 139],
      lineWidth: 0.2
    },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber !== 1) return;

      const { doc } = hookData;
      const startX = 14;
      const pageWidth = doc.internal.pageSize.getWidth();

      // 1. Metadata Lines
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      const metaItems = [
        { label: t.cropDate, value: currentRecord?.cropDate || '...........................................' },
        { label: t.cropKg, value: currentRecord?.cropKg ? `${currentRecord.cropKg} kg` : '...........................................' },
        { label: t.mfDate, value: currentRecord?.mfDate || '...........................................' },
        { label: t.otherLeafKg, value: currentRecord?.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '...........................................' }
      ];

      let currentMetaY = 38;
      metaItems.forEach((item) => {
        doc.setFont(undefined, 'bold');
        doc.text(item.label, startX, currentMetaY);
        const labelWidth = doc.getTextWidth(item.label);
        doc.setFont(undefined, 'normal');
        doc.text(`-   ${item.value}`, startX + Math.max(labelWidth + 2, 28), currentMetaY);
        currentMetaY += 4.8;
      });

      // 2. Operations Table
      const tableX = startX;
      const tableY = currentMetaY;
      const col1W = 68;
      const col2W = 68;
      const rowH = 5.5;

      const opRows = [
        [t.rollingStartTime, currentRecord?.rollingStartTime || '-'],
        [t.rollingEndTime, currentRecord?.rollingEndTime || '-'],
        [t.totalRollingHours, currentRecord?.totalRollingHours || '-'],
        [t.sameOrNext, currentRecord?.dayType === 'Next Day' ? t.nextDay : t.sameDay],
        [t.noOfBatches, String(batches.length || 1)]
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

      // 3. Warning Card
      if (analysis.isOverdue) {
        const alertX = 156;
        const alertY = tableY;
        const alertW = pageWidth - 14 - alertX;
        const alertH = opRows.length * rowH;

        doc.setDrawColor(252, 165, 165);
        doc.setFillColor(254, 242, 242);
        doc.setLineWidth(0.2);
        doc.rect(alertX, alertY, alertW, alertH, 'FD');

        doc.setFillColor(239, 68, 68);
        doc.rect(alertX, alertY, alertW, 6.5, 'F');

        doc.setFontSize(7.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("! ATTENTION: ROLLING TOOK LONGER THAN USUAL", alertX + 3.5, alertY + 4.5);

        const gridTop = alertY + 7.5;
        const colW = (alertW - 5) / 2;

        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text("ACTUAL DURATION:", alertX + 3, gridTop + 3.5);
        doc.setFont(undefined, 'normal');
        doc.text(analysis.actualHoursFormatted, alertX + 38, gridTop + 3.5);

        doc.setFont(undefined, 'bold');
        doc.text("EXPECTED (30D AVG):", alertX + 3, gridTop + 8.5);
        doc.setFont(undefined, 'normal');
        doc.text(analysis.expectedHoursFormatted, alertX + 38, gridTop + 8.5);

        doc.setFont(undefined, 'bold');
        doc.text("TOTAL DELAY:", alertX + colW + 4, gridTop + 3.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(185, 28, 28);
        doc.text(`${analysis.diffHoursFormatted} (+${analysis.diffPercentage}%)`, alertX + colW + 28, gridTop + 3.5);

        doc.setFont(undefined, 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text("30-DAY AVG RATE:", alertX + colW + 4, gridTop + 8.5);
        doc.setFont(undefined, 'normal');
        doc.text(`${analysis.ratePer1000Kg}h / 1,000 kg`, alertX + colW + 28, gridTop + 8.5);

        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(185, 28, 28);
        doc.text("* Rolling operation exceeded 30-day baseline benchmark.", alertX + 3, alertY + alertH - 2.5);
      }
    }
  }), [currentRecord, batches.length, analysis, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Header Bar --- */}
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-2xl shadow-md shadow-emerald-900/10 ring-4 ring-emerald-50 dark:ring-emerald-950/40">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {t.title}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Executive View
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end z-10">
            <PDFDownloader
              title={`ATHUKORALA GROUP (PVT) LTD - ${t.title}`}
              subtitle={`${t.filterDay} ${currentRecord?.mfDate || filterDate}`}
              headers={pdfHeaders}
              data={pdfData}
              fileName={`Rolling_Room_Sheet_${lang}_MF_${currentRecord?.mfDate || filterDate || 'Report'}.pdf`}
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
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <Languages size={15} className="text-slate-500 dark:text-slate-400" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>

            {/* Sync Button */}
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : 'text-slate-500 dark:text-slate-400'} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar --- */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{t.filterDay}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Filter production logs according to tea manufacturing date (M/F Date)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none px-3.5 py-2 transition-all"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/70 border border-rose-200/60 dark:border-rose-900/40 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> {t.clear}
              </button>
            )}
          </div>
        </div>

        {/* --- 30-Day Benchmark Status Banner --- */}
        {analysis.hasData && (
          <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 shadow-sm ${
            analysis.isOverdue
              ? 'bg-gradient-to-r from-rose-50 via-red-50/50 to-orange-50/30 dark:from-rose-950/40 dark:via-red-950/30 dark:to-slate-900 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
              : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shadow-sm mt-0.5 ${
                  analysis.isOverdue 
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-100 dark:ring-rose-950/50' 
                    : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/50'
                }`}>
                  {analysis.isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-sm font-black uppercase tracking-wide ${
                      analysis.isOverdue ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-950 dark:text-emerald-300'
                    }`}>
                      {analysis.isOverdue ? t.overtimeAlert : t.normalAlert}
                    </h3>
                    {analysis.isOverdue && (
                      <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full font-black text-[10px] uppercase tracking-wider shadow-xs">
                        Delayed Cycle
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${analysis.isOverdue ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'}`}>
                    {analysis.isOverdue ? t.overtimeDesc : t.normalDesc}
                  </p>
                </div>
              </div>

              {/* Metrics Cluster */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t.actualDuration}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{analysis.actualHoursFormatted}</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t.expectedDuration}</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{analysis.expectedHoursFormatted}</p>
                </div>

                <div className={`px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs ${
                  analysis.isOverdue 
                    ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white' 
                    : 'bg-white dark:bg-slate-800 border border-emerald-300/80 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300'
                }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${analysis.isOverdue ? 'text-rose-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {t.delayDifference}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {analysis.diffHoursFormatted} ({analysis.diffPercentage}%)
                  </p>
                </div>

                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[120px] shadow-2xs hidden md:block">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t.rollingRate}</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{analysis.ratePer1000Kg}h / 1k kg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Main Dashboard View --- */}
        {loading && allRecords.length === 0 ? (
          <div className="text-center py-28 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Loading rolling room sheet records...</p>
          </div>
        ) : !currentRecord ? (
          <div className="text-center py-24 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t.noRecordFound}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium">{t.noRecordDesc}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 md:p-10 overflow-hidden font-sans transition-colors duration-200">
            
            {/* Title Header */}
            <div className="text-center pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-2">
                Athukorala Tea Factory
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
                ROLLING ROOM SHEET
              </h2>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                Dhool Fractionation & Operational Batch Control Report
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.cropDate}</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{currentRecord.cropDate || '-'}</span>
              </div>
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">{t.mfDate}</span>
                <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">{currentRecord.mfDate || '-'}</span>
              </div>
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">{t.cropKg}</span>
                <span className="text-sm font-extrabold text-blue-900 dark:text-blue-200">{currentRecord.cropKg ? `${currentRecord.cropKg} kg` : '-'}</span>
              </div>
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">{t.otherLeafKg}</span>
                <span className="text-sm font-extrabold text-amber-950 dark:text-amber-200">{currentRecord.otherLeafKg ? `${currentRecord.otherLeafKg} kg` : '-'}</span>
              </div>
              <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase">{t.wetDhool} (Total)</span>
                <span className="text-sm font-extrabold text-purple-950 dark:text-purple-200">{grandTotalWetDhool.toFixed(2)} kg</span>
              </div>
            </div>

            {/* Operations Parameters */}
            <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold w-1/2 bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.rollingStartTime}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{currentRecord.rollingStartTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.rollingEndTime}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{currentRecord.rollingEndTime || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.totalRollingHours}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{currentRecord.totalRollingHours || '-'}</span>
                      {analysis.isOverdue && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-xs rounded border border-red-200 dark:border-red-900/50">
                          Overdue (+{analysis.diffPercentage}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.sameOrNext}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{currentRecord.dayType === 'Next Day' ? t.nextDay : t.sameDay}</td>
                  </tr>
                  <tr className="bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.noOfBatches}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{batches.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Main Batch Grid */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[1100px] border-collapse text-center text-xs">
                <thead>
                  {/* Tier 1 Header */}
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase">
                    <th rowSpan={3} className="border-r border-slate-200 dark:border-slate-700 p-2.5 w-20 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {t.badgeNo}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-2.5 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 tracking-wider text-xs font-black">
                      {t.dhool1}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-2.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 tracking-wider text-xs font-black">
                      {t.dhool2}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-2.5 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 tracking-wider text-xs font-black">
                      {t.bigBulk}
                    </th>
                    <th colSpan={2} rowSpan={2} className="p-2.5 bg-purple-100/90 dark:bg-purple-950/80 text-purple-950 dark:text-purple-200 tracking-wider text-xs font-black">
                      {t.totalWetDhoolHeader}
                    </th>
                  </tr>

                  {/* Tier 2 Header */}
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">{t.roll1}</th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">{t.roll2}</th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1.5 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">{t.roll3}</th>
                  </tr>

                  {/* Tier 3 Sub-Headers */}
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20 text-slate-800 dark:text-slate-200">{t.kg}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-16 text-slate-800 dark:text-slate-200">{t.pct}</th>

                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20 text-slate-800 dark:text-slate-200">{t.kg}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-16 text-slate-800 dark:text-slate-200">{t.pct}</th>

                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.startTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20">{t.endTime}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20 text-slate-800 dark:text-slate-200">{t.kg}</th>
                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-16 text-slate-800 dark:text-slate-200">{t.pct}</th>

                    <th className="border-r border-slate-200 dark:border-slate-700 p-1.5 w-20 text-purple-900 dark:text-purple-300 font-black">{t.kg}</th>
                    <th className="p-1.5 w-16 text-purple-900 dark:text-purple-300 font-black">{t.pct}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {batches.map((b, idx) => {
                    const bD1 = parseFloat(b.dhool1?.wetDhoolKg) || 0;
                    const bD2 = parseFloat(b.dhool2?.wetDhoolKg) || 0;
                    const bBB = parseFloat(b.bigBulk?.wetDhoolKg) || 0;
                    const batchWetTotal = bD1 + bD2 + bBB;
                    const batchWetPct = STANDARD_BATCH_KG > 0 ? ((batchWetTotal / STANDARD_BATCH_KG) * 100).toFixed(2) : '0.00';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2.5 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40">
                          {String(b.batchNo).padStart(2, '0')}
                        </td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.dhool1?.startTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.dhool1?.endTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-bold text-slate-900 dark:text-white bg-blue-50/20 dark:bg-blue-950/20">{b.dhool1?.wetDhoolKg || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-semibold text-slate-500 dark:text-slate-400">{b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}</td>

                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.dhool2?.startTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.dhool2?.endTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-bold text-slate-900 dark:text-white bg-emerald-50/20 dark:bg-emerald-950/20">{b.dhool2?.wetDhoolKg || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-semibold text-slate-500 dark:text-slate-400">{b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}</td>

                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.bigBulk?.startTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">{b.bigBulk?.endTime || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-bold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/20">{b.bigBulk?.wetDhoolKg || '-'}</td>
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-semibold text-slate-500 dark:text-slate-400">{b.bigBulk?.percentage ? `${b.bigBulk.percentage}%` : '-'}</td>

                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-black text-purple-900 dark:text-purple-300 bg-purple-50/40 dark:bg-purple-950/20">{batchWetTotal > 0 ? batchWetTotal.toFixed(2) : '-'}</td>
                        <td className="p-2 font-bold text-purple-700 dark:text-purple-400 bg-purple-50/20 dark:bg-purple-950/10">{batchWetTotal > 0 ? `${batchWetPct}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-extrabold text-slate-900 dark:text-slate-100">
                    <td className="border-r border-slate-300 dark:border-slate-700 p-2.5 uppercase text-xs text-slate-600 dark:text-slate-300">{t.total}</td>

                    <td colSpan={2} className="border-r border-slate-200 dark:border-slate-700 p-2"></td>
                    <td className="border-r border-slate-200 dark:border-slate-700 p-2 font-black text-slate-900 dark:text-white text-sm bg-blue-50/40 dark:bg-blue-950/40">{sumD1Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 font-bold">{avgD1Pct}%</td>

                    <td colSpan={2} className="border-r border-slate-200 dark:border-slate-700 p-2"></td>
                    <td className="border-r border-slate-200 dark:border-slate-700 p-2 font-black text-slate-900 dark:text-white text-sm bg-emerald-50/40 dark:bg-emerald-950/40">{sumD2Kg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 font-bold">{avgD2Pct}%</td>

                    <td colSpan={2} className="border-r border-slate-200 dark:border-slate-700 p-2"></td>
                    <td className="border-r border-slate-200 dark:border-slate-700 p-2 font-black text-slate-900 dark:text-white text-sm bg-amber-50/40 dark:bg-amber-950/40">{sumBBKg.toFixed(2)}</td>
                    <td className="border-r border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 font-bold">{avgBBPct}%</td>

                    <td className="border-r border-slate-300 dark:border-slate-700 p-2 font-black text-purple-950 dark:text-purple-200 text-sm bg-purple-100/50 dark:bg-purple-900/30">{grandTotalWetDhool.toFixed(2)}</td>
                    <td className="p-2 text-purple-900 dark:text-purple-300 font-black bg-purple-100/40 dark:bg-purple-900/20">{grandTotalPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Total Wet Dhool Card */}
            <div className="mt-6 p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                Grand Total Wet Dhool Quantity:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-purple-950 dark:text-purple-100">
                  {grandTotalWetDhool.toFixed(2)} kg
                </span>
                <span className="text-xs font-bold text-purple-800 dark:text-purple-200 bg-white dark:bg-purple-900/60 px-3 py-1 rounded-lg border border-purple-200 dark:border-purple-700 shadow-2xs">
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