import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { Languages } from 'lucide-react'; // <-- Imported Languages Icon

const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

const WitherLeafForm = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const quantityInputRef = useRef(null);

  const employeeNames = [
    "T P Damith Kumara – 00096",
    "G J S Kumara – 00153",
    "AR S Nishantha – 00165",
    "D J Lakshan – 00191"
  ];

  const initialTopFormState = {
    factory: '',
    dateOfCrop: getYesterdayDate(),
    dateOfManufacture: '',
    receivedTotalCropKg: '',
    totalEmployee: '',
    witheredLeafKg: '',
    name1: '',
    name2: '',
    percentage: '',
    startTime: '',
    finishTime: '',
    day: '',
    period: '',
    noOfBatchers: '',
    weatheringQuality: ''
  };

  const initialBottomFormState = {
    selectedBatch: '1',
    batchKg: '',
    batches: Array(25).fill(0)
  };

  const [topForm, setTopForm] = useState(initialTopFormState);
  const [bottomForm, setBottomForm] = useState(initialBottomFormState);
  const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, batchIndex: null });
  
  // 💡 Language Toggle State ("EN" or "SI")
  const [lang, setLang] = useState("EN");

  // 💡 --- DYNAMIC TRANSLATIONS ---
  const t = {
    title: lang === 'SI' ? "අමු තේ දළු ඇතුළත් කිරීම" : "Wither Leaf Entry",
    subtitle: lang === 'SI' ? "කර්මාන්තශාලා, මැලවූ දළු සහ කාණ්ඩ විස්තර දත්ත ගබඩාවට එක් කරන්න." : "Record Factory, Wither Leaf & Batch Details directly to the database.",
    
    sec1Title: lang === 'SI' ? "කොටස 1: අමු තේ දළු විස්තර" : "Section 1: Wither Leaf Details",
    factory: lang === 'SI' ? "කර්මාන්තශාලාව" : "Factory",
    selectFactory: lang === 'SI' ? "කර්මාන්තශාලාව තෝරන්න..." : "Select Factory...",
    dateOfCrop: lang === 'SI' ? "අස්වැන්න දිනය" : "Date of Crop",
    recTotalCrop: lang === 'SI' ? "ලැබුණු මුළු දළු (Kg)" : "Received Total Crop (Kg)",
    totalEmp: lang === 'SI' ? "මුළු සේවක සංඛ්‍යාව" : "Total Employee",
    witheredLeaf: lang === 'SI' ? "මැලවූ දළු (Kg)" : "Withered Leaf (Kg)",
    percentage: lang === 'SI' ? "ප්‍රතිශතය %" : "Percentage %",
    auto: lang === 'SI' ? "ස්වයංක්‍රීය" : "Auto",
    name1: lang === 'SI' ? "නම 1" : "Name 1",
    selectName1: lang === 'SI' ? "නම 1 තෝරන්න..." : "Select Name 1...",
    name2: lang === 'SI' ? "නම 2" : "Name 2",
    selectName2: lang === 'SI' ? "නම 2 තෝරන්න..." : "Select Name 2...",
    dom: lang === 'SI' ? "නිෂ්පාදිත දිනය" : "Date of Manufacture",

    sec2Title: lang === 'SI' ? "කොටස 2: කාණ්ඩ කාලසටහන" : "Section 2: Batching Schedule",
    startTime: lang === 'SI' ? "ආරම්භක වේලාව" : "Start Time",
    finishTime: lang === 'SI' ? "අවසන් වේලාව" : "Finish Time",
    period: lang === 'SI' ? "කාල සීමාව" : "Period",
    day: lang === 'SI' ? "දිනය" : "Day",
    noOfBatchers: lang === 'SI' ? "කාණ්ඩ සේවකයින් ගණන" : "No. of Batchers",
    weatherQuality: lang === 'SI' ? "මැලවීමේ ගුණාත්මය" : "Weathering Quality",

    sec3Title: lang === 'SI' ? "කොටස 3: නිෂ්පාදන ප්‍රමාණ" : "Section 3: Manufacture Quantities",
    awaitingDom: lang === 'SI' ? "අස්වැන්න දිනය බලාපොරොත්තුවෙන්..." : "Awaiting Date of Crop...",
    selectBatch: lang === 'SI' ? "කාණ්ඩය තෝරන්න" : "Select Batch",
    batch: lang === 'SI' ? "කාණ්ඩය" : "Batch",
    qty: lang === 'SI' ? "ප්‍රමාණය (උපරිම 400kg)" : "Quantity (Max 400kg)",
    enterKg: lang === 'SI' ? "Kg ඇතුලත් කරන්න..." : "Enter Kg...",
    addBatch: lang === 'SI' ? "කාණ්ඩය එක් කරන්න" : "Add Batch",
    noBatches: lang === 'SI' ? "තවමත් කාණ්ඩ වාර්තා කර නොමැත. ප්‍රමාණ එකතු කිරීමට ඉහළින් කාණ්ඩයක් තෝරන්න." : "No batches recorded yet. Select a batch above to add quantities.",

    saveSec12: lang === 'SI' ? "කොටස් 1 සහ 2 සුරකින්න" : "Save Sections 1 & 2",
    clearSec: lang === 'SI' ? "කොටස් මකන්න" : "Clear Sections",
    saveSec3: lang === 'SI' ? "කොටස 3 සුරකින්න" : "Save Section 3",
    clearBatches: lang === 'SI' ? "කාණ්ඩ මකන්න" : "Clear Batches",

    removeTitle: lang === 'SI' ? "කාණ්ඩ දත්ත ඉවත් කරන්න" : "Remove Batch Data",
    removeDesc1: lang === 'SI' ? "ඔබට විශ්වාසද " : "Are you sure you want to remove the data for ",
    removeDesc2: lang === 'SI' ? " ඉවත් කිරීමට අවශ්‍ය බව? මෙය ආපසු හැරවිය නොහැක." : "? This action cannot be undone.",
    cancelBtn: lang === 'SI' ? "අවලංගු කරන්න" : "Cancel",
    removeBtn: lang === 'SI' ? "ඔව්, ඉවත් කරන්න" : "Yes, Remove"
  };

  // 1. Fetch Total Crop
  useEffect(() => {
    const fetchTotalLeafQty = async () => {
      if (!topForm.dateOfCrop) return;
      try {
        const token = localStorage.getItem("token");
        const fetchUrl = `${BACKEND_URL}/api/factory-loft-leaf/report?date=${topForm.dateOfCrop}`;
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });

        if (response.ok) {
          const result = await response.json();
          const dataArray = Array.isArray(result) ? result : result.data || [];
          const totalQty = dataArray
            .filter(record => record.date === topForm.dateOfCrop)
            .reduce((sum, record) => sum + (Number(record.totalLeafQtyKg) || 0), 0);

          setTopForm(prev => ({
            ...prev,
            receivedTotalCropKg: totalQty > 0 ? totalQty.toString() : ''
          }));
        }
      } catch (error) {
        console.error("Failed to fetch LoftLeaf data:", error);
      }
    };
    fetchTotalLeafQty();
  }, [topForm.dateOfCrop, BACKEND_URL]);

  // 2. Date of Manufacture
  useEffect(() => {
    if (topForm.dateOfCrop) {
      const cropDate = new Date(topForm.dateOfCrop);
      cropDate.setDate(cropDate.getDate() + 1);
      const nextDay = cropDate.toISOString().split('T')[0];
      setTopForm((prev) => ({ ...prev, dateOfManufacture: nextDay, day: nextDay }));
    } else {
      setTopForm((prev) => ({ ...prev, dateOfManufacture: '', day: '' }));
    }
  }, [topForm.dateOfCrop]);

  // 3. Withered Percentage
  useEffect(() => {
    const received = parseFloat(topForm.receivedTotalCropKg);
    const withered = parseFloat(topForm.witheredLeafKg);
    let calcPercentage = '';
    let quality = '';

    if (!isNaN(received) && !isNaN(withered) && received > 0) {
      const p = (withered / received) * 100;
      calcPercentage = p.toFixed(2);
      if (p > 60) quality = 'Underwithered';
      else if (p >= 59) quality = 'Softwithered';
      else if (p >= 57) quality = 'Normal';
      else if (p >= 55) quality = 'Hardwithered';
      else quality = 'Overwithered';
    }
    setTopForm((prev) => ({ ...prev, percentage: calcPercentage, weatheringQuality: quality }));
  }, [topForm.receivedTotalCropKg, topForm.witheredLeafKg]);

  // 4. Time Period
  useEffect(() => {
    if (topForm.startTime && topForm.finishTime) {
      const start = new Date(`1970-01-01T${topForm.startTime}:00`);
      const end = new Date(`1970-01-01T${topForm.finishTime}:00`);
      let diffMs = end - start;
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      setTopForm((prev) => ({ ...prev, period: `${hrs}h ${mins}m` }));
    } else {
      setTopForm((prev) => ({ ...prev, period: '' }));
    }
  }, [topForm.startTime, topForm.finishTime]);

  // --- Input Handlers ---
  const handleTopChange = (e) => setTopForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleBottomChange = (e) => setBottomForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Batch Handling ---
  const handleBatchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBatchRecord();
    }
  };

  const handleAddBatchRecord = () => {
    const kgValue = parseFloat(bottomForm.batchKg);
    if (isNaN(kgValue) || kgValue <= 0) {
      toast.error(lang === 'SI' ? "කරුණාකර නිවැරදි ප්‍රමාණයක් ඇතුලත් කරන්න." : "Please enter a valid amount greater than 0.");
      return;
    }
    if (kgValue > 400) {
      toast.error(lang === 'SI' ? "උපරිම බර 400kg වේ." : "Maximum allowed weight per batch is 400kg.");
      return;
    }

    const batchIndex = parseInt(bottomForm.selectedBatch) - 1;
    const updatedBatches = [...bottomForm.batches];
    updatedBatches[batchIndex] = kgValue;

    setBottomForm((prev) => {
      const currentBatchInt = parseInt(prev.selectedBatch);
      const nextBatch = currentBatchInt < 25 ? String(currentBatchInt + 1) : prev.selectedBatch;
      return { ...prev, batches: updatedBatches, batchKg: '', selectedBatch: nextBatch };
    });

    setTimeout(() => { if (quantityInputRef.current) quantityInputRef.current.focus(); }, 10);
  };

  const handleEditBatchClick = (index) => {
    setBottomForm((prev) => ({
      ...prev,
      selectedBatch: String(index + 1),
      batchKg: prev.batches[index] > 0 ? String(prev.batches[index]) : ''
    }));
    setTimeout(() => { if (quantityInputRef.current) quantityInputRef.current.focus(); }, 10);
  };

  const handleDeleteBatchClick = (index) => setDeleteAlert({ isOpen: true, batchIndex: index });
  const confirmDelete = () => {
    const index = deleteAlert.batchIndex;
    if (index !== null) {
      const updatedBatches = [...bottomForm.batches];
      updatedBatches[index] = 0;
      setBottomForm((prev) => ({ ...prev, batches: updatedBatches }));
      toast.success(lang === 'SI' ? `කාණ්ඩය ${index + 1} සාර්ථකව ඉවත් කරන ලදී` : `Batch ${index + 1} removed successfully`);
    }
    setDeleteAlert({ isOpen: false, batchIndex: null });
  };
  const cancelDelete = () => setDeleteAlert({ isOpen: false, batchIndex: null });

  // --- Clear Handlers ---
  const handleClearTopSections = () => {
    setTopForm(prev => ({
      ...initialTopFormState,
      factory: prev.factory,
      dateOfCrop: prev.dateOfCrop,
      receivedTotalCropKg: prev.receivedTotalCropKg,
      dateOfManufacture: prev.dateOfManufacture,
      day: prev.day
    }));
  };

  const handleClearBottomSection = () => setBottomForm(initialBottomFormState);

  // ==========================================
  // INDEPENDENT SAVE: SECTIONS 1 & 2
  // ==========================================
  const handleSaveTopSections = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(lang === 'SI' ? "කොටස් 1 සහ 2 සුරකිමින්..." : "Saving Sections 1 & 2...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/wither-leaf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(topForm)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(lang === 'SI' ? "සාර්ථකව සුරකින ලදී!" : "Sections 1 & 2 saved successfully!", { id: loadingToast });
        handleClearTopSections();
      } else {
        toast.error(lang === 'SI' ? "සුරැකීම අසාර්ථකයි." : "Failed to save Sections 1 & 2.", { id: loadingToast });
      }
    } catch (error) {
      toast.error(lang === 'SI' ? "සේවාදායක දෝෂයකි." : "Server connection error.", { id: loadingToast });
    }
  };

  // ==========================================
  // INDEPENDENT SAVE: SECTION 3
  // ==========================================
  const handleSaveBottomSection = async (e) => {
    e.preventDefault();

    const hasData = bottomForm.batches.some(val => val > 0);
    if (!hasData) {
      toast.error(lang === 'SI' ? "කරුණාකර අවම වශයෙන් එක් කාණ්ඩයක් හෝ එක් කරන්න." : "Please add data to at least one batch before saving.");
      return;
    }

    const loadingToast = toast.loading(lang === 'SI' ? "කොටස 3 සුරකිමින්..." : "Saving Section 3...");

    try {
      const token = localStorage.getItem("token");
      const payload = {
        dateOfCrop: topForm.dateOfCrop,
        dateOfManufacture: topForm.dateOfManufacture,
        batches: bottomForm.batches
      };

      const response = await fetch(`${BACKEND_URL}/api/wither-leaf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(lang === 'SI' ? "සාර්ථකව සුරකින ලදී!" : "Section 3 saved successfully!", { id: loadingToast });
        handleClearBottomSection();
      } else {
        toast.error(lang === 'SI' ? "සුරැකීම අසාර්ථකයි." : "Failed to save Section 3.", { id: loadingToast });
      }
    } catch (error) {
      toast.error(lang === 'SI' ? "සේවාදායක දෝෂයකි." : "Server connection error.", { id: loadingToast });
    }
  };

  const activeBatches = bottomForm.batches.map((kg, index) => ({ index, kg })).filter(batch => batch.kg > 0);

  // --- Styles ---
  const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 block p-2.5 transition-colors";
  const readOnlyClass = "w-full bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-lg block p-2.5 font-medium";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2";
  const btnSaveClass = "bg-[#34a853] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm text-sm w-full sm:w-auto";
  const btnClearClass = "bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm text-sm w-full sm:w-auto";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans relative">
      <Toaster position="bottom-right" reverseOrder={false} />

      {/* --- HEADER --- */}
      <div className="mb-6 border-b border-gray-200 pb-4 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19s1-7 8-7 8 7 8 7M3 19c0-5.523 4.477-10 10-10s10 4.477 10 10M12 9c0-3.314-2.686-6-6-6S0 5.686 0 9"></path>
            </svg>
            <h1 className="text-xl font-bold text-green-800 tracking-tight">{t.title}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-8">{t.subtitle}</p>
        </div>
        
        {/* 💡 LANGUAGE TOGGLE BUTTON */}
        <button
          onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
          className="p-2.5 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm font-bold text-sm flex items-center gap-2"
          title="Toggle Language"
        >
          <Languages size={18} />
          {lang === 'EN' ? "සිංහල" : "English"}
        </button>
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-6">
          {/* --- SECTION 1 --- */}
          <div>
            <div className="flex items-center space-x-2 mb-4 border-b pb-2">
              <div className="p-1.5 bg-green-50 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path></svg>
              </div>
              <h2 className="text-sm font-bold text-gray-800">{t.sec1Title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-100"></div>

              <div className="flex flex-col gap-4 md:pr-4">
                <div>
                  <label className={labelClass}>{t.factory}</label>
                  <select name="factory" value={topForm.factory} onChange={handleTopChange} className={inputClass}>
                    <option value="">{t.selectFactory}</option>
                    <option value="ATHUKORALA TEA FACTORY - MF1398">ATHUKORALA TEA FACTORY - MF1398</option>
                    <option value="ATHUKORALA HANDMADE TEA FACTORY - HT0049">ATHUKORALA HANDMADE TEA FACTORY - HT0049</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.dateOfCrop}</label>
                  <input type="date" name="dateOfCrop" value={topForm.dateOfCrop} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t.recTotalCrop}</label>
                  <input type="number" name="receivedTotalCropKg" value={topForm.receivedTotalCropKg} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t.totalEmp}</label>
                  <input type="number" name="totalEmployee" value={topForm.totalEmployee} onChange={handleTopChange} className={inputClass} />
                </div>
              </div>

              <div className="flex flex-col gap-4 md:pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t.witheredLeaf}</label>
                    <input type="number" name="witheredLeafKg" value={topForm.witheredLeafKg} onChange={handleTopChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.percentage}</label>
                    <input type="text" name="percentage" value={topForm.percentage} readOnly className={readOnlyClass} placeholder={t.auto} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t.name1}</label>
                  <select name="name1" value={topForm.name1} onChange={handleTopChange} className={inputClass}>
                    <option value="">{t.selectName1}</option>
                    {employeeNames.map(name => <option key={`n1-${name}`} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.name2}</label>
                  <select name="name2" value={topForm.name2} onChange={handleTopChange} className={inputClass}>
                    <option value="">{t.selectName2}</option>
                    {employeeNames.map(name => <option key={`n2-${name}`} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.dom}</label>
                  <input type="date" name="dateOfManufacture" value={topForm.dateOfManufacture} readOnly className={readOnlyClass} />
                </div>
              </div>
            </div>
          </div>

          {/* --- SECTION 2 --- */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 mb-4 border-b pb-2">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <h2 className="text-sm font-bold text-gray-800">{t.sec2Title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{t.startTime}</label>
                <input type="time" name="startTime" value={topForm.startTime} onChange={handleTopChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.finishTime}</label>
                <input type="time" name="finishTime" value={topForm.finishTime} onChange={handleTopChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.period}</label>
                <input type="text" name="period" value={topForm.period} readOnly placeholder={t.auto} className={readOnlyClass} />
              </div>
              <div>
                <label className={labelClass}>{t.day}</label>
                <input type="date" name="day" value={topForm.day} onChange={handleTopChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.noOfBatchers}</label>
                <input type="number" name="noOfBatchers" value={topForm.noOfBatchers} onChange={handleTopChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.weatherQuality}</label>
                <input type="text" name="weatheringQuality" value={topForm.weatheringQuality} readOnly placeholder={t.auto} className={`${readOnlyClass} capitalize text-green-700`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 flex-wrap">
            <button type="button" onClick={handleSaveTopSections} className={btnSaveClass}>{t.saveSec12}</button>
            <button type="button" onClick={handleClearTopSections} className={btnClearClass}>{t.clearSec}</button>
          </div>
        </div>

        {/* --- SECTION 3 --- */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h2 className="text-sm font-bold text-gray-800">{t.sec3Title}</h2>
            </div>
          </div>

          <div className="mb-6">
            <label className={labelClass}>{t.dom}</label>
            <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 font-semibold h-10 flex items-center">
              {topForm.dateOfManufacture || t.awaitingDom}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="w-full md:w-1/3">
              <label className={labelClass}>{t.selectBatch}</label>
              <select name="selectedBatch" value={bottomForm.selectedBatch} onChange={handleBottomChange} className={inputClass}>
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{t.batch} {String(i + 1).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-1/3">
              <label className={labelClass}>{t.qty}</label>
              <input
                type="number"
                name="batchKg"
                ref={quantityInputRef}
                onKeyDown={handleBatchKeyDown}
                value={bottomForm.batchKg}
                onChange={handleBottomChange}
                placeholder={t.enterKg}
                className={inputClass}
              />
            </div>
            <div className="w-full md:w-auto">
              <button
                type="button"
                onClick={handleAddBatchRecord}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                {t.addBatch}
              </button>
            </div>
          </div>

          {activeBatches.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl mb-8">
              <p className="text-gray-500 text-sm font-medium">{t.noBatches}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-8">
              {activeBatches.map(({ index, kg }) => (
                <div key={index} className="group relative flex flex-col border border-green-200 rounded-lg overflow-hidden text-center shadow-sm">
                  <div className="bg-green-50 py-1.5 text-xs font-bold text-green-700 border-b border-green-200">
                    {t.batch} {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="py-3 text-lg font-bold text-gray-800 bg-white">
                    {kg} <span className="text-xs text-gray-400 font-normal">kg</span>
                  </div>
                  <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200 backdrop-blur-[2px]">
                    <button onClick={() => handleEditBatchClick(index)} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-transform hover:scale-110 shadow-sm" title="Edit Batch">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={() => handleDeleteBatchClick(index)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110 shadow-sm" title="Remove Batch">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2 flex-wrap">
            <button type="button" onClick={handleSaveBottomSection} className={btnSaveClass}>{t.saveSec3}</button>
            <button type="button" onClick={handleClearBottomSection} className={btnClearClass}>{t.clearBatches}</button>
          </div>
        </div>
      </div>

      {deleteAlert.isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t.removeTitle}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 pl-11">
              {t.removeDesc1} <strong>{t.batch} {deleteAlert.batchIndex + 1}</strong>{t.removeDesc2}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelDelete} className="px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t.cancelBtn}</button>
              <button onClick={confirmDelete} className="px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm">{t.removeBtn}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WitherLeafForm;