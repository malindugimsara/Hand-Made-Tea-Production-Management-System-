import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, Package, RefreshCcw, ListChecks, PlusCircle, Truck, Store, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Shared Input Styles ---
const inputStyles = "w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-400/20 focus:outline-none transition-all";

// --- Tea Type Predefined Options ---
const teaTypeOptions = [
  "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP",
  "FBOP", "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium"
];

// --- Custom Autocomplete Component ---
const TeaTypeAutocomplete = ({ name, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  const filteredOptions = teaTypeOptions.filter(opt =>
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange({ target: { name, value: filteredOptions[highlightedIndex] } });
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${inputStyles} pl-10 relative z-0`}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar overflow-hidden">
          {filteredOptions.map((opt, index) => (
            <li
              key={opt}
              className={`px-4 py-2.5 cursor-pointer text-sm font-bold transition-colors ${
                highlightedIndex === index
                  ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange({ target: { name, value: opt } });
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// --- MAIN COMPONENT ---
export default function DispatchAndReturn() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  
  // States
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || false;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Array-based initial state for multiple entries
  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    dispatches: [{ invoiceNo: '', teaType: '', weight: '' }],
    localSales: [{ teaType: '', weight: '' }],
    returns: [{ teaType: '', amount: '' }], // Added teaType to returns array based on your update
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (formData.date) {
      const selectedDateMonth = formData.date.substring(0, 7); 
      if (selectedDateMonth !== selectedMonth) {
        setSelectedMonth(selectedDateMonth);
      }
    }
  }, [formData.date, selectedMonth]);

  const username = localStorage.getItem('username') || 'Unknown User';
  const userRole = localStorage.getItem('userRole') || '';
  const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

  // Calculate Totals dynamically from arrays
  const totalDispatch = formData.dispatches.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const totalLocalSale = formData.localSales.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const totalReturn = formData.returns.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const calculatedTotalOut = totalDispatch + totalLocalSale;

  // Dark Mode Toggle Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchFactoryData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      toast.error("Network error fetching previous records.");
    }
  };

  useEffect(() => {
    fetchFactoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // --- Dynamic Array Handlers ---
  const handleArrayChange = (category, index, field, value) => {
    const updatedArray = [...formData[category]];
    updatedArray[index][field] = value;
    setFormData({ ...formData, [category]: updatedArray });
  };

  const addArrayItem = (category, defaultObj) => {
    setFormData({ ...formData, [category]: [...formData[category], defaultObj] });
  };

  const removeArrayItem = (category, index) => {
    const updatedArray = formData[category].filter((_, i) => i !== index);
    setFormData({ ...formData, [category]: updatedArray });
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    if (isViewer) {
      toast.error("Viewers cannot add records.");
      return;
    }

    const isAlreadyInQueue = pendingRecords.some(r => r.date === formData.date);
    if (isAlreadyInQueue) {
      toast.error(`A record for ${formData.date} is already in the pending list!`);
      return;
    }

    const existingRecord = records.find(r => r.date.split('T')[0] === formData.date);

    const newRecord = {
      ...formData,
      calculatedTotalOut,
      totalDispatch,
      totalLocalSale,
      totalReturn,
      greenLeafToday: existingRecord ? (existingRecord.greenLeaf?.today || existingRecord.greenLeafToday || 0) : 0,    
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success("Added to list!");
    
    // Reset Form (except date)
    setFormData({ 
      ...initialFormState,
      date: formData.date
    });
  };

  const handleRemoveFromList = (indexToRemove) => {
    setPendingRecords(pendingRecords.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) return;
    setIsSavingAll(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} dispatch records...`);

    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      for (const record of pendingRecords) {
        const payload = {
          date: record.date,
          greenLeafToday: Number(record.greenLeafToday) || 0,
          dispatches: record.dispatches.filter(d => d.weight || d.invoiceNo), 
          localSales: record.localSales.filter(l => l.weight || l.teaType),
          returns: record.returns.filter(r => r.amount || r.teaType),
          username: username
        };

        const res = await fetch(`${BACKEND_URL}/api/factory-logs`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to save record for ${record.date}`);
      }

      toast.success("Dispatch records saved!", { id: toastId });
      setPendingRecords([]);
      navigate("/factory/view");
    } catch (error) {
      toast.error(error.message || "Error saving records.", { id: toastId });
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 bg-[#f3faf7] dark:bg-gray-900">
      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER & TOGGLE */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border bg-[#f0fdfa] dark:bg-teal-900/30 border-[#99f6e4] dark:border-teal-800 text-[#0d5e4d] dark:text-teal-400 transition-colors">
              <Package size={32} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d] dark:text-teal-400 transition-colors">Dispatch & Returns</h2>
              <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-[#0f766e] dark:text-teal-500 transition-colors">Daily Outgoing Logs</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* FORM SIDE */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleAddToList} className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date</label>
                <input 
                  type="date" name="date" value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} required 
                  className={inputStyles}
                />
              </div>

              {/* 1. DISPATCH SECTION */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center justify-between text-[#0f766e] dark:text-teal-400 border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"><Truck size={18}/></div>
                    Dispatch Details
                  </div>
                </h3>
                
                {formData.dispatches.map((dispatchItem, index) => (
                  <div key={index} className="relative mb-5 pb-5 border-b border-gray-200 dark:border-gray-700/60 border-dashed last:border-0 last:mb-0 last:pb-0">
                    
                    {formData.dispatches.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeArrayItem('dispatches', index)}
                        className="absolute -top-1 right-0 text-red-400 hover:text-red-600 dark:hover:text-red-400 p-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors"
                        title="Remove dispatch"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Invoice No.</label>
                        <input 
                          type="text" 
                          value={dispatchItem.invoiceNo} 
                          onChange={(e) => handleArrayChange('dispatches', index, 'invoiceNo', e.target.value)} 
                          placeholder="Enter Invoice Number" className={inputStyles} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          name={`dispatchTeaType-${index}`}
                          value={dispatchItem.teaType}
                          onChange={(e) => handleArrayChange('dispatches', index, 'teaType', e.target.value)}
                          placeholder="E.g. BOPF, Pekoe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Gross Weight (kg)</label>
                      <input 
                        type="number" step="0.01" min="0" 
                        value={dispatchItem.weight} 
                        onChange={(e) => handleArrayChange('dispatches', index, 'weight', e.target.value)} 
                        onWheel={(e) => e.target.blur()} placeholder="0.00 kg" className={inputStyles} 
                      />
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={() => addArrayItem('dispatches', { invoiceNo: '', teaType: '', weight: '' })}
                  className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-teal-200 dark:border-teal-800/50 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center gap-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-sm"
                >
                  <PlusCircle size={16} /> Add New Dispatch
                </button>
              </div>

              {/* 2. LOCAL SALES SECTION */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#b45309] dark:text-orange-400 border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"><Store size={18}/></div>
                  Local Sales Details
                </h3>
                
                {formData.localSales.map((saleItem, index) => (
                   <div key={index} className="relative mb-5 pb-5 border-b border-gray-200 dark:border-gray-700/60 border-dashed last:border-0 last:mb-0 last:pb-0">
                    
                    {formData.localSales.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeArrayItem('localSales', index)}
                        className="absolute -top-1 right-0 text-red-400 hover:text-red-600 dark:hover:text-red-400 p-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          name={`localSaleTeaType-${index}`}
                          value={saleItem.teaType}
                          onChange={(e) => handleArrayChange('localSales', index, 'teaType', e.target.value)}
                          placeholder="E.g. Dust, Fannings"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Qty (kg)</label>
                        <input 
                          type="number" step="0.01" min="0" 
                          value={saleItem.weight} 
                          onChange={(e) => handleArrayChange('localSales', index, 'weight', e.target.value)} 
                          onWheel={(e) => e.target.blur()} placeholder="0.00 kg" className={inputStyles} 
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={() => addArrayItem('localSales', { teaType: '', weight: '' })}
                  className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800/40 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-sm"
                >
                  <PlusCircle size={16} /> Add New Local Sale
                </button>
              </div>

              {/* TOTAL OUT SUMMARY */}
              <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Out (All Dispatches + Local Sales)</label>
                <div className="w-full text-xl flex items-center font-black text-gray-800 dark:text-gray-200 transition-colors">
                  {calculatedTotalOut > 0 ? calculatedTotalOut.toFixed(2) : '0.00'} <span className="text-sm text-gray-500 ml-1">kg</span>
                </div>
              </div>

              {/* 3. RETURNS SECTION */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><RefreshCcw size={18}/></div> 
                  Returns
                </h3>
                
                {formData.returns.map((returnItem, index) => (
                  <div key={index} className="relative mb-5 pb-5 border-b border-gray-200 dark:border-gray-700/60 border-dashed last:border-0 last:mb-0 last:pb-0">
                    
                    {formData.returns.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeArrayItem('returns', index)}
                        className="absolute -top-1 right-0 text-red-400 hover:text-red-600 dark:hover:text-red-400 p-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          name={`returnTeaType-${index}`}
                          value={returnItem.teaType}
                          onChange={(e) => handleArrayChange('returns', index, 'teaType', e.target.value)}
                          placeholder="E.g. BOPF, Pekoe"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Return Amount (kg)</label>
                        <input 
                          type="number" step="0.01" min="0" 
                          value={returnItem.amount} 
                          onChange={(e) => handleArrayChange('returns', index, 'amount', e.target.value)} 
                          onWheel={(e) => e.target.blur()} placeholder="0.00" className={inputStyles} 
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  onClick={() => addArrayItem('returns', { teaType: '', amount: '' })}
                  className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                >
                  <PlusCircle size={16} /> Add New Return
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isViewer} 
                className="w-full py-4 rounded-2xl text-white font-black text-lg uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-[#163d2e] via-[#0d5e4d] to-[#0f766e] dark:from-teal-700 dark:via-teal-600 dark:to-teal-800 disabled:opacity-50"
              >
                <PlusCircle size={22} /> Add to Queue
              </button> 
            </form>
          </div>

          {/* QUEUE SIDE */}
          <div className="lg:col-span-5 flex flex-col h-full max-h-[85vh]">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden sticky top-6 transition-colors">
              
              <div className="bg-gray-50 dark:bg-gray-800/80 p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    <ListChecks size={18} />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">Dispatch Queue</h3>
                </div>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-black px-3 py-1 rounded-full">
                  {pendingRecords.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-900/30">
                {pendingRecords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-10">
                    <p className="text-sm font-bold">Queue is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRecords.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm relative group transition-colors">
                        
                        <button 
                          onClick={() => handleRemoveFromList(index)} 
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-700 p-1.5 rounded-md border border-gray-100 dark:border-gray-600 transition-colors z-10"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex flex-col gap-3 pr-8">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{item.date}</span>
                          
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 space-y-2 mb-1">
                            
                            {/* Dispatch Summaries */}
                            {item.totalDispatch > 0 && (
                              <div className="flex flex-col bg-teal-50/50 dark:bg-teal-900/10 p-2 rounded-lg border border-teal-100 dark:border-teal-800/30">
                                <div className="flex justify-between items-center text-[#0f766e] dark:text-teal-400 mb-1 border-b border-teal-200/50 dark:border-teal-800/50 pb-1">
                                  <span className="font-bold flex items-center gap-1"><Truck size={12}/> Dispatches</span>
                                  <span className="font-black">{item.totalDispatch.toFixed(2)} kg</span>
                                </div>
                                {item.dispatches.map((d, i) => (d.weight || d.invoiceNo) && (
                                  <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between pt-1">
                                    <span>{d.invoiceNo ? `Inv: ${d.invoiceNo}` : 'No Inv'} {d.teaType && `(${d.teaType})`}</span>
                                    <span className="font-semibold">{d.weight || '0'} kg</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Local Sale Summaries */}
                            {item.totalLocalSale > 0 && (
                              <div className="flex flex-col bg-orange-50/50 dark:bg-orange-900/10 p-2 rounded-lg border border-orange-100 dark:border-orange-800/30">
                                <div className="flex justify-between items-center text-[#b45309] dark:text-orange-400 mb-1 border-b border-orange-200/50 dark:border-orange-800/50 pb-1">
                                  <span className="font-bold flex items-center gap-1"><Store size={12}/> Local Sales</span>
                                  <span className="font-black">{item.totalLocalSale.toFixed(2)} kg</span>
                                </div>
                                {item.localSales.map((l, i) => (l.weight || l.teaType) && (
                                  <div key={i} className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between pt-1">
                                    <span>{l.teaType ? `Type: ${l.teaType}` : 'Unspecified'}</span>
                                    <span className="font-semibold">{l.weight || '0'} kg</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between px-3 text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors mt-1">
                            <span>Total Out:</span><span>{item.calculatedTotalOut.toFixed(2)} kg</span>
                          </div>
                          
                          {/* Returns Summary */}
                          {item.totalReturn > 0 && (
                            <div className="flex flex-col bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <div className="flex justify-between items-center text-blue-800 dark:text-blue-400 mb-1 border-b border-blue-200/50 dark:border-blue-800/50 pb-1 px-1">
                                  <span className="font-bold text-xs">Total Returns</span>
                                  <span className="font-black text-xs">{item.totalReturn.toFixed(2)} kg</span>
                                </div>
                                {item.returns.map((r, i) => (r.amount || r.teaType) && (
                                  <div key={i} className="text-[10px] text-blue-600/70 dark:text-blue-300/70 flex justify-between pt-1 px-1">
                                    <span>{r.teaType ? `Type: ${r.teaType}` : 'Unspecified'}</span>
                                    <span className="font-semibold">{r.amount || '0'} kg</span>
                                  </div>
                                ))}
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <button 
                  onClick={handleSaveAll} 
                  disabled={isSavingAll || pendingRecords.length === 0} 
                  className={`w-full py-4 rounded-2xl font-black flex justify-center items-center gap-2 transition-all ${
                    isSavingAll || pendingRecords.length === 0 
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed' 
                      : 'text-white shadow-lg hover:-translate-y-0.5 bg-gradient-to-br from-[#163d2e] via-[#0d5e4d] to-[#0f766e] dark:from-teal-700 dark:via-teal-600 dark:to-teal-800'
                  }`}
                >
                  <Save size={18} /> {isSavingAll ? "Saving..." : `Save Records (${pendingRecords.length})`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}