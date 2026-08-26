import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Leaf,
  Filter,
  X,
  Package,
  Activity,
  Info,
  Download
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as htmlToImage from 'html-to-image'; // <-- MODERN IMAGE LIBRARY

// Utility to chunk arrays into smaller arrays for multiple rows
const chunkArray = (arr, size) => {
  const chunked = [];
  for (let i = 0; i < arr.length; i += size) {
    chunked.push(arr.slice(i, i + size));
  }
  return chunked;
};

// Helper to get local date in YYYY-MM-DD format for default filter
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const WitherLeafSummary = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [downloadingImage, setDownloadingImage] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/wither-leaf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setRecords(result.data);
      } else {
        toast.error("Failed to load records.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Connection error while fetching records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const clearFilter = () => setFilterDate("");

  const filteredRecords = records.filter(record => {
    if (!filterDate) return true;
    const recordDate = record.dateOfCrop || (record.createdAt ? record.createdAt.split('T')[0] : '');
    return recordDate === filterDate;
  });

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const cropDate = record.dateOfCrop || 'Unknown Crop Date';
    const mfDate = record.dateOfManufacture || 'Unknown M/F Date';
    
    const groupKey = `${cropDate}|${mfDate}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(record);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(groupedRecords).sort((a, b) => {
    if (a.startsWith('Unknown')) return 1;
    if (b.startsWith('Unknown')) return -1;
    const dateA = a.split('|')[0];
    const dateB = b.split('|')[0];
    return new Date(dateB) - new Date(dateA);
  });

  // =========================================================
  // --- IMAGE EXPORT LOGIC (NO PDF CODE) ---
  // =========================================================
  const handleDownloadImage = async (groupKey, cropDateStr) => {
    const element = document.getElementById(`report-card-${groupKey}`);
    if (!element) return;

    setDownloadingImage(true);
    const toastId = toast.loading("Generating High-Quality Image...");

    try {
      // Use html-to-image to bypass the CSS parsing bugs of html2canvas
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 2, // High resolution (Retina quality)
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          borderRadius: '0' // Optional: removes border radius on the final image if preferred
        }
      });

      const link = document.createElement('a');
      link.download = `Wither_Leaf_Report_${cropDateStr}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Image downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image.", { id: toastId });
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans">
      <Toaster position="bottom-right" />
      
      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Leaf className="w-7 h-7 text-green-700" />
            <h1 className="text-2xl font-bold text-green-800 tracking-tight">Wither Leaf Summary</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-9">Daily consolidated report of all wither leaf and batch data.</p>
        </div>
        
        <button 
          onClick={fetchRecords} 
          disabled={loading}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2 sm:py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Sync'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="max-w-6xl mx-auto mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Filter className="w-4 h-4 text-green-600" />
          Filter by Day:
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Crop Date</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none p-2"
            />
          </div>
          {filterDate && (
            <button 
              onClick={clearFilter}
              className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* UI Content Generation */}
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {loading && records.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading reports...</p>
          </div>
        ) : sortedGroupKeys.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700">No Records Found</h3>
            <p className="text-gray-500 text-sm">There is no wither leaf data available for the selected date.</p>
          </div>
        ) : (
          sortedGroupKeys.map((groupKey) => {
            const dayRecords = groupedRecords[groupKey];
            const isExpanded = expandedGroups[groupKey] !== false; 
            
            const [cropDateStr, mfDateStr] = groupKey.split('|');

            const formatDate = (dStr) => {
              if (dStr.startsWith('Unknown')) return dStr;
              const d = new Date(dStr);
              return d.toLocaleDateString('en-GB'); 
            };

            const formattedCropDate = formatDate(cropDateStr);
            const formattedMFDate = formatDate(mfDateStr);
            
            const consolidated = dayRecords.reduce((acc, curr) => {
              if (curr.factory) acc.factory = curr.factory;
              if (curr.receivedTotalCropKg) acc.receivedTotalCropKg = curr.receivedTotalCropKg;
              if (curr.witheredLeafKg) acc.witheredLeafKg = curr.witheredLeafKg;
              if (curr.percentage) acc.percentage = curr.percentage;
              if (curr.weatheringQuality) acc.weatheringQuality = curr.weatheringQuality;
              if (curr.startTime) acc.startTime = curr.startTime;
              if (curr.finishTime) acc.finishTime = curr.finishTime;
              if (curr.period) acc.period = curr.period;
              if (curr.totalEmployee) acc.totalEmployee = curr.totalEmployee;
              if (curr.noOfBatchers) acc.noOfBatchers = curr.noOfBatchers;

              if (curr.batches) {
                curr.batches.forEach((val, i) => {
                  if (val > 0) acc.batches[i] += val; 
                });
              }
              return acc;
            }, { batches: Array(25).fill(0) });

            const activeBatches = consolidated.batches.map((kg, i) => ({ num: String(i + 1).padStart(2, '0'), kg })).filter(b => b.kg > 0);
            const hasBatches = activeBatches.length > 0;
            const totalReceived = consolidated.receivedTotalCropKg || 0;
            
            return (
              <div 
                key={groupKey} 
                id={`report-card-${groupKey}`} // <--- ID FOR IMAGE TARGET
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300"
              >
                
                {/* Header Container */}
                <div 
                  onClick={() => toggleGroup(groupKey)}
                  className="bg-white hover:bg-green-50/30 p-5 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-green-100/50 text-green-600 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Crop Date</span>
                         <span className="text-lg font-black text-gray-800">{formattedCropDate}</span>
                      </div>
                      <span className="hidden sm:block text-gray-300">|</span>
                      <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">M/F Date</span>
                         <span className="text-lg font-black text-gray-800">{formattedMFDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto mt-3 sm:mt-0">
                    {totalReceived > 0 && (
                      <div className="hidden sm:block text-right mr-2">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Total Crop</p>
                        <p className="text-sm font-bold text-gray-800">{Number(totalReceived).toFixed(2)} kg</p>
                      </div>
                    )}
                    
                    {/* --- IMAGE DOWNLOAD BUTTON --- */}
                    {isExpanded && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleDownloadImage(groupKey, formattedCropDate.replace(/\//g, '-'));
                        }}
                        disabled={downloadingImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-bold text-xs transition-colors border border-green-200"
                        title="Download as Image"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PNG
                      </button>
                    )}

                    <button className="p-1.5 bg-gray-50 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-100 ml-auto sm:ml-0 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ======================================= */}
                {/* --- MODERN UI CONTENT --- */}
                {/* ======================================= */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-6 md:p-8">
                    
                    {/* --- TOP SECTION: Batch Table --- */}
                    <div className="mb-10 w-full overflow-x-auto custom-scrollbar pb-2">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Batch Quantities</h4>
                      </div>

                      {hasBatches ? (
                        chunkArray(activeBatches, 15).map((chunk, chunkIdx) => (
                          <table key={`table-${chunkIdx}`} className="w-full min-w-max border-collapse border border-gray-200 mb-6 bg-white shadow-sm rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="border-r border-gray-200 text-gray-500 font-bold text-[11px] uppercase px-4 py-2 text-left w-24">
                                  Batch No
                                </th>
                                {chunk.map(batch => (
                                  <th 
                                    key={`th-${batch.num}`} 
                                    className="border-r border-gray-200 text-blue-600 font-bold text-[13px] px-3 py-2 text-center min-w-[55px] last:border-r-0"
                                  >
                                    {batch.num}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border-r border-gray-200 bg-gray-50 text-gray-500 font-bold text-[11px] uppercase px-4 py-3 text-left w-24">
                                  Kg
                                </td>
                                {chunk.map(batch => (
                                  <td 
                                    key={`td-${batch.num}`} 
                                    className="border-r border-gray-200 text-gray-800 font-bold text-sm px-3 py-3 text-center last:border-r-0"
                                  >
                                    {batch.kg}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        ))
                      ) : (
                        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center w-full max-w-md">
                          <p className="text-gray-500 font-medium text-sm">No batches recorded for this day.</p>
                        </div>
                      )}
                    </div>

                    {/* --- BOTTOM SECTION: Info List --- */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <Info className="w-4 h-4 text-green-600" />
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Production Summary</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm text-gray-700">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Crop Date</span>
                          <span className="font-bold text-gray-900">{formattedCropDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">M/F Date</span>
                          <span className="font-bold text-gray-900">{formattedMFDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Green leaf</span>
                          <span className="font-bold text-blue-600">{consolidated.receivedTotalCropKg || 0} kg</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Wither leaf</span>
                          <span className="font-bold text-green-600">{consolidated.witheredLeafKg || 0} kg</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Withering (P)</span>
                          <span className="font-bold text-gray-900">{consolidated.percentage || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Quality</span>
                          <span className="font-bold text-orange-500">{consolidated.weatheringQuality || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Factory</span>
                          <span className="font-bold text-gray-900">{consolidated.factory || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="font-medium text-gray-500">Ops Period</span>
                          <span className="font-bold text-gray-900">
                            {consolidated.startTime || '-'} to {consolidated.finishTime || '-'} ({consolidated.period || '-'})
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WitherLeafSummary;