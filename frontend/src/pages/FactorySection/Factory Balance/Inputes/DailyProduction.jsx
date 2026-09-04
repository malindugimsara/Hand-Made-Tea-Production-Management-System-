import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, Factory, Leaf, ListChecks, PlusCircle, Sparkles, FileUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyProduction() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  
  // States
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  
  // PDF Parsing States
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || false;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    estateLeafToday: '',
    broughtLeafToday: '',
  });

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

  // --- NEW CALCULATION LOGIC ---
  const selectedMonthNumber = parseInt(formData.date.split('-')[1], 10);
  const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
  const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
  
  const totalGreenLeafToday = (Number(formData.estateLeafToday) || 0) + (Number(formData.broughtLeafToday) || 0);
  const calculatedMadeTea = totalGreenLeafToday * conversionRate;
  // -----------------------------

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

  // =========================================================================
  // 💡 ENTER KEY FOCUS LOGIC
  // =========================================================================
  const focusNextInput = (nextId) => {
    const nextInput = document.getElementById(nextId);
    if (nextInput) {
      nextInput.focus();
    }
  };

  // =========================================================================
  // 💡 PDF AUTO-PARSING AND ESTATE/BROUGHT LEAF CLASSIFICATION
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

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        toast.error(`"${file.name}" is not a valid PDF file.`);
        return;
      }
    }

    setIsUploadingPdf(true);
    const toastId = toast.loading(`Parsing ${files.length} PDF file(s)...`);

    try {
      const pdfjs = await loadPdfJs();
      const groupedDataByDate = {}; 

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        let allTextItems = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          textContent.items.forEach(item => {
            allTextItems.push({
              str: item.str.trim(),
              x: Math.round(item.transform[4]),
              y: Math.round(item.transform[5])
            });
          });
        }

        let isEstateCollector = false;
        const headerText = allTextItems.slice(0, 60).map(i => i.str).join(" ").toUpperCase();
        if (headerText.includes("COLLECTOR : ESTATE") || headerText.includes("COLLECTOR: ESTATE")) {
            isEstateCollector = true;
        } else {
            const match = headerText.match(/COLLECTOR\s*:\s*([^A-Z]*[A-Z\s]+)/);
            if (match && match[1].includes("ESTATE")) {
                isEstateCollector = true;
            }
        }

        const dateHeaders = [];
        allTextItems.forEach(item => {
          const dateMatch = item.str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); 
          if (dateMatch) {
            const m = String(dateMatch[1]).padStart(2, '0');
            const d = String(dateMatch[2]).padStart(2, '0');
            const y = dateMatch[3];
            dateHeaders.push({ dateStr: `${y}-${m}-${d}`, x: item.x, y: item.y });
          }
        });

        const totalLabels = allTextItems.filter(i => i.str.toLowerCase() === "total" && i.x < 150);
        
        if (totalLabels.length > 0 && dateHeaders.length > 0) {
            let targetTotalRowY = null;
            let totalRowNumbers = [];

            for (let i = totalLabels.length - 1; i >= 0; i--) {
                const candidateY = totalLabels[i].y;
                const numbersOnThisRow = allTextItems.filter(item => 
                    Math.abs(item.y - candidateY) <= 6 && /^[\d,]+(\.\d{1,2})?$/.test(item.str)
                );
                if (numbersOnThisRow.length > 0) {
                    targetTotalRowY = candidateY;
                    totalRowNumbers = numbersOnThisRow;
                    break;
                }
            }

            if (targetTotalRowY !== null) {
                const routeCandidates = allTextItems.filter(i => i.x < 250 && i.y > targetTotalRowY + 10 && !/^[\d,.\/]+$/.test(i.str) && i.str.length > 3);
                routeCandidates.sort((a, b) => a.y - b.y); 
                const closestRoute = routeCandidates.length > 0 ? routeCandidates[0].str.toUpperCase() : "";
                
                const isEstateRow = isEstateCollector || closestRoute.includes("ESTATE");

                dateHeaders.forEach(dh => {
                    let closestNum = null;
                    let minDiff = 40; 
                    
                    totalRowNumbers.forEach(numItem => {
                        const diff = Math.abs(numItem.x - dh.x);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestNum = numItem;
                        }
                    });

                    if (closestNum) {
                        const val = parseFloat(closestNum.str.replace(/,/g, ''));
                        if (!isNaN(val)) {
                            if (!groupedDataByDate[dh.dateStr]) {
                                groupedDataByDate[dh.dateStr] = { estate: 0, brought: 0 };
                            }
                            
                            if (isEstateRow) {
                                groupedDataByDate[dh.dateStr].estate += val;
                            } else {
                                groupedDataByDate[dh.dateStr].brought += val;
                            }
                        }
                    }
                });
            }
        }
      }

      const datesFound = Object.keys(groupedDataByDate);

      if (datesFound.length === 0) {
        toast.error("No valid daily totals found in the uploaded PDF(s).", { id: toastId });
      } else {
        const newQueueItems = [];
        
        datesFound.forEach(dateStr => {
            const eLeaf = groupedDataByDate[dateStr].estate || 0;
            const bLeaf = groupedDataByDate[dateStr].brought || 0;
            const tLeaf = eLeaf + bLeaf;
            
            const monthNum = parseInt(dateStr.split('-')[1], 10);
            const convRate = monthsWith21Percent.includes(monthNum) ? 0.21 : 0.215;
            const calcMadeTea = tLeaf * convRate;

            const existingRecord = records.find(r => r.date.split('T')[0] === dateStr);

            newQueueItems.push({
              date: dateStr,
              estateLeafToday: eLeaf > 0 ? eLeaf.toFixed(2) : "",
              broughtLeafToday: bLeaf > 0 ? bLeaf.toFixed(2) : "",
              greenLeafToday: tLeaf.toFixed(2),
              calculatedMadeTea: calcMadeTea,
              dispatch: existingRecord ? existingRecord.dispatch : 0,
              localSaleAndGratis: existingRecord ? existingRecord.localSaleAndGratis : 0,
              returnAmount: existingRecord ? existingRecord.returnAmount : 0,
              dispatches: existingRecord?.dispatches || [],
              localSales: existingRecord?.localSales || [],
              returns: existingRecord?.returns || [],
            });
        });

        setPendingRecords(prev => {
             const existingDates = prev.map(p => p.date);
             const uniqueNewItems = newQueueItems.filter(n => !existingDates.includes(n.date));
             
             if(uniqueNewItems.length < newQueueItems.length) {
                 setTimeout(() => toast.error("Some dates were already in the queue and were skipped."), 1000);
             }
             return [...prev, ...uniqueNewItems];
        });

        toast.success(`Automatically mapped Estate/Brought totals for ${datesFound.length} dates!`, { id: toastId, duration: 6000 });
      }

    } catch (error) {
      console.error("PDF Parsing Error:", error);
      toast.error("Failed to parse PDFs. Check file format.", { id: toastId });
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      greenLeafToday: totalGreenLeafToday.toFixed(2),
      calculatedMadeTea,
      dispatch: existingRecord ? existingRecord.dispatch : 0,
      localSaleAndGratis: existingRecord ? existingRecord.localSaleAndGratis : 0,
      returnAmount: existingRecord ? existingRecord.returnAmount : 0,
      dispatches: existingRecord?.dispatches || [],
      localSales: existingRecord?.localSales || [],
      returns: existingRecord?.returns || [],
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success("Added to list!");
    
    // Clear amounts after adding
    setFormData({ ...formData, estateLeafToday: '', broughtLeafToday: '' }); 
    
    // 💡 Focus back to date input for the next entry
    focusNextInput('date-input');
  };

  const handleRemoveFromList = (indexToRemove) => {
    setPendingRecords(pendingRecords.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) return;
    setIsSavingAll(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} production records...`);

    try {
      const token = localStorage.getItem('token');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      for (const record of pendingRecords) {
        const payload = {
          date: record.date,
          estateLeafToday: Number(record.estateLeafToday) || 0,
          broughtLeafToday: Number(record.broughtLeafToday) || 0,
          greenLeafToday: Number(record.greenLeafToday) || 0,
          dispatch: Number(record.dispatch) || 0,
          localSaleAndGratis: Number(record.localSaleAndGratis) || 0,
          returnAmount: Number(record.returnAmount) || 0,
          dispatches: record.dispatches,
          localSales: record.localSales,
          returns: record.returns,
          username: username
        };

        const res = await fetch(`${BACKEND_URL}/api/factory-logs`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Failed to save record for ${record.date}`);
      }

      toast.success("Production records saved!", { id: toastId });
      setPendingRecords([]);
      navigate("/factory/view");
    } catch (error) {
      toast.error(error.message || "Error saving records.", { id: toastId });
    } finally {
      setIsSavingAll(false);
    }
  };

  const inputStyles = "w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 focus:ring-4 focus:ring-teal-500/20 dark:focus:ring-teal-400/20 focus:outline-none transition-all";

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 bg-[#f3faf7] dark:bg-gray-900">
      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border bg-[#f0fdfa] dark:bg-teal-900/30 border-[#99f6e4] dark:border-teal-800 text-[#0d5e4d] dark:text-teal-400 transition-colors">
              <Factory size={32} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d] dark:text-teal-400 transition-colors">Daily Production</h2>
              <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-[#0f766e] dark:text-teal-500 transition-colors">Green Leaf & Made Tea Log</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* FORM SIDE */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleAddToList} className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              
              <div className="flex justify-end w-full mb-2">
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Upload Daily PDFs to Auto-fill Routes Totals"
                >
                  {isUploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  {isUploadingPdf ? "Reading PDFs..." : "Upload Routes PDFs"}
                </button>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date</label>
                <input 
                  id="date-input"
                  type="date" name="date" value={formData.date} onChange={handleInputChange} required 
                  className={inputStyles}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusNextInput('estate-input');
                    }
                  }}
                />
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#0d5e4d] dark:text-teal-400 border-b border-teal-100 dark:border-teal-900/50 pb-3">
                  <div className="p-1.5 rounded-lg bg-[#f0fdfa] dark:bg-teal-900/30"><Leaf size={18}/></div>
                  Production Details (Manual Entry)
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                            <span>Estate Leaf (kg)</span>
                        </label>
                        <input 
                          id="estate-input"
                          type="number" step="0.01" min="0" name="estateLeafToday" 
                          value={formData.estateLeafToday} onChange={handleInputChange} 
                          onWheel={(e) => e.target.blur()} placeholder="e.g. 500" 
                          className={inputStyles} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextInput('brought-input');
                            }
                          }}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                            <span>Brought Leaf (kg)</span>
                        </label>
                        <input 
                          id="brought-input"
                          type="number" step="0.01" min="0" name="broughtLeafToday" 
                          value={formData.broughtLeafToday} onChange={handleInputChange} 
                          onWheel={(e) => e.target.blur()} placeholder="e.g. 1000" 
                          className={inputStyles} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextInput('add-queue-btn');
                            }
                          }}
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Total Green Leaf (kg)
                        </label>
                        <div className="w-full p-3.5 border rounded-xl flex items-center h-[54px] font-black bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 transition-colors">
                        {totalGreenLeafToday > 0 ? totalGreenLeafToday.toFixed(2) : '0.00'} kg
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Est. Made Tea ({(conversionRate * 100).toFixed(1)}%)
                        </label>
                        <div className="w-full p-3.5 border rounded-xl flex items-center h-[54px] font-black bg-[#f0fdfa] dark:bg-teal-900/20 border-[#99f6e4] dark:border-teal-800 text-[#0d5e4d] dark:text-teal-300 transition-colors">
                        {calculatedMadeTea > 0 ? calculatedMadeTea.toFixed(3) : '0.000'} kg
                        </div>
                        <p className="text-[10px] mt-1.5 font-bold flex items-center gap-1 text-[#0f766e] dark:text-teal-500">
                        <Sparkles size={10}/> Auto calculated based on selected month
                        </p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                id="add-queue-btn"
                type="submit" 
                disabled={isViewer || totalGreenLeafToday === 0} 
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
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">Production Queue</h3>
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
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-700 p-1.5 rounded-md border border-gray-100 dark:border-gray-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <div className="flex flex-col gap-3 pr-8">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{item.date}</span>
                          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                            
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
                              <span className="block text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold mb-1">Leaf (Est+Brt)</span>
                              <span className="font-black text-[#0d5e4d] dark:text-teal-400">{item.greenLeafToday} kg</span>
                              <span className="block text-[9px] text-gray-500 mt-0.5">
                                E: {item.estateLeafToday || '0'} | B: {item.broughtLeafToday || '0'}
                              </span>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
                              <span className="block text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold mb-1">Made Tea</span>
                              <span className="font-black text-[#0f766e] dark:text-teal-300">{item.calculatedMadeTea.toFixed(2)} kg</span>
                            </div>

                          </div>
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