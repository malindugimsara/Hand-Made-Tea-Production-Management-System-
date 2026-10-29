import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Scale,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  FileSpreadsheet,
  Languages,
  Layers,
  Settings2,
  Sparkles,
  CheckCircle2,
  ThermometerSun, // New icon for Hydro Meter
  LineChart // New icon for Chart
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper to get yesterday's date in YYYY-MM-DD
const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

// Calculate duration between HH:MM strings
const calculateDuration = (start, end) => {
  if (!start || !end) return '';
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Midnight rollover
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hrs}h ${mins}m`;
};

// Helper to compute percentage with dynamic standard batch divisor
const computePercentage = (kg, standardBatchKg) => {
  const kgVal = parseFloat(kg);
  const divisor = parseFloat(standardBatchKg) || 560;
  if (!isNaN(kgVal) && kgVal > 0 && divisor > 0) {
    return ((kgVal / divisor) * 100).toFixed(2);
  }
  return '';
};

// Helper to prevent negative signs & exponential notations on numeric inputs
const preventNegativeKeys = (e) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
};

// Initial state strictly matching the reference manual sheet
const initialBatchRow = (batchNum = 1) => ({
  batchNo: batchNum,
  // 1st Dhool: Roll 01 & Roll 02 + Wet Dhool
  dhool1: {
    roll01Start: '',
    roll01End: '',
    roll02Start: '',
    roll02End: '',
    wetDhoolKg: '',
    percentage: ''
  },
  // 2nd Dhool: Roll 03 & Roll 04 + Wet Dhool
  dhool2: {
    roll03Start: '',
    roll03End: '',
    roll04Start: '',
    roll04End: '',
    wetDhoolKg: '',
    percentage: ''
  }
});

// Initial state for Hydro Meter Chart row
const initialHydroRow = () => ({
    time: '',
    dryBulb: '',
    wetBulb: '',
    difference: ''
});

const RollingRoomSheetForm = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Language State
  const [lang, setLang] = useState('EN');

  // Configurable Standard Batch Weight (Default: 560 kg)
  const [standardBatchKg, setStandardBatchKg] = useState(560);

  // Header & Operations Metadata
  const [meta, setMeta] = useState({
    cropDate: getYesterdayDate(),
    mfDate: '',
    cropKg: '',
    otherLeafKg: '',
    rollingStartTime: '',
    rollingEndTime: '',
    totalRollingHours: '',
    dayType: 'Same Day',
    noOfBatches: 1
  });

  // Default rows matching the logbook
  const [batches, setBatches] = useState([
    initialBatchRow(1)
  ]);

  // 💡 NEW: States for TWO Hydro Meter Charts
  const [rollingHydroChart, setRollingHydroChart] = useState([]);
  const [fermentationHydroChart, setFermentationHydroChart] = useState([]);

  const [showNightSlots, setShowNightSlots] = useState(false);

  const nightTimeSlots = [
      { label: '6:00 PM', val: '18:00' }, { label: '7:00 PM', val: '19:00' },
      { label: '8:00 PM', val: '20:00' }, { label: '9:00 PM', val: '21:00' },
      { label: '10:00 PM', val: '22:00' }, { label: '11:00 PM', val: '23:00' },
      { label: '12:00 AM', val: '00:00' }, { label: '1:00 AM', val: '01:00' },
      { label: '2:00 AM', val: '02:00' }, { label: '3:00 AM', val: '03:00' },
      { label: '4:00 AM', val: '04:00' }, { label: '5:00 AM', val: '05:00' },
      { label: '6:00 AM', val: '06:00' }
  ];

  // 💡 Updated to accept 'type' (rolling or fermentation)
  const handleAddSpecificTimeRow = (type, timeVal) => {
      const setChart = type === 'rolling' ? setRollingHydroChart : setFermentationHydroChart;
      setChart(prev => [...prev, { time: timeVal, dryBulb: '', wetBulb: '', difference: '' }]);
  };

  

  // Translations
  const t = useMemo(() => ({
    title: lang === 'SI' ? "රෝලිං කාමර වාර්තා පත්‍රිකාව" : "ROLLING ROOM SHEET",
    subtitle: lang === 'SI' ? "දෛනික රෝලිං සහ තෙත් ධූල් වාර්තාව." : "Daily rolling cycles, roll times, and wet dhool weights.",

    // Top Metadata
    cropDate: lang === 'SI' ? "අස්වැන්න දිනය (Crop Date)" : "Crop Date",
    mfDate: lang === 'SI' ? "නිෂ්පාදිත දිනය (M/F Date)" : "M/F Date",
    cropKg: lang === 'SI' ? "අස්වැන්න (Crop Kg)" : "Crop (Kg)",
    otherLeafKg: lang === 'SI' ? "වෙනත් දළු (Other Leaf Kg)" : "Other Leaf (Kg)",

    // Operations summary
    rollingStartTime: lang === 'SI' ? "රෝලිං ආරම්භක වේලාව" : "Rolling Start Time",
    rollingEndTime: lang === 'SI' ? "රෝලිං අවසන් වේලාව" : "Rolling End Time",
    totalRollingHours: lang === 'SI' ? "මුළු රෝලිං පැය ගණන" : "Total Rolling Hours",
    sameOrNext: lang === 'SI' ? "එම දිනය / ඊළඟ දිනය" : "Same Day / Next Day",
    sameDay: lang === 'SI' ? "එම දිනය (Same Day)" : "Same Day",
    nextDay: lang === 'SI' ? "ඊළඟ දිනය (Next Day)" : "Next Day",
    noOfBatches: lang === 'SI' ? "කාණ්ඩ ගණන" : "No of Batches",
    standardBatch: lang === 'SI' ? "සම්මත කාණ්ඩ බර (Kg)" : "Standard Batch (Kg)",

    // Table Exact Match
    no: "NO:",
    dhool1: lang === 'SI' ? "1 වන ධූල් (1ST DHOOL)" : "1ST DHOOL",
    dhool2: lang === 'SI' ? "2 වන ධූල් (2ND DHOOL)" : "2ND DHOOL",
    roll01: "ROLL NO:01",
    roll02: "ROLL NO:02",
    roll03: "ROLL NO:03",
    roll04: "ROLL NO:04",
    wetDhool: lang === 'SI' ? "තෙත් ධූල්" : "WET DHOOL",
    kg: "KG",
    pct: "%",
    total: lang === 'SI' ? "එකතුව" : "TOTAL",
    
    // NEW: Hydro Meter Chart Translations
    hydroTitle: lang === 'SI' ? "හයිඩ්‍රෝ මීටර් සටහන" : "HYDRO METERS CHART",
    time: lang === 'SI' ? "වේලාව" : "TIME",
    dryBulb: lang === 'SI' ? "වියළි බල්බය" : "DRY BULB",
    wetBulb: lang === 'SI' ? "තෙත් බල්බය" : "WET BULB",
    difference: lang === 'SI' ? "වෙනස" : "DIFFERENCE",
    addReading: lang === 'SI' ? "කියවීමක් එක් කරන්න" : "Add Reading",

    // Actions
    addBatch: lang === 'SI' ? "කාණ්ඩයක් එක් කරන්න" : "Add Batch",
    save: lang === 'SI' ? "වාර්තාව සුරකින්න" : "Save Rolling Sheet",
    clear: lang === 'SI' ? "හිස් කරන්න" : "Clear All"
  }), [lang]);

  // 1. Auto calculate M/F Date (Crop Date + 1 Day)
  useEffect(() => {
    if (meta.cropDate) {
      const crop = new Date(meta.cropDate);
      crop.setDate(crop.getDate() + 1);
      setMeta(prev => ({ ...prev, mfDate: crop.toISOString().split('T')[0] }));
    }
  }, [meta.cropDate]);

  // 2. Auto calculate Total Rolling Hours
  useEffect(() => {
    if (meta.rollingStartTime && meta.rollingEndTime) {
      const duration = calculateDuration(meta.rollingStartTime, meta.rollingEndTime);
      setMeta(prev => ({ ...prev, totalRollingHours: duration }));
    }
  }, [meta.rollingStartTime, meta.rollingEndTime]);

  // 3. Auto-sync No. of Batches with table row count
  useEffect(() => {
    setMeta(prev => ({ ...prev, noOfBatches: batches.length }));
  }, [batches.length]);

  // 4. Recalculate percentages when standardBatchKg changes
  useEffect(() => {
    setBatches(prev => prev.map(b => ({
      ...b,
      dhool1: { ...b.dhool1, percentage: computePercentage(b.dhool1.wetDhoolKg, standardBatchKg) },
      dhool2: { ...b.dhool2, percentage: computePercentage(b.dhool2.wetDhoolKg, standardBatchKg) }
    })));
  }, [standardBatchKg]);

  // 4. Recalculate percentages when standardBatchKg changes
  useEffect(() => {
    setBatches(prev => prev.map(b => ({
      ...b,
      dhool1: { ...b.dhool1, percentage: computePercentage(b.dhool1.wetDhoolKg, standardBatchKg) },
      dhool2: { ...b.dhool2, percentage: computePercentage(b.dhool2.wetDhoolKg, standardBatchKg) }
    })));
  }, [standardBatchKg]);

  // 💡 NEW: 5. Date එක වෙනස් වනවිට කලින් Save කර ඇති දත්ත Form එකට Load කරගැනීම
  // 💡 NEW: 5. Date eka wenas wanawita kalin Save kara athi datta Form ekata Load karaganeema
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!meta.cropDate) return;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BACKEND_URL}/api/rolling-room-sheet?cropDate=${meta.cropDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (response.ok && result.success && result.data && result.data.length > 0) {
          const record = result.data[0];
          
          setMeta({
            cropDate: record.cropDate || meta.cropDate,
            mfDate: record.mfDate || '',
            cropKg: record.cropKg || '',
            otherLeafKg: record.otherLeafKg || '',
            rollingStartTime: record.rollingStartTime || '',
            rollingEndTime: record.rollingEndTime || '',
            totalRollingHours: record.totalRollingHours || '',
            dayType: record.dayType || 'Same Day',
            noOfBatches: record.noOfBatches || 1
          });
          setStandardBatchKg(record.standardBatchKg || 560);
          
          if (record.batches && record.batches.length > 0) {
              setBatches(record.batches);
          }
          if (record.rollingHydroReadings) setRollingHydroChart(record.rollingHydroReadings); // Updated here
          if (record.fermentationHydroReadings) setFermentationHydroChart(record.fermentationHydroReadings); // Updated here
          
          toast.success("Existing data loaded. You can now add hydro readings.");
        } else {
           // 💡 FIX: Ekhane mfDate blank korar bodole calculate kore set korano holo
           const crop = new Date(meta.cropDate);
           crop.setDate(crop.getDate() + 1);
           const calculatedMfDate = crop.toISOString().split('T')[0];

           setMeta(prev => ({
              ...prev,
              mfDate: calculatedMfDate, 
              cropKg: '',
              otherLeafKg: '',
              rollingStartTime: '',
              rollingEndTime: '',
              totalRollingHours: '',
              dayType: 'Same Day',
              noOfBatches: 1
           }));
           setStandardBatchKg(560);
           setBatches([initialBatchRow(1)]);
           setRollingHydroChart([]);
           setFermentationHydroChart([]);
        }
      } catch (error) {
        console.error("Fetch existing data error:", error);
      }
    };
    
    fetchExistingData();
  }, [meta.cropDate, BACKEND_URL]);

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    if (['cropKg', 'otherLeafKg'].includes(name) && value !== '') {
      const num = parseFloat(value);
      if (num < 0) return;
    }
    setMeta(prev => ({ ...prev, [name]: value }));
  };

  const handleStandardBatchChange = (e) => {
    const val = e.target.value;
    if (val !== '' && parseFloat(val) < 0) return;
    setStandardBatchKg(val);
  };

  const handleBatchCellChange = (index, sectionKey, field, value) => {
    if (field === 'wetDhoolKg' && value !== '') {
      const num = parseFloat(value);
      if (num < 0) return;
    }

    setBatches(prev => {
      const updated = [...prev];
      const targetSection = { ...updated[index][sectionKey], [field]: value };

      if (field === 'wetDhoolKg') {
        targetSection.percentage = computePercentage(value, standardBatchKg);
      }

      updated[index] = { ...updated[index], [sectionKey]: targetSection };
      return updated;
    });
  };

  const handleAddBatch = () => {
    setBatches(prev => [...prev, initialBatchRow(prev.length + 1)]);
  };

  const handleRemoveBatch = (index) => {
    if (batches.length <= 1) {
      toast.error("At least 1 batch row is required.");
      return;
    }
    const filtered = batches.filter((_, i) => i !== index);
    const reIndexed = filtered.map((b, idx) => ({ ...b, batchNo: idx + 1 }));
    setBatches(reIndexed);
  };
  
  // NEW: Handlers for Hydro Meter Chart
  const handleHydroChange = (type, index, field, value) => {
      const setChart = type === 'rolling' ? setRollingHydroChart : setFermentationHydroChart;
      setChart(prev => {
          const updated = [...prev];
          updated[index][field] = value;
          
          if (field === 'dryBulb' || field === 'wetBulb') {
              const dry = parseFloat(updated[index].dryBulb);
              const wet = parseFloat(updated[index].wetBulb);
              if (!isNaN(dry) && !isNaN(wet)) {
                  updated[index].difference = (dry - wet).toString();
              } else {
                  updated[index].difference = '';
              }
          }
          return updated;
      });
  };

  const handleAddHydroRow = (type) => {
      const setChart = type === 'rolling' ? setRollingHydroChart : setFermentationHydroChart;
      setChart(prev => [...prev, initialHydroRow()]);
  };

  const handleRemoveHydroRow = (type, index) => {
      const setChart = type === 'rolling' ? setRollingHydroChart : setFermentationHydroChart;
      setChart(prev => {
          if (prev.length <= 1) {
              toast.error("At least 1 reading is required.");
              return prev;
          }
          return prev.filter((_, i) => i !== index);
      });
  };


  const handleClear = () => {
    setMeta({
      // ... (meta reset codes)
    });
    setStandardBatchKg(560);
    setBatches([initialBatchRow(1)]);
    
    // 💡 Reset both charts
    setRollingHydroChart([]); 
    setFermentationHydroChart([]); 
    
    toast.success("Form reset to initial state.");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading("Saving Rolling Room Sheet...");

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...meta,
        standardBatchKg: parseFloat(standardBatchKg) || 560,
        batches,
        // 💡 Save both charts separately
        rollingHydroReadings: rollingHydroChart, 
        fermentationHydroReadings: fermentationHydroChart 
      };

      const response = await fetch(`${BACKEND_URL}/api/rolling-room-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Rolling Room Sheet saved successfully!", { id: loadingToast });
      } else {
        toast.error(result.message || "Failed to save sheet.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Server connection error.", { id: loadingToast });
    }
  };

  // Totals calculations
  const sumD1Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool1.wetDhoolKg) || 0), 0);
  const sumD2Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool2.wetDhoolKg) || 0), 0);
  const grandTotalWetDhool = sumD1Kg + sumD2Kg;

  const totalCapacityKg = batches.length * (parseFloat(standardBatchKg) || 560);
  const avgD1Pct = totalCapacityKg > 0 ? ((sumD1Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgD2Pct = totalCapacityKg > 0 ? ((sumD2Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const grandTotalPct = totalCapacityKg > 0 ? ((grandTotalWetDhool / totalCapacityKg) * 100).toFixed(2) : '0.00';

  const inputBase = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all";
  const readOnlyBase = "w-full bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-xl p-2.5 font-bold select-none outline-none";
  const timeInput = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md py-1 px-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all";
  const tableInput = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md py-1 px-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all";
  const tableReadOnly = "w-full bg-slate-100/70 dark:bg-slate-800/50 border border-transparent text-slate-700 dark:text-slate-300 rounded-md py-1 px-1 text-xs text-center font-bold select-none";
  
  // Styles specific for Hydro Chart
  const hydroTableInput = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md py-1.5 px-2 text-sm text-center outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all";
  const hydroTimeInput = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-md py-1.5 px-2 text-sm text-center outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all";
  const hydroReadOnly = "w-full bg-slate-100/70 dark:bg-slate-800/50 border border-transparent text-slate-700 dark:text-slate-300 rounded-md py-1.5 px-2 text-sm text-center font-bold select-none";


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Bar & Controls --- */}
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-2xl shadow-md ring-4 ring-emerald-50 dark:ring-emerald-950/40">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {t.title}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Exact Log Sheet
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end z-10">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-xl shadow-xs">
              <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                {t.standardBatch}:
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={standardBatchKg}
                onKeyDown={preventNegativeKeys}
                onChange={handleStandardBatchChange}
                className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-extrabold text-xs rounded-lg px-2 py-1 text-center outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <Languages size={15} className="text-slate-500 dark:text-slate-400" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>
          </div>
        </div>

        {/* --- Header Parameters --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Crop Information</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Step 1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.cropDate}</label>
                <input
                  type="date"
                  name="cropDate"
                  value={meta.cropDate}
                  onChange={handleMetaChange}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.mfDate}</label>
                <input
                  type="date"
                  name="mfDate"
                  value={meta.mfDate}
                  readOnly
                  className={readOnlyBase}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.cropKg}</label>
                <div className="relative">
                  <input
                    type="number"
                    name="cropKg"
                    min="0"
                    step="any"
                    value={meta.cropKg}
                    onKeyDown={preventNegativeKeys}
                    onChange={handleMetaChange}
                    placeholder="0.00"
                    className={`${inputBase} pr-8 text-emerald-700 dark:text-emerald-400 font-extrabold`}
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.otherLeafKg}</label>
                <div className="relative">
                  <input
                    type="number"
                    name="otherLeafKg"
                    min="0"
                    step="any"
                    value={meta.otherLeafKg}
                    onKeyDown={preventNegativeKeys}
                    onChange={handleMetaChange}
                    placeholder="0.00"
                    className={`${inputBase} pr-8 text-slate-800 dark:text-slate-100 font-extrabold`}
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Rolling Parameters</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Step 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.rollingStartTime}</label>
                <input
                  type="time"
                  name="rollingStartTime"
                  value={meta.rollingStartTime}
                  onChange={handleMetaChange}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.rollingEndTime}</label>
                <input
                  type="time"
                  name="rollingEndTime"
                  value={meta.rollingEndTime}
                  onChange={handleMetaChange}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.totalRollingHours}</label>
                <input
                  type="text"
                  value={meta.totalRollingHours}
                  readOnly
                  placeholder="Auto"
                  className={`${readOnlyBase} text-center font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.sameOrNext}</label>
                <select
                  name="dayType"
                  value={meta.dayType}
                  onChange={handleMetaChange}
                  className={`${inputBase} cursor-pointer`}
                >
                  <option value="Same Day">{t.sameDay}</option>
                  <option value="Next Day">{t.nextDay}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.noOfBatches}</label>
                <input
                  type="number"
                  name="noOfBatches"
                  value={meta.noOfBatches}
                  readOnly
                  className={`${readOnlyBase} text-center font-black text-slate-900 dark:text-white`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 2: Exact Layout Batch Rolling Grid (Light Gray Borders) --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-hidden">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xs">
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Batch Rolling Grid</h2>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Formula: (Wet Dhool Kg ÷ {standardBatchKg}) × 100
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddBatch}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Plus size={14} /> {t.addBatch}
            </button>
          </div>

          {/* 📱 Mobile Responsive Cards (< 1024px) */}
          <div className="flex lg:hidden flex-col gap-4">
            {batches.map((batch, index) => {
              const bD1 = parseFloat(batch.dhool1.wetDhoolKg) || 0;
              const bD2 = parseFloat(batch.dhool2.wetDhoolKg) || 0;
              const batchTotalKg = bD1 + bD2;

              return (
                <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        {t.no} {String(batch.batchNo).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                        Total: {batchTotalKg.toFixed(2)} kg
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBatch(index)}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {/* 1st Dhool */}
                    <div className="p-3 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <div className="text-[11px] font-black text-blue-800 dark:text-blue-300 uppercase mb-2">
                        {t.dhool1}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.roll01} (Start – End)</label>
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={batch.dhool1.roll01Start}
                              onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll01Start', e.target.value)}
                              className={timeInput}
                            />
                            <input
                              type="time"
                              value={batch.dhool1.roll01End}
                              onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll01End', e.target.value)}
                              className={timeInput}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.roll02} (Start – End)</label>
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={batch.dhool1.roll02Start}
                              onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll02Start', e.target.value)}
                              className={timeInput}
                            />
                            <input
                              type="time"
                              value={batch.dhool1.roll02End}
                              onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll02End', e.target.value)}
                              className={timeInput}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.wetDhool} (KG)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.0"
                            value={batch.dhool1.wetDhoolKg}
                            onKeyDown={preventNegativeKeys}
                            onChange={(e) => handleBatchCellChange(index, 'dhool1', 'wetDhoolKg', e.target.value)}
                            className={`${tableInput} font-bold text-blue-700 dark:text-blue-400`}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">%</label>
                          <input
                            type="text"
                            readOnly
                            placeholder="--"
                            value={batch.dhool1.percentage ? `${batch.dhool1.percentage}%` : ''}
                            className={tableReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2nd Dhool */}
                    <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <div className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase mb-2">
                        {t.dhool2}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.roll03} (Start – End)</label>
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={batch.dhool2.roll03Start}
                              onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll03Start', e.target.value)}
                              className={timeInput}
                            />
                            <input
                              type="time"
                              value={batch.dhool2.roll03End}
                              onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll03End', e.target.value)}
                              className={timeInput}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.roll04} (Start – End)</label>
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={batch.dhool2.roll04Start}
                              onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll04Start', e.target.value)}
                              className={timeInput}
                            />
                            <input
                              type="time"
                              value={batch.dhool2.roll04End}
                              onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll04End', e.target.value)}
                              className={timeInput}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">{t.wetDhool} (KG)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.0"
                            value={batch.dhool2.wetDhoolKg}
                            onKeyDown={preventNegativeKeys}
                            onChange={(e) => handleBatchCellChange(index, 'dhool2', 'wetDhoolKg', e.target.value)}
                            className={`${tableInput} font-bold text-emerald-700 dark:text-emerald-400`}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">%</label>
                          <input
                            type="text"
                            readOnly
                            placeholder="--"
                            value={batch.dhool2.percentage ? `${batch.dhool2.percentage}%` : ''}
                            className={tableReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 Exact Desktop Table Layout with Light Gray Lines */}
          <div className="hidden lg:block w-full overflow-x-auto pb-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                {/* Level 1: Category Headers (1ST DHOOL & 2ND DHOOL) */}
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
                  <th rowSpan={3} className="border-l border-slate-200 dark:border-slate-800 p-2 w-12 bg-slate-50 dark:bg-slate-900"></th>
                </tr>

                {/* Level 2: Sub-sections (ROLL NO:01, ROLL NO:02, WET DHOOL | ROLL NO:03, ROLL NO:04, WET DHOOL) */}
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

                {/* Level 3: KG and % split under WET DHOOL */}
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300">
                  <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-20">{t.kg}</th>
                  <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-16">{t.pct}</th>
                  <th className="border-r border-slate-200 dark:border-slate-800 p-1.5 w-20">{t.kg}</th>
                  <th className="p-1.5 w-16">{t.pct}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {batches.map((batch, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* NO: Column */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-2 font-black text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-800/30 text-sm">
                      {String(batch.batchNo).padStart(2, '0')}
                    </td>

                    {/* --- 1ST DHOOL: ROLL NO:01 (Start – End) --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="time"
                          value={batch.dhool1.roll01Start}
                          onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll01Start', e.target.value)}
                          className={timeInput}
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={batch.dhool1.roll01End}
                          onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll01End', e.target.value)}
                          className={timeInput}
                        />
                      </div>
                    </td>

                    {/* --- 1ST DHOOL: ROLL NO:02 (Start – End) --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="time"
                          value={batch.dhool1.roll02Start}
                          onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll02Start', e.target.value)}
                          className={timeInput}
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={batch.dhool1.roll02End}
                          onChange={(e) => handleBatchCellChange(index, 'dhool1', 'roll02End', e.target.value)}
                          className={timeInput}
                        />
                      </div>
                    </td>

                    {/* --- 1ST DHOOL: WET DHOOL KG --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.0"
                        value={batch.dhool1.wetDhoolKg}
                        onKeyDown={preventNegativeKeys}
                        onChange={(e) => handleBatchCellChange(index, 'dhool1', 'wetDhoolKg', e.target.value)}
                        className={`${tableInput} font-bold text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/20`}
                      />
                    </td>

                    {/* --- 1ST DHOOL: WET DHOOL % --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <input
                        type="text"
                        readOnly
                        placeholder="--"
                        value={batch.dhool1.percentage ? `${batch.dhool1.percentage}%` : ''}
                        className={tableReadOnly}
                      />
                    </td>

                    {/* --- 2ND DHOOL: ROLL NO:03 (Start – End) --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="time"
                          value={batch.dhool2.roll03Start}
                          onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll03Start', e.target.value)}
                          className={timeInput}
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={batch.dhool2.roll03End}
                          onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll03End', e.target.value)}
                          className={timeInput}
                        />
                      </div>
                    </td>

                    {/* --- 2ND DHOOL: ROLL NO:04 (Start – End) --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="time"
                          value={batch.dhool2.roll04Start}
                          onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll04Start', e.target.value)}
                          className={timeInput}
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={batch.dhool2.roll04End}
                          onChange={(e) => handleBatchCellChange(index, 'dhool2', 'roll04End', e.target.value)}
                          className={timeInput}
                        />
                      </div>
                    </td>

                    {/* --- 2ND DHOOL: WET DHOOL KG --- */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.0"
                        value={batch.dhool2.wetDhoolKg}
                        onKeyDown={preventNegativeKeys}
                        onChange={(e) => handleBatchCellChange(index, 'dhool2', 'wetDhoolKg', e.target.value)}
                        className={`${tableInput} font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20`}
                      />
                    </td>

                    {/* --- 2ND DHOOL: WET DHOOL % --- */}
                    <td className="p-1.5">
                      <input
                        type="text"
                        readOnly
                        placeholder="--"
                        value={batch.dhool2.percentage ? `${batch.dhool2.percentage}%` : ''}
                        className={tableReadOnly}
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="border-l border-slate-200 dark:border-slate-800 p-1.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Remove Row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer Totals */}
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

                  <td className="border-l border-slate-200 dark:border-slate-800 p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grand Total Bar */}
          <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Overall Total Wet Dhool Weight:
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


        {/* --- NEW SECTION: HYDRO METERS CHART --- */}
        {/* --- SECTION: HYDRO METERS CHART - ROLLING ROOM --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl shadow-xs border border-orange-200 dark:border-orange-800/50">
                        <ThermometerSun className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.hydroTitle} - Rolling Room Data</h2>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Dry Bulb & Wet Bulb Temperature Readings</span>
                    </div>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                    <button type="button" onClick={() => handleAddHydroRow('rolling')} className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer w-full sm:w-auto justify-center">
                        <Plus size={14} /> Custom Time
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Quick Add Time Slots</h3>
                </div>
                <div className="w-full flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800 scrollbar-track-transparent">
                    {nightTimeSlots.map((slot, idx) => (
                        <button key={idx} type="button" onClick={() => handleAddSpecificTimeRow('rolling', slot.val)} className="flex-shrink-0 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent cursor-pointer shadow-sm hover:shadow-md group">
                            <CheckCircle2 size={14} className="text-emerald-500 group-hover:text-white transition-colors" /> {slot.label}
                        </button>
                    ))}
                </div>
            </div>

            {rollingHydroChart.length > 0 ? (
                <div className="w-full overflow-x-auto pb-2">
                    <div className="min-w-[650px] grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 p-1 items-center">
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.time}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.dryBulb}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.wetBulb}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.difference}</div>
                        <div className="w-10"></div>
                        {rollingHydroChart.map((row, index) => (
                            <React.Fragment key={index}>
                                <div><input type="time" value={row.time} onChange={(e) => handleHydroChange('rolling', index, 'time', e.target.value)} className={hydroTimeInput} /></div>
                                <div><input type="number" step="any" placeholder="0" value={row.dryBulb} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroChange('rolling', index, 'dryBulb', e.target.value)} className={hydroTableInput} /></div>
                                <div><input type="number" step="any" placeholder="0" value={row.wetBulb} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroChange('rolling', index, 'wetBulb', e.target.value)} className={hydroTableInput} /></div>
                                <div><input type="text" readOnly placeholder="-" value={row.difference} className={`${hydroReadOnly} text-orange-600 dark:text-orange-400`} /></div>
                                <div className="flex justify-center">
                                    <button type="button" onClick={() => handleRemoveHydroRow('rolling', index)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
                                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <ThermometerSun size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                    <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No Temperature Readings Added</h3>
                </div>
            )}
        </div>

        {/* --- SECTION: HYDRO METERS CHART - FERMENTATION ROOM --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shadow-xs border border-blue-200 dark:border-blue-800/50">
                        <ThermometerSun className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.hydroTitle} - Fermentation Room Data</h2>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Dry Bulb & Wet Bulb Temperature Readings</span>
                    </div>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                    <button type="button" onClick={() => handleAddHydroRow('fermentation')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer w-full sm:w-auto justify-center">
                        <Plus size={14} /> Custom Time
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Quick Add Time Slots</h3>
                </div>
                <div className="w-full flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800 scrollbar-track-transparent">
                    {nightTimeSlots.map((slot, idx) => (
                        <button key={idx} type="button" onClick={() => handleAddSpecificTimeRow('fermentation', slot.val)} className="flex-shrink-0 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent cursor-pointer shadow-sm hover:shadow-md group">
                            <CheckCircle2 size={14} className="text-emerald-500 group-hover:text-white transition-colors" /> {slot.label}
                        </button>
                    ))}
                </div>
            </div>

            {fermentationHydroChart.length > 0 ? (
                <div className="w-full overflow-x-auto pb-2">
                    <div className="min-w-[650px] grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 p-1 items-center">
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.time}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.dryBulb}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.wetBulb}</div>
                        <div className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 text-center">{t.difference}</div>
                        <div className="w-10"></div>
                        {fermentationHydroChart.map((row, index) => (
                            <React.Fragment key={index}>
                                <div><input type="time" value={row.time} onChange={(e) => handleHydroChange('fermentation', index, 'time', e.target.value)} className={hydroTimeInput} /></div>
                                <div><input type="number" step="any" placeholder="0" value={row.dryBulb} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroChange('fermentation', index, 'dryBulb', e.target.value)} className={hydroTableInput} /></div>
                                <div><input type="number" step="any" placeholder="0" value={row.wetBulb} onKeyDown={preventNegativeKeys} onChange={(e) => handleHydroChange('fermentation', index, 'wetBulb', e.target.value)} className={hydroTableInput} /></div>
                                <div><input type="text" readOnly placeholder="-" value={row.difference} className={`${hydroReadOnly} text-orange-600 dark:text-orange-400`} /></div>
                                <div className="flex justify-center">
                                    <button type="button" onClick={() => handleRemoveHydroRow('fermentation', index)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
                                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <ThermometerSun size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                    <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400">No Temperature Readings Added</h3>
                </div>
            )}
        </div>

        {/* --- Action Buttons --- */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw size={15} />
            {t.clear}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Save size={16} />
            {t.save}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RollingRoomSheetForm;