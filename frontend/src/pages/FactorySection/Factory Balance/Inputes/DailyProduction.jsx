import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, Factory, Leaf, ListChecks, PlusCircle, Sparkles} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyProduction() {
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

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    greenLeafToday: '',
  });

  useEffect(() => {
    if (formData.date) {
      const selectedDateMonth = formData.date.substring(0, 7); // උදා: '2024-04'
      if (selectedDateMonth !== selectedMonth) {
        setSelectedMonth(selectedDateMonth);
      }
    }
  }, [formData.date, selectedMonth]);

  const username = localStorage.getItem('username') || 'Unknown User';
  const userRole = localStorage.getItem('userRole') || '';
  const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

  // --- NEW CALCULATION LOGIC ---
  // Extract month from the selected date (1-12)
  const selectedMonthNumber = parseInt(formData.date.split('-')[1], 10);
  
  // April(4), May(5), June(6), September(9), October(10), November(11), December(12)
  const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
  
  // Determine conversion rate based on the month
  const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
  const calculatedMadeTea = (Number(formData.greenLeafToday) || 0) * conversionRate;
  // -----------------------------

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
      calculatedMadeTea,
      dispatch: existingRecord ? existingRecord.dispatch : 0,
      localSaleAndGratis: existingRecord ? existingRecord.localSaleAndGratis : 0,
      returnAmount: existingRecord ? existingRecord.returnAmount : 0,
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success("Added to list!");
    setFormData({ ...formData, greenLeafToday: '' });
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
          greenLeafToday: Number(record.greenLeafToday) || 0,
          dispatch: Number(record.dispatch) || 0,
          localSaleAndGratis: Number(record.localSaleAndGratis) || 0,
          returnAmount: Number(record.returnAmount) || 0,
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

  // Reusable dynamic input styles for Light & Dark modes
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
              
              <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Record Date</label>
                <input 
                  type="date" name="date" value={formData.date} onChange={handleInputChange} required 
                  className={inputStyles}
                />
              </div>

              <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm mb-6 transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#0d5e4d] dark:text-teal-400">
                  <div className="p-1.5 rounded-lg bg-[#f0fdfa] dark:bg-teal-900/30"><Leaf size={18}/></div>
                  Production Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Green Leaf Today (kg)</label>
                    <input 
                      type="number" step="0.01" min="0" name="greenLeafToday" 
                      value={formData.greenLeafToday} onChange={handleInputChange} 
                      onWheel={(e) => e.target.blur()} required placeholder="e.g. 1500" 
                      className={inputStyles} 
                    />
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
                              <span className="block text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold mb-1">Leaf</span>
                              <span className="font-black text-[#0d5e4d] dark:text-teal-400">{item.greenLeafToday} kg</span>
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