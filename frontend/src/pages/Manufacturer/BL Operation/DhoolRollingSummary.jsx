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
  Leaf,
  Edit3,
  Save,
  RotateCcw,
  ThermometerSun,
  FileText,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable'; 
import PDFDownloader from '@/components/PDFDownloader';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Helper to format start and end time range like "09:28 - 09:48"
const formatTimeRange = (start, end) => {
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - ...`;
  if (end) return `... - ${end}`;
  return '-';
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

// Calculate duration string from start and end times
const calculateDurationStr = (start, end) => {
  if (!start || !end) return '';
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 24 * 60;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
};


// Helper to format time to 12-hour (AM/PM)
const format12Hour = (timeStr) => {
  if (!timeStr) return '-';
  let [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 පැය 12 ලෙස දැක්වීමට
  const strHours = hours.toString().padStart(2, '0');
  const strMins = minutes.toString().padStart(2, '0');
  return `${strHours}:${strMins} ${ampm}`;
};

const preventNegativeKeys = (e) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
};

const RollingRoomSheetSummary = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [lang, setLang] = useState('EN');

  // In-place editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [rowToDelete, setRowToDelete] = useState(null);
  const [isMainDeleteAlertOpen, setIsMainDeleteAlertOpen] = useState(false);

  const userRole = localStorage.getItem("userRole") || "Admin";
  const currentUsername = localStorage.getItem("username") || "admin";

  // Dynamic Translations
  const t = useMemo(() => ({
    title: lang === 'SI' ? "රෝලිං කාමර වාර්තා පත්‍රිකාව" : "ROLLING ROOM SHEET",
    subtitle: lang === 'SI' ? "දෛනික රෝලිං වාර්තාව සහ පසුගිය දින 30 සාමාන්‍ය කාල සංසන්දනය." : "Daily rolling room summary with 30-day operational rolling benchmark analysis.",
    sync: lang === 'SI' ? "යාවත්කාලීන කරන්න" : "Sync",
    refreshing: lang === 'SI' ? "යාවත්කාලීන වෙමින්..." : "Refreshing...",
    downloadPdf: lang === 'SI' ? "PDF බාගත කරන්න" : "Download PDF",
    filterDay: lang === 'SI' ? "නිෂ්පාදිත දිනය අනුව තෝරන්න (M/F Date):" : "Filter by M/F Date:",
    clear: lang === 'SI' ? "මකන්න" : "Clear",
    editRecord: lang === 'SI' ? "සංස්කරණය කරන්න" : "Edit Record",
    saveChanges: lang === 'SI' ? "සුරකින්න" : "Save Changes",
    cancelEdit: lang === 'SI' ? "අවලංගු කරන්න" : "Cancel",
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
    standardBatch: lang === 'SI' ? "සම්මත කාණ්ඩ බර" : "Standard Batch",

    // Grid Column Headers
    no: "NO:",
    dhool1: lang === 'SI' ? "1 වන ධූල් (1ST DHOOL)" : "1ST DHOOL",
    dhool2: lang === 'SI' ? "2 වන ධූල් (2ND DHOOL)" : "2ND DHOOL",
    roll01: "ROLL NO:01",
    roll02: "ROLL NO:02",
    roll03: "ROLL NO:03",
    roll04: "ROLL NO:04",

    wetDhool: lang === 'SI' ? "තෙත් ධූල්" : "WET DHOOL",
    kg: lang === 'SI' ? "කි.ග්‍රෑ." : "KG",
    pct: "%",
    total: lang === 'SI' ? "එකතුව" : "TOTAL",
    grandTotalWetDhoolTitle: lang === 'SI' ? "මුළු තෙත් ධූල් ප්‍රමාණය:" : "Grand Total Wet Dhool Quantity:",
    overallCapacityLabel: lang === 'SI' ? "සම්පූර්ණ ධාරිතාව" : "Overall Capacity",

    // 💡 NEW: Hydro Meter Chart Translations
    hydroTitle: lang === 'SI' ? "හයිඩ්‍රෝ මීටර් සටහන" : "HYDRO METERS CHART",
    hydroTime: lang === 'SI' ? "වේලාව" : "TIME",
    hydroDryBulb: lang === 'SI' ? "වියළි බල්බය" : "DRY BULB",
    hydroWetBulb: lang === 'SI' ? "තෙත් බල්බය" : "WET BULB",
    hydroDiff: lang === 'SI' ? "වෙනස" : "DIFFERENCE"

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

  // Cancel edit mode when changing date
  useEffect(() => {
    setIsEditing(false);
    setEditForm(null);
  }, [filterDate]);

  // Start in-place editing
  const handleStartEdit = () => {
    if (!currentRecord) return;
    setEditForm(JSON.parse(JSON.stringify(currentRecord)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

 
  const handleHydroCellChange = (type, index, field, value) => {
    setEditForm(prev => {
        const targetArray = type === 'rolling' ? 'rollingHydroReadings' : 'fermentationHydroReadings';
        const updatedReadings = [...(prev[targetArray] || [])];
        const row = { ...updatedReadings[index] };
        row[field] = value;

        // Auto calculate difference
        if (field === 'dryBulb' || field === 'wetBulb') {
            const dry = parseFloat(row.dryBulb);
            const wet = parseFloat(row.wetBulb);
            if (!isNaN(dry) && !isNaN(wet)) {
                row.difference = (dry - wet).toString();
            } else {
                row.difference = '';
            }
        }

        updatedReadings[index] = row;
        return { ...prev, [targetArray]: updatedReadings };
    });
  };

  // Cell level editing for batches
  const handleBatchCellChange = (batchIndex, sectionKey, field, value) => {
    setEditForm(prev => {
      const updatedBatches = [...(prev.batches || [])];
      const batch = { ...updatedBatches[batchIndex] };
      const section = { ...(batch[sectionKey] || {}) };
      section[field] = value;
      if (field === 'wetDhoolKg') {
        const stdKg = parseFloat(prev.standardBatchKg) || 560;
        const enteredKg = parseFloat(value) || 0;
        section.percentage = stdKg > 0 ? parseFloat(((enteredKg / stdKg) * 100).toFixed(2)) : 0;
      }
      batch[sectionKey] = section;
      updatedBatches[batchIndex] = batch;
      return { ...prev, batches: updatedBatches };
    });
  };

  const handleMetaFieldChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'rollingStartTime' || field === 'rollingEndTime') {
        const start = field === 'rollingStartTime' ? value : prev.rollingStartTime;
        const end = field === 'rollingEndTime' ? value : prev.rollingEndTime;
        if (start && end) {
          updated.totalRollingHours = calculateDurationStr(start, end);
        }
      }
      return updated;
    });
  };

  const handleSaveInline = async () => {
    if (!editForm || !editForm._id) {
      toast.error("Invalid record identifier.");
      return;
    }
    const toastId = toast.loading("Saving changes...");
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/rolling-room-sheet/${editForm._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success("Rolling room record updated successfully!", { id: toastId });
        // 💡 FIX: බලහත්කාරයෙන් අලුත් අගයන් දෙකම UI එකට යාවත්කාලීන කිරීම
        const finalUpdatedRecord = {
            ...(resData.data || editForm),
            rollingHydroReadings: editForm.rollingHydroReadings,
            fermentationHydroReadings: editForm.fermentationHydroReadings
        };
        setAllRecords(prev => prev.map(rec => rec._id === editForm._id ? finalUpdatedRecord : rec));
        setIsEditing(false);
        setEditForm(null);
      } else {
        toast.error(resData.message || "Failed to update record.", { id: toastId });
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error communicating with server.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!currentRecord || !currentRecord._id) return;
    setIsMainDeleteAlertOpen(false);
    const toastId = toast.loading("Deleting record...");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/rolling-room-sheet/${currentRecord._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success("Rolling room record deleted successfully!", { id: toastId });
        const updatedRecords = allRecords.filter(r => r._id !== currentRecord._id);
        setAllRecords(updatedRecords);
        if (updatedRecords.length > 0) {
          setFilterDate(normalizeDate(updatedRecords[0].mfDate));
        } else {
          setFilterDate(getTodayDate());
        }
      } else {
        toast.error(resData.message || "Failed to delete record.", { id: toastId });
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error communicating with server.", { id: toastId });
    }
  };

  // 💡 NEW: අදාළ Chart එකට අනුව Row එක Delete කිරීම
  const confirmRowDelete = () => {
    if (rowToDelete) {
        setEditForm(prev => {
            const targetArray = rowToDelete.type === 'rolling' ? 'rollingHydroReadings' : 'fermentationHydroReadings';
            return {
                ...prev,
                [targetArray]: (prev[targetArray] || []).filter((_, i) => i !== rowToDelete.index)
            };
        });
        setRowToDelete(null);
    }
  };

  
  // Active record based on mode
  const activeRecord = isEditing ? editForm : currentRecord;

  // 30-Day Rolling Benchmark Calculation
  const analysis = useMemo(() => {
    if (!activeRecord) {
      return { hasData: false, isOverdue: false };
    }

    const currentDateObj = new Date(activeRecord.mfDate || activeRecord.cropDate || activeRecord.createdAt);
    const thirtyDaysAgo = new Date(currentDateObj);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const past30DayRecords = allRecords.filter(r => {
      const rDate = new Date(r.mfDate || r.cropDate || r.createdAt);
      return rDate >= thirtyDaysAgo && rDate <= currentDateObj && r._id !== activeRecord._id;
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
    const currentDayTotalKg = (Number(activeRecord.cropKg) || 0) + (Number(activeRecord.otherLeafKg) || 0);
    const actualHours = parseDurationToDecimalHours(
      activeRecord.totalRollingHours,
      activeRecord.rollingStartTime,
      activeRecord.rollingEndTime
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
  }, [allRecords, activeRecord]);

  // Batch summary totals
  const batches = activeRecord?.batches || [];
  const standardBatchWeight = activeRecord?.standardBatchKg || 560;

  const sumD1Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool1?.wetDhoolKg) || 0), 0);
  const sumD2Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool2?.wetDhoolKg) || 0), 0);
  const grandTotalWetDhool = sumD1Kg + sumD2Kg;

  const totalCapacityKg = (batches.length || 1) * standardBatchWeight;
  const avgD1Pct = totalCapacityKg > 0 ? ((sumD1Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgD2Pct = totalCapacityKg > 0 ? ((sumD2Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const grandTotalPct = totalCapacityKg > 0 ? ((grandTotalWetDhool / totalCapacityKg) * 100).toFixed(2) : '0.00';

  // Multi-tier PDF table headers
  const pdfHeaders = useMemo(() => [
    [
      { content: t.no, rowSpan: 3, styles: { halign: 'center', valign: 'middle', fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.dhool1, colSpan: 4, styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.dhool2, colSpan: 4, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } }
    ],
    [
      { content: t.roll01, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.roll02, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [30, 58, 138], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.wetDhool, colSpan: 2, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },

      { content: t.roll03, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [6, 78, 59], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.roll04, rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [6, 78, 59], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.wetDhool, colSpan: 2, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } }
    ],
    [
      { content: t.kg, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [30, 64, 175], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },

      { content: t.kg, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } },
      { content: t.pct, styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [6, 95, 70], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] } }
    ]
  ], [t]);

  const pdfData = useMemo(() => {
    if (!activeRecord || !activeRecord.batches || activeRecord.batches.length === 0) {
      return [];
    }

    const rows = activeRecord.batches.map(b => [
      String(b.batchNo).padStart(2, '0'),
      formatTimeRange(b.dhool1?.roll01Start, b.dhool1?.roll01End),
      formatTimeRange(b.dhool1?.roll02Start, b.dhool1?.roll02End),
      b.dhool1?.wetDhoolKg ? Number(b.dhool1.wetDhoolKg).toFixed(2) : '-',
      b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-',
      formatTimeRange(b.dhool2?.roll03Start, b.dhool2?.roll03End),
      formatTimeRange(b.dhool2?.roll04Start, b.dhool2?.roll04End),
      b.dhool2?.wetDhoolKg ? Number(b.dhool2.wetDhoolKg).toFixed(2) : '-',
      b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'
    ]);

    // Summary Total Row
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
        `${avgD2Pct}%`
      ],
      isFooter: true
    });

    return rows;
  }, [activeRecord, sumD1Kg, avgD1Pct, sumD2Kg, avgD2Pct, t]);


  // PDF Autotable Layout
  // PDF Autotable Layout
  const autoTableOptions = useMemo(() => ({
    startY: 115, // 💡 Start slightly lower to accommodate the new beautiful header cards
    margin: { top: 25, bottom: 25, left: 14, right: 14 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    didDrawPage: (hookData) => {
      const { doc } = hookData;

      // 💡 HACK: Intercept doc.save and output to add a new page with TWO Hydro Charts Side-by-Side
      if (!doc.__hydroHookAdded) {
          const addHydroPage = () => {
              if (doc.__hydroPageAdded) return;
              doc.__hydroPageAdded = true;

              const hasRolling = activeRecord?.rollingHydroReadings && activeRecord.rollingHydroReadings.length > 0;
              const hasFermentation = activeRecord?.fermentationHydroReadings && activeRecord.fermentationHydroReadings.length > 0;

              if (hasRolling || hasFermentation) {
                  doc.addPage();
                  const pageWidth = doc.internal.pageSize.getWidth();
                  const halfWidth = pageWidth / 2;
                  
                  // Page Title
                  doc.setFontSize(16);
                  doc.setFont(undefined, 'bold');
                  doc.setTextColor(15, 23, 42);
                  doc.text(t.hydroTitle, 14, 22);

                  // Decorative Line below title
                  doc.setDrawColor(226, 232, 240);
                  doc.setLineWidth(0.5);
                  doc.line(14, 26, pageWidth - 14, 26);

                  const currentY = 35; 

                  // Table 1: Rolling Room Data (LEFT SIDE)
                  doc.setFontSize(11);
                  doc.setTextColor(234, 88, 12); 
                  doc.text("Rolling Room Data", 14, currentY);

                  let rollingPdfData = [['-', 'No Data Available', '-', '-']];
                  if (hasRolling) {
                      rollingPdfData = activeRecord.rollingHydroReadings.map(r => [
                          r.time ? format12Hour(r.time) : '-', r.dryBulb || '-', r.wetBulb || '-', r.difference || '-'
                      ]);
                  }

                  autoTable(doc, {
                      startY: currentY + 4,
                      margin: { left: 14, right: halfWidth + 5 }, 
                      head: [[t.hydroTime, t.hydroDryBulb, t.hydroWetBulb, t.hydroDiff]],
                      body: rollingPdfData,
                      theme: 'grid',
                      headStyles: { fillColor: [255, 237, 213], textColor: [154, 52, 18], fontStyle: 'bold', halign: 'center' },
                      columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', textColor: [234, 88, 12], fontStyle: 'bold' } },
                      styles: { fontSize: 9, cellPadding: 3.5, lineColor: [226, 232, 240], lineWidth: 0.1 }
                  });

                  // Table 2: Fermentation Room Data (RIGHT SIDE)
                  doc.setFontSize(11);
                  doc.setTextColor(37, 99, 235); 
                  doc.text("Fermentation Room Data", halfWidth + 5, currentY);

                  let fermPdfData = [['-', 'No Data Available', '-', '-']];
                  if (hasFermentation) {
                      fermPdfData = activeRecord.fermentationHydroReadings.map(r => [
                          r.time ? format12Hour(r.time) : '-', r.dryBulb || '-', r.wetBulb || '-', r.difference || '-'
                      ]);
                  }

                  autoTable(doc, {
                      startY: currentY + 4,
                      margin: { left: halfWidth + 5, right: 14 }, 
                      head: [[t.hydroTime, t.hydroDryBulb, t.hydroWetBulb, t.hydroDiff]],
                      body: fermPdfData,
                      theme: 'grid',
                      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', halign: 'center' },
                      columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', textColor: [37, 99, 235], fontStyle: 'bold' } },
                      styles: { fontSize: 9, cellPadding: 3.5, lineColor: [226, 232, 240], lineWidth: 0.1 }
                  });
              }
          };

          const originalSave = doc.save.bind(doc);
          doc.save = function(...args) {
              addHydroPage();
              return originalSave(...args);
          };
          if (doc.output) {
              const originalOutput = doc.output.bind(doc);
              doc.output = function(...args) {
                  addHydroPage();
                  return originalOutput(...args);
              };
          }
          doc.__hydroHookAdded = true;
      }

      // 💡 --- BEAUTIFUL PAGE 1 HEADER LAYOUT ---
      if (hookData.pageNumber !== 1) return;
      const startX = 14;
      const pageWidth = doc.internal.pageSize.getWidth();

      // 1. Decorative Separator Line Below Header
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      // 2. Metadata Grid Card (Beautiful 2-Column Box)
      const metaY = 44;
      const metaH = 18;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.roundedRect(14, metaY, pageWidth - 28, metaH, 2, 2, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105); // slate-600
      
      // Col 1
      doc.setFont(undefined, 'bold');
      doc.text(t.cropDate, 20, metaY + 7);
      doc.text(t.cropKg, 20, metaY + 13.5);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`:   ${activeRecord?.cropDate || '-'}`, 55, metaY + 7);
      doc.text(`:   ${activeRecord?.cropKg ? `${activeRecord.cropKg} kg` : '-'}`, 55, metaY + 13.5);

      // Col 2
      const col2X = pageWidth / 2 + 10;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(t.mfDate, col2X, metaY + 7);
      doc.text(t.otherLeafKg, col2X, metaY + 13.5);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`:   ${activeRecord?.mfDate || '-'}`, col2X + 35, metaY + 7);
      doc.text(`:   ${activeRecord?.otherLeafKg ? `${activeRecord.otherLeafKg} kg` : '-'}`, col2X + 35, metaY + 13.5);

      // 3. Operations Table (Left Side) - Enclosed in a styled box
      const tableX = startX;
      const tableY = metaY + metaH + 6;
      const col1W = 70;
      const col2W = 60;
      const rowH = 6;

      const opRows = [
        [t.rollingStartTime, activeRecord?.rollingStartTime || '-'],
        [t.rollingEndTime, activeRecord?.rollingEndTime || '-'],
        [t.totalRollingHours, activeRecord?.totalRollingHours || '-'],
        [t.sameOrNext, activeRecord?.dayType === 'Next Day' ? t.nextDay : t.sameDay],
        [t.noOfBatches, String(batches.length || 1)]
      ];

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(tableX, tableY, col1W + col2W, opRows.length * rowH, 2, 2, 'S');

      opRows.forEach((r, i) => {
        const currentY = tableY + (i * rowH);
        
        // Zebra striping
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(tableX, currentY, col1W + col2W, rowH, 'F');
        }
        
        // Vertical divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(tableX + col1W, currentY, tableX + col1W, currentY + rowH);
        
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(r[0], tableX + 4, currentY + 4.2);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(r[1] || '-'), tableX + col1W + 4, currentY + 4.2);
      });

      // 4. Right Side Top Box (Grand Total Purple Card)
      const rightCardX = tableX + col1W + col2W + 8;
      const rightCardW = pageWidth - 14 - rightCardX;
      const fullCardH = opRows.length * rowH;

      if (analysis.isOverdue) {
        // Red Alert Styling
        doc.setDrawColor(252, 165, 165); // red-300
        doc.setFillColor(254, 242, 242); // red-50
        doc.setLineWidth(0.2);
        doc.roundedRect(rightCardX, tableY, rightCardW, fullCardH, 3, 3, 'FD');

        doc.setFillColor(239, 68, 68); // red-500 Header strip
        doc.roundedRect(rightCardX, tableY, rightCardW, 8, 3, 3, 'F');

        doc.setFontSize(7.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("! OVERDUE: ACTUAL " + analysis.actualHoursFormatted + " | EXPECTED " + analysis.expectedHoursFormatted, rightCardX + 4, tableY + 5.5);

        doc.setFontSize(9);
        doc.setTextColor(153, 27, 27);
        doc.text(t.grandTotalWetDhoolTitle, rightCardX + 5, tableY + 14);

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text(`${grandTotalWetDhool.toFixed(2)} kg`, rightCardX + 5, tableY + 21);
        
        const badgeText = `${grandTotalPct}% ${t.overallCapacityLabel}`;
        const badgeW = doc.getTextWidth(badgeText) + 8;
        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(248, 113, 113);
        doc.roundedRect(rightCardX + 5, tableY + 23.5, badgeW, 4.5, 1, 1, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(185, 28, 28);
        doc.text(badgeText, rightCardX + 9, tableY + 26.7);

      } else {
        // Beautiful Purple Styling matching your image
        doc.setDrawColor(233, 213, 255); // purple-200
        doc.setFillColor(250, 245, 255); // purple-50
        doc.setLineWidth(0.2);
        doc.roundedRect(rightCardX, tableY, rightCardW, fullCardH, 3, 3, 'FD');

        doc.setFillColor(243, 232, 255); // purple-100 Header strip
        doc.roundedRect(rightCardX, tableY, rightCardW, 8, 3, 3, 'F');

        doc.setFontSize(8.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(126, 34, 206); // purple-700
        doc.text(t.grandTotalWetDhoolTitle, rightCardX + 5, tableY + 5.5);

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(88, 28, 135); // purple-900
        doc.text(`${grandTotalWetDhool.toFixed(2)} kg`, rightCardX + 5, tableY + 18);

        const badgeText = `${grandTotalPct}% ${t.overallCapacityLabel}`;
        const badgeW = doc.getTextWidth(badgeText) + 10;
        doc.setFillColor(243, 232, 255);
        doc.setDrawColor(216, 180, 254);
        doc.roundedRect(rightCardX + 5, tableY + 22, badgeW, 5.5, 1.5, 1.5, 'FD');
        
        doc.setFontSize(7.5);
        doc.setTextColor(126, 34, 206);
        doc.text(badgeText, rightCardX + 10, tableY + 26);
      }
    }
  }), [activeRecord, batches.length, analysis, grandTotalWetDhool, grandTotalPct, t]);

  const inlineInput = "w-full bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500 text-slate-900 dark:text-slate-100 rounded px-1.5 py-1 text-xs text-center font-bold outline-none ring-2 ring-emerald-500/10 focus:ring-emerald-500 transition-all";
  const inlineTimeInput = "w-full bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500 text-slate-900 dark:text-slate-100 rounded px-1 py-0.5 text-[11px] text-center font-bold outline-none";

  const docRefCode = `RRS/${(activeRecord?.mfDate || filterDate || '').replace(/-/g, '')}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Header Bar --- */}
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-2xl shadow-md ring-4 ring-emerald-50 dark:ring-emerald-950/40">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {t.title}
                </h1>
                {isEditing ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-amber-500 text-white rounded-full shadow-xs animate-pulse">
                    <Edit3 className="w-3 h-3" /> In-Place Edit Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                    <Sparkles className="w-3 h-3 text-emerald-500" /> Executive View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end z-10">
            {/* In-Place Edit / Save / Cancel Controls */}
            {currentRecord && (
              !isEditing ? (
                // 💡 Edit සහ Delete බොත්තම් දෙකම පෙන්වීම
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Edit3 size={15} />
                    {t.editRecord}
                  </button>
                  
                  {/* 💡 අලුත් Delete බොත්තම */}
                  {/* 💡 Animation සහිත අලුත් Delete බොත්තම */}
                  <button
                    type="button"
                    onClick={() => setIsMainDeleteAlertOpen(true)} // 💡 මෙතන වෙනස් කළා
                    className="px-4 py-2.5 bg-rose-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-bold text-xs rounded-xl transition-all duration-300 flex items-center gap-2 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95 group"
                  >
                    <Trash2 size={15} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                    Delete
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3.5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    {t.cancelEdit}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInline}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {t.saveChanges}
                  </button>
                </div>
              )
            )}

            <PDFDownloader
              title={`${t.title}`}
              subtitle={`${t.filterDay} ${activeRecord?.mfDate || filterDate}`}
              headers={pdfHeaders}
              data={pdfData}
              fileName={`Rolling_Room_Sheet_${lang}_MF_${activeRecord?.mfDate || filterDate || 'Report'}.pdf`}
              orientation="landscape"
              uniqueCode={docRefCode}
              userName={currentUsername}
              userRole={userRole}
              autoTableOptions={autoTableOptions}
              disabled={!activeRecord || pdfData.length === 0}
            />

            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <Languages size={15} className="text-slate-500 dark:text-slate-400" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>

            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading || isEditing}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : 'text-slate-500 dark:text-slate-400'} />
              {loading ? t.refreshing : t.sync}
            </button>
          </div>
        </div>

        {/* --- Date Filter Bar --- */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              disabled={isEditing}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none px-3.5 py-2 transition-all disabled:opacity-50"
            />
            {filterDate && !isEditing && (
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
          <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 shadow-sm ${analysis.isOverdue
            ? 'bg-gradient-to-r from-rose-50 via-red-50/50 to-orange-50/30 dark:from-rose-950/40 dark:via-red-950/30 dark:to-slate-900 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
            : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
            }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shadow-sm mt-0.5 ${analysis.isOverdue
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white ring-4 ring-rose-100 dark:ring-rose-950/50'
                  : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/50'
                  }`}>
                  {analysis.isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-sm font-black uppercase tracking-wide ${analysis.isOverdue ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-950 dark:text-emerald-300'
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
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t.actualDuration}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{analysis.actualHoursFormatted}</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t.expectedDuration}</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{analysis.expectedHoursFormatted}</p>
                </div>

                <div className={`px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[110px] shadow-2xs ${analysis.isOverdue
                  ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white'
                  : 'bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300'
                  }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${analysis.isOverdue ? 'text-rose-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {t.delayDifference}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {analysis.diffHoursFormatted} ({analysis.diffPercentage}%)
                  </p>
                </div>

                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-center flex-1 sm:flex-none min-w-[120px] shadow-2xs hidden md:block">
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
          <div className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm p-6 md:p-10 overflow-hidden font-sans transition-colors duration-200 ${isEditing ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}`}>

            {/* Title Header */}
            <div className="text-center pb-6 mb-8 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
                ROLLING ROOM SHEET
              </h2>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                Dhool Fractionation & Operational Batch Control Report
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.cropDate}</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.cropDate || ''}
                    onChange={(e) => handleMetaFieldChange('cropDate', e.target.value)}
                    className="bg-emerald-50 dark:bg-slate-800 border border-emerald-400 rounded px-2 py-0.5 text-xs font-bold outline-none"
                  />
                ) : (
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{activeRecord.cropDate || '-'}</span>
                )}
              </div>
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">{t.mfDate}</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.mfDate || ''}
                    onChange={(e) => handleMetaFieldChange('mfDate', e.target.value)}
                    className="bg-emerald-50 dark:bg-slate-800 border border-emerald-400 rounded px-2 py-0.5 text-xs font-bold outline-none"
                  />
                ) : (
                  <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">{activeRecord.mfDate || '-'}</span>
                )}
              </div>
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">{t.cropKg}</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    onKeyDown={preventNegativeKeys}
                    value={editForm.cropKg || ''}
                    onChange={(e) => handleMetaFieldChange('cropKg', e.target.value)}
                    className="w-24 bg-blue-50 dark:bg-slate-800 border border-blue-400 rounded px-2 py-0.5 text-xs font-bold text-right outline-none"
                  />
                ) : (
                  <span className="text-sm font-extrabold text-blue-900 dark:text-blue-200">{activeRecord.cropKg ? `${activeRecord.cropKg} kg` : '-'}</span>
                )}
              </div>
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 p-3.5 rounded-xl flex justify-between items-center shadow-2xs">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">{t.otherLeafKg}</span>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    onKeyDown={preventNegativeKeys}
                    value={editForm.otherLeafKg || ''}
                    onChange={(e) => handleMetaFieldChange('otherLeafKg', e.target.value)}
                    className="w-24 bg-amber-50 dark:bg-slate-800 border border-amber-400 rounded px-2 py-0.5 text-xs font-bold text-right outline-none"
                  />
                ) : (
                  <span className="text-sm font-extrabold text-amber-950 dark:text-amber-200">{activeRecord.otherLeafKg ? `${activeRecord.otherLeafKg} kg` : '-'}</span>
                )}
              </div>
            </div>

            {/* Operations Parameters */}
            <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold w-1/2 bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.rollingStartTime}</td>
                    <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editForm.rollingStartTime || ''}
                          onChange={(e) => handleMetaFieldChange('rollingStartTime', e.target.value)}
                          className="bg-emerald-50 dark:bg-slate-800 border border-emerald-400 rounded px-2 py-1 text-xs font-bold outline-none"
                        />
                      ) : (activeRecord.rollingStartTime || '-')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.rollingEndTime}</td>
                    <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                      {isEditing ? (
                        <input
                          type="time"
                          value={editForm.rollingEndTime || ''}
                          onChange={(e) => handleMetaFieldChange('rollingEndTime', e.target.value)}
                          className="bg-emerald-50 dark:bg-slate-800 border border-emerald-400 rounded px-2 py-1 text-xs font-bold outline-none"
                        />
                      ) : (activeRecord.rollingEndTime || '-')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.totalRollingHours}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{activeRecord.totalRollingHours || '-'}</span>
                      {analysis.isOverdue && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-xs rounded border border-red-200 dark:border-red-900/50">
                          Overdue (+{analysis.diffPercentage}%)
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.sameOrNext}</td>
                    <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                      {isEditing ? (
                        <select
                          value={editForm.dayType || 'Same Day'}
                          onChange={(e) => handleMetaFieldChange('dayType', e.target.value)}
                          className="bg-emerald-50 dark:bg-slate-800 border border-emerald-400 rounded px-2 py-1 text-xs font-bold outline-none"
                        >
                          <option value="Same Day">{t.sameDay}</option>
                          <option value="Next Day">{t.nextDay}</option>
                        </select>
                      ) : (activeRecord.dayType === 'Next Day' ? t.nextDay : t.sameDay)}
                    </td>
                  </tr>
                  <tr className="bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{t.noOfBatches}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      {batches.length} {activeRecord.standardBatchKg ? `(${t.standardBatch}: ${activeRecord.standardBatchKg} kg)` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* --- Exact Reference Table --- */}
            <div className="w-full overflow-x-auto pb-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  {/* Tier 1: 1ST DHOOL & 2ND DHOOL */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 uppercase text-xs font-black">
                    <th rowSpan={3} className="border-r border-slate-200 dark:border-slate-800 p-2.5 w-16 bg-slate-100/60 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-black text-sm">
                      {t.no}
                    </th>
                    <th colSpan={4} className="border-r border-slate-200 dark:border-slate-800 p-2.5 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-black tracking-wider text-sm">
                      {t.dhool1}
                    </th>
                    <th colSpan={4} className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-black tracking-wider text-sm">
                      {t.dhool2}
                    </th>
                  </tr>

                  {/* Tier 2: Roll Numbers & WET DHOOL */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    <th rowSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2 w-48 align-middle">
                      {t.roll01}
                    </th>
                    <th rowSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2 w-48 align-middle">
                      {t.roll02}
                    </th>
                    <th colSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-1.5 bg-slate-50/50 dark:bg-slate-800/50 font-black">
                      {t.wetDhool}
                    </th>

                    <th rowSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2 w-48 align-middle">
                      {t.roll03}
                    </th>
                    <th rowSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2 w-48 align-middle">
                      {t.roll04}
                    </th>
                    <th colSpan={2} className="p-1.5 bg-slate-50/50 dark:bg-slate-800/50 font-black">
                      {t.wetDhool}
                    </th>
                  </tr>

                  {/* Tier 3: KG and % */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300">
                    <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-24">{t.kg}</th>
                    <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-16">{t.pct}</th>
                    <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-24">{t.kg}</th>
                    <th className="p-1.5 w-16">{t.pct}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {batches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Batch NO: */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-black text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-800/30 text-sm">
                        {String(b.batchNo).padStart(2, '0')}
                      </td>

                      {/* Roll 01 Time Range */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-bold text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={b.dhool1?.roll01Start || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool1', 'roll01Start', e.target.value)}
                              className={inlineTimeInput}
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={b.dhool1?.roll01End || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool1', 'roll01End', e.target.value)}
                              className={inlineTimeInput}
                            />
                          </div>
                        ) : (
                          formatTimeRange(b.dhool1?.roll01Start, b.dhool1?.roll01End)
                        )}
                      </td>

                      {/* Roll 02 Time Range */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-bold text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={b.dhool1?.roll02Start || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool1', 'roll02Start', e.target.value)}
                              className={inlineTimeInput}
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={b.dhool1?.roll02End || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool1', 'roll02End', e.target.value)}
                              className={inlineTimeInput}
                            />
                          </div>
                        ) : (
                          formatTimeRange(b.dhool1?.roll02Start, b.dhool1?.roll02End)
                        )}
                      </td>

                      {/* 1st Dhool Wet Kg */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-black text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/20 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            onKeyDown={preventNegativeKeys}
                            value={b.dhool1?.wetDhoolKg ?? ''}
                            onChange={(e) => handleBatchCellChange(idx, 'dhool1', 'wetDhoolKg', e.target.value)}
                            className={inlineInput}
                          />
                        ) : (
                          b.dhool1?.wetDhoolKg ? Number(b.dhool1.wetDhoolKg).toFixed(2) : '-'
                        )}
                      </td>

                      {/* 1st Dhool % */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-bold text-slate-600 dark:text-slate-400">
                        {b.dhool1?.percentage ? `${b.dhool1.percentage}%` : '-'}
                      </td>

                      {/* Roll 03 Time Range */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-bold text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={b.dhool2?.roll03Start || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool2', 'roll03Start', e.target.value)}
                              className={inlineTimeInput}
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={b.dhool2?.roll03End || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool2', 'roll03End', e.target.value)}
                              className={inlineTimeInput}
                            />
                          </div>
                        ) : (
                          formatTimeRange(b.dhool2?.roll03Start, b.dhool2?.roll03End)
                        )}
                      </td>

                      {/* Roll 04 Time Range */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-bold text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={b.dhool2?.roll04Start || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool2', 'roll04Start', e.target.value)}
                              className={inlineTimeInput}
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={b.dhool2?.roll04End || ''}
                              onChange={(e) => handleBatchCellChange(idx, 'dhool2', 'roll04End', e.target.value)}
                              className={inlineTimeInput}
                            />
                          </div>
                        ) : (
                          formatTimeRange(b.dhool2?.roll04Start, b.dhool2?.roll04End)
                        )}
                      </td>

                      {/* 2nd Dhool Wet Kg */}
                      <td className="border-r border-slate-200 dark:border-slate-800 p-1 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            onKeyDown={preventNegativeKeys}
                            value={b.dhool2?.wetDhoolKg ?? ''}
                            onChange={(e) => handleBatchCellChange(idx, 'dhool2', 'wetDhoolKg', e.target.value)}
                            className={inlineInput}
                          />
                        ) : (
                          b.dhool2?.wetDhoolKg ? Number(b.dhool2.wetDhoolKg).toFixed(2) : '-'
                        )}
                      </td>

                      {/* 2nd Dhool % */}
                      <td className="p-2 font-bold text-slate-600 dark:text-slate-400">
                        {b.dhool2?.percentage ? `${b.dhool2.percentage}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer */}
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-black text-slate-900 dark:text-slate-100 text-xs border-t border-slate-200 dark:border-slate-800">
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2.5 uppercase text-slate-700 dark:text-slate-200">
                      {t.total}
                    </td>

                    {/* 1st Dhool Totals */}
                    <td colSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2"></td>
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-blue-700 dark:text-blue-400 font-black text-sm bg-blue-50/40 dark:bg-blue-950/30">
                      {sumD1Kg.toFixed(2)} kg
                    </td>
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-blue-700 dark:text-blue-300 font-bold">
                      {avgD1Pct}%
                    </td>

                    {/* 2nd Dhool Totals */}
                    <td colSpan={2} className="border-r border-slate-200 dark:border-slate-800 p-2"></td>
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-emerald-700 dark:text-emerald-400 font-black text-sm bg-emerald-50/40 dark:bg-emerald-950/30">
                      {sumD2Kg.toFixed(2)} kg
                    </td>
                    <td className="p-2 text-emerald-700 dark:text-emerald-300 font-bold">
                      {avgD2Pct}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 💡 NEW: Hydro Meters Chart Section (View & Edit Mode) */}
            {/* --- SECTION: HYDRO METERS CHART - ROLLING ROOM --- */}
            {(activeRecord?.rollingHydroReadings?.length > 0 || isEditing) && (
                <div className="mt-6 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
                        <div className="flex items-center gap-2">
                            <ThermometerSun className="w-5 h-5 text-orange-500" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                {t.hydroTitle} - Rolling Room Data
                            </h3>
                        </div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditForm(prev => ({
                                        ...prev,
                                        rollingHydroReadings: [...(prev.rollingHydroReadings || []), { time: '', dryBulb: '', wetBulb: '', difference: '' }]
                                    }));
                                }}
                                className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200 transition-colors"
                            >
                                + Add Reading
                            </button>
                        )}
                    </div>
                    
                    <table className="w-full text-center text-xs border-collapse min-w-[500px]">
                        <thead>
                            <tr className="bg-orange-50/60 dark:bg-orange-950/20 text-orange-900 dark:text-orange-300 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase">
                                <th className="p-2.5 w-1/4">{t.hydroTime}</th>
                                <th className="p-2.5 w-1/4">{t.hydroDryBulb}</th>
                                <th className="p-2.5 w-1/4">{t.hydroWetBulb}</th>
                                <th className="p-2.5 w-1/4">{t.hydroDiff}</th>
                                {isEditing && <th className="p-2.5 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {((isEditing ? editForm?.rollingHydroReadings : activeRecord?.rollingHydroReadings) || []).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="time" value={row.time || ''} onChange={(e) => handleHydroCellChange('rolling', idx, 'time', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-orange-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-orange-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.time ? format12Hour(row.time) : '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="number" step="any" placeholder="0" value={row.dryBulb || ''} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroCellChange('rolling', idx, 'dryBulb', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-orange-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-orange-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.dryBulb || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="number" step="any" placeholder="0" value={row.wetBulb || ''} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroCellChange('rolling', idx, 'wetBulb', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-orange-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-orange-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.wetBulb || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <span className="font-black text-orange-600 dark:text-orange-400">{row.difference || '-'}</span>
                                    </td>
                                    {isEditing && (
                                        <td className="p-2">
                                            <button type="button" onClick={() => setRowToDelete({ type: 'rolling', index: idx, time: row.time || 'Unknown' })} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {((isEditing ? editForm?.rollingHydroReadings : activeRecord?.rollingHydroReadings) || []).length === 0 && !isEditing && (
                                <tr><td colSpan="4" className="p-6 text-slate-400 font-semibold text-sm">No Temperature Readings Available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- SECTION: HYDRO METERS CHART - FERMENTATION ROOM --- */}
            {(activeRecord?.fermentationHydroReadings?.length > 0 || isEditing) && (
                <div className="mt-6 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
                        <div className="flex items-center gap-2">
                            <ThermometerSun className="w-5 h-5 text-blue-500" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                {t.hydroTitle} - Fermentation Room Data
                            </h3>
                        </div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditForm(prev => ({
                                        ...prev,
                                        fermentationHydroReadings: [...(prev.fermentationHydroReadings || []), { time: '', dryBulb: '', wetBulb: '', difference: '' }]
                                    }));
                                }}
                                className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition-colors"
                            >
                                + Add Reading
                            </button>
                        )}
                    </div>
                    
                    <table className="w-full text-center text-xs border-collapse min-w-[500px]">
                        <thead>
                            <tr className="bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase">
                                <th className="p-2.5 w-1/4">{t.hydroTime}</th>
                                <th className="p-2.5 w-1/4">{t.hydroDryBulb}</th>
                                <th className="p-2.5 w-1/4">{t.hydroWetBulb}</th>
                                <th className="p-2.5 w-1/4">{t.hydroDiff}</th>
                                {isEditing && <th className="p-2.5 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {((isEditing ? editForm?.fermentationHydroReadings : activeRecord?.fermentationHydroReadings) || []).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="time" value={row.time || ''} onChange={(e) => handleHydroCellChange('fermentation', idx, 'time', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-blue-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.time ? format12Hour(row.time) : '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="number" step="any" placeholder="0" value={row.dryBulb || ''} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroCellChange('fermentation', idx, 'dryBulb', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-blue-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.dryBulb || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {isEditing ? (
                                            <input type="number" step="any" placeholder="0" value={row.wetBulb || ''} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroCellChange('fermentation', idx, 'wetBulb', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-blue-200 rounded px-2 py-1 text-center outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                                        ) : (
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{row.wetBulb || '-'}</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <span className="font-black text-blue-600 dark:text-blue-400">{row.difference || '-'}</span>
                                    </td>
                                    {isEditing && (
                                        <td className="p-2">
                                            <button type="button" onClick={() => setRowToDelete({ type: 'fermentation', index: idx, time: row.time || 'Unknown' })} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {((isEditing ? editForm?.fermentationHydroReadings : activeRecord?.fermentationHydroReadings) || []).length === 0 && !isEditing && (
                                <tr><td colSpan="4" className="p-6 text-slate-400 font-semibold text-sm">No Temperature Readings Available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Total Wet Dhool Card */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {t.grandTotalWetDhoolTitle}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                  {grandTotalWetDhool.toFixed(2)} kg
                </span>
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-300/80 dark:border-emerald-800 shadow-2xs">
                  {grandTotalPct}% of Total Capacity ({totalCapacityKg} kg)
                </span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* --- AlertDialog Component --- */}
        <AlertDialog
          open={!!rowToDelete}
          onOpenChange={() => setRowToDelete(null)}
        >
          <AlertDialogContent className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-w-[420px]">
            <AlertDialogHeader className="text-left space-y-2">
              <AlertDialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2 text-base font-bold">
                <Trash2 size={18} strokeWidth={2.5} />
                Delete Row Data
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm font-medium pt-1">
                Are you sure you want to permanently delete data for the{" "}
                <strong className="text-slate-900 dark:text-white font-black">
                  {rowToDelete?.time ? format12Hour(rowToDelete.time) : ''}
                </strong>{" "}
                time slot?
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="mt-6 flex justify-end gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => setRowToDelete(null)}
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-4 py-2 cursor-pointer font-bold transition-colors m-0"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRowDelete}
                className="bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-lg px-4 py-2 cursor-pointer font-bold shadow-sm transition-colors m-0"
              >
                Delete Row
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        <AlertDialog
          open={isMainDeleteAlertOpen}
          onOpenChange={setIsMainDeleteAlertOpen}
        >
          <AlertDialogContent className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-w-[420px]">
            <AlertDialogHeader className="text-left space-y-2">
              <AlertDialogTitle className="text-red-600 dark:text-red-500 flex items-center gap-2 text-base font-bold">
                <Trash2 size={18} strokeWidth={2.5} />
                Delete Rolling Sheet
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm font-medium pt-1">
                Are you sure you want to permanently delete this entire rolling sheet for{" "}
                <strong className="text-slate-900 dark:text-white font-black">
                  {currentRecord?.mfDate}
                </strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="mt-6 flex justify-end gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => setIsMainDeleteAlertOpen(false)}
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-4 py-2 cursor-pointer font-bold transition-colors m-0"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRecord}
                className="bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-lg px-4 py-2 cursor-pointer font-bold shadow-sm transition-colors m-0"
              >
                Delete Sheet
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default RollingRoomSheetSummary;