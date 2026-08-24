import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { createPortal } from 'react-dom';

const WitherLeafForm = () => {
  // --- Constants ---
  const employeeNames = [
    "T P Damith Kumara – 00096",
    "G J S Kumara – 00153",
    "AR S Nishantha – 00165",
    "D J Lakshan – 00191"
  ];

  // --- States ---
  const initialTopFormState = {
    factory: '',
    dateOfCrop: '',
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
  const [pendingQueue, setPendingQueue] = useState([]);
  const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, batchIndex: null });

  // --- Effects for Auto-Calculations ---
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

    setTopForm((prev) => ({ 
      ...prev, 
      percentage: calcPercentage,
      weatheringQuality: quality
    }));
  }, [topForm.receivedTotalCropKg, topForm.witheredLeafKg]);

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

  // --- Handlers ---
  const handleTopChange = (e) => {
    const { name, value } = e.target;
    setTopForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBottomChange = (e) => {
    const { name, value } = e.target;
    setBottomForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBatchRecord = () => {
    const kgValue = parseFloat(bottomForm.batchKg);
    
    if (isNaN(kgValue) || kgValue <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }
    if (kgValue > 400) {
      alert("Maximum allowed weight per batch is 400kg.");
      return;
    }

    const batchIndex = parseInt(bottomForm.selectedBatch) - 1;
    const updatedBatches = [...bottomForm.batches];
    updatedBatches[batchIndex] = kgValue;

    setBottomForm((prev) => {
      const currentBatchInt = parseInt(prev.selectedBatch);
      const nextBatch = currentBatchInt < 25 ? String(currentBatchInt + 1) : prev.selectedBatch;
      
      return {
        ...prev,
        batches: updatedBatches,
        batchKg: '', 
        selectedBatch: nextBatch
      };
    });
  };

  const handleEditBatchClick = (index) => {
    setBottomForm((prev) => ({
      ...prev,
      selectedBatch: String(index + 1),
      batchKg: prev.batches[index] > 0 ? String(prev.batches[index]) : ''
    }));
  };

  // --- Deletion Dialog Handlers ---
  const handleDeleteBatchClick = (index) => {
    setDeleteAlert({ isOpen: true, batchIndex: index });
  };

  const confirmDelete = () => {
    const index = deleteAlert.batchIndex;
    if (index !== null) {
      const updatedBatches = [...bottomForm.batches];
      updatedBatches[index] = 0; // Reset back to 0
      setBottomForm((prev) => ({ ...prev, batches: updatedBatches }));
      
      toast.success(`Batch ${index + 1} data removed successfully`, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
        iconTheme: {
          primary: '#4ade80',
          secondary: '#fff',
        },
      });
    }
    setDeleteAlert({ isOpen: false, batchIndex: null });
  };

  const cancelDelete = () => {
    setDeleteAlert({ isOpen: false, batchIndex: null });
  };
  // --------------------------------

  const handleSaveTopSections = (e) => {
    e.preventDefault();
    if (!topForm.factory || !topForm.dateOfCrop) {
      alert("Please fill at least the Factory and Date of Crop.");
      return;
    }
    setPendingQueue([...pendingQueue, { ...topForm, type: 'Wither Leaf Info', id: Date.now() }]);
    setTopForm(initialTopFormState);
  };

  const handleClearTopSections = () => setTopForm(initialTopFormState);

  const handleSaveBottomSection = (e) => {
    e.preventDefault();
    const hasData = bottomForm.batches.some(val => val > 0);
    if (!hasData) {
      alert("Please add data to at least one batch before saving.");
      return;
    }
    setPendingQueue([...pendingQueue, { 
      type: 'Batch Quantities', 
      dateOfManufacture: topForm.dateOfManufacture, 
      batches: bottomForm.batches,
      id: Date.now() 
    }]);
    setBottomForm(initialBottomFormState);
  };

  const handleClearBottomSection = () => setBottomForm(initialBottomFormState);

  const handleSaveToDatabase = async () => {
    if (pendingQueue.length === 0) return;
    alert(`${pendingQueue.length} records saved to database!`);
    setPendingQueue([]);
  };

  // Extract active batches to render
  const activeBatches = bottomForm.batches
    .map((kg, index) => ({ index, kg }))
    .filter(batch => batch.kg > 0);

  // Reusable Theme Styles
  const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 block p-2.5 transition-colors";
  const readOnlyClass = "w-full bg-gray-100 border border-gray-200 text-gray-500 text-sm rounded-lg block p-2.5 font-medium";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2";
  const btnSaveClass = "bg-[#34a853] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm text-sm";
  const btnClearClass = "bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm text-sm";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans relative">
      <Toaster position="bottom-right" reverseOrder={false} />
      
      {/* Page Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19s1-7 8-7 8 7 8 7M3 19c0-5.523 4.477-10 10-10s10 4.477 10 10M12 9c0-3.314-2.686-6-6-6S0 5.686 0 9"></path>
          </svg>
          <h1 className="text-xl font-bold text-green-800 tracking-tight">Wither Leaf Entry</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-8">Record Factory, Wither Leaf & Batch Details</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* LEFT SIDE: Form Inputs */}
        <div className="w-full xl:w-3/4 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-6">
            
            {/* --- SECTION 1: Wither Leaf Details --- */}
            <div>
              <div className="flex items-center space-x-2 mb-4 border-b pb-2">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-800">Section 1: Wither Leaf Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-100"></div>

                {/* Left Column */}
                <div className="flex flex-col gap-4 md:pr-4">
                  <div>
                    <label className={labelClass}>Factory</label>
                    <select name="factory" value={topForm.factory} onChange={handleTopChange} className={inputClass}>
                      <option value="">Select Factory...</option>
                      <option value="ATHUKORALA TEA FACTORY - MF1398">ATHUKORALA TEA FACTORY - MF1398</option>
                      <option value="ATHUKORALA HANDMADE TEA FACTORY - HT0049">ATHUKORALA HANDMADE TEA FACTORY - HT0049</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Crop</label>
                    <input type="date" name="dateOfCrop" value={topForm.dateOfCrop} onChange={handleTopChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Received Total Crop (Kg)</label>
                    <input type="number" name="receivedTotalCropKg" value={topForm.receivedTotalCropKg} onChange={handleTopChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Total Employee</label>
                    <input type="number" name="totalEmployee" value={topForm.totalEmployee} onChange={handleTopChange} className={inputClass} />
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4 md:pl-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className={labelClass}>Withered Leaf (Kg)</label>
                      <input type="number" name="witheredLeafKg" value={topForm.witheredLeafKg} onChange={handleTopChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Percentage %</label>
                      <input type="text" name="percentage" value={topForm.percentage} readOnly className={readOnlyClass} placeholder="Auto" />
                    </div>
                  </div>
                  
                  <div>
                    <label className={labelClass}>Name 1</label>
                    <select name="name1" value={topForm.name1} onChange={handleTopChange} className={inputClass}>
                      <option value="">Select Name 1...</option>
                      {employeeNames.map(name => <option key={`n1-${name}`} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Name 2</label>
                    <select name="name2" value={topForm.name2} onChange={handleTopChange} className={inputClass}>
                      <option value="">Select Name 2...</option>
                      {employeeNames.map(name => <option key={`n2-${name}`} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Manufacture</label>
                    <input type="date" name="dateOfManufacture" value={topForm.dateOfManufacture} readOnly className={readOnlyClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* --- SECTION 2: Batching Schedule --- */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 mb-4 border-b pb-2">
                <div className="p-1.5 bg-orange-50 rounded-lg">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-800">Section 2: Batching Schedule</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Start Time</label>
                  <input type="time" name="startTime" value={topForm.startTime} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Finish Time</label>
                  <input type="time" name="finishTime" value={topForm.finishTime} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Period</label>
                  <input type="text" name="period" value={topForm.period} readOnly placeholder="Auto calc" className={readOnlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Day</label>
                  <input type="date" name="day" value={topForm.day} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>No. of Batchers</label>
                  <input type="number" name="noOfBatchers" value={topForm.noOfBatchers} onChange={handleTopChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Weathering Quality</label>
                  <input type="text" name="weatheringQuality" value={topForm.weatheringQuality} readOnly placeholder="Auto calc" className={`${readOnlyClass} capitalize text-green-700`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleSaveTopSections} className={btnSaveClass}>Save Sections 1 & 2</button>
              <button type="button" onClick={handleClearTopSections} className={btnClearClass}>Clear</button>
            </div>
          </div>


          {/* --- SECTION 3: Manufacture Quantities --- */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6 border-b pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-800">Section 3: Manufacture Quantities</h2>
                </div>
             </div>

             <div className="mb-6">
                <label className={labelClass}>Date of Manufacture</label>
                <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 font-semibold h-10 flex items-center">
                  {topForm.dateOfManufacture || 'Awaiting Date of Crop...'}
                </div>
             </div>

             {/* Batch Input Controls */}
             <div className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="w-full md:w-1/3">
                  <label className={labelClass}>Select Batch</label>
                  <select name="selectedBatch" value={bottomForm.selectedBatch} onChange={handleBottomChange} className={inputClass}>
                    {Array.from({ length: 25 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Batch {String(i + 1).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-1/3">
                  <label className={labelClass}>Quantity (Max 400kg)</label>
                  <input 
                    type="number" 
                    name="batchKg" 
                    value={bottomForm.batchKg} 
                    onChange={handleBottomChange} 
                    placeholder="Enter Kg..."
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
                    Save Batch
                  </button>
                </div>
             </div>

             {/* Active Batches Visual Grid */}
             {activeBatches.length === 0 ? (
               <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl mb-8">
                 <p className="text-gray-500 text-sm font-medium">No batches recorded yet. Select a batch above to add quantities.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-8">
                 {activeBatches.map(({ index, kg }) => (
                   <div 
                      key={index} 
                      className="group relative flex flex-col border border-green-200 rounded-lg overflow-hidden text-center shadow-sm"
                    >
                      <div className="bg-green-50 py-1.5 text-xs font-bold text-green-700 border-b border-green-200">
                        Batch {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="py-3 text-lg font-bold text-gray-800 bg-white">
                        {kg} <span className="text-xs text-gray-400 font-normal">kg</span>
                      </div>
                      
                      {/* Hover Overlay with Action Buttons */}
                      <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200 backdrop-blur-[2px]">
                        <button 
                          onClick={() => handleEditBatchClick(index)}
                          className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-transform hover:scale-110 shadow-sm"
                          title="Edit Batch"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteBatchClick(index)}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110 shadow-sm"
                          title="Remove Batch"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             )}

             <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleSaveBottomSection} className={btnSaveClass}>Save Section 3</button>
              <button type="button" onClick={handleClearBottomSection} className={btnClearClass}>Clear</button>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE: Pending Queue Sidebar */}
        <div className="w-full xl:w-1/4">
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-full shadow-sm sticky top-6">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                <h3 className="font-bold text-gray-800 text-sm">Pending Queue</h3>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{pendingQueue.length}</span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto bg-gray-50 min-h-[400px]">
              {pendingQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50 pt-20">
                  <div className="p-4 bg-gray-200 rounded-full">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Queue is empty</p>
                    <p className="text-xs text-gray-500">Fill the forms and save records here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingQueue.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-500">ENTRY #{idx + 1} - {item.type}</span>
                      {item.type === 'Wither Leaf Info' ? (
                        <>
                          <span className="text-sm font-semibold text-gray-800 line-clamp-1">{item.factory}</span>
                          <span className="text-xs text-gray-500">Crop: {item.dateOfCrop}</span>
                        </>
                      ) : (
                         <>
                          <span className="text-sm font-semibold text-gray-800">DOM: {item.dateOfManufacture}</span>
                          <span className="text-xs text-green-600 font-bold">Batch data recorded</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-white rounded-b-2xl">
              <button 
                onClick={handleSaveToDatabase}
                disabled={pendingQueue.length === 0}
                className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  pendingQueue.length > 0 
                    ? 'bg-gray-800 text-white hover:bg-gray-900 shadow-md' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Sync Database ({pendingQueue.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Custom Alert Dialog for Deletion --- */}
      {deleteAlert.isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all">
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Remove Batch Data</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 pl-11">
              Are you sure you want to remove the data for <strong>Batch {deleteAlert.batchIndex + 1}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                Yes, Remove
              </button>
            </div>
            
          </div>
        </div>,
        document.body // <--- THIS TELLS REACT TO PUT IT OVER EVERYTHING
      )}
    </div>
  );
};

export default WitherLeafForm;