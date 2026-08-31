import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  Languages,
  Flame,
  Scale,
  Fuel,
  Calculator,
  Filter,
  X,
  Package,
  Sparkles,
  UserCheck
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader';

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

const FiringSectionSummary = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const userRole = localStorage.getItem("userRole") || "Admin";
  const currentUsername = localStorage.getItem("username") || "admin";

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [lang, setLang] = useState('EN');

  // Dynamic Translations Dictionary
  const t = useMemo(() => ({
    title: lang === 'SI' ? "ඩ්‍රයර් කාමර වාර්තා පත්‍රිකාව" : "DRIER ROOM RECORD SHEET",
    subtitle: lang === 'SI' ? "දෛනික ඩ්‍රයර් 01, 02 සහ සම්පූර්ණ ධූල්, දර පරිභෝජන සහ පිරිවැය සාරාංශ වාර්තාව." : "Consolidated report of Drier 01, Drier 02, and Total Dhools, Firewood usage, and production costs.",
    sync: lang === 'SI' ? "යාවත්කාලීන කරන්න" : "Sync",
    refreshing: lang === 'SI' ? "යාවත්කාලීන වෙමින්..." : "Refreshing...",
    downloadPdf: lang === 'SI' ? "PDF බාගත කරන්න" : "Download PDF",
    filterDay: lang === 'SI' ? "නිෂ්පාදිත දිනය අනුව තෝරන්න (M/F Date):" : "Filter by M/F Date:",
    clear: lang === 'SI' ? "මකන්න" : "Clear",
    noRecordFound: lang === 'SI' ? "තෝරාගත් දිනය සඳහා වාර්තා හමු නොවීය" : "No Drier Records Found",
    noRecordDesc: lang === 'SI' ? "මෙම නිෂ්පාදිත දිනය සඳහා තවමත් ඩ්‍රයර් කාමර සටහනක් ඇතුලත් කර නොමැත." : "There is no drier room sheet recorded for the selected manufacturing date.",

    // Metadata
    mfDate: lang === 'SI' ? "නිෂ්පාදිත දිනය (M/F Date)" : "M/F DATE",
    cropDate: lang === 'SI' ? "අස්වැන්න දිනය (Crop Date)" : "CROP DATE",
    cropKg: lang === 'SI' ? "අස්වැන්න (Crop Kg)" : "CROP (Kg)",

    // Tables
    drier1: "DHOOLS (kg) - 01",
    drier2: "DHOOLS (kg) - 02",
    drierTotal: "DHOOLS (kg) TOTAL",
    item: lang === 'SI' ? "අයිතමය" : "Item",
    kg: lang === 'SI' ? "කි.ග්‍රෑ." : "Kg",
    pct: "%",

    // Dhool Grades
    first: "1ST",
    second: "2ND",
    third: "3RD",
    dir: "DIR / R",
    bigBulk: "BIG BULK",
    totalFiredTea: "TOTAL FIRED TEA",

    // Firewood Usage
    fwUsage1: "FIREWOOD USAGE (kg) - 01",
    fwUsage2: "FIREWOOD USAGE (kg) - 02",
    fwUsageTotal: "FIREWOOD USAGE (kg) TOTAL",
    f: "F",
    rf: "R/F",
    w: "W",
    total: "TOTAL",

    // Firewood Output
    fwOut1: "FIREWOOD OUTPUT - 01",
    fwOut2: "FIREWOOD OUTPUT - 02",
    fwOutTotal: "FIREWOOD OUTPUT TOTAL",
    withoutWithering: "WITHOUT WITHERING",
    withering: "WITH WITHERING",
    totalOutput: "TOTAL OUTPUT",

    // Drier Time & Output
    drier01Title: "DRIER - 01",
    drier02Title: "DRIER - 02",
    startTime: "START TIME",
    endTime: "END TIME",
    totalHours: "TOTAL HOURS",
    drierOutputPerHour: "DRIER OUTPUT / H",

    // Cost of Firewood
    costDrier01: "DRIER - 01",
    costDrier02: "DRIER - 02",
    costTotal: "TOTAL",
    totalFwKg: "TOTAL F/W KG",
    unitPrice: "UNIT PRICE (Rs.)",
    madeTeaKg: "MADE TEA KG",
    costOfFw: "COST OF F/W (Rs.)",

    // Signatures & Benchmarks
    officerName: "OFFICER NAME 01",
    checkBy: "CHECK BY",
    benchmarkTitle: lang === 'SI' ? "කර්මාන්තශාලා සම්මත මාර්ගෝපදේශ" : "Standard Factory Benchmark Specifications"
  }), [lang]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/firing-section`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (response.ok && result.success) {
        const records = Array.isArray(result.data) ? result.data : [];
        setAllRecords(records);

        if (records.length > 0) {
          const matchExists = records.some(
            r => normalizeDate(r?.dateOfManufacture) === filterDate
          );
          if (!matchExists) {
            const latestMfDate = normalizeDate(records[0]?.dateOfManufacture);
            if (latestMfDate) setFilterDate(latestMfDate);
          }
        }
      } else {
        toast.error("Failed to load drier records.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Connection error while fetching drier records.");
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
      normalizeDate(r?.dateOfManufacture) === filterDate
    ) || null;
  }, [allRecords, filterDate]);

  // Derived calculations across all sections
  const calcData = useMemo(() => {
    if (!currentRecord) return null;

    // 1. Dhools Data
    const d1 = currentRecord.dhools?.drier1 || {};
    const d2 = currentRecord.dhools?.drier2 || {};

    const d1Items = {
      first: Number(d1.first) || 0,
      second: Number(d1.second) || 0,
      third: Number(d1.third) || 0,
      dir: Number(d1.dir) || 0,
      bigBulk: Number(d1.bigBulk) || 0
    };
    const d1Total = d1Items.first + d1Items.second + d1Items.third + d1Items.dir + d1Items.bigBulk;

    const d2Items = {
      first: Number(d2.first) || 0,
      second: Number(d2.second) || 0,
      third: Number(d2.third) || 0,
      dir: Number(d2.dir) || 0,
      bigBulk: Number(d2.bigBulk) || 0
    };
    const d2Total = d2Items.first + d2Items.second + d2Items.third + d2Items.dir + d2Items.bigBulk;

    const totalItems = {
      first: d1Items.first + d2Items.first,
      second: d1Items.second + d2Items.second,
      third: d1Items.third + d2Items.third,
      dir: d1Items.dir + d2Items.dir,
      bigBulk: d1Items.bigBulk + d2Items.bigBulk
    };
    const grandTotalFired = d1Total + d2Total;

    // 2. Firewood Usage
    const dr1 = currentRecord.drier1 || {};
    const dr2 = currentRecord.drier2 || {};

    const u1 = {
      f: Number(dr1.ffrw1) || 0,
      rf: Number(dr1.ffrw2) || 0,
      w: Number(dr1.ffrw3) || 0,
      extra: Number(dr1.ffrw4) || 0
    };
    u1.total = u1.f + u1.rf + u1.w + u1.extra;

    const u2 = {
      f: Number(dr2.ffrw1) || 0,
      rf: Number(dr2.ffrw2) || 0,
      w: Number(dr2.ffrw3) || 0,
      extra: Number(dr2.ffrw4) || 0
    };
    u2.total = u2.f + u2.rf + u2.w + u2.extra;

    const uTotal = {
      f: u1.f + u2.f,
      rf: u1.rf + u2.rf,
      w: u1.w + u2.w,
      total: u1.total + u2.total
    };

    // 3. Firewood Output
    const fo1 = currentRecord.firewoodOutput?.drier1 || {};
    const fo2 = currentRecord.firewoodOutput?.drier2 || {};

    const out1 = {
      withoutWithering: Number(fo1.withoutWithering) || 0,
      withering: Number(fo1.withWithering) || 0,
      rf: Number(fo1.rf) || 0
    };
    out1.total = out1.withoutWithering + out1.withering + out1.rf;

    const out2 = {
      withoutWithering: Number(fo2.withoutWithering) || 0,
      withering: Number(fo2.withWithering) || 0,
      rf: Number(fo2.rf) || 0
    };
    out2.total = out2.withoutWithering + out2.withering + out2.rf;

    const outTotal = {
      withoutWithering: out1.withoutWithering + out2.withoutWithering,
      withering: out1.withering + out2.withering,
      rf: out1.rf + out2.rf,
      total: out1.total + out2.total
    };

    // 4. Drier Hours and Output / Hour
    const h1 = Number(dr1.totalHours) || Number(dr1.periodDecimal) || 0;
    const h2 = Number(dr2.totalHours) || Number(dr2.periodDecimal) || 0;
    const hTotal = h1 + h2;

    const outPerH1 = h1 > 0 ? (d1Total / h1).toFixed(2) : '0.00';
    const outPerH2 = h2 > 0 ? (d2Total / h2).toFixed(2) : '0.00';

    // 5. Cost of Firewood
    const fc1 = currentRecord.firewoodCost?.drier1 || {};
    const fc2 = currentRecord.firewoodCost?.drier2 || {};

    const c1 = {
      fwKg: Number(fc1.totalFwKg) || 0,
      unitPrice: Number(fc1.unitPrice) || 0,
      madeTeaKg: Number(fc1.madeTeaKg) || 0
    };
    c1.cost = c1.fwKg * c1.unitPrice;

    const c2 = {
      fwKg: Number(fc2.totalFwKg) || 0,
      unitPrice: Number(fc2.unitPrice) || 0,
      madeTeaKg: Number(fc2.madeTeaKg) || 0
    };
    c2.cost = c2.fwKg * c2.unitPrice;

    const cTotal = {
      fwKg: c1.fwKg + c2.fwKg,
      unitPrice: c1.fwKg + c2.fwKg > 0 ? ((c1.cost + c2.cost) / (c1.fwKg + c2.fwKg)) : 0,
      madeTeaKg: c1.madeTeaKg + c2.madeTeaKg,
      cost: c1.cost + c2.cost
    };

    return {
      d1Items, d1Total,
      d2Items, d2Total,
      totalItems, grandTotalFired,
      u1, u2, uTotal,
      out1, out2, outTotal,
      h1, h2, hTotal, outPerH1, outPerH2,
      c1, c2, cTotal
    };
  }, [currentRecord]);

  const docRefCode = `DRS/${(currentRecord?.dateOfManufacture || filterDate || '').replace(/-/g, '')}`;

  // Multi-tier headers for Dhools
  const pdfHeaders = useMemo(() => [
    [
      { content: 'DHOOLS (kg) - 01', colSpan: 3, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: 'DHOOLS (kg) - 02', colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: 'DHOOLS (kg) TOTAL', colSpan: 3, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } }
    ],
    [
      { content: 'Item', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: 'Kg', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: '%', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },

      { content: 'Item', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: 'Kg', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: '%', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },

      { content: 'Item', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: 'Kg', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } },
      { content: '%', styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [182, 176, 159] } }
    ]
  ], []);

  // Complete unified data matrix
  const pdfData = useMemo(() => {
    if (!currentRecord || !calcData) return [];

    const rows = [];
    const d1 = currentRecord.drier1 || {};
    const d2 = currentRecord.drier2 || {};

    // Section 1: Dhools Rows
    const grades = [
      { l1: "1ST", l2: "1ST", l3: "1ST", k: 'first' },
      { l1: "2ND", l2: "2ND", l3: "2ND", k: 'second' },
      { l1: "3RD", l2: "3RD", l3: "3RD", k: 'third' },
      { l1: "DIR / R", l2: "DIR / R", l3: "DIR / R", k: 'dir' },
      { l1: "G BULK", l2: "BIG BULK", l3: "BIG BULK", k: 'bigBulk' }
    ];

    grades.forEach(g => {
      const d1Kg = calcData.d1Items[g.k];
      const d1Pct = calcData.d1Total > 0 ? ((d1Kg / calcData.d1Total) * 100).toFixed(2) : '0.00';

      const d2Kg = calcData.d2Items[g.k];
      const d2Pct = calcData.d2Total > 0 ? ((d2Kg / calcData.d2Total) * 100).toFixed(2) : '0.00';

      const totKg = calcData.totalItems[g.k];
      const totPct = calcData.grandTotalFired > 0 ? ((totKg / calcData.grandTotalFired) * 100).toFixed(2) : '0.00';

      rows.push([
        g.l1, d1Kg > 0 ? d1Kg.toFixed(2) : '0.00', d1Pct,
        g.l2, d2Kg > 0 ? d2Kg.toFixed(2) : '0.00', d2Pct,
        g.l3, totKg > 0 ? totKg.toFixed(2) : '0.00', totPct
      ]);
    });

    // Total Fired Tea Row
    rows.push([
      { content: "TOTAL FIRED TEA", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calcData.d1Total.toFixed(2), styles: { fontStyle: 'bold', textColor: [30, 64, 175], fillColor: [248, 250, 252] } },
      { content: "100.0", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "TOTAL FIRED TEA", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calcData.d2Total.toFixed(2), styles: { fontStyle: 'bold', textColor: [6, 95, 70], fillColor: [248, 250, 252] } },
      { content: "100.0", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "TOTAL FIRED TEA", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calcData.grandTotalFired.toFixed(2), styles: { fontStyle: 'bold', textColor: [146, 64, 14], fillColor: [248, 250, 252] } },
      { content: "100.0", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
    ]);

    // Section 2: Firewood Usage (kg)
    rows.push([
      { content: "FIREWOOD USAGE (kg) - 01", colSpan: 3, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: "FIREWOOD USAGE (kg) - 02", colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: "FIREWOOD USAGE (kg) TOTAL", colSpan: 3, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ]);
    rows.push([
      { content: "F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "R/F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "W / TOTAL", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "R/F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "W / TOTAL", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "R/F", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: "W / TOTAL", styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
    ]);
    rows.push([
      String(calcData.u1.f), String(calcData.u1.rf), `${calcData.u1.w} (${calcData.u1.total})`,
      String(calcData.u2.f), String(calcData.u2.rf), `${calcData.u2.w} (${calcData.u2.total})`,
      String(calcData.uTotal.f), String(calcData.uTotal.rf), `${calcData.uTotal.w} (${calcData.uTotal.total})`
    ]);

    // Section 3: Firewood Output
    rows.push([
      { content: "FIREWOOD OUTPUT - 01", colSpan: 3, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: "FIREWOOD OUTPUT - 02", colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: "FIREWOOD OUTPUT TOTAL", colSpan: 3, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ]);

    const foData = [
      ["WITHOUT WITHERING", `${calcData.out1.withoutWithering.toFixed(2)} kg`, "WITHOUT WITHERING", `${calcData.out2.withoutWithering.toFixed(2)} kg`, "WITHOUT WITHERING", `${calcData.outTotal.withoutWithering.toFixed(2)} kg`],
      ["WITH WITHERING", `${calcData.out1.withering.toFixed(2)} kg`, "WITH WITHERING", `${calcData.out2.withering.toFixed(2)} kg`, "WITH WITHERING", `${calcData.outTotal.withering.toFixed(2)} kg`],
      ["R/F", `${calcData.out1.rf.toFixed(2)} kg`, "R/F", `${calcData.out2.rf.toFixed(2)} kg`, "R/F", `${calcData.outTotal.rf.toFixed(2)} kg`],
      ["TOTAL OUTPUT", `${calcData.out1.total.toFixed(2)} kg`, "TOTAL OUTPUT", `${calcData.out2.total.toFixed(2)} kg`, "TOTAL OUTPUT", `${calcData.outTotal.total.toFixed(2)} kg`]
    ];

    foData.forEach(r => {
      rows.push([
        { content: r[0], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[1] },
        { content: r[2], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[3] },
        { content: r[4], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[5], styles: { fontStyle: 'bold', textColor: [146, 64, 14] } }
      ]);
    });

    // Section 4: Drier Time & Output
    rows.push([
      { content: "DRIER - 01", colSpan: 3, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: "DRIER - 02", colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: "TOTAL", colSpan: 3, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ]);

    rows.push([
      { content: "START TIME", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: d1.start || '-' },
      { content: "START TIME", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: d2.start || '-' },
      { content: "", colSpan: 3, styles: { fillColor: [248, 250, 252] } }
    ]);
    rows.push([
      { content: "END TIME", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: d1.finish || '-' },
      { content: "END TIME", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: d2.finish || '-' },
      { content: "", colSpan: 3, styles: { fillColor: [248, 250, 252] } }
    ]);
    rows.push([
      { content: "TOTAL HOURS", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `${calcData.h1} h` },
      { content: "TOTAL HOURS", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `${calcData.h2} h` },
      { content: "TOTAL HOURS", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `${calcData.hTotal} h`, styles: { fontStyle: 'bold', textColor: [146, 64, 14] } }
    ]);
    rows.push([
      { content: "DRIER OUTPUT / H", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `${calcData.outPerH1} kg`, styles: { fontStyle: 'bold', textColor: [30, 64, 175] } },
      { content: "DRIER OUTPUT / H", colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `${calcData.outPerH2} kg`, styles: { fontStyle: 'bold', textColor: [6, 95, 70] } },
      { content: "", colSpan: 3, styles: { fillColor: [248, 250, 252] } }
    ]);

    // Section 5: Cost of Firewood
    rows.push([
      { content: "DRIER - 01", colSpan: 3, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' } },
      { content: "DRIER - 02", colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold' } },
      { content: "TOTAL", colSpan: 3, styles: { halign: 'center', fillColor: [255, 251, 235], textColor: [146, 64, 14], fontStyle: 'bold' } }
    ]);

    const cfData = [
      ["TOTAL F/W KG", `${calcData.c1.fwKg.toFixed(2)} kg`, "TOTAL F/W KG", `${calcData.c2.fwKg.toFixed(2)} kg`, "TOTAL F/W KG", `${calcData.cTotal.fwKg.toFixed(2)} kg`],
      ["UNIT PRICE (Rs.)", `Rs. ${calcData.c1.unitPrice.toFixed(2)}`, "UNIT PRICE (Rs.)", `Rs. ${calcData.c2.unitPrice.toFixed(2)}`, "AVG UNIT PRICE", `Rs. ${calcData.cTotal.unitPrice.toFixed(2)}`],
      ["MADE TEA KG", `${calcData.c1.madeTeaKg.toFixed(2)} kg`, "MADE TEA KG", `${calcData.c2.madeTeaKg.toFixed(2)} kg`, "MADE TEA KG", `${calcData.cTotal.madeTeaKg.toFixed(2)} kg`],
      ["COST OF F/W (Rs.)", `Rs. ${calcData.c1.cost.toFixed(2)}`, "COST OF F/W (Rs.)", `Rs. ${calcData.c2.cost.toFixed(2)}`, "COST OF F/W (Rs.)", `Rs. ${calcData.cTotal.cost.toFixed(2)}`]
    ];

    cfData.forEach((r, idx) => {
      rows.push([
        { content: r[0], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[1], styles: idx === 3 ? { textColor: [30, 64, 175], fontStyle: 'bold' } : {} },
        { content: r[2], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[3], styles: idx === 3 ? { textColor: [6, 95, 70], fontStyle: 'bold' } : {} },
        { content: r[4], colSpan: 2, styles: { fontStyle: 'bold' } }, { content: r[5], styles: { fontStyle: 'bold', textColor: [146, 64, 14] } }
      ]);
    });

    return rows;
  }, [currentRecord, calcData]);

  // =========================================================================
  const autoTableOptions = useMemo(() => ({
    startY: 56,
    margin: { top: 12, bottom: 12, left: 12, right: 12 },
    theme: 'grid',
    styles: {
      fontSize: 7.0,
      cellPadding: 1.6,
      valign: 'middle',
      halign: 'center',
      lineColor: [182, 176, 159],
      lineWidth: 0.18,
      textColor: [0, 0, 0]
    },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber !== 1) return;

      const { doc } = hookData;
      const startX = 12;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - 24;

      // 1. Clean Title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text("DRIER ROOM RECORD SHEET", pageWidth / 2, 46, { align: 'center' });
      doc.setLineWidth(0.4);

      // 2. Metadata (Top Left)
      doc.setFontSize(8);
      doc.text("M/F DATE   :  ", startX, 36);
      if (currentRecord?.dateOfManufacture) {
        doc.setFont(undefined, 'bold');
        doc.text(currentRecord.dateOfManufacture, startX + 22, 35.6);
      }

      doc.setFont(undefined, 'bold');
      doc.text("CROP DATE :  ", startX, 43);
      if (currentRecord?.drier1?.day) {
        doc.text(currentRecord.drier1.day, startX + 22, 42.6);
      }

      doc.text("CROP (Kg)  :   ", startX, 50);
      if (calcData?.grandTotalFired) {
        doc.text(`${(calcData.grandTotalFired * 4.2).toFixed(2)} kg`, startX + 22, 49.6);
      }

      // ----------------------------------------------------
      // 3. Benchmark Spec Box (Shifted 15 units higher)
      // ----------------------------------------------------
      const tableFinalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 230;
      const bBoxY = tableFinalY - 4; // Shifted 15 points higher from previous (+5 to -10)
      const bBoxH = 17;

      doc.setDrawColor(182, 176, 159);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(startX + 12, bBoxY, contentWidth - 24, bBoxH, 2, 2, 'FD');

      const bRows = [
        ["Firewood output", "WITHOUT WITHERING 1KG FIREWOOD (MAXIMUM)"],
        ["1kg F/T", "WITH WITHERING 1.2KG FIREWOOD (MAXIMUM)"],
        ["DRIER OUTPUT", "WITHOUT WITHERING 200 (MINIMUM)"],
        ["1 YARD", "WITH WITHERING 180 (MINIMUM)"]
      ];

      bRows.forEach((br, bIdx) => {
        const curY = bBoxY + 3.6 + (bIdx * 3.6);
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(182, 176, 159);
        doc.text(br[0], startX + 20, curY);

        // Native Arrow Lines
        doc.setLineWidth(0.2);
        doc.line(startX + 52, curY - 0.8, startX + 64, curY - 0.8);
        doc.line(startX + 62, curY - 1.8, startX + 64, curY - 0.8);
        doc.line(startX + 62, curY + 0.2, startX + 64, curY - 0.8);

        doc.text(br[1], startX + 70, curY);
      });
    }
  }), [currentRecord, calcData]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Header Bar --- */}
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-gradient-to-br from-orange-600 via-amber-600 to-slate-900 text-white rounded-2xl shadow-md shadow-orange-900/10 ring-4 ring-orange-50 dark:ring-orange-950/40">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {t.title}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-full border border-orange-200/60 dark:border-orange-800/60">
                  <Sparkles className="w-3 h-3 text-orange-500" /> Operational Record
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end z-10">
            {/* Native PDFDownloader handling  footer */}
            <PDFDownloader
              title=""
              subtitle=""
              headers={pdfHeaders}
              data={pdfData}
              fileName={`Drier_Room_Record_Sheet_${lang}_MF_${currentRecord?.dateOfManufacture || filterDate || 'Report'}.pdf`}
              orientation="portrait"
              uniqueCode={docRefCode}
              userName={currentRecord?.officerName || currentUsername}
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
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-600' : 'text-slate-500 dark:text-slate-400'} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar --- */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{t.filterDay}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Filter drier logs by tea manufacturing date (M/F Date)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none px-3.5 py-2 transition-all"
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

        {/* --- Main Dashboard Content --- */}
        {loading && allRecords.length === 0 ? (
          <div className="text-center py-28 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Loading drier room record sheet...</p>
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 md:p-10 overflow-hidden font-sans transition-colors duration-200 flex flex-col gap-8">

            {/* Title Header */}
            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
                DRIER ROOM RECORD SHEET
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-6 mt-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                <div>{t.mfDate} : <span className="text-slate-900 dark:text-white font-extrabold">{currentRecord.dateOfManufacture}</span></div>
                <div>•</div>
                <div>{t.cropDate} : <span className="text-slate-900 dark:text-white font-extrabold">{currentRecord.drier1?.day || '-'}</span></div>
                <div>•</div>
                <div>{t.cropKg} : <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{calcData?.grandTotalFired ? (calcData.grandTotalFired * 4.2).toFixed(2) + ' kg' : '-'}</span></div>
              </div>
            </div>

            {/* 1. DHOOLS (kg) TABLE */}
            <div>
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full min-w-[850px] border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th colSpan={3} className="p-3 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.drier1}</th>
                      <th colSpan={3} className="p-3 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.drier2}</th>
                      <th colSpan={3} className="p-3 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black">{t.drierTotal}</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2 w-28 border-r border-slate-200 dark:border-slate-700 text-left pl-3">{t.item}</th>
                      <th className="p-2 w-20 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                      <th className="p-2 w-16 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>

                      <th className="p-2 w-28 border-r border-slate-200 dark:border-slate-700 text-left pl-3">{t.item}</th>
                      <th className="p-2 w-20 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                      <th className="p-2 w-16 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>

                      <th className="p-2 w-28 border-r border-slate-200 dark:border-slate-700 text-left pl-3">{t.item}</th>
                      <th className="p-2 w-20 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                      <th className="p-2 w-16">{t.pct}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {[
                      { label: "1ST", k: 'first' },
                      { label: "2ND", k: 'second' },
                      { label: "3RD", k: 'third' },
                      { label: "DIR / R", k: 'dir' },
                      { label: "G BULK / BIG BULK", k: 'bigBulk' }
                    ].map(({ label, k }) => {
                      const d1Kg = calcData?.d1Items[k] || 0;
                      const d1Pct = calcData?.d1Total > 0 ? ((d1Kg / calcData.d1Total) * 100).toFixed(2) : '0.00';

                      const d2Kg = calcData?.d2Items[k] || 0;
                      const d2Pct = calcData?.d2Total > 0 ? ((d2Kg / calcData.d2Total) * 100).toFixed(2) : '0.00';

                      const totKg = calcData?.totalItems[k] || 0;
                      const totPct = calcData?.grandTotalFired > 0 ? ((totKg / calcData.grandTotalFired) * 100).toFixed(2) : '0.00';

                      return (
                        <tr key={k} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                          <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800">{d1Kg.toFixed(2)}</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800">{d1Pct}%</td>

                          <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                          <td className="p-2.5 font-bold border-r border-slate-200 dark:border-slate-800">{d2Kg.toFixed(2)}</td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800">{d2Pct}%</td>

                          <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                          <td className="p-2.5 font-black text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">{totKg.toFixed(2)}</td>
                          <td className="p-2.5 font-bold text-amber-800 dark:text-amber-300">{totPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                      <td className="p-3 text-blue-700 dark:text-blue-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/30">{calcData?.d1Total.toFixed(2)}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700">100%</td>

                      <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/30">{calcData?.d2Total.toFixed(2)}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-700">100%</td>

                      <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                      <td className="p-3 text-amber-700 dark:text-amber-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-amber-950/30">{calcData?.grandTotalFired.toFixed(2)} kg</td>
                      <td className="p-3">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. FIREWOOD USAGE (kg) TABLE */}
            <div>
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full min-w-[850px] border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th colSpan={4} className="p-2.5 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.fwUsage1}</th>
                      <th colSpan={4} className="p-2.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.fwUsage2}</th>
                      <th colSpan={4} className="p-2.5 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black">{t.fwUsageTotal}</th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.f}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.rf}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.w}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700 font-black">{t.total}</th>

                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.f}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.rf}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.w}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700 font-black">{t.total}</th>

                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.f}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.rf}</th>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.w}</th>
                      <th className="p-2 font-black">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 font-bold">
                    <tr>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u1.f}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u1.rf}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u1.w}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 font-black">{calcData?.u1.total}</td>

                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u2.f}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u2.rf}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.u2.w}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-black">{calcData?.u2.total}</td>

                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.uTotal.f}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.uTotal.rf}</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">{calcData?.uTotal.w}</td>
                      <td className="p-3 text-amber-700 dark:text-amber-400 font-black">{calcData?.uTotal.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. FIREWOOD OUTPUT TABLE */}
            <div>
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full min-w-[850px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th colSpan={2} className="p-2.5 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.fwOut1}</th>
                      <th colSpan={2} className="p-2.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 font-black">{t.fwOut2}</th>
                      <th colSpan={2} className="p-2.5 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black">{t.fwOutTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{t.withoutWithering}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 w-1/6 text-center">{calcData?.out1.withoutWithering} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{t.withoutWithering}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 w-1/6 text-center">{calcData?.out2.withoutWithering} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{t.withoutWithering}</td>
                      <td className="p-2.5 w-1/6 text-center font-bold">{calcData?.outTotal.withoutWithering} kg</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.withering}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center">{calcData?.out1.withering} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.withering}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center">{calcData?.out2.withering} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.withering}</td>
                      <td className="p-2.5 text-center font-bold">{calcData?.outTotal.withering} kg</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.rf}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center">{calcData?.out1.rf} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.rf}</td>
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-center">{calcData?.out2.rf} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.rf}</td>
                      <td className="p-2.5 text-center font-bold">{calcData?.outTotal.rf} kg</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                      <td className="p-3 text-blue-700 dark:text-blue-400 text-center border-r border-slate-200 dark:border-slate-700">{calcData?.out1.total.toFixed(2)} kg</td>
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 text-center border-r border-slate-200 dark:border-slate-700">{calcData?.out2.total.toFixed(2)} kg</td>
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                      <td className="p-3 text-amber-700 dark:text-amber-400 text-center">{calcData?.outTotal.total.toFixed(2)} kg</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. DRIER TIME & OUTPUT TABLE */}
            <div>
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full min-w-[850px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th colSpan={2} className="p-2.5 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700 font-black w-1/3">{t.drier01Title}</th>
                      <th colSpan={2} className="p-2.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 font-black w-1/3">{t.drier02Title}</th>
                      <th colSpan={2} className="p-2.5 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black w-1/3">{t.costTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.startTime}</td>
                      <td className="p-2.5 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.start || '-'}</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.startTime}</td>
                      <td className="p-2.5 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier2?.start || '-'}</td>
                      <td colSpan={2} className="p-2.5 bg-slate-50 dark:bg-slate-800/40"></td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.endTime}</td>
                      <td className="p-2.5 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.finish || '-'}</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.endTime}</td>
                      <td className="p-2.5 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier2?.finish || '-'}</td>
                      <td colSpan={2} className="p-2.5 bg-slate-50 dark:bg-slate-800/40"></td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                      <td className="p-2.5 text-center font-black border-r border-slate-200 dark:border-slate-800">{calcData?.h1 || 0} h</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                      <td className="p-2.5 text-center font-black border-r border-slate-200 dark:border-slate-800">{calcData?.h2 || 0} h</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                      <td className="p-2.5 text-center font-black text-amber-700 dark:text-amber-400">{calcData?.hTotal || 0} h</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.drierOutputPerHour}</td>
                      <td className="p-2.5 text-center font-black text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">{calcData?.outPerH1} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.drierOutputPerHour}</td>
                      <td className="p-2.5 text-center font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">{calcData?.outPerH2} kg</td>
                      <td colSpan={2} className="p-2.5 bg-slate-50 dark:bg-slate-800/40"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. COST OF FIREWOOD TABLE */}
            <div>
              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full min-w-[850px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th colSpan={2} className="p-2.5 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700 font-black w-1/3">{t.costDrier01}</th>
                      <th colSpan={2} className="p-2.5 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-700 font-black w-1/3">{t.costDrier02}</th>
                      <th colSpan={2} className="p-2.5 bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-black w-1/3">{t.costTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalFwKg}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">{calcData?.c1.fwKg} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalFwKg}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">{calcData?.c2.fwKg} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalFwKg}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700 dark:text-amber-400">{calcData?.cTotal.fwKg} kg</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">Rs. {calcData?.c1.unitPrice.toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">Rs. {calcData?.c2.unitPrice.toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                      <td className="p-2.5 text-center font-bold">Rs. {calcData?.cTotal.unitPrice.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">{calcData?.c1.madeTeaKg} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">{calcData?.c2.madeTeaKg} kg</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                      <td className="p-2.5 text-center font-bold">{calcData?.cTotal.madeTeaKg} kg</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                      <td className="p-3 text-blue-700 dark:text-blue-400 text-center border-r border-slate-200 dark:border-slate-700">Rs. {calcData?.c1.cost.toFixed(2)}</td>
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 text-center border-r border-slate-200 dark:border-slate-700">Rs. {calcData?.c2.cost.toFixed(2)}</td>
                      <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                      <td className="p-3 text-amber-700 dark:text-amber-400 text-center">Rs. {calcData?.cTotal.cost.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 6. SIGN-OFFS & SPECIFICATION FOOTER */}
            <div className="flex flex-col gap-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.officerName} :</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentRecord.officerName || '..................................................'}</p>
                  </div>
                  <UserCheck className="w-5 h-5 text-slate-400" />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.checkBy} :</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentRecord.checkedBy || '..................................................'}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Benchmark Reference Card */}
              <div className="p-5 bg-gradient-to-r from-slate-50 via-slate-100/50 to-slate-50 dark:from-slate-900/60 dark:via-slate-800/30 dark:to-slate-900/60 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs">
                <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                  <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  {t.benchmarkTitle}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Firewood output (1kg F/T) ➔</span>
                    <span className="font-bold text-slate-900 dark:text-white">WITHOUT WITHERING 1KG (MAX)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Firewood output (1kg F/T) ➔</span>
                    <span className="font-bold text-slate-900 dark:text-white">WITH WITHERING 1.2KG (MAX)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Drier Output (1 Yard) ➔</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">WITHOUT WITHERING 200 (MIN)</span>
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Drier Output (1 Yard) ➔</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">WITH WITHERING 180 (MIN)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default FiringSectionSummary;