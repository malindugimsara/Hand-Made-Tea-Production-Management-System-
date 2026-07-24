import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Truck, Store, RefreshCcw, ArrowLeft, Info, AlertTriangle, Tag, Save, PlusCircle, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// --- Shared Input Styles ---
const inputStyles = "w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/30 focus:outline-none transition-all";

// --- Tea Type Predefined Options & Autocomplete ---
const teaTypeOptions = [
  "BOPF", "BOPF SP", "OPA", "OP 1", "OP", "Pekoe", "BOP",
  "FBOP", "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium"
];

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

export default function EditDispatchLog() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Grab the record safely right away
    const record = location.state?.recordData || null;

    // 2. Initialize the state using the passed record (mapping to arrays)
    const [formData, setFormData] = useState({
        date: record?.date ? new Date(record.date).toISOString().split('T')[0] : '',
        
        // Convert existing DB arrays OR fallback to a single empty row if none exist
        dispatches: record?.dispatches?.length > 0 ? record.dispatches : [{ invoiceNo: '', teaType: '', weight: '' }],
        localSales: record?.localSales?.length > 0 ? record.localSales : [{ teaType: '', weight: '' }],
        returns: record?.returns?.length > 0 ? record.returns : [{ teaType: '', amount: '' }],

        // HIDDEN FIELD: We MUST send the existing Green Leaf back to the backend
        greenLeafToday: record?.greenLeaf?.today || record?.greenLeafToday || 0,
    });

    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
        if (!record) {
            toast.error("No record data found to edit.");
            navigate(-1);
        }
    }, [record, navigate]);

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

    // Real-time calculation for Total Out
    const totalDispatch = formData.dispatches.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const totalLocalSale = formData.localSales.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const calculatedTotalOut = totalDispatch + totalLocalSale;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSpinner(true);
        const toastId = toast.loading('Updating dispatch records...');

        try {
            const loggedInUser = localStorage.getItem('username') || 'System User';

            const payload = {
                date: formData.date,
                
                // Keep the original green leaf value unchanged
                greenLeafToday: Number(formData.greenLeafToday) || 0,
                
                // Updated Array Data (Filtered to remove empty rows)
                dispatches: formData.dispatches.filter(d => d.weight || d.invoiceNo), 
                localSales: formData.localSales.filter(l => l.weight || l.teaType),
                returns: formData.returns.filter(r => r.amount || r.teaType),
                
                username: loggedInUser,
                isExplicitEdit: true
            };

            const response = await fetch(`${BACKEND_URL}/api/factory-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success('Dispatch record updated successfully!', { id: toastId });
                setTimeout(() => {
                    navigate(-1); // Go back to the previous page (Dispatch View)
                }, 500);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to update record.', { id: toastId });
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error('Network error. Please check your connection.', { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    if (!record || !formData.date) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-gray-500 bg-gray-50 dark:bg-gray-900">
                <AlertTriangle size={48} className="text-orange-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Data Missing</h2>
                <p className="mt-2 text-gray-500">Please go back to the table and click "Edit" again.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto font-sans bg-[#f3faf7] dark:bg-gray-950 min-h-screen transition-colors duration-300">
            {/* Header & Back Button */}
            <div className="mb-8 relative flex flex-col items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-0 top-0 p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-full transition-all"
                    title="Go Back"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-teal-600 dark:text-teal-400 mb-3">
                    <Truck size={32} />
                </div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100">Edit Dispatch Log</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Update invoice, types, and outgoing quantities</p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex items-start gap-3 text-sm shadow-sm">
                <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                    You are editing the dispatch record for <strong>{formData.date}</strong>. Note that modifying these weights will automatically recalculate the Factory Balance.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">

                {/* DATE SECTION (Locked) */}
                <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date (Locked)</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        disabled
                        className="w-full md:w-1/2 p-3 border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-bold"
                    />
                </div>

                {/* 1. DISPATCH SECTION */}
                <div className="mb-6 bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-teal-700 dark:text-teal-400 mb-4 flex items-center gap-2 border-b border-teal-200/50 dark:border-teal-800/50 pb-3">
                        <Truck size={20} /> Dispatch Details
                    </h3>
                    
                    {formData.dispatches.map((dispatchItem, index) => (
                        <div key={index} className="relative mb-5 pb-5 border-b border-teal-200/50 dark:border-teal-800/50 border-dashed last:border-0 last:mb-0 last:pb-0">
                            
                            {formData.dispatches.length > 1 && (
                            <button 
                                type="button" 
                                onClick={() => removeArrayItem('dispatches', index)}
                                className="absolute -top-1 right-0 text-red-400 hover:text-red-600 dark:hover:text-red-400 p-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 mt-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Invoice No.</label>
                                    <input
                                        type="text" 
                                        value={dispatchItem.invoiceNo} 
                                        onChange={(e) => handleArrayChange('dispatches', index, 'invoiceNo', e.target.value)}
                                        placeholder="E.g. INV-1002" className={inputStyles}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                                    <TeaTypeAutocomplete
                                        name={`dispatchTeaType-${index}`}
                                        value={dispatchItem.teaType}
                                        onChange={(e) => handleArrayChange('dispatches', index, 'teaType', e.target.value)}
                                        placeholder="E.g. BOPF"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Dispatch Quantity (kg)</label>
                                <input
                                    type="number" step="0.01" min="0" 
                                    value={dispatchItem.weight} 
                                    onChange={(e) => handleArrayChange('dispatches', index, 'weight', e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    placeholder="0.00 kg" className={inputStyles}
                                />
                            </div>
                        </div>
                    ))}

                    <button 
                        type="button" 
                        onClick={() => addArrayItem('dispatches', { invoiceNo: '', teaType: '', weight: '' })}
                        className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 font-bold flex items-center justify-center gap-2 hover:bg-teal-100/50 dark:hover:bg-teal-900/40 transition-colors text-sm"
                    >
                        <PlusCircle size={16} /> Add New Dispatch
                    </button>
                </div>

                {/* 2. LOCAL SALES SECTION */}
                <div className="mb-6 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2 border-b border-orange-200/50 dark:border-orange-800/50 pb-3">
                        <Store size={20} /> Local Sales Details
                    </h3>
                    
                    {formData.localSales.map((saleItem, index) => (
                        <div key={index} className="relative mb-5 pb-5 border-b border-orange-200/50 dark:border-orange-800/50 border-dashed last:border-0 last:mb-0 last:pb-0">
                            
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
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
                                    <TeaTypeAutocomplete
                                        name={`localSaleTeaType-${index}`}
                                        value={saleItem.teaType}
                                        onChange={(e) => handleArrayChange('localSales', index, 'teaType', e.target.value)}
                                        placeholder="E.g. Dust"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Total Qty (kg)</label>
                                    <input
                                        type="number" step="0.01" min="0" 
                                        value={saleItem.weight} 
                                        onChange={(e) => handleArrayChange('localSales', index, 'weight', e.target.value)}
                                        onWheel={(e) => e.target.blur()}
                                        placeholder="0.00 kg" className={inputStyles}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        type="button" 
                        onClick={() => addArrayItem('localSales', { teaType: '', weight: '' })}
                        className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 font-bold flex items-center justify-center gap-2 hover:bg-orange-100/50 dark:hover:bg-orange-900/40 transition-colors text-sm"
                    >
                        <PlusCircle size={16} /> Add New Local Sale
                    </button>
                </div>

                {/* TOTAL OUT SUMMARY */}
                <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Out (Dispatch + Local Sales)</label>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">
                        {calculatedTotalOut > 0 ? calculatedTotalOut.toFixed(2) : '0.00'} <span className="text-sm text-gray-500">kg</span>
                    </div>
                </div>

                {/* 3. RETURNS */}
                <div className="mb-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5 transition-colors">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/50 pb-3">
                        <RefreshCcw size={20} /> Returns
                    </h3>
                    
                    {formData.returns.map((returnItem, index) => (
                        <div key={index} className="relative mb-5 pb-5 border-b border-blue-200/50 dark:border-blue-800/50 border-dashed last:border-0 last:mb-0 last:pb-0">
                            
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
                                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tea Type</label>
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
                                        onWheel={(e) => e.target.blur()}
                                        placeholder="0.00 kg" className={inputStyles}
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

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className={`w-full h-14 text-white font-black rounded-xl mt-2 text-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${showSpinner
                            ? 'bg-teal-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-teal-600 to-teal-800 hover:-translate-y-0.5 hover:shadow-xl'
                        }`}
                    disabled={showSpinner}
                >
                    {showSpinner ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : (
                        <><Save size={22} /> Update Dispatch Record</>
                    )}
                </button>
            </form>
        </div>
    );
}