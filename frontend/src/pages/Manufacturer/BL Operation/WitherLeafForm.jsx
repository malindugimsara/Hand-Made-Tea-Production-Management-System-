import React, { useState } from 'react';

const WitherLeafForm = () => {
  // Form State
  const initialFormState = {
    factory: '',
    dateOfCrop: '',
    receivedTotalCropKg: '',
    totalEmployee: '',
    witheredLeafKgName1: '',
    percentage: '',
    batchingDetails: {
      startTime: '',
      finishTime: '',
      noOfBatchers: '',
      weatheringQuality: ''
    },
    quantities: [] // Dynamic quantities
  };

  const [formData, setFormData] = useState(initialFormState);
  
  // Queue State (Matches the right-side panel in your theme)
  const [pendingQueue, setPendingQueue] = useState([]);

  // --- Handlers ---
  const handleMainChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBatchingChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      batchingDetails: { ...prev.batchingDetails, [name]: value }
    }));
  };

  const addQuantityRecord = () => {
    setFormData((prev) => ({
      ...prev,
      quantities: [...prev.quantities, { batchId: '', value: '' }]
    }));
  };

  const handleQuantityUpdate = (index, field, value) => {
    const updatedQuantities = [...formData.quantities];
    updatedQuantities[index][field] = value;
    setFormData((prev) => ({ ...prev, quantities: updatedQuantities }));
  };

  // Workflow Step 1: Add to Queue
  const handleAddToQueue = (e) => {
    e.preventDefault();
    if (!formData.factory || !formData.dateOfCrop) {
      alert("Please fill at least the Factory and Date of Crop.");
      return;
    }
    setPendingQueue([...pendingQueue, { ...formData, id: Date.now() }]);
    setFormData(initialFormState); // Reset form after queueing
  };

  // Workflow Step 2: Save Database
  const handleSaveToDatabase = async () => {
    if (pendingQueue.length === 0) return;
    console.log('Saving to Database:', pendingQueue);
    // API Call here...
    // await axios.post('/api/wither-leaf/bulk', pendingQueue);
    alert(`${pendingQueue.length} records saved to database!`);
    setPendingQueue([]);
  };

  // Reusable Input Style based on your theme
  const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 block p-2.5 transition-colors";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans">
      
      {/* Page Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-2">
          {/* Leaf Icon */}
          <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19s1-7 8-7 8 7 8 7M3 19c0-5.523 4.477-10 10-10s10 4.477 10 10M12 9c0-3.314-2.686-6-6-6S0 5.686 0 9"></path>
          </svg>
          <h1 className="text-xl font-bold text-green-800 tracking-tight">Wither Leaf Entry</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-8">Record Factory, Wither Leaf, and Batching data</p>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT SIDE: Form Inputs */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          
          {/* Top Card: Date & Collection */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Date of Collection</label>
                <input 
                  type="date" 
                  name="dateOfCrop" 
                  value={formData.dateOfCrop} 
                  onChange={handleMainChange} 
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Factory</label>
                <select 
                  name="factory" 
                  value={formData.factory} 
                  onChange={handleMainChange} 
                  className={inputClass}
                >
                  <option value="">Select Factory...</option>
                  <option value="Factory 1">Factory 1</option>
                  <option value="Factory 2">Factory 2</option>
                </select>
              </div>
            </div>
          </div>

          {/* Middle Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wither Leaf Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-800">Wither Leaf Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Total Received (KG)</label>
                  <input type="number" name="receivedTotalCropKg" value={formData.receivedTotalCropKg} onChange={handleMainChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Percentage %</label>
                  <input type="number" name="percentage" value={formData.percentage} onChange={handleMainChange} className={inputClass} />
                </div>
                <div className="pt-2">
                  <label className={labelClass}>Withered Leaf (KG) Name 1</label>
                  {/* Styled like the 'Return Weight' read-only field in your theme */}
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex justify-between items-center">
                     <span className="text-sm text-gray-400">Calculated Value</span>
                     <span className="font-bold text-green-600">0 kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Batching Schedule Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-1.5 bg-orange-50 rounded-lg">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-800">Batching Schedule</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Start Time</label>
                    <input type="time" name="startTime" value={formData.batchingDetails.startTime} onChange={handleBatchingChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Finish Time</label>
                    <input type="time" name="finishTime" value={formData.batchingDetails.finishTime} onChange={handleBatchingChange} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>No. of Batchers</label>
                  <input type="number" name="noOfBatchers" value={formData.batchingDetails.noOfBatchers} onChange={handleBatchingChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Weathering Quality</label>
                  <input type="text" name="weatheringQuality" value={formData.batchingDetails.weatheringQuality} onChange={handleBatchingChange} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Manufacture Quantities Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-800">Manufacture Quantities</h2>
                </div>
                <button type="button" onClick={addQuantityRecord} className="text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                  + Add Row
                </button>
             </div>

             {formData.quantities.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">No quantities added.</p>
             ) : (
                <div className="space-y-3">
                  {formData.quantities.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className={labelClass}>Batch/Col ID</label>
                        <input type="text" value={item.batchId} onChange={(e) => handleQuantityUpdate(index, 'batchId', e.target.value)} className={inputClass} />
                      </div>
                      <div className="flex-1">
                        <label className={labelClass}>Value</label>
                        <input type="number" value={item.value} onChange={(e) => handleQuantityUpdate(index, 'value', e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>

          {/* Add to Queue Button */}
          <button 
            type="button" 
            onClick={handleAddToQueue}
            className="w-full bg-[#34a853] hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Add to Pending Queue
          </button>

        </div>

        {/* RIGHT SIDE: Pending Queue Sidebar */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-full shadow-sm">
            
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                <h3 className="font-bold text-gray-800 text-sm">Pending Queue</h3>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                {pendingQueue.length}
              </span>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 p-5 overflow-y-auto bg-gray-50">
              {pendingQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50 pt-20">
                  <div className="p-4 bg-gray-200 rounded-full">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Queue is empty</p>
                    <p className="text-xs text-gray-500">Fill the form and add records here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingQueue.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-500">ENTRY #{idx + 1}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.factory} | {item.dateOfCrop}</span>
                      <span className="text-xs text-gray-500">{item.receivedTotalCropKg || 0} kg Received</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
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
                Save to Database ({pendingQueue.length})
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default WitherLeafForm;