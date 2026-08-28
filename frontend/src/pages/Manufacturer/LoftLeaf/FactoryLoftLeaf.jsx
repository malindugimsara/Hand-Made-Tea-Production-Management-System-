import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Leaf, PlusCircle, Trash2, Tag, Factory, Users, Edit2, Save, Weight, Calendar, Clock, Languages, UserCheck, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// 💡 Leaf Collector Name Mapping
const collectorNameMapping = {
  "C1": "H. H. Kaluarachchi",
  "C2": "M. Darmakeerthi",
  "C3": "K. W. W. P. Kumara",
  "C4": "W. P. Madushanka",
  "C5": "J. D. I. Chandrakumara",
  "C7": "T. M. Jayasinghe",
  "C8": "K. C. Sampath"
};

const routeOptions = [
  "C1 - MATHTHAKA", "C2 - WALALLAWITA", "C3 - PELAWATHTHA", "C4 - POLGAMPALA",
  "C5 - MANAMPITA", "C7 - GANEGODA", "C8 - THUNDOLA", "FA - FACTORY", "E - ESTATE TEA",
];

export default function LoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const getLocalTodayDate = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  
  const currentUsername = localStorage.getItem("username") || "";

  const [selectedDate, setSelectedDate] = useState(getLocalTodayDate());
  
  // Pending records and Edit State
  const [pendingRecords, setPendingRecords] = useState([]);
  const [editingId, setEditingId] = useState(null); 
  const [editFormData, setEditFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFactoryRouteDropdownOpen, setIsFactoryRouteDropdownOpen] = useState(false);
  const [isCollectorRouteDropdownOpen, setIsCollectorRouteDropdownOpen] = useState(false);
  
  const factoryRouteDropdownRef = useRef(null);
  const collectorRouteDropdownRef = useRef(null);

  // 💡 Factory Supervisor Name (Global for the day)
  const [supervisorName, setSupervisorName] = useState(currentUsername);
  
  // 💡 State to track the last auto-filled route to avoid overwriting manual edits
  const [lastAutoFilledRoute, setLastAutoFilledRoute] = useState("");

  const [factoryForm, setFactoryForm] = useState({
    route: "",
    arrivalTime: "",
    arrivalAmPm: "PM",
    totalLeafQty: "", 
    bestQty: "",
    belowBestQty: "",
  });

  const [collectorForm, setCollectorForm] = useState({
    route: "",
    collectorName: "", 
    bestQty: "",
    belowBestQty: "",
  });

  // 💡 --- AUTO-FILL COLLECTOR NAME LOGIC ---
  useEffect(() => {
      const routeCode = collectorForm.route.split('-')[0].trim().toUpperCase();
      if (collectorNameMapping[routeCode]) {
          if (lastAutoFilledRoute !== routeCode) {
              setCollectorForm((prev) => ({ ...prev, collectorName: collectorNameMapping[routeCode] }));
              setLastAutoFilledRoute(routeCode);
          }
      } else if (collectorForm.route === "") {
          setLastAutoFilledRoute(""); 
      }
  }, [collectorForm.route, lastAutoFilledRoute]);

  // 💡 --- LANGUAGE TOGGLE & TRANSLATIONS ---
  const [lang, setLang] = useState("EN");

  const t = {
    title: lang === 'SI' ? "අමු තේ දළු ගුණාත්මය" : "Add Loft Leaf Count",
    subtitle: lang === 'SI' ? "කර්මාන්තශාලා සහ එකතු කරන්නන්ගේ නියැදි සඳහා දෛනික දළු ප්‍රමාණ ඇතුළත් කරන්න." : "Enter daily leaf quantities for Factory and Collector samples.",
    facSampleEntry: lang === 'SI' ? "කර්මාන්තශාලා නියැදිය ඇතුළත් කිරීම" : "Factory Sample Entry",
    colSampleEntry: lang === 'SI' ? "එකතු කරන්නාගේ නියැදිය ඇතුළත් කිරීම" : "Leaf Collector's Sample Entry",
    supervisorName: lang === 'SI' ? "කර්මාන්තශාලා අධීක්ෂකගේ නම" : "Factory Supervisor Name",
    collectorName: lang === 'SI' ? "දළු එකතු කරන්නාගේ නම (විකල්ප)" : "Leaf Collector Name (Optional)",
    route: lang === 'SI' ? "සැපයුම් මාර්ගය" : "Route",
    arrTime: lang === 'SI' ? "පැමිණි වේලාව" : "Arrival Time",
    totalKg: lang === 'SI' ? "මුළු අමු දළු ප්‍රමාණය (Kg)" : "Total Leaf Qty (Kg)",
    bestG: lang === 'SI' ? "ගුණාත්මයෙන් ඉහළ (g)" : "Best (g)",
    belowBestG: lang === 'SI' ? "ගුණාත්මයෙන් මධ්‍යස්ථ (g)" : "Below Best (g)",
    poorG: lang === 'SI' ? "ගුණාත්මයෙන් පහළ (g)" : "Poor Leaf (g)",
    addFac: lang === 'SI' ? "කර්මාන්තශාලා නියැදිය එක් කරන්න" : "Add Factory Sample",
    addCol: lang === 'SI' ? "එකතු කරන්නාගේ නියැදිය එක් කරන්න" : "Add Collector Sample",
    autoCalcNote: lang === 'SI' ? "* ගුණාත්මයෙන් පහළ ප්‍රතිශතය ස්වයංක්‍රීයව ගණනය වේ." : "* Poor leaf percentage will be auto-calculated.",
  };

  const filteredFactoryRoutes = routeOptions.filter(r => r.toLowerCase().includes(factoryForm.route.toLowerCase()));
  const filteredCollectorRoutes = routeOptions.filter(r => r.toLowerCase().includes(collectorForm.route.toLowerCase()));

  const [focusedFacRouteIdx, setFocusedFacRouteIdx] = useState(-1);
  const [focusedColRouteIdx, setFocusedColRouteIdx] = useState(-1);

  const focusNext = (nextId) => {
      const el = document.getElementById(nextId);
      if (el) el.focus();
  };

  const handleEnterKey = (e, nextId) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          focusNext(nextId);
      }
  };

  const handleFacRouteKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIsFactoryRouteDropdownOpen(true);
          setFocusedFacRouteIdx((prev) => Math.min(prev + 1, filteredFactoryRoutes.length - 1));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedFacRouteIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (isFactoryRouteDropdownOpen && focusedFacRouteIdx >= 0 && filteredFactoryRoutes[focusedFacRouteIdx]) {
              setFactoryForm((p) => ({ ...p, route: filteredFactoryRoutes[focusedFacRouteIdx] }));
          }
          setIsFactoryRouteDropdownOpen(false);
          focusNext('fac-arrivalTime');
      } else if (e.key === 'Escape') {
          setIsFactoryRouteDropdownOpen(false);
      }
  };

  const handleColRouteKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setIsCollectorRouteDropdownOpen(true);
          setFocusedColRouteIdx((prev) => Math.min(prev + 1, filteredCollectorRoutes.length - 1));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedColRouteIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (isCollectorRouteDropdownOpen && focusedColRouteIdx >= 0 && filteredCollectorRoutes[focusedColRouteIdx]) {
              const selectedRoute = filteredCollectorRoutes[focusedColRouteIdx];
              setCollectorForm((p) => ({ ...p, route: selectedRoute }));
          }
          setIsCollectorRouteDropdownOpen(false);
          focusNext('col-name');
      } else if (e.key === 'Escape') {
          setIsCollectorRouteDropdownOpen(false);
      }
  };

  useEffect(() => {
      if (isFactoryRouteDropdownOpen && focusedFacRouteIdx >= 0) {
          document.getElementById(`fac-route-opt-${focusedFacRouteIdx}`)?.scrollIntoView({ block: 'nearest' });
      }
  }, [focusedFacRouteIdx, isFactoryRouteDropdownOpen]);

  useEffect(() => {
      if (isCollectorRouteDropdownOpen && focusedColRouteIdx >= 0) {
          document.getElementById(`col-route-opt-${focusedColRouteIdx}`)?.scrollIntoView({ block: 'nearest' });
      }
  }, [focusedColRouteIdx, isCollectorRouteDropdownOpen]);

  useEffect(() => {
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

  const calculateStats = (best, belowBest) => {
    const b = Number(best) || 0;
    const bb = Number(belowBest) || 0;
    const p = Math.max(0, 100 - (b + bb));
    const totalQty = b + bb + p;

    return {
      b, bb, p, totalQty,
      bPct: totalQty > 0 ? ((b / totalQty) * 100).toFixed(0) : 0,
      bbPct: totalQty > 0 ? ((bb / totalQty) * 100).toFixed(0) : 0,
      pPct: totalQty > 0 ? ((p / totalQty) * 100).toFixed(0) : 0,
    };
  };

  const factoryStats = calculateStats(factoryForm.bestQty, factoryForm.belowBestQty);
  const collectorStats = calculateStats(collectorForm.bestQty, collectorForm.belowBestQty);

  // 💡 --- TIME FORMATTER & VALIDATOR (12-Hour) ---
  const formatTime12Hour = (value) => {
      let raw = value.replace(/\D/g, ''); // අංක පමණක් වෙන් කර ගැනීම
      raw = raw.substring(0, 4); // උපරිම ඉලක්කම් 4කට සීමා කිරීම

      if (raw.length === 0) return '';

      let hours = raw.substring(0, 2);
      let minutes = raw.substring(2, 4);

      // පැය (Hours) වල නිවැරදිතාවය පරීක්ෂා කිරීම (01-12)
      if (hours.length === 2) {
          let h = parseInt(hours, 10);
          if (h > 12) hours = '12'; // 12ට වඩා ටයිප් කළොත් 12 බවට පත් වේ
          if (h === 0) hours = '12'; // 00 ලෙස ටයිප් කළොත් 12 බවට පත් වේ
      } else if (hours.length === 1 && parseInt(hours, 10) > 1) {
          hours = `0${hours}`; // 2-9 අතර ඉලක්කමක් මුලින් ගැහුවොත් ඉබේම '0' එකක් මුලට වැටේ
      }

      // මිනිත්තු (Minutes) වල නිවැරදිතාවය පරීක්ෂා කිරීම (00-59)
      if (minutes.length === 2) {
          let m = parseInt(minutes, 10);
          if (m > 59) minutes = '59'; // 59ට වඩා ටයිප් කළොත් 59 බවට පත් වේ
      }

      // Output එකට ':' එක් කිරීම
      if (raw.length >= 3) {
          return `${hours}:${minutes}`;
      } else {
          return hours;
      }
  };

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    const setForm = formType === 'factory' ? setFactoryForm : setCollectorForm;
    
    if (name === 'route') {
        if (formType === 'factory') {
            setFocusedFacRouteIdx(-1);
            setIsFactoryRouteDropdownOpen(true);
        } else {
            setFocusedColRouteIdx(-1);
            setIsCollectorRouteDropdownOpen(true);
        }
    }

    setForm(prev => {
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
    if (isFactory && !currentForm.totalLeafQty) {
      toast.error("Please fill Total Leaf Quantity for Factory sample!");
      return;
    }

    const finalArrivalTime = isFactory && currentForm.arrivalTime 
        ? `${currentForm.arrivalTime} ${currentForm.arrivalAmPm}` 
        : "";

    const newRecord = {
      id: Date.now().toString() + Math.random().toString(), 
      date: selectedDate,
      sampleType: isFactory ? "Factory" : "LeafCollector",
      route: currentForm.route,
      arrivalTime: finalArrivalTime, 
      leafCollectorName: !isFactory ? currentForm.collectorName : "", 
      totalLeafQty: isFactory ? Number(currentForm.totalLeafQty) : null,
      bestQty: stats.b,
      belowBestQty: stats.bb,
      poorQty: stats.p,
      totalQty: stats.totalQty,
    };
    
    setPendingRecords([...pendingRecords, newRecord]);
    
    if (isFactory) {
      setFactoryForm({ route: "", arrivalTime: "", arrivalAmPm: "PM", totalLeafQty: "", bestQty: "", belowBestQty: "" });
      setTimeout(() => focusNext('fac-route'), 50);
    } else {
      setCollectorForm({ route: "", collectorName: "", bestQty: "", belowBestQty: "" }); 
      setLastAutoFilledRoute(""); // Reset tracking logic
      setTimeout(() => focusNext('col-route'), 50);
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

  // --- SAVE ALL TO BACKEND ---
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
        const isFactory = record.sampleType === 'Factory';
        const endpoint = isFactory ? '/api/factory-loft-leaf/factory' : '/api/factory-loft-leaf/collector'; 
        
        const payload = isFactory ? {
            date: record.date, 
            route: record.route, 
            arrivalTime: record.arrivalTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), 
            totalLeafQtyKg: record.totalLeafQty, 
            factorySupervisorName: supervisorName, // Global supervisor name
            bestG: record.bestQty, 
            belowBestG: record.belowBestQty, 
            poorG: record.poorQty
        } : {
            date: record.date, 
            route: record.route, 
            leafCollectorName: record.leafCollectorName, // Specific collector name
            bestG: record.bestQty, 
            belowBestG: record.belowBestQty, 
            poorG: record.poorQty
        };

        return fetch(`${BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }).then((res) => {
          if (!res.ok) throw new Error();
        });
      });

      await Promise.all(promises);
      toast.success("All records saved!", { id: toastId });
      setPendingRecords([]);
      navigate("/manufacturer/view-factory-loft-leaf"); 
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
        <div className="mt-4 mb-8 bg-white dark:bg-zinc-900/50 p-4 rounded-xl shadow-sm border border-lime-200 dark:border-zinc-800">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                {icon} Pending {title} ({filteredRecords.length})
            </h4>
            
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400 min-w-[600px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-zinc-800 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Route</th>
                    {sampleType === 'LeafCollector' && <th className="px-4 py-3">Collector Name</th>}
                    {sampleType === 'Factory' && (
                        <>
                            <th className="px-4 py-3 text-center">Time</th>
                            <th className="px-4 py-3 text-center">Total (Kg)</th>
                        </>
                    )}
                    <th className="px-4 py-3 text-center">Best (g)</th>
                    <th className="px-4 py-3 text-center">Below Best (g)</th>
                    <th className="px-4 py-3 text-center">Poor (g)</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item) => {
                      const isEditing = editingId === item.id;
                      const data = isEditing ? editFormData : item;
                      return (
                      <tr key={item.id} className="bg-white border-b dark:bg-zinc-900 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{data.route.toUpperCase()}</td>
                        
                        {sampleType === 'LeafCollector' && (
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                {isEditing ? (
                                    <input type="text" name="leafCollectorName" value={data.leafCollectorName || ''} onChange={handleEditChange} className="w-full p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded outline-none focus:ring-1 focus:ring-lime-500" />
                                ) : (
                                    <span>{data.leafCollectorName || '-'}</span>
                                )}
                            </td>
                        )}

                        {sampleType === 'Factory' && (
                            <>
                                <td className="px-4 py-3 text-center">
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            name="arrivalTime" 
                                            value={data.arrivalTime || ''} 
                                            onChange={handleEditChange} 
                                            placeholder="08:30 PM"
                                            className="w-20 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-lime-500 font-mono text-xs" 
                                        />
                                    ) : (
                                        <span className="font-mono text-xs">{data.arrivalTime || '-'}</span>
                                    )}
                                </td>                                
                                <td className="px-4 py-3 text-center">
                                    {isEditing ? (
                                        <input type="number" name="totalLeafQty" value={data.totalLeafQty || ''} onChange={handleEditChange} className="w-20 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-lime-500" />
                                    ) : (
                                        <span className="font-bold text-lime-700 dark:text-lime-400">{data.totalLeafQty ? `${data.totalLeafQty} Kg` : '-'}</span>
                                    )}
                                </td>
                            </>
                        )}
                        <td className="px-4 py-3 text-center">
                            {isEditing ? <input type="number" name="bestQty" value={data.bestQty} onChange={handleEditChange} className="w-16 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-lime-500" /> : <span className="text-green-600 font-bold">{data.bestQty}g</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                            {isEditing ? <input type="number" name="belowBestQty" value={data.belowBestQty} onChange={handleEditChange} className="w-16 p-1 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded text-center outline-none focus:ring-1 focus:ring-lime-500" /> : <span className="text-yellow-600 font-bold">{data.belowBestQty}g</span>}
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
                                    <button type="button" onClick={() => handleEditClick(item.id)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                                    <button type="button" onClick={() => handleRemoveFromList(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
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
        <div className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans min-h-screen transition-colors duration-300 relative">     
      {/* 1. HEADING SECTION */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3f6212] dark:text-lime-500 flex items-center gap-2">
            <Leaf size={24} /> {t.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.subtitle}
          </p>
        </div>
        <button
            onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 rounded-lg transition-colors shadow-sm font-bold text-sm flex items-center gap-2"
        >
            <Languages size={18} />
            {lang === 'EN' ? "සිංහල" : "English"}
        </button>
      </div>

      {/* 2. DATE SELECTOR SECTION */}
      <div className="mb-8">
        <div className="inline-block bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border-l-4 border-l-[#84cc16] border border-gray-100 dark:border-zinc-800">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Select Date
            </label>
            <div className="relative">
                <Calendar size={18} className="absolute left-3 top-2.5 text-[#65a30d]" />
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#84cc16] outline-none bg-gray-50 dark:bg-zinc-800 text-[#3f6212] dark:text-lime-400 cursor-pointer transition-all shadow-inner"
                />
            </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* FACTORY SAMPLE SECTION */}
        <div>
            <form onSubmit={(e) => handleAddToList(e, 'factory')} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border-t-4 border-t-[#84cc16] border border-gray-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-[#3f6212] dark:text-lime-500 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Factory size={20} /> {t.facSampleEntry}
            </h3>

            {/* 💡 SUPERVISOR NAME (GLOBAL FOR FACTORY) */}
            <div className="mb-6 bg-lime-50/50 dark:bg-lime-900/10 p-4 rounded-xl border border-lime-100 dark:border-lime-900/50 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="text-sm font-bold text-lime-800 dark:text-lime-400 min-w-max flex items-center gap-2">
                    <UserCheck size={16} /> {t.supervisorName}:
                </label>
                <input 
                    type="text" 
                    value={supervisorName} 
                    onChange={(e) => setSupervisorName(e.target.value)} 
                    className="w-full max-w-sm p-2 border border-gray-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-lime-500 bg-white dark:bg-zinc-950 font-bold text-gray-700 dark:text-gray-300"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Route */}
                <div className="relative" ref={factoryRouteDropdownRef}>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Tag size={12} /> {t.route}</label>
                    <input type="text" id="fac-route" placeholder="Select route..." name="route" value={factoryForm.route} onChange={(e) => { handleInputChange(e, 'factory'); setIsFactoryRouteDropdownOpen(true); }} onFocus={() => setIsFactoryRouteDropdownOpen(true)} onKeyDown={handleFacRouteKeyDown} required className="w-full p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950 placeholder-gray-400/70 dark:placeholder-zinc-600" />
                    <AnimatePresence>
                        {isFactoryRouteDropdownOpen && filteredFactoryRoutes.length > 0 && (
                        <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {filteredFactoryRoutes.map((r, idx) => (
                            <li key={r} id={`fac-route-opt-${idx}`} onClick={() => { setFactoryForm((p) => ({ ...p, route: r })); setIsFactoryRouteDropdownOpen(false); focusNext('fac-arrivalTime'); }} className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-lime-50 dark:hover:bg-zinc-800 ${focusedFacRouteIdx === idx ? "bg-lime-100 dark:bg-zinc-800" : ""}`}>
                                {r.toUpperCase()}
                            </li>
                            ))}
                        </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Arrival Time */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Clock size={12} /> {t.arrTime}</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            id="fac-arrivalTime" 
                            name="arrivalTime" 
                            placeholder="08:30"
                            maxLength="5"
                            value={factoryForm.arrivalTime} 
                            onChange={(e) => {
                                const formattedTime = formatTime12Hour(e.target.value);
                                setFactoryForm(prev => ({ ...prev, arrivalTime: formattedTime }));
                            }} 
                            onKeyDown={(e) => handleEnterKey(e, 'fac-totalQty')} 
                            className="placeholder-gray-400/70 dark:placeholder-zinc-600 w-full p-2.5 text-center border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950" 
                        />
                        <select
                            name="arrivalAmPm"
                            value={factoryForm.arrivalAmPm}
                            onChange={(e) => handleInputChange(e, 'factory')}
                            className="w-20 p-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg font-bold focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950 text-center"
                        >
                            <option value="PM">PM</option>
                            <option value="AM">AM</option>
                        </select>
                    </div>
                </div>

                {/* Total Leaf Qty */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Weight size={12} /> {t.totalKg}</label>
                    <input type="number" id="fac-totalQty" name="totalLeafQty" placeholder="e.g. 250" value={factoryForm.totalLeafQty} onChange={(e) => handleInputChange(e, 'factory')} onKeyDown={(e) => handleEnterKey(e, 'fac-bestQty')} required min="0" step="any" className="w-full p-2.5 placeholder-gray-400/70 dark:placeholder-zinc-600 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                    <label className="block text-xs font-bold text-green-700 mb-2 uppercase">{t.bestG}</label>
                    <input type="number" id="fac-bestQty" name="bestQty" onWheel={(e) => e.target.blur()} value={factoryForm.bestQty} onChange={(e) => handleInputChange(e, 'factory')} onKeyDown={(e) => handleEnterKey(e, 'fac-belowBestQty')} required className="w-full p-2.5 mb-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                    <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg font-bold text-green-800 justify-center shadow-inner">{factoryStats.bPct}%</div>
                </div>

                <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                    <label className="block text-xs font-bold text-yellow-700 mb-2 uppercase">{t.belowBestG}</label>
                    <input type="number" id="fac-belowBestQty" name="belowBestQty" onWheel={(e) => e.target.blur()} value={factoryForm.belowBestQty} onChange={(e) => handleInputChange(e, 'factory')} onKeyDown={(e) => handleEnterKey(e, 'fac-submitBtn')} required className="w-full p-2.5 mb-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white dark:bg-zinc-800" />
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg font-bold text-yellow-800 justify-center shadow-inner">{factoryStats.bbPct}%</div>
                </div>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <label className="block text-xs font-bold text-red-700 mb-2 uppercase">{t.poorG}</label>
                    <input type="number" value={factoryStats.p} disabled className="w-full p-2.5 mb-3 border border-red-200 dark:border-red-900/50 rounded-lg bg-gray-100 dark:bg-zinc-800/80 font-bold text-red-700 dark:text-red-500 cursor-not-allowed outline-none" />
                    <div className="flex items-center gap-1 bg-red-100 px-3 py-2 rounded-lg font-bold text-red-800 justify-center shadow-inner">{factoryStats.pPct}%</div>
                </div>
                
            </div>
            
            <p className="text-xs text-gray-500 mt-3 italic">{t.autoCalcNote}</p>

            <button type="submit" id="fac-submitBtn" className="mt-6 w-full py-3 rounded-xl bg-[#3f6212] text-white font-bold hover:bg-[#4d7c0f] transition-all shadow-md flex items-center justify-center gap-2">
                <PlusCircle size={18} /> {t.addFac}
            </button>
            </form>

            <PendingTable sampleType="Factory" title="Factory Entries" icon={<Factory size={16}/>} />
        </div>

        {/* COLLECTOR SAMPLE SECTION */}
        <div>
            <form onSubmit={(e) => handleAddToList(e, 'collector')} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border-t-4 border-t-[#65a30d] border border-gray-100 dark:border-zinc-800 mt-8">
            <h3 className="text-lg font-bold text-[#65a30d] dark:text-lime-500 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                <Users size={20} /> {t.colSampleEntry}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative" ref={collectorRouteDropdownRef}>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Tag size={12} /> {t.route}
                </label>
                <input
                    type="text"
                    id="col-route"
                    placeholder="Select route..."
                    name="route"
                    value={collectorForm.route}
                    onChange={(e) => handleInputChange(e, 'collector')}
                    onFocus={() => setIsCollectorRouteDropdownOpen(true)}
                    onKeyDown={handleColRouteKeyDown}
                    required
                    className="w-full placeholder-gray-400/70 dark:placeholder-zinc-600 p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950"
                />
                <AnimatePresence>
                    {isCollectorRouteDropdownOpen && filteredCollectorRoutes.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                    >
                        {filteredCollectorRoutes.map((r, idx) => (
                        <li
                            key={r}
                            id={`col-route-opt-${idx}`}
                            onClick={() => {
                                const routeCode = r.split('-')[0].trim().toUpperCase();
                                setCollectorForm((p) => ({ 
                                    ...p, 
                                    route: r,
                                    collectorName: collectorNameMapping[routeCode] || "" 
                                }));
                                setLastAutoFilledRoute(routeCode);
                                setIsCollectorRouteDropdownOpen(false);
                                setTimeout(() => focusNext('col-name'), 50); 
                            }}
                            className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-lime-50 dark:hover:bg-zinc-800 ${focusedColRouteIdx === idx ? "bg-lime-100 dark:bg-zinc-800" : ""}`}
                        >
                            {r.toUpperCase()}
                        </li>
                        ))}
                    </motion.ul>
                    )}
                </AnimatePresence>
                </div>

                {/* 💡 Leaf Collector Name Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                        <User size={12} /> {t.collectorName}
                    </label>
                    <input
                        type="text"
                        id="col-name"
                        name="collectorName"
                        placeholder="Enter collector name..."
                        value={collectorForm.collectorName}
                        onChange={(e) => handleInputChange(e, 'collector')}
                        onKeyDown={(e) => handleEnterKey(e, 'col-bestQty')}
                        className="w-full placeholder-gray-400/70 dark:placeholder-zinc-600 p-2.5 pl-4 border border-gray-200 dark:border-zinc-700 rounded-lg font-medium focus:ring-2 focus:ring-lime-500 outline-none bg-gray-50 dark:bg-zinc-950"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                    <label className="block text-xs font-bold text-green-700 mb-2 uppercase">{t.bestG}</label>
                    <input type="number" id="col-bestQty" name="bestQty" value={collectorForm.bestQty} onChange={(e) => handleInputChange(e, 'collector')} onWheel={(e) => e.target.blur()} onKeyDown={(e) => handleEnterKey(e, 'col-belowBestQty')} required className="w-full p-2.5 mb-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none" />
                    <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg font-bold text-green-800 justify-center shadow-inner">{collectorStats.bPct}%</div>
                </div>

                <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                    <label className="block text-xs font-bold text-yellow-700 mb-2 uppercase">{t.belowBestG}</label>
                    <input type="number" id="col-belowBestQty" name="belowBestQty" value={collectorForm.belowBestQty} onChange={(e) => handleInputChange(e, 'collector')} onWheel={(e) => e.target.blur()} onKeyDown={(e) => handleEnterKey(e, 'col-submitBtn')} required className="w-full p-2.5 mb-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white dark:bg-zinc-800" />
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg font-bold text-yellow-800 justify-center shadow-inner">{collectorStats.bbPct}%</div>
                </div>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <label className="block text-xs font-bold text-red-700 mb-2 uppercase">{t.poorG}</label>
                    <input type="number" value={collectorStats.p} disabled className="w-full p-2.5 mb-3 border border-red-200 dark:border-red-900/50 rounded-lg bg-gray-100 dark:bg-zinc-800/80 font-bold text-red-700 dark:text-red-500 cursor-not-allowed outline-none" />
                    <div className="flex items-center gap-1 bg-red-100 px-3 py-2 rounded-lg font-bold text-red-800 justify-center shadow-inner">{collectorStats.pPct}%</div>
                </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3 italic">{t.autoCalcNote}</p>

            <button type="submit" id="col-submitBtn" className="mt-6 w-full py-3 rounded-xl bg-[#65a30d] text-white font-bold hover:bg-[#4d7c0f] transition-all shadow-md flex items-center justify-center gap-2">
                <PlusCircle size={18} /> {t.addCol}
            </button>
            </form>

            <PendingTable sampleType="LeafCollector" title="Collector Entries" icon={<Users size={16}/>} />
        </div>
      </div>

      {pendingRecords.length > 0 && (
          <div className="mt-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-lime-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-gray-700 dark:text-gray-300 font-bold text-lg">
                  Total Pending: <span className="text-[#65a30d]">{pendingRecords.length} Records</span>
              </div>
              <button
                  onClick={handleSaveAll}
                  disabled={isSaving || editingId !== null}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#84cc16] hover:bg-[#65a30d] text-white font-bold disabled:bg-gray-400 transition-all shadow-md flex items-center justify-center gap-2"
              >
                  <Save size={20} />
                  {isSaving ? "Saving to Database..." : "Save All to Database"}
              </button>
          </div>
      )}
    </div>
  );
}