import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { AlertTriangle, Calendar, Settings2, FileDown, Save, DollarSign, Info, Eye, RefreshCw, Sun, Moon } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader'; 

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; 

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const defaultTeaData = [
  { id: 1, type: 'Pink tea', amount: 0.025, packs: '', price: 8 },
  { id: 2, type: 'Pink tea(paper can)', amount: 0.025, packs: '', price: 10 },
  { id: 3, type: 'Vita glow', amount: 0.025, packs: '', price: 5 },
  { id: 4, type: 'Christmass tea', amount: 0.005, packs: '', price: 7 },
  { id: 5, type: 'Christmass tea (reusable bag)', amount: 0.005, packs: '', price: 10 },
  { id: 6, type: 'White tea', amount: 0.025, packs: '', price: 7 },
  { id: 7, type: 'White tea(paper can)', amount: 0.025, packs: '', price: 9 },
  { id: 8, type: 'Purple tea', amount: 0.01, packs: '', price: 7 },
  { id: 9, type: 'Purple tea(paper can)', amount: 0.005, packs: '', price: 9 },
  { id: 10, type: 'Slim beauty', amount: 0.01, packs: '', price: 11 },
  { id: 11, type: 'Slim beauty(paper can)', amount: 0.005, packs: '', price: 7 },
  { id: 12, type: 'Golden tips', amount: 0.002, packs: '', price: 14 },
  { id: 13, type: 'Golden tips', amount: 0.004, packs: '', price: 25 },
  { id: 14, type: 'Golden tips', amount: 0.005, packs: '', price: 35 },
  { id: 15, type: 'Silver Green', amount: 0.05, packs: '', price: 14 },
];

