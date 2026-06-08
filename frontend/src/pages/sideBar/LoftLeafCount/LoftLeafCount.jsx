import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Leaf, PlusCircle, Trash2, Tag, ListChecks, User, Factory, Users, Edit2, Save, Weight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function LoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const currentUsername = localStorage.getItem("username") || "Unknown";
  
  const getLocalTodayDate = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  const today = getLocalTodayDate();

  const [records, setRecords] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Pending records and Edit State
  const [pendingRecords, setPendingRecords] = useState([]);
  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFactoryRouteDropdownOpen, setIsFactoryRouteDropdownOpen] = useState(false);
  const [isCollectorRouteDropdownOpen, setIsCollectorRouteDropdownOpen] = useState(false);
  
  const factoryRouteDropdownRef = useRef(null);
  const collectorRouteDropdownRef = useRef(null);

  // Added totalLeafQty to factoryForm
  const [factoryForm, setFactoryForm] = useState({
    route: "",
    officerName: "",
    totalLeafQty: "", 
    bestQty: "",
    belowBestQty: "",
  });

  const [collectorForm, setCollectorForm] = useState({
    route: "",
    bestQty: "",
    belowBestQty: "",
  });

  const routeOptions = [
    "C1 - MATHTHAKA",
    "C2 - walallawita",
    "C3 - pelawaththa",
    "C4 - polgampala",
    "C5 - manampita",
    "C7 - ganegoda",
    "C8 - thundola",
    "FA - factory",
    "E - estate tea",
  ];

  useEffect(() => {
    fetchRecords();
    function handleClickOutside(event) {
      if (factoryRouteDropdownRef.current && !factoryRouteDropdownRef.current.contains(event.target)) {
        setIsFactoryRouteDropdownOpen(false);
      }
      if (collectorRouteDropdownRef.current && !collectorRouteDropdownRef.current.contains(event.target)) {
        setIsCollectorRouteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/loft-leaf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRecords(data);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Fetch error:", error);
      setIsDataLoaded(true);
    }
  };

  const isTodaySaved = isDataLoaded && records.some((r) => {
      if (!r.date) return false;
      return r.date.split("T")[0] === today;
  });

  const calculateStats = (best, belowBest) => {
    const b = Number(best) || 0;
    const bb = Number(belowBest) || 0;
    const p = Math.max(0, 100 - (b + bb));
    const totalQty = b + bb + p;

    return {
      b,
      bb,
      p,
      totalQty,
      bPct: totalQty > 0 ? ((b / totalQty) * 100).toFixed(0) : 0,
      bbPct: totalQty > 0 ? ((bb / totalQty) * 100).toFixed(0) : 0,
      pPct: totalQty > 0 ? ((p / totalQty) * 100).toFixed(0) : 0,
    };
  };

  const factoryStats = calculateStats(factoryForm.bestQty, factoryForm.belowBestQty);
  const collectorStats = calculateStats(collectorForm.bestQty, collectorForm.belowBestQty);

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    
    if (formType === 'factory') {
        setFactoryForm(prev => {
            const newValue = { ...prev, [name]: value };
            if (name === "bestQty" || name === "belowBestQty") {
                const val = Number(value) || 0;
                const b = name === "bestQty" ? val : (Number(prev.bestQty) || 0);
                const bb = name === "belowBestQty" ? val : (Number(prev.belowBestQty) || 0);
                if (b + bb > 100) return prev;
                if (val < 0) return prev;
            }
            return newValue;
        });
    } else if (formType === 'collector') {
        setCollectorForm(prev => {
            const newValue = { ...prev, [name]: value };
            if (name === "bestQty" || name === "belowBestQty") {
                const val = Number(value) || 0;
                const b = name === "bestQty" ? val : (Number(prev.bestQty) || 0);
                const bb = name === "belowBestQty" ? val : (Number(prev.belowBestQty) || 0);
                if (b + bb > 100) return prev;
                if (val < 0) return prev;
            }
            return newValue;
        });
    }
  };

  const handleAddToList = (e, formType) => {
    e.preventDefault();
    
    const isFactory = formType === 'factory';
    const currentForm = isFactory ? factoryForm : collectorForm;
    const stats = isFactory ? factoryStats : collectorStats;

    if (!currentForm.route || stats.totalQty === 0) {
      toast.error("Please fill Route and quantities!");
      return;
    }
    // Updated validation to check totalLeafQty for factory
    if (isFactory && (!currentForm.officerName.trim() || !currentForm.totalLeafQty)) {
      toast.error("Please fill all Factory specific fields (Officer, Total Leaf Qty)!");
      return;
    }

    const newRecord = {
      id: Date.now().toString() + Math.random().toString(), 
      date: today,
      sampleType: isFactory ? "Factory" : "LeafCollector",
      route: currentForm.route,
      officerName: isFactory ? currentForm.officerName : "",
      totalLeafQty: isFactory ? Number(currentForm.totalLeafQty) : null, // Added to payload
      bestQty: stats.b,
      belowBestQty: stats.bb,
      poorQty: stats.p,
      totalQty: stats.totalQty,
    };
    
    setPendingRecords([...pendingRecords, newRecord]);
    
    if (isFactory) {
      setFactoryForm({ route: "", officerName: "", totalLeafQty: "", bestQty: "", belowBestQty: "" });
    } else {
      setCollectorForm({ route: "", bestQty: "", belowBestQty: "" });
    }
    
    toast.success(`Added ${isFactory ? 'Factory' : 'Collector'} Sample to list!`);
  };

  const handleRemoveFromList = (id) => {
    setPendingRecords(pendingRecords.filter(r => r.id !== id));
    if(editingId === id) {
        setEditingId(null);
        setEditFormData(null);
    }
  };

  const handleEditClick = (id) => {
      setEditingId(id);
      const recordToEdit = pendingRecords.find(r => r.id === id);
      setEditFormData({...recordToEdit});
  };

  const handleEditChange = (e) => {
      const { name, value } = e.target;
      
      setEditFormData(prev => {
          const newData = { ...prev, [name]: value };
          
          if (name === 'bestQty' || name === 'belowBestQty') {
              const b = name === 'bestQty' ? (Number(value) || 0) : (Number(prev.bestQty) || 0);
              const bb = name === 'belowBestQty' ? (Number(value) || 0) : (Number(prev.belowBestQty) || 0);
              
              if(b + bb <= 100 && b >= 0 && bb >= 0) {
                  const p = Math.max(0, 100 - (b + bb));
                  newData.poorQty = p;
                  newData.totalQty = b + bb + p;
                  return newData;
              }
              return prev; 
          }
          return newData;
      });
  };

  const handleSaveEdit = () => {
      setPendingRecords(pendingRecords.map(r => r.id === editingId ? editFormData : r));
      setEditingId(null);
      setEditFormData(null);
      toast.success("Record updated successfully!");
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditFormData(null);
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) return;
    if (editingId !== null) {
        toast.error("Please save your edits first!");
        return;
    }
    
    setIsSaving(true);
    const toastId = toast.loading("Saving records to database...");
    try {
      const token = localStorage.getItem("token");
      const promises = pendingRecords.map((record) => {
        const { id, ...recordToSave } = record; 
        return fetch(`${BACKEND_URL}/api/loft-leaf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...recordToSave, updatedBy: currentUsername }),
        }).then((res) => {
          if (!res.ok) throw new Error();
        });
      });

      await Promise.all(promises);
      toast.success("All records saved!", { id: toastId });
      setPendingRecords([]);
      fetchRecords();
      navigate("/view-loft-leaf");
    } catch (error) {
      toast.error("Error saving records.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const PendingTable = ({ sampleType, title, icon }) => {
    const filteredRecords = pendingRecords.filter(r => r.sampleType === sampleType);
    
    if (filteredRecords.length === 0) return null;

    return (
        <div className="mt-4 mb-8 bg-white dark:bg-zinc-900/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                {icon} Pending {title} ({filteredRecords.length})
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400 min-w-[600px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-800 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">Route</th>
                    {sampleType === 'Factory' && (
                        <>
                            <th scope="col" className="px-4 py-3">Officer</th>
                            <th scope="col" className="px-4 py-3 text-center">Total Leaf (Kg)</th>
                        </>
                    )}
                    <th scope="col" className="px-4 py-3 text-center">Best (g)</th>
                    <th scope="col" className="px-4 py-3 text-center">Below Best (g)</th>
                    <th scope="col" className="px-4 py-3 text-center">Poor (g)</th>
                    <th scope="col" className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item) => {
                      const isEditing = editingId === item.id;
                      const data = isEditing ? editFormData : item;
                      
                      return (
                      <tr key={item.id} className="bg-white border-b dark:bg-zinc-900 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            {data.route.split(' - ')[0].toUpperCase()}
                        </td>
                        
                        {sampleType === 'Factory' && (
                            <>
                                <td className="px-4 py-3">{data.officerName || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                    {isEditing ? (
                                        <input type="number" name="totalLeafQty" value={data.totalLeafQty || ''} onChange={handleEditChange} className="w-20 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-teal-500" />
                                    ) : (
                                        <span className="font-bold text-teal-600 dark:text-teal-400">{data.totalLeafQty ? `${data.totalLeafQty} Kg` : '-'}</span>
                                    )}
                                </td>
                            </>
                        )}
                        
                        <td className="px-4 py-3 text-center">
                            {isEditing ? (
                                <input type="number" name="bestQty" value={data.bestQty} onChange={handleEditChange} className="w-16 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-teal-500" />
                            ) : (
                                <span className="text-green-600 font-bold">{data.bestQty}g</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-center">
                            {isEditing ? (
                                <input type="number" name="belowBestQty" value={data.belowBestQty} onChange={handleEditChange} className="w-16 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-teal-500" />
                            ) : (
                                <span className="text-yellow-600 font-bold">{data.belowBestQty}g</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-red-600 font-bold">{data.poorQty}g</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 font-bold text-xs bg-green-100 px-2 py-1 rounded">Save</button>
                                    <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800 font-bold text-xs bg-gray-200 px-2 py-1 rounded">Cancel</button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => handleEditClick(item.id)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleRemoveFromList(item.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </td>
                      </tr>
                    )})}
                </tbody>
              </table>
            </div>
        </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[900px] mx-auto font-sans min-h-screen transition-colors duration-300 relative">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <Leaf size={24} /> Add Loft Leaf Count
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter daily leaf quantities for Factory and Collector samples.
          </p>
        </div>
        <div className="text-left md:text-right">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Today's Date</span>
            <span className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-lg font-mono font-bold text-gray-700 dark:text-gray-300">
                {today}
            </span>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* =======================================
            1. FACTORY SAMPLE SECTION
        ======================================= */}
        <div>
            <form
            onSubmit={(e) => handleAddToList(e, 'factory')}
            className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border-t-4 border-t-gray-800 border-x border-b border-gray-100 dark:border-zinc-800"
            >
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Factory size={20} className="text-gray-800 dark:text-gray-400" /> Factory Sample Entry
            </h3>

            {/* Changed from md:grid-cols-2 to md:grid-cols-3 to accommodate the new field */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Route Field */}
                <div className="relative" ref={factoryRouteDropdownRef}>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Tag size={12} /> Route
                </label>
                <input
                    type="text"
                    placeholder="Select route..."
                    name="route"
                    value={factoryForm.route}
                    onChange={(e) => handleInputChange(e, 'factory')}
                    onFocus={() => setIsFactoryRouteDropdownOpen(true)}
                    required
                    className="w-full p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-gray-800/50 outline-none transition-colors shadow-sm bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
                />
                
                <AnimatePresence>
                    {isFactoryRouteDropdownOpen && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                    >
                        {routeOptions.map((r) => (
                        <li
                            key={r}
                            onClick={() => {
                            setFactoryForm((p) => ({ ...p, route: r }));
                            setIsFactoryRouteDropdownOpen(false);
                            }}
                            className="px-4 py-2.5 cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            {r.toUpperCase()}
                        </li>
                        ))}
                    </motion.ul>
                    )}
                </AnimatePresence>
                </div>

                {/* Officer Name Field */}
                <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <User size={12} /> Selected Officer Name
                </label>
                <input
                    type="text"
                    name="officerName"
                    placeholder="Enter officer name"
                    value={factoryForm.officerName}
                    onChange={(e) => handleInputChange(e, 'factory')}
                    required
                    className="w-full p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-gray-800/50 outline-none transition-colors shadow-sm bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
                />
                </div>

                {/* NEW FIELD: Total Leaf Qty */}
                <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Weight size={12} /> Total Leaf Qty (Kg)
                </label>
                <input
                    type="number"
                    name="totalLeafQty"
                    placeholder="e.g. 250"
                    value={factoryForm.totalLeafQty}
                    onChange={(e) => handleInputChange(e, 'factory')}
                    required
                    min="0"
                    step="any"
                    className="w-full p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-gray-800/50 outline-none transition-colors shadow-sm bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
                />
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                <label className="block text-xs font-bold text-green-700 mb-2">Best (g)</label>
                <input type="number" name="bestQty" value={factoryForm.bestQty} onChange={(e) => handleInputChange(e, 'factory')} required className="w-full p-2.5 mb-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg font-bold text-green-800 justify-center shadow-inner">{factoryStats.bPct}%</div>
                </div>
                <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                <label className="block text-xs font-bold text-yellow-700 mb-2 uppercase">Below Best (g)</label>
                <input type="number" name="belowBestQty" value={factoryForm.belowBestQty} onChange={(e) => handleInputChange(e, 'factory')} required className="w-full p-2.5 mb-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none" />
                <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg font-bold text-yellow-800 justify-center shadow-inner">{factoryStats.bbPct}%</div>
                </div>
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                <label className="block text-xs font-bold text-red-700 mb-2 uppercase">Poor Leaf (g)</label>
                <input type="number" value={factoryStats.p} disabled className="w-full p-2.5 mb-3 border border-red-200 rounded-lg bg-gray-100 font-bold text-red-700 cursor-not-allowed" />
                <div className="flex items-center gap-1 bg-red-100 px-3 py-2 rounded-lg font-bold text-red-800 justify-center shadow-inner">{factoryStats.pPct}%</div>
                </div>
            </div>

            <button type="submit" className="mt-6 w-full py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-all shadow-md flex items-center justify-center gap-2">
                <PlusCircle size={18} /> Add Factory Sample
            </button>
            </form>

            <PendingTable sampleType="Factory" title="Factory Entries" icon={<Factory size={16}/>} />
        </div>

        {/* =======================================
            2. LEAF COLLECTOR SAMPLE SECTION
        ======================================= */}
        <div>
            <form
            onSubmit={(e) => handleAddToList(e, 'collector')}
            className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border-t-4 border-t-teal-600 border-x border-b border-gray-100 dark:border-zinc-800 mt-8"
            >
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Users size={20} className="text-teal-600" /> Leaf Collector's Sample Entry
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative" ref={collectorRouteDropdownRef}>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Tag size={12} /> Route
                </label>
                <input
                    type="text"
                    placeholder="Select route..."
                    name="route"
                    value={collectorForm.route}
                    onChange={(e) => handleInputChange(e, 'collector')}
                    onFocus={() => setIsCollectorRouteDropdownOpen(true)}
                    required
                    className="w-full p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-teal-500/50 outline-none transition-colors shadow-sm bg-white dark:bg-zinc-950 text-gray-900 dark:text-white"
                />
                <AnimatePresence>
                    {isCollectorRouteDropdownOpen && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                    >
                        {routeOptions.map((r) => (
                        <li
                            key={r}
                            onClick={() => {
                            setCollectorForm((p) => ({ ...p, route: r }));
                            setIsCollectorRouteDropdownOpen(false);
                            }}
                            className="px-4 py-2.5 cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            {r.toUpperCase()}
                        </li>
                        ))}
                    </motion.ul>
                    )}
                </AnimatePresence>
                </div>
                <div className="hidden md:block"></div> 
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                <label className="block text-xs font-bold text-green-700 mb-2">Best (g)</label>
                <input type="number" name="bestQty" value={collectorForm.bestQty} onChange={(e) => handleInputChange(e, 'collector')} required className="w-full p-2.5 mb-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg font-bold text-green-800 justify-center shadow-inner">{collectorStats.bPct}%</div>
                </div>
                <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                <label className="block text-xs font-bold text-yellow-700 mb-2 uppercase">Below Best (g)</label>
                <input type="number" name="belowBestQty" value={collectorForm.belowBestQty} onChange={(e) => handleInputChange(e, 'collector')} required className="w-full p-2.5 mb-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none" />
                <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg font-bold text-yellow-800 justify-center shadow-inner">{collectorStats.bbPct}%</div>
                </div>
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                <label className="block text-xs font-bold text-red-700 mb-2 uppercase">Poor Leaf (g)</label>
                <input type="number" value={collectorStats.p} disabled className="w-full p-2.5 mb-3 border border-red-200 rounded-lg bg-gray-100 font-bold text-red-700 cursor-not-allowed" />
                <div className="flex items-center gap-1 bg-red-100 px-3 py-2 rounded-lg font-bold text-red-800 justify-center shadow-inner">{collectorStats.pPct}%</div>
                </div>
            </div>

            <button type="submit" className="mt-6 w-full py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shadow-md flex items-center justify-center gap-2">
                <PlusCircle size={18} /> Add Collector Sample
            </button>
            </form>

            <PendingTable sampleType="LeafCollector" title="Collector Entries" icon={<Users size={16}/>} />
        </div>
      </div>

      {/* Static Save All Button Container at the bottom */}
      {pendingRecords.length > 0 && (
          <div className="mt-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">
                  Total Pending: <span className="text-[#1B6A31]">{pendingRecords.length} Records</span>
              </div>
              <button
                  onClick={handleSaveAll}
                  disabled={isSaving || isTodaySaved || editingId !== null}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#1B6A31] hover:bg-green-800 text-white font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                  <Save size={20} />
                  {isTodaySaved ? "Already Saved Today" : isSaving ? "Saving to Database..." : "Save All to Database"}
              </button>
          </div>
      )}
    </div>
  );
}