import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Scale, 
  Save, 
  RotateCcw, 
  Flame, 
  Fuel, 
  Calculator, 
  Languages, 
  CheckCircle2,
  Sparkles,
  Printer,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Helper to get today's date in YYYY-MM-DD
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Calculate duration string and decimal hours between HH:MM strings
const calculateDuration = (start, end) => {
  if (!start || !end) return { decimal: 0, str: '' };
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const decimal = parseFloat((diffMinutes / 60).toFixed(2));
  return {
    decimal,
    str: `${hrs}h ${mins}m`
  };
};

const preventNegativeKeys = (e) => {
  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
    e.preventDefault();
  }
};

const FiringSectionForm = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  const [lang, setLang] = useState('EN');

  const [form, setForm] = useState({
    dateOfManufacture: getTodayDate(),
    cropDate: getTodayDate(),
    cropKg: '',

    dhools: {
      drier1: { first: '', second: '', third: '', dir: '', bigBulk: '' },
      drier2: { first: '', second: '', third: '', dir: '', bigBulk: '' }
    },

    firewoodUsage: {
      drier1: { f: '', rf: '', w: '' },
      drier2: { f: '', rf: '', w: '' }
    },

    firewoodOutput: {
      drier1: { withoutWithering: '', withWithering: '', rf: '' },
      drier2: { withoutWithering: '', withWithering: '', rf: '' }
    },

    drier1: { start: '', finish: '', day: getTodayDate(), periodStr: '', totalHours: 0, outputPerHour: 0 },
    drier2: { start: '', finish: '', day: getTodayDate(), periodStr: '', totalHours: 0, outputPerHour: 0 },

    firewoodCost: {
      drier1: { totalFwKg: '', unitPrice: '', madeTeaKg: '' },
      drier2: { totalFwKg: '', unitPrice: '', madeTeaKg: '' }
    },

    officerName: '',
    checkedBy: ''
  });

  const t = useMemo(() => ({
    title: lang === 'SI' ? "ඩ්‍රයර් කාමර වාර්තා පත්‍රිකාව" : "DRIER ROOM RECORD SHEET",
    subtitle: lang === 'SI' ? "දෛනික ඩ්‍රයර් 01, 02 සහ සම්පූර්ණ ධූල්, දර පරිභෝජන සහ පිරිවැය සටහන." : "Daily recording sheet for drier cycles, dhools fractionation, firewood output, and combustion costs.",
    
    mfDate: lang === 'SI' ? "නිෂ්පාදිත දිනය (M/F DATE)" : "M/F DATE",
    cropDate: lang === 'SI' ? "අස්වැන්න දිනය (CROP DATE)" : "CROP DATE",
    cropKg: lang === 'SI' ? "අස්වැන්න (CROP Kg)" : "CROP (Kg)",

    drier1: "DHOOLS (kg) - 01",
    drier2: "DHOOLS (kg) - 02",
    drierTotal: "DHOOLS (kg) TOTAL",
    item: lang === 'SI' ? "අයිතමය" : "Item",
    kg: lang === 'SI' ? "කි.ග්‍රෑ." : "Kg",
    pct: "%",

    first: "1ST",
    second: "2ND",
    third: "3RD",
    dir: "DIR / R",
    bigBulk: "BIG BULK",
    gBulk: "G BULK",
    totalFiredTea: "TOTAL FIRED TEA",

    fwUsage1: "FIREWOOD USAGE (kg) - 01",
    fwUsage2: "FIREWOOD USAGE (kg) - 02",
    fwUsageTotal: "FIREWOOD USAGE (kg) TOTAL",
    f: "F",
    rf: "R/F",
    w: "W",
    total: "TOTAL",

    fwOut1: "FIREWOOD OUTPUT - 01",
    fwOut2: "FIREWOOD OUTPUT - 02",
    fwOutTotal: "FIREWOOD OUTPUT TOTAL",
    withoutWithering: "WITHOUT WITHERING",
    withering: "WITH WITHERING",
    totalOutput: "TOTAL OUTPUT",

    drier01Title: "DRIER - 01",
    drier02Title: "DRIER - 02",
    startTime: "START TIME",
    endTime: "END TIME",
    totalHours: "TOTAL HOURS",
    drierOutputPerHour: "DRIER OUTPUT / H",

    costDrier01: "DRIER - 01",
    costDrier02: "DRIER - 02",
    costTotal: "TOTAL",
    totalFwKg: "TOTAL F/W KG",
    unitPrice: "UNIT PRICE (Rs.)",
    madeTeaKg: "MADE TEA KG",
    costOfFw: "COST OF F/W (Rs.)",

    officer: "OFFICER NAME 01",
    checked: "CHECK BY",
    enterOfficer: lang === 'SI' ? "නිලධාරී නම ඇතුළත් කරන්න..." : "Enter officer name",
    enterChecker: lang === 'SI' ? "පරීක්ෂක නම ඇතුළත් කරන්න..." : "Enter checker name",
    benchmarkTitle: lang === 'SI' ? "කර්මාන්තශාලා සම්මත මාර්ගෝපදේශ" : "Standard Factory Benchmark Specifications",

    save: lang === 'SI' ? "සුරකින්න" : "SAVE",
    savePrint: lang === 'SI' ? "සුරකින්න සහ මුද්‍රණය කරන්න" : "SAVE & PRINT",
    clear: lang === 'SI' ? "මකන්න" : "CLEAR"
  }), [lang]);

  const inputBase = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold";
  const tableInput = "w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all";

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (section, subSection, field, value) => {
    if (value !== '' && parseFloat(value) < 0) return;
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [field]: value
        }
      }
    }));
  };

  const handleDrierTimeChange = (drierKey, field, value) => {
    setForm(prev => ({
      ...prev,
      [drierKey]: {
        ...prev[drierKey],
        [field]: value
      }
    }));
  };

  const calcData = useMemo(() => {
    const d1 = form.dhools.drier1;
    const d2 = form.dhools.drier2;

    const d1Items = {
      first: parseFloat(d1.first) || 0,
      second: parseFloat(d1.second) || 0,
      third: parseFloat(d1.third) || 0,
      dir: parseFloat(d1.dir) || 0,
      bigBulk: parseFloat(d1.bigBulk) || 0
    };
    const d1Total = d1Items.first + d1Items.second + d1Items.third + d1Items.dir + d1Items.bigBulk;

    const d2Items = {
      first: parseFloat(d2.first) || 0,
      second: parseFloat(d2.second) || 0,
      third: parseFloat(d2.third) || 0,
      dir: parseFloat(d2.dir) || 0,
      bigBulk: parseFloat(d2.bigBulk) || 0
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

    const u1 = {
      f: parseFloat(form.firewoodUsage.drier1.f) || 0,
      rf: parseFloat(form.firewoodUsage.drier1.rf) || 0,
      w: parseFloat(form.firewoodUsage.drier1.w) || 0
    };
    u1.total = u1.f + u1.rf + u1.w;

    const u2 = {
      f: parseFloat(form.firewoodUsage.drier2.f) || 0,
      rf: parseFloat(form.firewoodUsage.drier2.rf) || 0,
      w: parseFloat(form.firewoodUsage.drier2.w) || 0
    };
    u2.total = u2.f + u2.rf + u2.w;

    const uTotal = {
      f: u1.f + u2.f,
      rf: u1.rf + u2.rf,
      w: u1.w + u2.w,
      total: u1.total + u2.total
    };

    const o1 = {
      withoutWithering: parseFloat(form.firewoodOutput.drier1.withoutWithering) || 0,
      withering: parseFloat(form.firewoodOutput.drier1.withering) || 0,
      rf: parseFloat(form.firewoodOutput.drier1.rf) || 0
    };
    o1.total = o1.withoutWithering + o1.withering + o1.rf;

    const o2 = {
      withoutWithering: parseFloat(form.firewoodOutput.drier2.withoutWithering) || 0,
      withering: parseFloat(form.firewoodOutput.drier2.withering) || 0,
      rf: parseFloat(form.firewoodOutput.drier2.rf) || 0
    };
    o2.total = o2.withoutWithering + o2.withering + o2.rf;

    const oTotal = {
      withoutWithering: o1.withoutWithering + o2.withoutWithering,
      withering: o1.withering + o2.withering,
      rf: o1.rf + o2.rf,
      total: o1.total + o2.total
    };

    const d1Dur = calculateDuration(form.drier1.start, form.drier1.finish);
    const d2Dur = calculateDuration(form.drier2.start, form.drier2.finish);
    const totHours = d1Dur.decimal + d2Dur.decimal;

    const outPerH1 = d1Dur.decimal > 0 ? (d1Total / d1Dur.decimal).toFixed(2) : '0.00';
    const outPerH2 = d2Dur.decimal > 0 ? (d2Total / d2Dur.decimal).toFixed(2) : '0.00';

    const fc1 = form.firewoodCost.drier1;
    const fc2 = form.firewoodCost.drier2;

    const c1 = {
      fwKg: parseFloat(fc1.totalFwKg) || 0,
      unitPrice: parseFloat(fc1.unitPrice) || 0,
      madeTeaKg: parseFloat(fc1.madeTeaKg) || 0
    };
    c1.cost = c1.fwKg * c1.unitPrice;

    const c2 = {
      fwKg: parseFloat(fc2.totalFwKg) || 0,
      unitPrice: parseFloat(fc2.unitPrice) || 0,
      madeTeaKg: parseFloat(fc2.madeTeaKg) || 0
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
      o1, o2, oTotal,
      d1Dur, d2Dur, totHours,
      outPerH1, outPerH2,
      c1, c2, cTotal
    };
  }, [form]);

  const handleClear = () => {
    setForm({
      dateOfManufacture: getTodayDate(),
      cropDate: getTodayDate(),
      cropKg: '',
      dhools: {
        drier1: { first: '', second: '', third: '', dir: '', bigBulk: '' },
        drier2: { first: '', second: '', third: '', dir: '', bigBulk: '' }
      },
      firewoodUsage: {
        drier1: { f: '', rf: '', w: '' },
        drier2: { f: '', rf: '', w: '' }
      },
      firewoodOutput: {
        drier1: { withoutWithering: '', withWithering: '', rf: '' },
        drier2: { withoutWithering: '', withWithering: '', rf: '' }
      },
      drier1: { start: '', finish: '', day: getTodayDate(), periodStr: '', totalHours: 0, outputPerHour: 0 },
      drier2: { start: '', finish: '', day: getTodayDate(), periodStr: '', totalHours: 0, outputPerHour: 0 },
      firewoodCost: {
        drier1: { totalFwKg: '', unitPrice: '', madeTeaKg: '' },
        drier2: { totalFwKg: '', unitPrice: '', madeTeaKg: '' }
      },
      officerName: '',
      checkedBy: ''
    });
    toast.success("Form reset to blank state.");
  };

  const handleSave = async (shouldPrint = false) => {
    const loadingToast = toast.loading("Saving Drier Room Sheet...");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...form,
        drier1: {
          ...form.drier1,
          periodStr: calcData.d1Dur.str,
          totalHours: calcData.d1Dur.decimal,
          outputPerHour: parseFloat(calcData.outPerH1) || 0
        },
        drier2: {
          ...form.drier2,
          periodStr: calcData.d2Dur.str,
          totalHours: calcData.d2Dur.decimal,
          outputPerHour: parseFloat(calcData.outPerH2) || 0
        },
        summary: {
          d1TotalFired: calcData.d1Total,
          d2TotalFired: calcData.d2Total,
          grandTotalFiredTea: calcData.grandTotalFired,
          d1FwCost: calcData.c1.cost,
          d2FwCost: calcData.c2.cost
        }
      };

      const response = await fetch(`${BACKEND_URL}/api/firing-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Drier room record saved successfully!", { id: loadingToast });
        if (shouldPrint) {
          window.print();
        }
      } else {
        toast.error(result.message || "Failed to save record.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Server connection error.", { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* --- Top Bar & Controls --- */}
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
                  <Sparkles className="w-3 h-3 text-orange-500" /> Data Entry Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end z-10">
            <button
              type="button"
              onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Languages size={15} className="text-slate-500 dark:text-slate-400" />
              {lang === 'EN' ? "සිංහල" : "English"}
            </button>
          </div>
        </div>

        {/* --- Main Entry Card --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 md:p-10 overflow-hidden font-sans transition-colors duration-200 flex flex-col gap-8">
          
          {/* Top Metadata Line */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.mfDate} :</label>
              <input 
                type="date"
                name="dateOfManufacture"
                value={form.dateOfManufacture}
                onChange={handleMetaChange}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.cropDate} :</label>
              <input 
                type="date"
                name="cropDate"
                value={form.cropDate}
                onChange={handleMetaChange}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">{t.cropKg} :</label>
              <div className="relative">
                <input 
                  type="number"
                  name="cropKg"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={form.cropKg}
                  onKeyDown={preventNegativeKeys}
                  onChange={handleMetaChange}
                  className={`${inputBase} font-extrabold pr-8`}
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">kg</span>
              </div>
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
                    <th className="p-2 w-24 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                    <th className="p-2 w-16 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>

                    <th className="p-2 w-28 border-r border-slate-200 dark:border-slate-700 text-left pl-3">{t.item}</th>
                    <th className="p-2 w-24 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                    <th className="p-2 w-16 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>

                    <th className="p-2 w-28 border-r border-slate-200 dark:border-slate-700 text-left pl-3">{t.item}</th>
                    <th className="p-2 w-24 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
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
                    const d1Kg = calcData.d1Items[k];
                    const d1Pct = calcData.d1Total > 0 ? ((d1Kg / calcData.d1Total) * 100).toFixed(2) : '0.00';

                    const d2Kg = calcData.d2Items[k];
                    const d2Pct = calcData.d2Total > 0 ? ((d2Kg / calcData.d2Total) * 100).toFixed(2) : '0.00';

                    const totKg = calcData.totalItems[k];
                    const totPct = calcData.grandTotalFired > 0 ? ((totKg / calcData.grandTotalFired) * 100).toFixed(2) : '0.00';

                    return (
                      <tr key={k} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          <input 
                            type="number" 
                            min="0" 
                            step="any" 
                            placeholder="0.0" 
                            value={form.dhools.drier1[k]} 
                            onChange={(e) => handleNestedChange('dhools', 'drier1', k, e.target.value)} 
                            onKeyDown={preventNegativeKeys} 
                            className={tableInput} 
                          />
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">{d1Pct}%</td>

                        <td className="p-2 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                          <input 
                            type="number" 
                            min="0" 
                            step="any" 
                            placeholder="0.0" 
                            value={form.dhools.drier2[k]} 
                            onChange={(e) => handleNestedChange('dhools', 'drier2', k, e.target.value)} 
                            onKeyDown={preventNegativeKeys} 
                            className={tableInput} 
                          />
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">{d2Pct}%</td>

                        <td className="p-2 text-left font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{label}</td>
                        <td className="p-2 font-black text-amber-700 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/20">{totKg.toFixed(2)}</td>
                        <td className="p-2 font-bold text-amber-800 dark:text-amber-300 bg-amber-50/20 dark:bg-amber-950/20">{totPct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                    <td className="p-3 text-blue-700 dark:text-blue-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/30">{calcData.d1Total.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-200 dark:border-slate-700">100%</td>

                    <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/30">{calcData.d2Total.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-200 dark:border-slate-700">100%</td>

                    <td className="p-3 text-left pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalFiredTea}</td>
                    <td className="p-3 text-amber-700 dark:text-amber-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-amber-950/30">{calcData.grandTotalFired.toFixed(2)} kg</td>
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
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier1.f} onChange={(e) => handleNestedChange('firewoodUsage', 'drier1', 'f', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier1.rf} onChange={(e) => handleNestedChange('firewoodUsage', 'drier1', 'rf', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier1.w} onChange={(e) => handleNestedChange('firewoodUsage', 'drier1', 'w', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 font-black bg-blue-50/20 dark:bg-blue-950/20">{calcData.u1.total}</td>

                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier2.f} onChange={(e) => handleNestedChange('firewoodUsage', 'drier2', 'f', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier2.rf} onChange={(e) => handleNestedChange('firewoodUsage', 'drier2', 'rf', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" placeholder="0" value={form.firewoodUsage.drier2.w} onChange={(e) => handleNestedChange('firewoodUsage', 'drier2', 'w', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-black bg-emerald-50/20 dark:bg-emerald-950/20">{calcData.u2.total}</td>

                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/20">{calcData.uTotal.f}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/20">{calcData.uTotal.rf}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/20">{calcData.uTotal.w}</td>
                    <td className="p-2 text-amber-700 dark:text-amber-400 font-black bg-amber-50/30 dark:bg-amber-950/30">{calcData.uTotal.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. FIREWOOD OUTPUT TABLE (Updated with WITHOUT WITHERING) */}
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
                  {[
                    { label: t.withoutWithering, k: 'withoutWithering' },
                    { label: t.withering, k: 'withering' },
                    { label: t.rf, k: 'rf' }
                  ].map(({ label, k }) => (
                    <tr key={k}>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{label}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 w-1/6">
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.0" 
                          value={form.firewoodOutput.drier1[k]} 
                          onChange={(e) => handleNestedChange('firewoodOutput', 'drier1', k, e.target.value)} 
                          onKeyDown={preventNegativeKeys} 
                          className={tableInput} 
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{label}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800 w-1/6">
                        <input 
                          type="number" 
                          min="0" 
                          step="any" 
                          placeholder="0.0" 
                          value={form.firewoodOutput.drier2[k]} 
                          onChange={(e) => handleNestedChange('firewoodOutput', 'drier2', k, e.target.value)} 
                          onKeyDown={preventNegativeKeys} 
                          className={tableInput} 
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800 w-1/6">{label}</td>
                      <td className="p-2.5 w-1/6 text-center font-black bg-amber-50/20 dark:bg-amber-950/20">{calcData.oTotal[k].toFixed(2)} kg</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                    <td className="p-3 text-blue-700 dark:text-blue-400 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/30">{calcData.o1.total.toFixed(2)} kg</td>
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/30">{calcData.o2.total.toFixed(2)} kg</td>
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                    <td className="p-3 text-amber-700 dark:text-amber-400 text-center bg-amber-50/40 dark:bg-amber-950/30">{calcData.oTotal.total.toFixed(2)} kg</td>
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
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier1.start} onChange={(e) => handleDrierTimeChange('drier1', 'start', e.target.value)} className={tableInput} /></td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.startTime}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier2.start} onChange={(e) => handleDrierTimeChange('drier2', 'start', e.target.value)} className={tableInput} /></td>
                    <td colSpan={2} className="p-2.5 bg-slate-50 dark:bg-slate-800/40"></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.endTime}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier1.finish} onChange={(e) => handleDrierTimeChange('drier1', 'finish', e.target.value)} className={tableInput} /></td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.endTime}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier2.finish} onChange={(e) => handleDrierTimeChange('drier2', 'finish', e.target.value)} className={tableInput} /></td>
                    <td colSpan={2} className="p-2.5 bg-slate-50 dark:bg-slate-800/40"></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                    <td className="p-2.5 text-center font-black border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400">{calcData.d1Dur.decimal} h ({calcData.d1Dur.str || '0h 00m'})</td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                    <td className="p-2.5 text-center font-black border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">{calcData.d2Dur.decimal} h ({calcData.d2Dur.str || '0h 00m'})</td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                    <td className="p-2.5 text-center font-black text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/20">{calcData.totHours.toFixed(2)} h</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.drierOutputPerHour}</td>
                    <td className="p-2.5 text-center font-black text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20">{calcData.outPerH1} kg</td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.drierOutputPerHour}</td>
                    <td className="p-2.5 text-center font-black text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/20">{calcData.outPerH2} kg</td>
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
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.0" 
                        value={form.firewoodCost.drier1.totalFwKg} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier1', 'totalFwKg', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalFwKg}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.0" 
                        value={form.firewoodCost.drier2.totalFwKg} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier2', 'totalFwKg', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.totalFwKg}</td>
                    <td className="p-2.5 text-center font-black text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/20">{calcData.cTotal.fwKg.toFixed(2)} kg</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.00" 
                        value={form.firewoodCost.drier1.unitPrice} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier1', 'unitPrice', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.00" 
                        value={form.firewoodCost.drier2.unitPrice} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier2', 'unitPrice', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                    <td className="p-2.5 text-center font-bold bg-amber-50/20 dark:bg-amber-950/20">Rs. {calcData.cTotal.unitPrice.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.0" 
                        value={form.firewoodCost.drier1.madeTeaKg} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier1', 'madeTeaKg', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                      <input 
                        type="number" 
                        min="0" 
                        step="any" 
                        placeholder="0.0" 
                        value={form.firewoodCost.drier2.madeTeaKg} 
                        onChange={(e) => handleNestedChange('firewoodCost', 'drier2', 'madeTeaKg', e.target.value)} 
                        onKeyDown={preventNegativeKeys} 
                        className={tableInput} 
                      />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 pl-3 border-r border-slate-200 dark:border-slate-800">{t.madeTeaKg}</td>
                    <td className="p-2.5 text-center font-bold bg-amber-50/20 dark:bg-amber-950/20">{calcData.cTotal.madeTeaKg.toFixed(2)} kg</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                    <td className="p-3 text-blue-700 dark:text-blue-400 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/30">Rs. {calcData.c1.cost.toFixed(2)}</td>
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/30">Rs. {calcData.c2.cost.toFixed(2)}</td>
                    <td className="p-3 pl-3 uppercase border-r border-slate-200 dark:border-slate-700">{t.costOfFw}</td>
                    <td className="p-3 text-amber-700 dark:text-amber-400 text-center bg-amber-50/40 dark:bg-amber-950/30">Rs. {calcData.cTotal.cost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. SIGN-OFFS INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.officer} :</label>
              <input 
                type="text"
                name="officerName"
                value={form.officerName}
                onChange={handleMetaChange}
                placeholder={t.enterOfficer}
                className={inputBase}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.checked} :</label>
              <input 
                type="text"
                name="checkedBy"
                value={form.checkedBy}
                onChange={handleMetaChange}
                placeholder={t.enterChecker}
                className={inputBase}
              />
            </div>
          </div>

          {/* 7. FACTORY BENCHMARK SPECIFICATION REFERENCE */}
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

          {/* --- Action Buttons --- */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Printer size={15} />
              {t.savePrint}
            </button>
            
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Save size={16} />
              {t.save}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default FiringSectionForm;