export default function SellingDetailsTable() {
  const [tableData, setTableData] = useState(defaultTeaData);
  const [exchangeRate, setExchangeRate] = useState(300);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  const [isSaved, setIsSaved] = useState(true); 
  const [hasChanges, setHasChanges] = useState(false); 
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

  const userRole = localStorage.getItem('userRole') || ''; 
  const isViewer = userRole.toLowerCase() === 'viewer'; 

  // --- THEME STATE LOGIC ---
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
          document.documentElement.classList.add('dark');
          setIsDark(true);
      }
  }, []);

  const toggleTheme = () => {
      const root = window.document.documentElement;
      if (isDark) {
          root.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      } else {
          root.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      }
      setIsDark(!isDark);
  };

  useEffect(() => {
      handleFetchData(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (id, field, value) => {
    if (value !== '' && Number(value) < 0) return;

    const updatedData = tableData.map((row) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setTableData(updatedData);
    setHasChanges(true); 
    setIsSaved(false); 
  };

  const handleExchangeRateChange = (e) => {
      const val = Number(e.target.value);
      if (val < 0) return;
      setExchangeRate(val);
      setHasChanges(true);
      setIsSaved(false);
  };

  const handleFetchData = async (isSilent = false) => {
    if (!selectedMonth) {
      if (!isSilent) toast.error("Please select a month first.");
      return;
    }

    setIsFetching(true);
    let loadToast;
    if (!isSilent) loadToast = toast.loading('Fetching data...');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/selling-details?month=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.records && data.records.length > 0) {
          const fetchedRecords = data.records;
          
          const mergedData = defaultTeaData.map((defaultRow) => {
            const foundRecord = fetchedRecords.find((r) => r.type === defaultRow.type && Number(r.amount) === Number(defaultRow.amount));
            if (foundRecord) {
              return { 
                ...defaultRow, 
                amount: foundRecord.amount, 
                packs: foundRecord.packs, 
                price: foundRecord.price 
              };
            }
            return { ...defaultRow, packs: '' };
          });

          setTableData(mergedData);
          if (data.exchangeRate) setExchangeRate(data.exchangeRate);
          
          setIsSaved(true); 
          setHasChanges(false);
          if (!isSilent) toast.success(`Data for ${selectedMonth} loaded!`, { id: loadToast });
        } else {
          setTableData(defaultTeaData);
          setIsSaved(false); 
          setHasChanges(false);
          if (!isSilent) toast('No data found. Ready for new entries.', { icon: 'ℹ️', id: loadToast });
        }
      } else {
        if (response.status === 401 || response.status === 403) {
            if (!isSilent) toast.error('Session expired. Please log in again.', { id: loadToast });
        } else {
            if (!isSilent) toast.error('Failed to fetch data.', { id: loadToast });
        }
      }
    } catch (error) {
      if (!isSilent) toast.error('Network error while fetching.', { id: loadToast });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToDB = async () => {
    if (isViewer) {
        toast.error("Viewers are not allowed to save data.");
        return false;
    }

    const recordsToSave = tableData.filter((row) => row.packs !== '' && Number(row.packs) > 0);
    
    if (recordsToSave.length === 0) {
      toast.error("No packs entered. Nothing to save!");
      return false;
    }

    setIsSaving(true);
    const saveToast = toast.loading('Saving to database...');

    try {
      const saveDate = new Date(`${selectedMonth}-01`).toISOString();
      const token = localStorage.getItem('token');

      const response = await fetch(`${BACKEND_URL}/api/selling-details`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          date: saveDate, 
          exchangeRate: exchangeRate,
          records: recordsToSave,
        }),
      });

      if (response.ok) {
        toast.success(`Data successfully saved for ${selectedMonth}!`, { id: saveToast });
        setIsSaved(true); 
        setHasChanges(false); 
        return true;
      } else {
        if (response.status === 403) {
            toast.error("Access Denied. You do not have permission to save.", { id: saveToast });
        } else {
            toast.error('Failed to save data.', { id: saveToast });
        }
        return false;
      }
    } catch (error) {
      toast.error('Network error while saving.', { id: saveToast });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const totalUsd = tableData.reduce((sum, row) => sum + (Number(row.packs) || 0) * (Number(row.price) || 0), 0);
  const totalLkr = totalUsd * exchangeRate;

  const getPdfData = () => {
    const recordsToPrint = tableData.filter((row) => row.packs !== '' && Number(row.packs) > 0);

    const tableRows = recordsToPrint.map(row => {
      const calculatedUsd = (Number(row.packs) || 0) * (Number(row.price) || 0);
      const calculatedLkr = calculatedUsd * exchangeRate;
      
      return [
        row.type,
        Number(row.amount).toFixed(3),
        row.packs ? row.packs.toString() : "0",
        Number(row.price).toFixed(2),
        calculatedUsd.toFixed(2),
        calculatedLkr.toLocaleString()
      ];
    });

    tableRows.push([
      "GRAND TOTAL", "-", "-", "-",
      totalUsd.toFixed(2),
      totalLkr.toLocaleString()
    ]);

    return tableRows;
  };

  const pdfHeaders = ["Type of Tea", "Amount (kg)", "Nu. of Packs", "Price/One ($)", "Total (USD)", "Total (LKR)"];

  const handleSaveAndDownload = async () => {
      const saved = await handleSaveToDB();
      if (saved) {
          setShowUnsavedAlert(false);
          toast.success("Saved! You can now click the Download PDF button.");
      }
  };

  const getCurrentMonthCode = () => {
        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `HT/SDS/${month}.${year}`; 
    };

    const uniqueCode = getCurrentMonthCode();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
    <div className="p-3 sm:p-5 md:p-8 max-w-[1400px] mx-auto font-sans relative">
        
        {/* STRICT UNSAVED DATA ALERT DIALOG */}
        <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-sm sm:max-w-md w-[90vw] transition-colors p-5 sm:p-6">
                <AlertDialogHeader>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 sm:mb-4 border border-orange-200 dark:border-orange-800/50">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <AlertDialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Save Before Downloading</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        You have unsaved packs or rate changes. You must save these records to the database before generating the PDF report to ensure data consistency.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-5 sm:mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
                    <AlertDialogCancel className="w-full sm:w-auto border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-4 sm:px-6 py-2.5 font-semibold mt-0 transition-colors">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleSaveAndDownload} 
                        className="w-full sm:w-auto bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg px-4 sm:px-6 py-2.5 font-semibold shadow-sm transition-colors"
                    >
                        Save & Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md -mt-3 -mx-3 p-3 sm:-mt-5 sm:-mx-5 sm:pt-6 sm:pb-4 sm:px-5 md:-mt-8 md:-mx-8 md:pt-8 md:pb-4 md:px-8 mb-5 sm:mb-8 border-b border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col min-[850px]:flex-row justify-between items-start min-[850px]:items-center gap-4 transition-colors duration-300">
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1B6A31] dark:text-[#8CC63F] flex items-center gap-2">
                    <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-[28px] md:h-[28px]" /> Monthly Selling Details
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Manage and export monthly sales data</p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full min-[850px]:w-auto justify-stretch sm:justify-end items-stretch sm:items-center">
                <button 
                    onClick={() => handleFetchData(false)}
                    disabled={isFetching}
                    className={`flex-1 sm:flex-none justify-center px-3 sm:px-5 py-2 sm:py-2.5 bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 ${isFetching ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-800'}`}
                >
                    <RefreshCw className={`w-4 h-4 sm:w-[16px] sm:h-[16px] ${isFetching ? 'animate-spin' : ''}`} /> Sync Data
                </button>

                <button 
                    onClick={handleSaveToDB}
                    disabled={isSaving || (isSaved && !hasChanges) || isViewer}
                    className={`flex-1 sm:flex-none justify-center px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 ${
                        (isSaved && !hasChanges) || isViewer ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                >
                    {isViewer ? <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]"/> : <Save className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />} 
                    {isViewer ? "View Only" : isSaving ? "Saving..." : isSaved && !hasChanges ? "Saved to DB" : "Save to DB"}
                </button>

                {(!isSaved && !isViewer && hasChanges) ? (
                    <button 
                        onClick={() => setShowUnsavedAlert(true)}
                        disabled={tableData.filter(row => row.packs !== '' && Number(row.packs) > 0).length === 0}
                        className="w-full sm:w-auto justify-center px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all duration-300 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
                    >
                        <FileDown className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> Download PDF
                    </button>
                ) : (
                    <div className="w-full sm:w-auto">
                        <PDFDownloader 
                            title="Monthly Selling Details Summary"
                            subtitle={`Active Month: ${new Date(`${selectedMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })} | Exchange Rate: 1 USD = Rs. ${exchangeRate}`}
                            headers={pdfHeaders}
                            data={getPdfData()}
                            uniqueCode={uniqueCode}
                            fileName={`Selling_Details_${selectedMonth}.pdf`}
                            orientation="portrait"
                            disabled={tableData.filter(row => row.packs !== '' && Number(row.packs) > 0).length === 0}
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2 sm:py-2.5" 
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Viewer Notification Banner */}
        {isViewer && (
            <div className="mb-5 sm:mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg flex items-start sm:items-center gap-2.5 sm:gap-3 transition-colors">
                <Info className="w-5 h-5 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-xs sm:text-sm font-medium">You are logged in as a <strong>Viewer</strong>. You can view data and download reports. Editing and saving are disabled.</p>
            </div>
        )}

        {/* Control Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-5 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/20 dark:to-zinc-900 p-4 sm:p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-900/5 flex flex-col justify-center relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                
                <div className="flex justify-between items-center border-b border-blue-100 dark:border-zinc-800 pb-2 sm:pb-3 mb-3 sm:mb-4">
                    <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
                        <div className="p-1 sm:p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                            <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-700 dark:text-blue-400"/>
                        </div>
                        1. Active Workspace Month
                    </h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 relative z-10 items-stretch sm:items-end">
                    <div className="w-full">
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            className="w-full border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 sm:p-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-zinc-950 dark:text-white shadow-sm transition-colors" 
                        />
                    </div>
                    <button 
                        onClick={() => handleFetchData(false)}
                        disabled={isFetching}
                        className="w-full sm:w-auto whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
                    >
                        {isFetching ? 'Loading...' : 'Load Month Data'}
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-900/20 dark:to-zinc-900 p-4 sm:p-6 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-lg shadow-orange-900/5 h-fit relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                
                <div className="flex items-center gap-2 mb-3 sm:mb-4 border-b border-orange-100 dark:border-zinc-800 pb-2 sm:pb-3">
                    <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-orange-700 dark:text-orange-500 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
                        <div className="p-1 sm:p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                            <Settings2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-orange-600 dark:text-orange-400"/>
                        </div>
                        2. Adjust Rates {isViewer && "(Read Only)"}
                    </h3>
                </div>
                
                <div className="flex flex-col gap-1 sm:gap-1.5 relative z-10">
                    <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">1 USD = (LKR)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 sm:top-3 text-gray-400 dark:text-gray-500 text-xs sm:text-sm font-bold">Rs.</span>
                        <input 
                            type="number" 
                            min="0" 
                            onWheel={(e) => e.target.blur()} 
                            value={exchangeRate} 
                            onChange={handleExchangeRateChange} 
                            disabled={isViewer}
                            className="w-full sm:w-1/2 border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 sm:p-3 pl-9 sm:pl-10 text-xs sm:text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-zinc-950 shadow-sm disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed transition-colors" 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Main Table */}
        <div className={`bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden mb-8 sm:mb-12 min-h-[300px] border transition-colors ${isViewer ? 'border-gray-200 dark:border-zinc-800 opacity-95' : 'border-gray-200 dark:border-zinc-800'}`}>
            <div className="bg-[#1B6A31] dark:bg-[#1B6A31]/80 p-3 sm:p-4 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2 transition-colors">
                <DollarSign className="text-white w-4 h-4 sm:w-5 sm:h-5"/>
                <h3 className="text-base sm:text-lg font-bold text-white">Selling Details Board</h3>
            </div>
            
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700 w-full p-0 sm:p-4">
                <table className="w-full border-collapse min-w-[700px] lg:min-w-max">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 px-3 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#1a1a1a] dark:text-gray-200 bg-[#f9f9f9] dark:bg-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center transition-colors">Type of tea</th>
                            <th className="px-2 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2e6b3b] dark:text-green-400 bg-[#f4f9f4] dark:bg-green-900/20 text-center transition-colors">Amount (kg)</th>
                            <th className="px-2 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#2858b4] dark:text-blue-400 bg-[#f0f5fd] dark:bg-blue-900/20 text-center transition-colors">Number of Packs</th>
                            <th className="px-2 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#d66b2d] dark:text-orange-400 bg-[#fdf7f2] dark:bg-orange-900/20 text-center transition-colors">Price per one (USD)</th>
                            <th className="px-2 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#1a1a1a] dark:text-gray-200 bg-[#f9f9f9] dark:bg-zinc-800 text-center transition-colors">Total (USD)</th>
                            <th className="px-2 sm:px-4 py-3 sm:py-4 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase border-b-2 border-gray-200 dark:border-zinc-700 border-r text-[#b81d1d] dark:text-red-300 bg-[#fcedec] dark:bg-red-900/20 text-center transition-colors">Total (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row) => {
                            const calculatedUsd = (Number(row.packs) || 0) * (Number(row.price) || 0);
                            const calculatedLkr = calculatedUsd * exchangeRate;

                            return (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                    <td className="sticky left-0 z-10 p-2 sm:p-3 text-[10px] sm:text-sm font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-[#2e6b3b] dark:text-white bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-left pl-3 sm:pl-5 transition-colors whitespace-nowrap">
                                        {row.type}
                                    </td>
                                    <td className="p-1 sm:p-3 text-xs sm:text-sm font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center transition-colors">
                                        <input 
                                            type="number" 
                                            step="0.001" 
                                            min="0"
                                            onWheel={(e) => e.target.blur()}
                                            value={row.amount} 
                                            onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)} 
                                            disabled={isViewer}
                                            className="w-[70px] sm:w-[80%] p-1.5 sm:p-2 border border-transparent hover:border-green-300 dark:hover:border-green-700 focus:border-green-300 dark:focus:border-green-700 rounded text-center text-xs sm:text-sm font-bold text-[#1B6A31] dark:text-green-400 outline-none focus:ring-2 focus:ring-green-500 shadow-inner bg-white dark:bg-zinc-950 disabled:bg-transparent disabled:opacity-70 disabled:cursor-not-allowed transition-colors" 
                                        />
                                    </td>
                                    <td className="p-1 sm:p-3 text-xs sm:text-sm font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center transition-colors">
                                        <input 
                                            type="number" 
                                            placeholder="0" 
                                            min="0"
                                            onWheel={(e) => e.target.blur()}
                                            value={row.packs} 
                                            onChange={(e) => handleInputChange(row.id, 'packs', e.target.value)} 
                                            disabled={isViewer}
                                            className="w-[70px] sm:w-[80%] p-1.5 sm:p-2 border border-blue-300 dark:border-zinc-600 rounded text-center text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-white dark:bg-zinc-950 disabled:bg-gray-50 dark:disabled:bg-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed transition-colors" 
                                        />
                                    </td>
                                    <td className="p-1 sm:p-3 text-xs sm:text-sm font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center transition-colors">
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            min="0"
                                            onWheel={(e) => e.target.blur()}
                                            value={row.price} 
                                            onChange={(e) => handleInputChange(row.id, 'price', e.target.value)} 
                                            disabled={isViewer}
                                            className="w-[70px] sm:w-[80%] p-1.5 sm:p-2 border border-transparent hover:border-orange-300 dark:hover:border-orange-700 focus:border-orange-300 dark:focus:border-orange-700 rounded text-center text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner bg-white dark:bg-zinc-950 disabled:bg-transparent disabled:opacity-70 disabled:cursor-not-allowed transition-colors" 
                                        />
                                    </td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm font-bold border-b border-r border-gray-200 dark:border-zinc-700 text-center text-[#1a1a1a] dark:text-gray-200 bg-gray-50/50 dark:bg-zinc-800/50 transition-colors">{calculatedUsd > 0 ? calculatedUsd.toFixed(2) : '0'}</td>
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm font-black border-b border-r border-gray-200 dark:border-zinc-700 text-center text-[#b81d1d] dark:text-red-200 bg-red-50/30 dark:bg-red-900/10 transition-colors">{calculatedLkr > 0 ? calculatedLkr.toLocaleString() : '0'}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-[#fcedec] dark:bg-zinc-800 border-t-2 border-gray-300 dark:border-zinc-600 transition-colors">
                            <td colSpan="4" className="sticky left-0 z-10 p-2 sm:p-3 text-[10px] sm:text-sm font-bold text-[#1a1a1a] dark:text-gray-200 text-right pr-3 sm:pr-5 border-r border-gray-200 dark:border-zinc-700 bg-[#fcedec] dark:bg-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">GRAND TOTAL</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-md font-bold text-[#1a1a1a] dark:text-red-400 text-center border-r border-gray-200 dark:border-zinc-700">$.{totalUsd.toFixed(2)}</td>
                            <td className="p-2 sm:p-3 text-xs sm:text-md font-black text-[#b81d1d] dark:text-red-400 text-center border-r border-gray-200 dark:border-zinc-700">Rs.{totalLkr.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
  );
}