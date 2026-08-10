import React, { useState } from 'react';
import { Save, Calendar, PlusCircle, Trash2, ListChecks, Package, ArrowRight, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

const teaCategories = [
  { id: 'athukorala', title: 'Athukorala', sizes: ['400g', '200g', '100g'] },
  { id: 'bopfSp', title: 'BOPF Sp.', sizes: ['400g', '200g'] },
  { id: 'bopfPremium', title: 'BOPF Premium', sizes: ['400g', '200g'] },
  { id: 'tb', title: 'T/B', sizes: ['100', '25'] },
  { id: 'pitigala', title: 'PITIGALA TEA', sizes: ['400g', '200g'] },
  { id: 'gt', title: 'G/T', sizes: ['200g'] },
  { id: 'gttb25', title: 'G/T', sizes: ['T/B 25'] },
  { id: 'others', title: 'Other Grades', sizes: ['DUST (KG)', 'DUST 1 (KG)', 'BOPF (KG)'] }
];

const ISSUE_TYPES = [
  "Free issued",
  "Labour issued",
  "Staff issued"
];

export default function IssueTypeSummaryEntry() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const getInitialState = () => {
    const initialState = {};
    teaCategories.forEach(category => {
      initialState[category.id] = {};
      category.sizes.forEach(size => {
        initialState[category.id][size] = { out: '' }; // IN ඉවත් කර OUT පමණක් තබා ඇත
      });
    });
    return initialState;
  };

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueType, setIssueType] = useState('');
  const [formData, setFormData] = useState(getInitialState());
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (categoryId, size, value) => {
    // Prevent negative values
    if (value !== '' && Number(value) < 0) return;
    
    setFormData(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [size]: {
          out: value
        }
      }
    }));
  };

  // Extract only filled OUT data to add to the list
  const extractFilledData = () => {
    const filledItems = [];
    Object.entries(formData).forEach(([catId, sizes]) => {
      Object.entries(sizes).forEach(([size, values]) => {
        if (values.out !== '') {
          const catTitle = teaCategories.find(c => c.id === catId)?.title;
          filledItems.push({
            categoryId: catId,
            categoryTitle: catTitle,
            size,
            out: values.out || '0'
          });
        }
      });
    });
    return filledItems;
  };

  const handleAddToList = (e) => {
    e.preventDefault();

    if (!issueType) {
      toast.error("Please select an Issue Type!");
      return;
    }

    const filledItems = extractFilledData();

    if (filledItems.length === 0) {
      toast.error("Please enter at least one OUT value before adding!");
      return;
    }

    // Check if date & issueType combination already exists in the list
    if (pendingRecords.some(record => record.date === date && record.issueType === issueType)) {
      toast.error(`A record for ${date} with type '${issueType}' is already in the pending list!`);
      return;
    }

    const newRecord = {
      id: Date.now(),
      date,
      issueType,
      items: filledItems
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success(`Record added to list!`);
    
    // Reset form data after adding
    setFormData(getInitialState());
  };

  const handleRemoveFromList = (indexToRemove) => {
    setPendingRecords(pendingRecords.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) {
      toast.error("No records in the list to save!");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

    // Format Payload matching backend expectations for OUT-only entries
    const payload = {
      records: pendingRecords.map(record => ({
        date: record.date,
        issueType: record.issueType,
        items: record.items.map(item => ({
          categoryId: item.categoryId,
          categoryTitle: item.categoryTitle,
          size: item.size,
          out: Number(item.out) || 0
        }))
      }))
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/summary/bulk-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save records');
      }

      toast.success(data.message || "All records saved successfully!", { id: toastId });
      setPendingRecords([]);

    } catch (error) {
      console.error("Save Error:", error);
      toast.error(error.message || "Error saving some records. Please check.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">      
      {/* Header Section */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400">Issue Type Data Entry (OUT)</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Enter product issued details by category</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* --- LEFT SIDE: DATA ENTRY FORM --- */}
        <div className="lg:col-span-3">
          <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-green-100 dark:border-zinc-800 transition-colors duration-300">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Date Input */}
              <div className="bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl">
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-yellow-600 dark:text-yellow-500"/> Select Date
                </label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                  className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-yellow-400/50 outline-none bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold transition-colors" 
                />
              </div>

              {/* Issue Type Dropdown (Required) */}
              <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl">
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-green-600 dark:text-green-500"/> Issue Type *
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-green-400/50 outline-none bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 font-bold transition-colors cursor-pointer"
                >
                  <option value="" disabled>-- Select Issue Type --</option>
                  {ISSUE_TYPES.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-green-700 dark:text-green-500 flex items-center gap-2 mb-6">
                <Package size={20} /> Enter Product OUT Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teaCategories.map((category) => (
                  <div key={category.id} className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden hover:border-yellow-300 dark:hover:border-yellow-700/50 transition-colors">
                    <div className="bg-gradient-to-r from-green-50 to-yellow-50 dark:from-zinc-900 dark:to-zinc-800 border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
                      <h3 className="font-bold text-green-800 dark:text-green-400 text-sm text-center uppercase tracking-wider">{category.title}</h3>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 text-center uppercase tracking-wider mb-2">
                        <div className="col-span-8 text-left pl-2">Size / Type</div>
                        <div className="col-span-4 text-red-500 text-center">OUT</div>
                      </div>

                      {category.sizes.map((size) => {
                        const isKg = size.includes('(KG)'); 

                        return (
                          <div key={size} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-8 font-bold text-xs text-gray-700 dark:text-gray-300 truncate pl-2">
                              {size}
                            </div>
                            <div className="col-span-4 relative">
                              <input
                                type="number" 
                                min="0" 
                                step="any" 
                                placeholder={isKg ? "0.00" : "0"} 
                                value={formData[category.id][size].out}
                                onChange={(e) => handleInputChange(category.id, size, e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                className="w-full h-[36px] bg-red-50/30 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md p-2 text-center text-sm font-bold text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-400/50 outline-none transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to List Button */}
            <button type="submit" className="w-full py-4 rounded-xl text-yellow-900 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 font-bold flex justify-center items-center gap-2 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-all shadow-sm hover:shadow-yellow-400/20">
              <PlusCircle size={20} /> Add to Pending List
            </button>
          </form>
        </div>

        {/* --- RIGHT SIDE: PENDING LIST & SUMMARY --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-green-900/50 flex flex-col max-h-[85vh] transition-colors duration-300">
            
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg text-yellow-700 dark:text-yellow-400"><ListChecks size={20} /></div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Pending Records</h3>
              </div>
              <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">{pendingRecords.length} Items</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
              {pendingRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12">
                  <ListChecks size={40} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">List is empty.</p>
                  <p className="text-xs mt-1 text-center max-w-[200px]">Add records from the left panel to see them here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRecords.map((record, index) => (
                    <div key={record.id} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group hover:border-yellow-400 dark:hover:border-yellow-600/50 transition-colors shadow-sm">
                      
                      <button onClick={() => handleRemoveFromList(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors z-10" title="Remove Record">
                        <Trash2 size={16} />
                      </button>

                      <div className="flex flex-col gap-2 pr-8">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-black text-gray-800 dark:text-gray-200 text-base flex items-center gap-1.5">
                            <Calendar size={15} className="text-yellow-500"/> {record.date}
                          </span>
                          <span className="text-[10px] font-extrabold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {record.issueType}
                          </span>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-gray-100 dark:border-zinc-700/50 mt-1">
                          <div className="space-y-2">
                            {record.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-50 dark:border-zinc-800/50 last:border-0 last:pb-0">
                                <div className="flex items-center gap-1.5">
                                  <ArrowRight size={10} className="text-gray-400" />
                                  <span className="font-bold text-gray-700 dark:text-gray-300">{item.categoryTitle}</span>
                                  <span className="text-gray-500">({item.size})</span>
                                </div>
                                <div className="font-bold text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                                  OUT: {item.out}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-[10px] font-bold text-gray-400 uppercase mt-1">
                          {record.items.length} Entries
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save All Button */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
              <button 
                onClick={handleSaveAll} 
                disabled={isSaving || pendingRecords.length === 0} 
                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all 
                ${isSaving || pendingRecords.length === 0 
                  ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-600 to-green-500 hover:shadow-green-500/40 hover:-translate-y-1'}`}
              >
                <Save size={20} /> {isSaving ? "Saving..." : `Save All Records`}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}