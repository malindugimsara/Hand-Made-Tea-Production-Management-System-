import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle, Calendar, Settings2, FileDown, Save, DollarSign, Info, Eye } from "lucide-react";
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

  // --- ROLE BASED ACCESS CONTROL ---
  const userRole = localStorage.getItem('userRole') || ''; 
  const isViewer = userRole.toLowerCase() === 'viewer'; 

  // --- AUTO LOAD ON MOUNT ---
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

  const handleDownloadPDFClick = () => {
      const hasData = tableData.some(row => row.packs !== '' && Number(row.packs) > 0);
      if (!hasData) {
          toast.error("Table is empty. Please enter data first.");
          return;
      }

      // Viewers bypass the save requirement
      if ((hasChanges || !isSaved) && !isViewer) {
          setShowUnsavedAlert(true);
      } else {
          generatePDF();
      }
  };

  const handleSaveAndDownload = async () => {
      const saved = await handleSaveToDB();
      if (saved) {
          setShowUnsavedAlert(false);
          generatePDF();
      }
  };

  const generatePDF = async () => {
    const doc = new jsPDF('portrait'); 
    
    try {
        const res = await fetch("/logo.png");
        if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            doc.addImage(dataUrl, "PNG", 14, 10, 25, 25); 
        }
    } catch (err) {}

    doc.setFontSize(20);
    doc.setTextColor(46, 107, 59); 
    doc.text("Monthly Selling Details Summary", 45, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const monthName = new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.text(`Active Month: ${monthName}`, 45, 32);
    doc.text(`Exchange Rate: 1 USD = Rs. ${exchangeRate}`, 45, 38);

    const tableHead = [[
      { content: "Type of Tea", styles: { halign: 'center', fillColor: [50, 50, 50] } },
      { content: "Amount (kg)", styles: { halign: 'center', fillColor: [46, 107, 59] } },
      { content: "Nu. of Packs", styles: { halign: 'center', fillColor: [40, 88, 180] } },
      { content: "Price/One ($)", styles: { halign: 'center', fillColor: [214, 107, 45] } },
      { content: "Total (USD)", styles: { halign: 'center', fillColor: [50, 50, 50] } },
      { content: "Total (LKR)", styles: { halign: 'center', fillColor: [184, 29, 29] } }
    ]];
    
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

    autoTable(doc, {
      startY: 45,
      head: tableHead,
      body: tableRows,
      theme: 'grid',
      headStyles: { textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10, halign: 'center', valign: 'middle' },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', halign: 'left' } },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const colIdx = data.column.index;
          
          if (colIdx === 1) data.cell.styles.textColor = [46, 107, 59]; 
          else if (colIdx === 2) data.cell.styles.textColor = [40, 88, 180]; 
          else if (colIdx === 3) data.cell.styles.textColor = [214, 107, 45]; 
          else if (colIdx === 5) data.cell.styles.textColor = [184, 29, 29]; 

          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = 'bold';
            if (colIdx === 0) data.cell.styles.halign = 'right';
          }
        }
      }
    });

    doc.save(`Selling_Details_${selectedMonth}.pdf`);
    toast.success("PDF Downloaded Successfully!");
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto font-sans relative">
      <Toaster position="top-center" reverseOrder={false} />

      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
          <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
              <AlertDialogHeader>
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4 border border-orange-200">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <AlertDialogTitle className="text-xl font-bold text-gray-900">Save Before Downloading</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-500 text-base">
                      You have unsaved packs or rate changes. You must save these records to the database before generating the PDF report to ensure data consistency.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg font-semibold mt-0">
                      Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                      onClick={handleSaveAndDownload} 
                      className="bg-[#1B6A31] hover:bg-green-800 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                  >
                      Save & Download
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mt-8 -mx-8 pt-8 pb-4 px-8 mb-8 border-b border-gray-100 shadow-sm text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center justify-center sm:justify-start gap-2">
                  <DollarSign size={28} /> Monthly Selling Details
              </h2>
              <p className="text-gray-500 mt-1 font-medium">Manage and export monthly sales data</p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center sm:justify-end">
              <button 
                  onClick={handleSaveToDB}
                  disabled={isSaving || (isSaved && !hasChanges) || isViewer}
                  className={`px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${
                      (isSaved && !hasChanges) || isViewer ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
              >
                  {isViewer ? <Eye size={18}/> : <Save size={18} />} 
                  {isViewer ? "View Only" : isSaving ? "Saving..." : isSaved && !hasChanges ? "Saved" : "Save to DB"}
              </button>

              <button 
                  onClick={handleDownloadPDFClick}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all duration-300"
              >
                  <FileDown size={18} /> Download PDF
              </button>
          </div>
      </div>

      {/* Viewer Notification Banner */}
      {isViewer && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
              <Info size={20} />
              <p className="text-sm font-medium">You are logged in as a <strong>Viewer</strong>. You can view data and download reports. Editing and saving are disabled.</p>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-xl border border-blue-200 shadow-lg shadow-blue-900/5 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
              
              <div className="flex justify-between items-center border-b border-blue-100 pb-3 mb-4">
                  <h3 className="text-sm md:text-base font-extrabold text-blue-700 flex items-center gap-2 uppercase tracking-wider">
                      <div className="p-1.5 bg-blue-100 rounded-lg"><Calendar size={18} className="text-blue-700"/></div>
                      1. Active Workspace Month
                  </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 relative z-10 items-end">
                  <div className="w-full">
                      <input 
                          type="month" 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)} 
                          className="w-full border border-gray-300 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" 
                      />
                  </div>
                  <button 
                      onClick={() => handleFetchData(false)}
                      disabled={isFetching}
                      className="w-full sm:w-auto whitespace-nowrap px-5 py-3 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                      {isFetching ? 'Loading...' : 'Load Month Data'}
                  </button>
              </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50/50 to-white p-6 rounded-xl border border-orange-200 shadow-lg shadow-orange-900/5 h-fit relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
              
              <div className="flex items-center gap-2 mb-4 border-b border-orange-100 pb-3">
                  <h3 className="text-sm md:text-base font-extrabold text-orange-700 flex items-center gap-2 uppercase tracking-wider">
                      <div className="p-1.5 bg-orange-100 rounded-lg"><Settings2 size={18} className="text-orange-600"/></div>
                      2. Adjust Rates {isViewer && "(Read Only)"}
                  </h3>
              </div>
              
              <div className="flex flex-col gap-1.5 relative z-10">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1">1 USD = (LKR)</label>
                  <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">Rs.</span>
                      <input 
                          type="number" 
                          min="0" 
                          onWheel={(e) => e.target.blur()} 
                          value={exchangeRate} 
                          onChange={handleExchangeRateChange} 
                          disabled={isViewer}
                          className="w-full sm:w-1/2 border border-gray-300 rounded-md p-3 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed" 
                      />
                  </div>
              </div>
          </div>
      </div>

      <div className={`bg-white rounded-xl shadow-md overflow-hidden mb-12 min-h-[300px] border ${isViewer ? 'border-gray-200 opacity-95' : 'border-gray-200'}`}>
        <div className="bg-[#1B6A31] p-4 border-b border-gray-200 flex items-center gap-2">
            <DollarSign className="text-white" size={20}/>
            <h3 className="text-lg font-bold text-white">Selling Details Board</h3>
        </div>
        
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#1a1a1a] bg-[#f9f9f9] text-center">Type of tea</th>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2e6b3b] bg-[#f4f9f4] text-center">Amount (kg)</th>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#2858b4] bg-[#f0f5fd] text-center">Number of Packs</th>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#d66b2d] bg-[#fdf7f2] text-center">Price per one (USD)</th>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#1a1a1a] bg-[#f9f9f9] text-center">Total (USD)</th>
                <th className="px-4 py-4 font-extrabold text-xs tracking-wider uppercase border-b-2 border-gray-200 border-r text-[#b81d1d] bg-[#fcedec] text-center">Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => {
                const calculatedUsd = (Number(row.packs) || 0) * (Number(row.price) || 0);
                const calculatedLkr = calculatedUsd * exchangeRate;

                return (
                  <tr key={row.id}>
                    <td className="p-3 text-sm font-bold border-b border-r border-gray-200 text-[#2e6b3b] text-left pl-5">{row.type}</td>
                    <td className="p-3 text-sm font-bold border-b border-r border-gray-200 text-center">
                      <input 
                        type="number" 
                        step="0.001" 
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={row.amount} 
                        onChange={(e) => handleInputChange(row.id, 'amount', e.target.value)} 
                        disabled={isViewer}
                        className="w-[80%] p-2 border border-transparent hover:border-green-300 focus:border-green-300 rounded text-center font-bold text-[#1B6A31] outline-none focus:ring-2 focus:ring-green-500 shadow-inner bg-white disabled:bg-transparent disabled:opacity-70 disabled:cursor-not-allowed" 
                      />
                    </td>
                    <td className="p-3 text-sm font-bold border-b border-r border-gray-200 text-center">
                      <input 
                        type="number" 
                        placeholder="0" 
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={row.packs} 
                        onChange={(e) => handleInputChange(row.id, 'packs', e.target.value)} 
                        disabled={isViewer}
                        className="w-[80%] p-2 border border-blue-300 rounded text-center font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-white disabled:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed" 
                      />
                    </td>
                    <td className="p-3 text-sm font-bold border-b border-r border-gray-200 text-center">
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={row.price} 
                        onChange={(e) => handleInputChange(row.id, 'price', e.target.value)} 
                        disabled={isViewer}
                        className="w-[80%] p-2 border border-transparent hover:border-orange-300 focus:border-orange-300 rounded text-center font-bold text-orange-600 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner bg-white disabled:bg-transparent disabled:opacity-70 disabled:cursor-not-allowed" 
                      />
                    </td>
                    <td className="p-3 text-sm font-bold border-b border-r border-gray-200 text-center text-[#1a1a1a] bg-gray-50/50">{calculatedUsd > 0 ? calculatedUsd.toFixed(2) : '0'}</td>
                    <td className="p-3 text-sm font-black border-b border-r border-gray-200 text-center text-[#b81d1d] bg-red-50/30">{calculatedLkr > 0 ? calculatedLkr.toLocaleString() : '0'}</td>
                  </tr>
                );
              })}
              <tr className="bg-[#fcedec]">
                <td colSpan="4" className="p-3 text-sm font-bold text-[#1a1a1a] text-right pr-5 border-r border-gray-200">GRAND TOTAL</td>
                <td className="p-3 text-lg font-bold text-[#1a1a1a] text-center border-r border-gray-200">{totalUsd.toFixed(2)}</td>
                <td className="p-3 text-lg font-black text-[#b81d1d] text-center border-r border-gray-200">{totalLkr.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}