import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, Package, RefreshCcw, ListChecks, PlusCircle, Truck, Store, Tag, FileUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Shared Input Styles ---
const inputStyles = "w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-400/20 focus:outline-none transition-all";

// --- Tea Type Predefined Options ---
const teaTypeOptions = [
  "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP",
  "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "BM", "Bop",
  "BOP SP", "BOPSP", "BOP1", "BOP1A", "BOPA", "BOPF1", "BT",
  "FBOP1", "FBOPF1", "FNGS", "OP1", "Pekoe1"
];

// --- Custom Autocomplete Component ---
const TeaTypeAutocomplete = ({ id, name, value, onChange, placeholder, autoFocus, onEnterKeyPress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const activeOptionRef = useRef(null); 

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

  useEffect(() => {
    if (activeOptionRef.current && isOpen) {
      activeOptionRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      } else if (e.key === "Enter") {
        e.preventDefault(); 
        if (onEnterKeyPress) onEnterKeyPress();
      }
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
        setHighlightedIndex(-1);
        if (onEnterKeyPress) setTimeout(() => onEnterKeyPress(), 50);
      } else {
        setIsOpen(false);
        if (onEnterKeyPress) onEnterKeyPress();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
      <input
        id={id}
        type="text"
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e);
          setIsOpen(true);
          setHighlightedIndex(-1); 
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${inputStyles} pl-10 relative z-0`}
        autoComplete="off"
        autoFocus={autoFocus} 
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar overflow-hidden">
          {filteredOptions.map((opt, index) => {
            const isHighlighted = highlightedIndex === index;
            return (
              <li
                key={opt}
                ref={isHighlighted ? activeOptionRef : null} 
                className={`px-4 py-2.5 cursor-pointer text-sm font-bold transition-colors ${
                  isHighlighted
                    ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ target: { name, value: opt } });
                  setIsOpen(false);
                  if (onEnterKeyPress) setTimeout(() => onEnterKeyPress(), 50);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function DispatchAndReturn() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const fileInputRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || false;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    dispatches: [{ invoiceNo: '', teaType: '', weight: '' }],
    localSales: [{ teaType: '', weight: '' }],
    returns: [{ teaType: '', amount: '' }], 
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

  const totalDispatch = formData.dispatches.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const totalLocalSale = formData.localSales.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const totalReturn = formData.returns.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const calculatedTotalOut = totalDispatch + totalLocalSale;

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
  }, [selectedMonth]);

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

  // =========================================================================
  // 💡 PDF AUTO-PARSING AND EXTRACTION LOGIC
  // =========================================================================
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Failed to load PDF processing library."));
      document.head.appendChild(script);
    });
  };

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate that all selected files are PDFs
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        toast.error(`"${file.name}" is not a valid PDF file.`);
        return;
      }
    }

    setIsUploadingPdf(true);
    const toastId = toast.loading(`Processing ${files.length} PDF file(s)...`);

    try {
      const pdfjs = await loadPdfJs();
      const allExtractedDispatches = [];

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const rows = [];
          textContent.items.forEach(item => {
            const text = item.str.trim();
            if (!text) return;
            const x = item.transform[4];
            const y = Math.round(item.transform[5]);

            let row = rows.find(r => Math.abs(r.y - y) <= 4);
            if (!row) {
              row = { y, items: [] };
              rows.push(row);
            }
            row.items.push({ x, text });
          });

          rows.sort((a, b) => b.y - a.y);
          rows.forEach(r => r.items.sort((a, b) => a.x - b.x));

          for (const r of rows) {
            const texts = r.items.map(i => i.text);
            if (texts.length < 5) continue;

            const firstCol = texts[0];
            if (!/^\d{4,8}$/.test(firstCol) || firstCol.toLowerCase().includes("total")) continue;

            const invoiceNo = firstCol;
            let weight = '';
            let teaType = '';

            if (texts.length >= 8) {
              weight = texts[6];

              let candidateGrade = texts[7];
              if (texts[8] && (texts[8].toUpperCase() === 'SP' || texts[8].toUpperCase() === '1' || texts[8].toUpperCase() === 'EX SP')) {
                candidateGrade += ' ' + texts[8];
              }

              const matchedGrade = teaTypeOptions.find(opt => opt.toLowerCase() === candidateGrade.toLowerCase());
              teaType = matchedGrade || candidateGrade.toUpperCase();
            }

            if (invoiceNo && (weight || teaType)) {
              allExtractedDispatches.push({
                invoiceNo: invoiceNo,
                teaType: teaType,
                weight: weight ? String(Number(weight.replace(/,/g, '')) || weight) : ''
              });
            }
          }
        }
      }

      if (allExtractedDispatches.length === 0) {
        toast.error("No valid dispatch invoice rows found in the uploaded PDF(s).", { id: toastId });
      } else {
        setFormData(prev => ({
          ...prev,
          dispatches: [...prev.dispatches.filter(d => d.invoiceNo || d.teaType || d.weight), ...allExtractedDispatches]
        }));
        toast.success(`Successfully imported ${allExtractedDispatches.length} items from ${files.length} file(s)!`, { id: toastId });
      }
    } catch (error) {
      console.error("Multiple PDF Parsing Error:", error);
      toast.error("Failed to parse one or more PDF files.", { id: toastId });
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          dispatch: Number(record.totalDispatch) || 0,
          localSaleAndGratis: Number(record.totalLocalSale) || 0,
          returnAmount: Number(record.totalReturn) || 0,

          dispatches: record.dispatches
            .filter(d => d.weight || d.invoiceNo)
            .map(d => ({
              invoiceNo: d.invoiceNo,
              teaType: d.teaType,
              weight: Number(d.weight) || 0
            })),
            
          localSales: record.localSales
            .filter(l => l.weight || l.teaType)
            .map(l => ({
              teaType: l.teaType,
              weight: Number(l.weight) || 0
            })),
            
          returns: record.returns
            .filter(r => r.amount || r.teaType)
            .map(r => ({
              teaType: r.teaType,
              amount: Number(r.amount) || 0
            })),
            
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

  const focusNextInput = (nextId) => {
    const nextInput = document.getElementById(nextId);
    if (nextInput) {
      nextInput.focus();
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 bg-[#f3faf7] dark:bg-gray-900">
      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER */}
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
            <form 
              onSubmit={handleAddToList} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors"
            >
              
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date</label>
                <input 
                  type="date" name="date" value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} required 
                  className={inputStyles}
                  onKeyDown={(e) => {
                    if(e.key === "Enter"){
                      e.preventDefault();
                      focusNextInput('dispatch-invoice-0');
                    }
                  }}
                />
              </div>

              {/* 1. DISPATCH SECTION */}
              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"><Truck size={18}/></div>
                    <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-400">Dispatch Details</h3>
                  </div>

                  {/* 💡 Upload PDF Button */}
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePdfUpload} 
                      accept="application/pdf" 
                      multiple
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPdf || isViewer}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      title="Upload Tea Invoice PDF to auto-fill"
                    >
                      {isUploadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                      {isUploadingPdf ? "Reading PDF..." : "Upload Invoice PDF"}
                    </button>
                  </div>
                </div>
                
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
                          id={`dispatch-invoice-${index}`}
                          type="text" 
                          value={dispatchItem.invoiceNo} 
                          onChange={(e) => handleArrayChange('dispatches', index, 'invoiceNo', e.target.value)} 
                          placeholder="Enter Invoice Number" className={inputStyles} 
                          autoFocus={index > 0 && index === formData.dispatches.length - 1}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusNextInput(`dispatch-tea-${index}`);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          id={`dispatch-tea-${index}`}
                          name={`dispatchTeaType-${index}`}
                          value={dispatchItem.teaType}
                          onChange={(e) => handleArrayChange('dispatches', index, 'teaType', e.target.value)}
                          placeholder="E.g. BOPF, Pekoe"
                          onEnterKeyPress={() => focusNextInput(`dispatch-weight-${index}`)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Gross Weight (kg)</label>
                      <input 
                        id={`dispatch-weight-${index}`}
                        type="number" step="0.01" min="0" 
                        value={dispatchItem.weight} 
                        onChange={(e) => handleArrayChange('dispatches', index, 'weight', e.target.value)} 
                        onWheel={(e) => e.target.blur()} placeholder="0.00 kg" className={inputStyles} 
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            if (dispatchItem.invoiceNo || dispatchItem.teaType || dispatchItem.weight) {
                              addArrayItem('dispatches', { invoiceNo: '', teaType: '', weight: '' });
                            }
                          }
                        }}
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
                        title="Remove local sale"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          id={`localSale-tea-${index}`}
                          name={`localSaleTeaType-${index}`}
                          value={saleItem.teaType}
                          onChange={(e) => handleArrayChange('localSales', index, 'teaType', e.target.value)}
                          placeholder="E.g. Dust, Fannings"
                          autoFocus={index > 0 && index === formData.localSales.length - 1}
                          onEnterKeyPress={() => focusNextInput(`localSale-weight-${index}`)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Qty (kg)</label>
                        <input 
                          id={`localSale-weight-${index}`}
                          type="number" step="0.01" min="0" 
                          value={saleItem.weight} 
                          onChange={(e) => handleArrayChange('localSales', index, 'weight', e.target.value)} 
                          onWheel={(e) => e.target.blur()} placeholder="0.00 kg" className={inputStyles} 
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault(); 
                              if (saleItem.teaType || saleItem.weight) {
                                addArrayItem('localSales', { teaType: '', weight: '' });
                              }
                            }
                          }}
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
                        title="Remove return"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                        <TeaTypeAutocomplete
                          id={`return-tea-${index}`}
                          name={`returnTeaType-${index}`}
                          value={returnItem.teaType}
                          onChange={(e) => handleArrayChange('returns', index, 'teaType', e.target.value)}
                          placeholder="E.g. BOPF, Pekoe"
                          autoFocus={index > 0 && index === formData.returns.length - 1}
                          onEnterKeyPress={() => focusNextInput(`return-weight-${index}`)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Return Amount (kg)</label>
                        <input 
                          id={`return-weight-${index}`}
                          type="number" step="0.01" min="0" 
                          value={returnItem.amount} 
                          onChange={(e) => handleArrayChange('returns', index, 'amount', e.target.value)} 
                          onWheel={(e) => e.target.blur()} placeholder="0.00" className={inputStyles} 
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault(); 
                              if (returnItem.teaType || returnItem.amount) {
                                addArrayItem('returns', { teaType: '', amount: '' });
                              }
                            }
                          }}
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