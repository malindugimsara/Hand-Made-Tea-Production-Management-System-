import React, { useState, useEffect } from 'react';
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
  Settings2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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

// 💡 Helper to prevent negative signs & exponential notations on numeric inputs
const preventNegativeKeys = (e) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
};

const initialBatchRow = (batchNum = 1) => ({
  batchNo: batchNum,
  dhool1: { startTime: '', endTime: '', wetDhoolKg: '', percentage: '' },
  dhool2: { startTime: '', endTime: '', wetDhoolKg: '', percentage: '' },
  bigBulk: { startTime: '', endTime: '', wetDhoolKg: '', percentage: '' }
});

const RollingRoomSheetForm = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  // 💡 Language State
  const [lang, setLang] = useState('EN');

  // 💡 Configurable Standard Batch Weight (Default: 560 kg, strictly >= 0)
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

  // Default shows ONLY ONE batch in the table
  const [batches, setBatches] = useState([
    initialBatchRow(1)
  ]);

  // 💡 Translations
  const t = {
    title: lang === 'SI' ? "රෝලිං කාමර වාර්තා පත්‍රිකාව" : "ROLLING ROOM SHEET",
    subtitle: lang === 'SI' ? "දෛනික රෝලිං, ධූල් සහ බිග් බල්ක් තොරතුරු ඇතුළත් කිරීම." : "Daily recording sheet for rolling cycles, wet dhool weights, and big bulk output.",
    
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
    
    // Table Headers
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
    
    // Actions
    addBatch: lang === 'SI' ? "කාණ්ඩයක් එක් කරන්න" : "Add Batch",
    save: lang === 'SI' ? "වාර්තාව සුරකින්න" : "Save Rolling Sheet",
    clear: lang === 'SI' ? "හිස් කරන්න" : "Clear All"
  };

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

  // 3. Auto-sync No. of Batches with the table row count
  useEffect(() => {
    setMeta(prev => ({ ...prev, noOfBatches: batches.length }));
  }, [batches.length]);

  // 4. Dynamically recalculate all batch percentages whenever standardBatchKg changes
  useEffect(() => {
    setBatches(prev => prev.map(b => ({
      ...b,
      dhool1: { ...b.dhool1, percentage: computePercentage(b.dhool1.wetDhoolKg, standardBatchKg) },
      dhool2: { ...b.dhool2, percentage: computePercentage(b.dhool2.wetDhoolKg, standardBatchKg) },
      bigBulk: { ...b.bigBulk, percentage: computePercentage(b.bigBulk.wetDhoolKg, standardBatchKg) }
    })));
  }, [standardBatchKg]);

  // Handle Meta Change (Strictly disallows negative values for kg fields)
  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    if (['cropKg', 'otherLeafKg'].includes(name) && value !== '') {
      const num = parseFloat(value);
      if (num < 0) return; // Disallow negative
    }
    setMeta(prev => ({ ...prev, [name]: value }));
  };

  // Handle Standard Batch Input Change (Strictly >= 0)
  const handleStandardBatchChange = (e) => {
    const val = e.target.value;
    if (val !== '' && parseFloat(val) < 0) return;
    setStandardBatchKg(val);
  };

  // Handle Batch Cell Input Change (Strictly disallows negative values)
  const handleBatchCellChange = (index, sectionKey, field, value) => {
    if (field === 'wetDhoolKg' && value !== '') {
      const num = parseFloat(value);
      if (num < 0) return; // Disallow negative
    }

    setBatches(prev => {
      const updated = [...prev];
      const targetSection = { ...updated[index][sectionKey], [field]: value };
      
      // Auto % calculation: (Wet Dhool Kg / standardBatchKg) * 100
      if (field === 'wetDhoolKg') {
        targetSection.percentage = computePercentage(value, standardBatchKg);
      }

      updated[index] = { ...updated[index], [sectionKey]: targetSection };
      return updated;
    });
  };

  // Add Batch Row
  const handleAddBatch = () => {
    setBatches(prev => [...prev, initialBatchRow(prev.length + 1)]);
  };

  // Remove Batch Row
  const handleRemoveBatch = (index) => {
    if (batches.length <= 1) {
      toast.error("At least 1 batch row is required.");
      return;
    }
    const filtered = batches.filter((_, i) => i !== index);
    const reIndexed = filtered.map((b, idx) => ({ ...b, batchNo: idx + 1 }));
    setBatches(reIndexed);
  };

  // Clear Form
  const handleClear = () => {
    setMeta({
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
    setStandardBatchKg(560);
    setBatches([initialBatchRow(1)]);
    toast.success("Form reset to initial state.");
  };

  // Save to Backend
  const handleSave = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading("Saving Rolling Room Sheet...");

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...meta,
        standardBatchKg: parseFloat(standardBatchKg) || 560,
        batches
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

  // Summary Column Totals
  const sumD1Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool1.wetDhoolKg) || 0), 0);
  const sumD2Kg = batches.reduce((sum, b) => sum + (parseFloat(b.dhool2.wetDhoolKg) || 0), 0);
  const sumBBKg = batches.reduce((sum, b) => sum + (parseFloat(b.bigBulk.wetDhoolKg) || 0), 0);
  const grandTotalWetDhool = sumD1Kg + sumD2Kg + sumBBKg;

  // Overall Total Capacity Calculation
  const totalCapacityKg = batches.length * (parseFloat(standardBatchKg) || 560);
  const avgD1Pct = totalCapacityKg > 0 ? ((sumD1Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgD2Pct = totalCapacityKg > 0 ? ((sumD2Kg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const avgBBPct = totalCapacityKg > 0 ? ((sumBBKg / totalCapacityKg) * 100).toFixed(2) : '0.00';
  const grandTotalPct = totalCapacityKg > 0 ? ((grandTotalWetDhool / totalCapacityKg) * 100).toFixed(2) : '0.00';

  // CSS helpers
  const inputBase = "w-full bg-white border border-gray-200 text-gray-800 text-xs rounded-md p-2 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all";
  const readOnlyBase = "w-full bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-md p-2 font-semibold";
  const tableInput = "w-full bg-white border border-gray-200 rounded p-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600";
  const tableReadOnly = "w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs text-center font-bold text-gray-600";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans">
      <Toaster position="bottom-right" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Bar & Controls --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 text-green-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                {t.title}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
            
            {/* 💡 Standard Batch Input Box (No Negative Allowed) */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <label className="text-[11px] font-bold text-gray-600 uppercase whitespace-nowrap">
                {t.standardBatch}:
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={standardBatchKg}
                onKeyDown={preventNegativeKeys}
                onChange={handleStandardBatchChange}
                className="w-20 bg-white border border-gray-300 text-gray-900 font-bold text-xs rounded px-2 py-1 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="p-2 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors font-bold text-xs flex items-center gap-2"
            >
              <Languages size={16} />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>
          </div>
        </div>

        {/* --- Section 1: Header Parameters & Operations --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Box: Crop & Leaf Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <Scale className="w-4 h-4 text-green-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">Crop Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.cropDate}</label>
                <input 
                  type="date" 
                  name="cropDate" 
                  value={meta.cropDate} 
                  onChange={handleMetaChange} 
                  className={inputBase} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.mfDate}</label>
                <input 
                  type="date" 
                  name="mfDate" 
                  value={meta.mfDate} 
                  readOnly 
                  className={readOnlyBase} 
                />
              </div>

              {/* 💡 Crop Kg (No Negative Allowed) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.cropKg}</label>
                <input 
                  type="number" 
                  name="cropKg" 
                  min="0"
                  step="any"
                  value={meta.cropKg} 
                  onKeyDown={preventNegativeKeys}
                  onChange={handleMetaChange} 
                  placeholder="0.00" 
                  className={inputBase} 
                />
              </div>

              {/* 💡 Other Leaf Kg (No Negative Allowed) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.otherLeafKg}</label>
                <input 
                  type="number" 
                  name="otherLeafKg" 
                  min="0"
                  step="any"
                  value={meta.otherLeafKg} 
                  onKeyDown={preventNegativeKeys}
                  onChange={handleMetaChange} 
                  placeholder="0.00" 
                  className={inputBase} 
                />
              </div>
            </div>
          </div>

          {/* Right Box: Rolling Parameters */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">Rolling Parameters</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Native Rolling Start Time */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.rollingStartTime}</label>
                <input 
                  type="time" 
                  name="rollingStartTime" 
                  value={meta.rollingStartTime} 
                  onChange={handleMetaChange} 
                  className={inputBase} 
                />
              </div>

              {/* Native Rolling End Time */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.rollingEndTime}</label>
                <input 
                  type="time" 
                  name="rollingEndTime" 
                  value={meta.rollingEndTime} 
                  onChange={handleMetaChange} 
                  className={inputBase} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.totalRollingHours}</label>
                <input 
                  type="text" 
                  value={meta.totalRollingHours} 
                  readOnly 
                  placeholder="Auto" 
                  className={readOnlyBase} 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.sameOrNext}</label>
                <select 
                  name="dayType" 
                  value={meta.dayType} 
                  onChange={handleMetaChange} 
                  className={inputBase}
                >
                  <option value="Same Day">{t.sameDay}</option>
                  <option value="Next Day">{t.nextDay}</option>
                </select>
              </div>

              {/* Automatically calculated No of Batches */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{t.noOfBatches}</label>
                <input 
                  type="number" 
                  name="noOfBatches" 
                  value={meta.noOfBatches} 
                  readOnly 
                  className={readOnlyBase} 
                />
              </div>
            </div>
          </div>

        </div>

        {/* --- Section 2: Main Rolling Room Sheet Table --- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">Batch Rolling Grid</h2>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                Formula: (Wet Dhool Kg ÷ {standardBatchKg}) × 100
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus size={14} /> {t.addBatch}
            </button>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full min-w-[1050px] border-collapse text-center text-xs">
              <thead>
                {/* Level 1 Header: Dhool Category */}
                <tr className="bg-gray-100 text-gray-900 font-black uppercase text-xs border border-gray-300">
                  <th rowSpan={3} className="border border-gray-300 p-2.5 w-16 bg-gray-200/80">
                    {t.badgeNo}
                  </th>
                  <th colSpan={4} className="border border-gray-300 p-2 bg-blue-50/70 text-blue-900 font-bold">
                    {t.dhool1}
                  </th>
                  <th colSpan={4} className="border border-gray-300 p-2 bg-emerald-50/70 text-emerald-900 font-bold">
                    {t.dhool2}
                  </th>
                  <th colSpan={4} className="border border-gray-300 p-2 bg-amber-50/70 text-amber-900 font-bold">
                    {t.bigBulk}
                  </th>
                  <th rowSpan={3} className="border border-gray-300 p-2 w-12 bg-gray-50"></th>
                </tr>

                {/* Level 2 Header: Roll Number */}
                <tr className="bg-gray-50 text-gray-800 font-bold border border-gray-300">
                  <th colSpan={4} className="border border-gray-300 p-1.5 text-blue-800 bg-blue-50/40">{t.roll1}</th>
                  <th colSpan={4} className="border border-gray-300 p-1.5 text-emerald-800 bg-emerald-50/40">{t.roll2}</th>
                  <th colSpan={4} className="border border-gray-300 p-1.5 text-amber-800 bg-amber-50/40">{t.roll3}</th>
                </tr>

                {/* Level 3 Header: Sub-Columns */}
                <tr className="bg-gray-50 text-[10px] text-gray-600 font-bold uppercase tracking-wider border border-gray-300">
                  {/* 1st Dhool Sub-headers */}
                  <th className="border border-gray-300 p-1.5 w-24">{t.startTime}</th>
                  <th className="border border-gray-300 p-1.5 w-24">{t.endTime}</th>
                  <th className="border border-gray-300 p-1.5 w-20">{t.kg}</th>
                  <th className="border border-gray-300 p-1.5 w-16">{t.pct}</th>

                  {/* 2nd Dhool Sub-headers */}
                  <th className="border border-gray-300 p-1.5 w-24">{t.startTime}</th>
                  <th className="border border-gray-300 p-1.5 w-24">{t.endTime}</th>
                  <th className="border border-gray-300 p-1.5 w-20">{t.kg}</th>
                  <th className="border border-gray-300 p-1.5 w-16">{t.pct}</th>

                  {/* Big Bulk Sub-headers */}
                  <th className="border border-gray-300 p-1.5 w-24">{t.startTime}</th>
                  <th className="border border-gray-300 p-1.5 w-24">{t.endTime}</th>
                  <th className="border border-gray-300 p-1.5 w-20">{t.kg}</th>
                  <th className="border border-gray-300 p-1.5 w-16">{t.pct}</th>
                </tr>
              </thead>

              <tbody>
                {batches.map((batch, index) => (
                  <tr key={index} className="hover:bg-gray-50/60 transition-colors">
                    
                    {/* Badge / Batch No */}
                    <td className="border border-gray-300 p-2 font-black text-gray-900 bg-gray-50/50">
                      {String(batch.batchNo).padStart(2, '0')}
                    </td>

                    {/* --- 1ST DHOOL --- */}
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.dhool1.startTime} 
                        onChange={(e) => handleBatchCellChange(index, 'dhool1', 'startTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.dhool1.endTime} 
                        onChange={(e) => handleBatchCellChange(index, 'dhool1', 'endTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      {/* 💡 Wet Dhool Kg (No Negative Allowed) */}
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        placeholder="0.0" 
                        value={batch.dhool1.wetDhoolKg} 
                        onKeyDown={preventNegativeKeys}
                        onChange={(e) => handleBatchCellChange(index, 'dhool1', 'wetDhoolKg', e.target.value)} 
                        className={`${tableInput} font-bold text-blue-700`} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        readOnly
                        placeholder="--" 
                        value={batch.dhool1.percentage ? `${batch.dhool1.percentage}%` : ''} 
                        className={tableReadOnly} 
                      />
                    </td>

                    {/* --- 2ND DHOOL --- */}
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.dhool2.startTime} 
                        onChange={(e) => handleBatchCellChange(index, 'dhool2', 'startTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.dhool2.endTime} 
                        onChange={(e) => handleBatchCellChange(index, 'dhool2', 'endTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      {/* 💡 Wet Dhool Kg (No Negative Allowed) */}
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        placeholder="0.0" 
                        value={batch.dhool2.wetDhoolKg} 
                        onKeyDown={preventNegativeKeys}
                        onChange={(e) => handleBatchCellChange(index, 'dhool2', 'wetDhoolKg', e.target.value)} 
                        className={`${tableInput} font-bold text-emerald-700`} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        readOnly
                        placeholder="--" 
                        value={batch.dhool2.percentage ? `${batch.dhool2.percentage}%` : ''} 
                        className={tableReadOnly} 
                      />
                    </td>

                    {/* --- BIG BULK --- */}
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.bigBulk.startTime} 
                        onChange={(e) => handleBatchCellChange(index, 'bigBulk', 'startTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={batch.bigBulk.endTime} 
                        onChange={(e) => handleBatchCellChange(index, 'bigBulk', 'endTime', e.target.value)} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      {/* 💡 Wet Dhool Kg (No Negative Allowed) */}
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        placeholder="0.0" 
                        value={batch.bigBulk.wetDhoolKg} 
                        onKeyDown={preventNegativeKeys}
                        onChange={(e) => handleBatchCellChange(index, 'bigBulk', 'wetDhoolKg', e.target.value)} 
                        className={`${tableInput} font-bold text-amber-700`} 
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        readOnly
                        placeholder="--" 
                        value={batch.bigBulk.percentage ? `${batch.bigBulk.percentage}%` : ''} 
                        className={tableReadOnly} 
                      />
                    </td>

                    {/* Row Delete Button */}
                    <td className="border border-gray-300 p-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
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
                <tr className="bg-gray-100 border-2 border-gray-300 font-bold text-gray-800">
                  <td className="border border-gray-300 p-2.5 font-bold uppercase">{t.total}</td>
                  
                  {/* 1st Dhool Totals */}
                  <td colSpan={2} className="border border-gray-300 p-2"></td>
                  <td className="border border-gray-300 p-2 text-blue-800 font-black">{sumD1Kg.toFixed(2)} kg</td>
                  <td className="border border-gray-300 p-2 text-blue-800 font-bold">{avgD1Pct}%</td>

                  {/* 2nd Dhool Totals */}
                  <td colSpan={2} className="border border-gray-300 p-2"></td>
                  <td className="border border-gray-300 p-2 text-emerald-800 font-black">{sumD2Kg.toFixed(2)} kg</td>
                  <td className="border border-gray-300 p-2 text-emerald-800 font-bold">{avgD2Pct}%</td>

                  {/* Big Bulk Totals */}
                  <td colSpan={2} className="border border-gray-300 p-2"></td>
                  <td className="border border-gray-300 p-2 text-amber-800 font-black">{sumBBKg.toFixed(2)} kg</td>
                  <td className="border border-gray-300 p-2 text-amber-800 font-bold">{avgBBPct}%</td>

                  <td className="border border-gray-300 p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grand Total Summary Box */}
          <div className="mt-4 p-4 bg-green-50/50 rounded-xl border border-green-200 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="text-xs font-bold text-gray-600 uppercase">
              Overall Total Wet Dhool Weight:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-green-800">
                {grandTotalWetDhool.toFixed(2)} kg
              </span>
              <span className="text-sm font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
                {grandTotalPct}% of Total Capacity ({totalCapacityKg} kg)
              </span>
            </div>
          </div>

        </div>

        {/* --- Form Action Buttons --- */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            {t.clear}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
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