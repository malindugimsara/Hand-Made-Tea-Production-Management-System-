import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Leaf, PlusCircle, Trash2, Tag, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function LoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const currentUsername = localStorage.getItem("username") || "Unknown";
  // Local Timezone (Sri Lanka)
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
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const routeDropdownRef = useRef(null);

  

  const [formData, setFormData] = useState({
    date: today,
    route: "",
    bestQty: "",
    belowBestQty: "",
  });

  useEffect(() => {
    fetchRecords();
    function handleClickOutside(event) {
      if (
        routeDropdownRef.current &&
        !routeDropdownRef.current.contains(event.target)
      ) {
        setIsRouteDropdownOpen(false);
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

  const b = Number(formData.bestQty) || 0;
  const bb = Number(formData.belowBestQty) || 0;
  const p = Math.max(0, 100 - (b + bb));
  const totalQty = b + bb + p;

  // Percentage calculations for display
  const bPct = totalQty > 0 ? ((b / totalQty) * 100).toFixed(0) : 0;
  const bbPct = totalQty > 0 ? ((bb / totalQty) * 100).toFixed(0) : 0;
  const pPct = totalQty > 0 ? ((p / totalQty) * 100).toFixed(0) : 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const val = Number(value) || 0;
    if (name === "bestQty" && val + bb > 100) return;
    if (name === "belowBestQty" && val + b > 100) return;
    if (value < 0) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isTodaySaved = isDataLoaded && records.some((r) => {
      if (!r.date) return false;
      return r.date.split("T")[0] === today;
  });
  
  const handleAddToList = (e) => {
    e.preventDefault();
    if (!formData.route || totalQty === 0) {
      toast.error("Please fill Route and quantities!");
      return;
    }
    const newRecord = {
      ...formData,
      bestQty: b,
      belowBestQty: bb,
      poorQty: p,
      totalQty,
    };
    setPendingRecords([...pendingRecords, newRecord]);
    setFormData((prev) => ({
      ...prev,
      route: "",
      bestQty: "",
      belowBestQty: "",
    }));
    toast.success("Added to list!");
  };

  const handleRemoveFromList = (index) => {
    setPendingRecords(pendingRecords.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) return;
    setIsSaving(true);
    const toastId = toast.loading("Saving records...");
    try {
      const token = localStorage.getItem("token");
      const promises = pendingRecords.map((record) =>
        fetch(`${BACKEND_URL}/api/loft-leaf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...record, updatedBy: currentUsername }),
        }).then((res) => {
          if (!res.ok) throw new Error();
        }),
      );
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

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto font-sans min-h-screen transition-colors duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM SECTION */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
              <Leaf size={24} /> Add Loft Leaf Count
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter daily best, below best & poor leaf quantities.
            </p>
          </div>

          <form
            onSubmit={handleAddToList}
            className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-green-100 dark:border-zinc-800"
          >
            <h3 className="text-lg font-bold text-[#1B6A31] dark:text-green-400 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
              <PlusCircle size={20} /> Daily Entry
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center gap-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={today}
                    disabled
                    className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-950 cursor-not-allowed"
                  />
                </div>
                <div className="relative" ref={routeDropdownRef}>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Tag size={12} /> Route
                  </label>
                  <input
                    type="text"
                    placeholder="Select route..."
                    value={formData.route}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, route: e.target.value }))
                    }
                    onFocus={() => setIsRouteDropdownOpen(true)}
                    required
                    className="w-full p-3 pl-4 border border-gray-200 dark:border-zinc-700 rounded-xl font-medium focus:ring-2 focus:ring-teal-500/50 outline-none transition-colors shadow-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                  <AnimatePresence>
                    {isRouteDropdownOpen && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"
                      >
                        {[
                          "C1 - MATHTHAKA",
                          "C2 - walallawita",
                          "C3 - pelawaththa",
                          "C4 - polgampala",
                          "C5 - manampita",
                          "C7 - ganegoda",
                          "C8 - thundola",
                          "FA - factory",
                          "E - estate tea",
                        ].map((r) => (
                          <li
                            key={r}
                            onClick={() => {
                              setFormData((p) => ({ ...p, route: r }));
                              setIsRouteDropdownOpen(false);
                            }}
                            className="px-4 py-2.5 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                          >
                            {r.toUpperCase()}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                  <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-2">
                    Best (g)
                  </label>
                  <input
                    type="number"
                    name="bestQty"
                    value={formData.bestQty}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 mb-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-[#8CC63F] outline-none bg-white dark:bg-zinc-950"
                  />
                  <div className="flex items-center gap-1 bg-green-100 px-3 py-2 rounded-lg font-bold text-green-800 justify-center shadow-inner">
                    {bPct}%
                  </div>
                </div>
                <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                  <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-2">
                    <span className="uppercase">Below Best</span> (g)
                  </label>
                  <input
                    type="number"
                    name="belowBestQty"
                    value={formData.belowBestQty}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 mb-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none bg-white dark:bg-zinc-950"
                  />
                  <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg font-bold text-yellow-800 justify-center shadow-inner">
                    {bbPct}%
                  </div>
                </div>
                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                  <label className="block text-xs font-bold text-red-700 dark:text-red-400 mb-2">
                    <span className="uppercase">Poor Leaf</span> (g)
                  </label>
                  <input
                    type="number"
                    value={p}
                    disabled
                    className="w-full p-2.5 mb-3 border border-red-200 rounded-lg bg-gray-100 font-bold text-red-700"
                  />
                  <div className="flex items-center gap-1 bg-red-100 px-3 py-2 rounded-lg font-bold text-red-800 justify-center shadow-inner">
                    {pPct}%
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#1B6A31] text-white font-bold hover:bg-green-800 transition-all"
              >
                Add to List
              </button>
            </div>
          </form>
        </div>

        {/* PENDING LIST SECTION */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg h-full flex flex-col">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ListChecks size={20} /> Pending ({pendingRecords.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              {pendingRecords.map((item, i) => (
                <div
                  key={i}
                  className="p-4 border rounded-xl bg-gray-50 dark:bg-zinc-800 relative"
                >
                  <button
                    onClick={() => handleRemoveFromList(i)}
                    className="absolute top-3 right-3 text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="mb-2">
                    <span className="font-black">
                      {item.route.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
                    <div className="bg-green-100 py-1 rounded">
                      {item.bestQty}g
                    </div>
                    <div className="bg-yellow-100 py-1 rounded">
                      {item.belowBestQty}g
                    </div>
                    <div className="bg-red-100 py-1 rounded">
                      {item.poorQty}g
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveAll}
              disabled={
                isSaving ||
                pendingRecords.length === 0 ||
                isTodaySaved ||
                !isDataLoaded
              }
              className="mt-4 w-full py-4 rounded-xl bg-teal-600 text-white font-bold disabled:bg-gray-400"
            >
              {isTodaySaved
                ? "Already Saved Today"
                : isSaving
                  ? "Saving..."
                  : "Save All Records"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}