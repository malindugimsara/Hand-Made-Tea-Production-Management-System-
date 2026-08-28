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
  Printer
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

// Calculate duration string between HH:MM strings
const calculateDuration = (start, end) => {
  if (!start || !end) return { hours: 0, str: '' };
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Midnight rollover
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const decimalHours = (diffMinutes / 60).toFixed(2);
  return {
    decimal: parseFloat(decimalHours),
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
  
  // Language State
  const [lang, setLang] = useState('EN');

  // Form State
  const [form, setForm] = useState({
    dateOfManufacture: getTodayDate(),
    
    // Section 1: Firing Schedule
    drier1: {
      start: '',
      finish: '',
      day: getTodayDate(),
      periodStr: '',
      periodDecimal: 0,
      ffrw1: '',
      ffrw2: '',
      ffrw3: '',
      ffrw4: '',
      totalHours: 0,
      outputPerHour: 0
    },
    drier2: {
      start: '',
      finish: '',
      day: getTodayDate(),
      periodStr: '',
      periodDecimal: 0,
      ffrw1: '',
      ffrw2: '',
      ffrw3: '',
      ffrw4: '',
      totalHours: 0,
      outputPerHour: 0
    },

    // Section 2: Dhools
    dhools: {
      drier1: { first: '', second: '', third: '', dir: '', bigBulk: '' },
      drier2: { first: '', second: '', third: '', dir: '', bigBulk: '' }
    },

    // Section 3: Firewood Output
    firewoodOutput: {
      drier1: { withoutWithering: '', withWithering: '', rf: '' },
      drier2: { withoutWithering: '', withWithering: '', rf: '' }
    },

    // Section 4: Cost of Firewood
    firewoodCost: {
      drier1: { totalFwKg: '', unitPrice: '', madeTeaKg: '' },
      drier2: { totalFwKg: '', unitPrice: '', madeTeaKg: '' }
    },

    // Footer Sign-offs
    officerName: '',
    checkedBy: ''
  });

  // Translations Dictionary
  const t = useMemo(() => ({
    title: lang === 'SI' ? "ගිනි තැබීමේ සහ ඩ්‍රයර් අංශය" : "FIRING & DRIER SECTION",
    subtitle: lang === 'SI' ? "ඩ්‍රයර් කාලසටහන, ධූල් ශ්‍රේණි, සහ දර පරිභෝජන පිරිවැය කළමනාකරණය." : "Consolidated management of drier schedules, dhool grading, and firewood combustion costs.",
    
    dom: lang === 'SI' ? "නිෂ්පාදිත දිනය" : "Date of Manufacture",
    
    // Sec 1
    sec1: lang === 'SI' ? "කොටස 1: ඩ්‍රයර් ක්‍රියාත්මක කිරීම (Firing Schedule)" : "Section 1: Firing Schedule",
    drier1: "DRIER 01",
    drier2: "DRIER 02",
    start: lang === 'SI' ? "ආරම්භය" : "START",
    finish: lang === 'SI' ? "අවසන්" : "FINISH",
    day: lang === 'SI' ? "දිනය" : "DAY",
    period: lang === 'SI' ? "කාලය" : "PERIOD",
    ffrw: "F : F : R : W",
    totalHours: lang === 'SI' ? "මුළු පැය ගණන" : "TOTAL HOURS",
    outputPerHour: lang === 'SI' ? "පැයට නිෂ්පාදනය (Kg/H)" : "DRIER OUTPUT / H (KG)",

    // Sec 2
    sec2: lang === 'SI' ? "කොටස 2: ධූල් ශ්‍රේණිගත කිරීම (Dhools Output)" : "Section 2: Dhools Output",
    grade: lang === 'SI' ? "ශ්‍රේණිය (Grade)" : "GRADE",
    kg: lang === 'SI' ? "කි.ග්‍රෑ." : "KG",
    pct: "%",
    first: "FIRST (KG)",
    second: "SECOND (KG)",
    third: "THIRD (KG)",
    dir: "DIR / R",
    bigBulk: "BIG BULK (KG)",
    firedTea: "FIRED TEA (KG)",

    // Sec 3
    sec3: lang === 'SI' ? "කොටස 3: දර නිෂ්පාදන ප්‍රතිදානය (Firewood Output)" : "Section 3: Firewood Output",
    desc: lang === 'SI' ? "විස්තරය" : "DESCRIPTION",
    withoutWithering: "WITHOUT WITHERING (KG)",
    withWithering: "WITH WITHERING (KG)",
    rf: "R/F (KG)",
    totalOutput: "TOTAL OUTPUT (KG)",

    // Sec 4
    sec4: lang === 'SI' ? "කොටස 4: දර පිරිවැය (Cost of Firewood)" : "Section 4: Cost of Firewood",
    item: lang === 'SI' ? "අයිතමය" : "ITEM",
    totalFw: "TOTAL F/W KG",
    unitPrice: "UNIT PRICE (Rs.)",
    madeTea: "MADE TEA KG",
    costFw: "COST OF F/W (RS.)",

    // Footer
    officer: lang === 'SI' ? "නිලධාරී නම 01" : "OFFICER NAME 01",
    checked: lang === 'SI' ? "පරීක්ෂා කළේ" : "CHECKED BY",
    enterOfficer: lang === 'SI' ? "නිලධාරී නම ඇතුළත් කරන්න..." : "Enter officer name",
    enterChecker: lang === 'SI' ? "පරීක්ෂක නම ඇතුළත් කරන්න..." : "Enter checker name",

    save: lang === 'SI' ? "සුරකින්න" : "SAVE",
    savePrint: lang === 'SI' ? "සුරකින්න සහ මුද්‍රණය කරන්න" : "SAVE & PRINT",
    clear: lang === 'SI' ? "මකන්න" : "CLEAR"
  }), [lang]);

  // Responsive Dark Mode Styles (Defined properly inside component scope)
  const inputBase = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-2 text-center outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all";
  const readOnlyBase = "w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-xl p-2 text-center font-bold select-none";
  const tableInput = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:ring-1 focus:ring-emerald-500 transition-all";
  const tableReadOnly = "w-full bg-slate-100 dark:bg-slate-800/40 border border-transparent text-slate-600 dark:text-slate-400 rounded-lg p-1.5 text-xs text-center font-bold select-none";

  // 1. Auto-calculate Drier 1 & Drier 2 Periods & Totals
  useEffect(() => {
    const d1Duration = calculateDuration(form.drier1.start, form.drier1.finish);
    const d2Duration = calculateDuration(form.drier2.start, form.drier2.finish);

    setForm(prev => {
      const d1TotalFired = Object.values(prev.dhools.drier1).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      const d1OutPerH = d1Duration.decimal > 0 ? (d1TotalFired / d1Duration.decimal).toFixed(2) : 0;

      const d2TotalFired = Object.values(prev.dhools.drier2).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      const d2OutPerH = d2Duration.decimal > 0 ? (d2TotalFired / d2Duration.decimal).toFixed(2) : 0;

      return {
        ...prev,
        drier1: {
          ...prev.drier1,
          periodStr: d1Duration.str,
          periodDecimal: d1Duration.decimal,
          totalHours: d1Duration.decimal,
          outputPerHour: d1OutPerH
        },
        drier2: {
          ...prev.drier2,
          periodStr: d2Duration.str,
          periodDecimal: d2Duration.decimal,
          totalHours: d2Duration.decimal,
          outputPerHour: d2OutPerH
        }
      };
    });
  }, [
    form.drier1.start, form.drier1.finish, 
    form.drier2.start, form.drier2.finish,
    form.dhools.drier1, form.dhools.drier2
  ]);

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDrierTimeChange = (drierKey, field, value) => {
    setForm(prev => ({
      ...prev,
      [drierKey]: { ...prev[drierKey], [field]: value }
    }));
  };

  const handleDhoolChange = (drierKey, gradeKey, value) => {
    if (value !== '' && parseFloat(value) < 0) return;
    setForm(prev => ({
      ...prev,
      dhools: {
        ...prev.dhools,
        [drierKey]: { ...prev.dhools[drierKey], [gradeKey]: value }
      }
    }));
  };

  const handleFirewoodOutputChange = (drierKey, field, value) => {
    if (value !== '' && parseFloat(value) < 0) return;
    setForm(prev => ({
      ...prev,
      firewoodOutput: {
        ...prev.firewoodOutput,
        [drierKey]: { ...prev.firewoodOutput[drierKey], [field]: value }
      }
    }));
  };

  const handleFirewoodCostChange = (drierKey, field, value) => {
    if (value !== '' && parseFloat(value) < 0) return;
    setForm(prev => ({
      ...prev,
      firewoodCost: {
        ...prev.firewoodCost,
        [drierKey]: { ...prev.firewoodCost[drierKey], [field]: value }
      }
    }));
  };

  const getDhoolsTotals = (drierKey) => {
    const d = form.dhools[drierKey];
    const first = parseFloat(d.first) || 0;
    const second = parseFloat(d.second) || 0;
    const third = parseFloat(d.third) || 0;
    const dir = parseFloat(d.dir) || 0;
    const bigBulk = parseFloat(d.bigBulk) || 0;
    const total = first + second + third + dir + bigBulk;
    return { first, second, third, dir, bigBulk, total };
  };

  const d1Dhool = getDhoolsTotals('drier1');
  const d2Dhool = getDhoolsTotals('drier2');
  const grandTotalFiredTea = d1Dhool.total + d2Dhool.total;

  const getFwOutputTotals = (drierKey) => {
    const f = form.firewoodOutput[drierKey];
    const withoutW = parseFloat(f.withoutWithering) || 0;
    const withW = parseFloat(f.withWithering) || 0;
    const rf = parseFloat(f.rf) || 0;
    const total = withoutW + withW + rf;
    return { withoutW, withW, rf, total };
  };

  const d1FwOut = getFwOutputTotals('drier1');
  const d2FwOut = getFwOutputTotals('drier2');

  const getFwCostTotals = (drierKey) => {
    const c = form.firewoodCost[drierKey];
    const totalFwKg = parseFloat(c.totalFwKg) || 0;
    const unitPrice = parseFloat(c.unitPrice) || 0;
    const madeTeaKg = parseFloat(c.madeTeaKg) || 0;
    const cost = totalFwKg * unitPrice;
    return { totalFwKg, unitPrice, madeTeaKg, cost };
  };

  const d1FwCost = getFwCostTotals('drier1');
  const d2FwCost = getFwCostTotals('drier2');

  const handleClear = () => {
    setForm({
      dateOfManufacture: getTodayDate(),
      drier1: { start: '', finish: '', day: getTodayDate(), periodStr: '', periodDecimal: 0, ffrw1: '', ffrw2: '', ffrw3: '', ffrw4: '', totalHours: 0, outputPerHour: 0 },
      drier2: { start: '', finish: '', day: getTodayDate(), periodStr: '', periodDecimal: 0, ffrw1: '', ffrw2: '', ffrw3: '', ffrw4: '', totalHours: 0, outputPerHour: 0 },
      dhools: { drier1: { first: '', second: '', third: '', dir: '', bigBulk: '' }, drier2: { first: '', second: '', third: '', dir: '', bigBulk: '' } },
      firewoodOutput: { drier1: { withoutWithering: '', withWithering: '', rf: '' }, drier2: { withoutWithering: '', withWithering: '', rf: '' } },
      firewoodCost: { drier1: { totalFwKg: '', unitPrice: '', madeTeaKg: '' }, drier2: { totalFwKg: '', unitPrice: '', madeTeaKg: '' } },
      officerName: '',
      checkedBy: ''
    });
    toast.success("Form cleared successfully.");
  };

  const handleSave = async (shouldPrint = false) => {
    const loadingToast = toast.loading("Saving Firing Section Report...");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...form,
        summary: {
          d1TotalFired: d1Dhool.total,
          d2TotalFired: d2Dhool.total,
          grandTotalFiredTea,
          d1FwCost: d1FwCost.cost,
          d2FwCost: d2FwCost.cost
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
        toast.success("Firing section data saved successfully!", { id: loadingToast });
        if (shouldPrint) {
          window.print();
        }
      } else {
        toast.error(result.message || "Failed to save firing record.", { id: loadingToast });
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
                  <Sparkles className="w-3 h-3 text-orange-500" /> Operational Control
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start xl:justify-end z-10">
            {/* Language Toggle */}
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

        {/* --- SECTION 1: FIRING SCHEDULE --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
          <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 rounded-xl">
              <Flame size={18} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.sec1}</h2>
          </div>

          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t.dom}:</label>
            <input 
              type="date"
              name="dateOfManufacture"
              value={form.dateOfManufacture}
              onChange={handleMetaChange}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-left w-44 border-r border-slate-200 dark:border-slate-700">Metric</th>
                  <th className="p-3 text-center bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                  <th className="p-3 text-center bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">{t.drier2}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.start}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier1.start} onChange={(e) => handleDrierTimeChange('drier1', 'start', e.target.value)} className={inputBase} /></td>
                  <td className="p-2.5"><input type="time" value={form.drier2.start} onChange={(e) => handleDrierTimeChange('drier2', 'start', e.target.value)} className={inputBase} /></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.finish}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="time" value={form.drier1.finish} onChange={(e) => handleDrierTimeChange('drier1', 'finish', e.target.value)} className={inputBase} /></td>
                  <td className="p-2.5"><input type="time" value={form.drier2.finish} onChange={(e) => handleDrierTimeChange('drier2', 'finish', e.target.value)} className={inputBase} /></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.day}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="date" value={form.drier1.day} onChange={(e) => handleDrierTimeChange('drier1', 'day', e.target.value)} className={inputBase} /></td>
                  <td className="p-2.5"><input type="date" value={form.drier2.day} onChange={(e) => handleDrierTimeChange('drier2', 'day', e.target.value)} className={inputBase} /></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.period}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="text" value={form.drier1.periodStr} readOnly className={readOnlyBase} /></td>
                  <td className="p-2.5"><input type="text" value={form.drier2.periodStr} readOnly className={readOnlyBase} /></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.ffrw}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-4 gap-1">
                      <input type="number" min="0" placeholder="0" value={form.drier1.ffrw1} onChange={(e) => handleDrierTimeChange('drier1', 'ffrw1', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier1.ffrw2} onChange={(e) => handleDrierTimeChange('drier1', 'ffrw2', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier1.ffrw3} onChange={(e) => handleDrierTimeChange('drier1', 'ffrw3', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier1.ffrw4} onChange={(e) => handleDrierTimeChange('drier1', 'ffrw4', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="grid grid-cols-4 gap-1">
                      <input type="number" min="0" placeholder="0" value={form.drier2.ffrw1} onChange={(e) => handleDrierTimeChange('drier2', 'ffrw1', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier2.ffrw2} onChange={(e) => handleDrierTimeChange('drier2', 'ffrw2', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier2.ffrw3} onChange={(e) => handleDrierTimeChange('drier2', 'ffrw3', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                      <input type="number" min="0" placeholder="0" value={form.drier2.ffrw4} onChange={(e) => handleDrierTimeChange('drier2', 'ffrw4', e.target.value)} onKeyDown={preventNegativeKeys} className={inputBase} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="text" value={form.drier1.totalHours} readOnly className={readOnlyBase} /></td>
                  <td className="p-2.5"><input type="text" value={form.drier2.totalHours} readOnly className={readOnlyBase} /></td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.outputPerHour}</td>
                  <td className="p-2.5 border-r border-slate-200 dark:border-slate-800"><input type="text" value={form.drier1.outputPerHour} readOnly className={`${readOnlyBase} font-black text-blue-700 dark:text-blue-400`} /></td>
                  <td className="p-2.5"><input type="text" value={form.drier2.outputPerHour} readOnly className={`${readOnlyBase} font-black text-emerald-700 dark:text-emerald-400`} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* --- SECTION 2: DHOOLS OUTPUT --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
          <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
              <Scale size={18} />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.sec2}</h2>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full min-w-[700px] border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-left w-44 border-r border-slate-200 dark:border-slate-700">{t.grade}</th>
                  <th colSpan={2} className="p-3 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                  <th colSpan={2} className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="border-r border-slate-200 dark:border-slate-700"></th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                  <th className="p-2">{t.pct}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                {[
                  { key: 'first', label: t.first },
                  { key: 'second', label: t.second },
                  { key: 'third', label: t.third },
                  { key: 'dir', label: t.dir },
                  { key: 'bigBulk', label: t.bigBulk },
                ].map(({ key, label }) => {
                  const d1Kg = parseFloat(form.dhools.drier1[key]) || 0;
                  const d2Kg = parseFloat(form.dhools.drier2[key]) || 0;
                  const d1Pct = d1Dhool.total > 0 ? ((d1Kg / d1Dhool.total) * 100).toFixed(2) : '0.00';
                  const d2Pct = d2Dhool.total > 0 ? ((d2Kg / d2Dhool.total) * 100).toFixed(2) : '0.00';

                  return (
                    <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{label}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.0" value={form.dhools.drier1[key]} onChange={(e) => handleDhoolChange('drier1', key, e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="text" readOnly value={d1Pct} className={tableReadOnly} /></td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.0" value={form.dhools.drier2[key]} onChange={(e) => handleDhoolChange('drier2', key, e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      <td className="p-2"><input type="text" readOnly value={d2Pct} className={tableReadOnly} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-3 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.firedTea}</td>
                  <td className="p-3 text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">{d1Dhool.total.toFixed(2)}</td>
                  <td className="p-3 border-r border-slate-200 dark:border-slate-700">100%</td>
                  <td className="p-3 text-emerald-700 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{d2Dhool.total.toFixed(2)}</td>
                  <td className="p-3">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* --- SECTION 3 & 4 GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 3: Firewood Output */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl">
                  <Fuel size={18} />
                </div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.sec3}</h2>
              </div>

              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 text-left border-r border-slate-200 dark:border-slate-700">{t.desc}</th>
                      <th className="p-3 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                      <th className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {[
                      { key: 'withoutWithering', label: t.withoutWithering },
                      { key: 'withWithering', label: t.withWithering },
                      { key: 'rf', label: t.rf }
                    ].map(({ key, label }) => (
                      <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{label}</td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodOutput.drier1[key]} onChange={(e) => handleFirewoodOutputChange('drier1', key, e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                        <td className="p-2"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodOutput.drier2[key]} onChange={(e) => handleFirewoodOutputChange('drier2', key, e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                      <td className="p-3 text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">{d1FwOut.total.toFixed(2)}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400">{d2FwOut.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: Cost of Firewood */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-xl">
                  <Calculator size={18} />
                </div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{t.sec4}</h2>
              </div>

              <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 text-left border-r border-slate-200 dark:border-slate-700">{t.item}</th>
                      <th className="p-3 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                      <th className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    <tr>
                      <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.totalFw}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodCost.drier1.totalFwKg} onChange={(e) => handleFirewoodCostChange('drier1', 'totalFwKg', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      <td className="p-2"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodCost.drier2.totalFwKg} onChange={(e) => handleFirewoodCostChange('drier2', 'totalFwKg', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.00" value={form.firewoodCost.drier1.unitPrice} onChange={(e) => handleFirewoodCostChange('drier1', 'unitPrice', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      <td className="p-2"><input type="number" min="0" step="any" placeholder="0.00" value={form.firewoodCost.drier2.unitPrice} onChange={(e) => handleFirewoodCostChange('drier2', 'unitPrice', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.madeTea}</td>
                      <td className="p-2 border-r border-slate-200 dark:border-slate-800"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodCost.drier1.madeTeaKg} onChange={(e) => handleFirewoodCostChange('drier1', 'madeTeaKg', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                      <td className="p-2"><input type="number" min="0" step="any" placeholder="0.0" value={form.firewoodCost.drier2.madeTeaKg} onChange={(e) => handleFirewoodCostChange('drier2', 'madeTeaKg', e.target.value)} onKeyDown={preventNegativeKeys} className={tableInput} /></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                      <td className="p-3 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.costFw}</td>
                      <td className="p-3 text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">Rs. {d1FwCost.cost.toFixed(2)}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400">Rs. {d2FwCost.cost.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* --- Footer & Action Buttons --- */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-6 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.officer}</label>
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
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.checked}</label>
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