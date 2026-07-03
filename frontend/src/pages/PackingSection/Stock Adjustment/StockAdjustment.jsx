import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from 'react-hot-toast';
import {
  Settings2,
  ArrowDownCircle,
  ArrowUpCircle,
  Package,
  Leaf,
  Search,
  ShieldAlert,
  Calendar,
  ListChecks,
  Save,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const THEME = {
  pageBg: "#f9fbfb",
  textPrimary: "#0d5e4d",
  textSecondary: "#0f766e",
  accent: "#0d9488",
  btnGradient: "linear-gradient(135deg,#163d2e 0%,#0d5e4d 45%,#0f766e 100%)",
  dangerGradient: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 45%,#b91c1c 100%)",
};

export default function StockAdjustment() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // UI States
  const [activeTab, setActiveTab] = useState("tea");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Pending List States (NEW)
  const [pendingRecords, setPendingRecords] = useState([]);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Data States
  const [teaStocks, setTeaStocks] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Form States
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedItem, setSelectedItem] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStockData();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [teaRes, rawRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/packing-stock`, { headers }),
        fetch(`${BACKEND_URL}/api/raw-materials-in/stock`, { headers }), // Make sure this endpoint is correct
      ]);

      if (teaRes.ok) {
        const teaData = await teaRes.json();
        setTeaStocks(Array.isArray(teaData) ? teaData : teaData.data || []);
      }
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        setRawMaterials(Array.isArray(rawData) ? rawData : rawData.data || []);
      }
    } catch (error) {
      toast.error("Failed to load stock data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items for the custom dropdown
  const filteredItems = useMemo(() => {
    if (activeTab === "tea") {
      return teaStocks
        .filter((item) => {
          const name = item.productName || item.name || "";
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .map((item) => ({
          name: item.productName || item.name || "Unknown Tea",
          category: "Tea Stock",
          colorClass: "bg-[#bbf7d0]",
        }));
    } else {
      return rawMaterials
        .filter((item) => {
          const name = item.materialName || item.itemName || item.name || "";
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .map((item) => {
          const name =
            item.materialName ||
            item.itemName ||
            item.name ||
            "Unknown Material";
          const isFlavor = (item.category || "").toLowerCase() === "flavor";
          return {
            name: name,
            category: isFlavor ? "Spicy (Flavor)" : "Packing Material",
            colorClass: isFlavor ? "bg-blue-300" : "bg-[#fed7aa]",
          };
        })
        .sort((a, b) => a.category.localeCompare(b.category));
    }
  }, [activeTab, teaStocks, rawMaterials, searchQuery]);

  // Calculate Overall Current Stock
  const currentStockInfo = useMemo(() => {
    if (!selectedItem) return null;

    if (activeTab === "tea") {
      const tea = teaStocks.find(
        (t) => (t.productName || t.name) === selectedItem,
      );
      if (!tea) return null;
      return {
        name: tea.productName || tea.name,
        qty: tea.totalBulkStockKg,
        unit: "kg",
      };
    } else {
      const raw = rawMaterials.find(
        (r) => (r.materialName || r.itemName || r.name) === selectedItem,
      );
      if (!raw) return null;
      return {
        name: raw.materialName || raw.itemName || raw.name,
        qty: raw.totalQuantity,
        unit: raw.unit || "units",
      };
    }
  }, [selectedItem, activeTab, teaStocks, rawMaterials]);

  // --- NEW: Add to Pending List ---
  const handleAddToList = (e) => {
    e.preventDefault();

    if (!selectedItem || !amount || Number(amount) <= 0) {
      toast.error("Please fill all fields with valid amounts.");
      return;
    }

    // Calculate effective stock based on DB stock + already pending items
    let pendingEffect = 0;
    pendingRecords.forEach((record) => {
      if (record.itemName === selectedItem) {
        if (record.action === "add") pendingEffect += record.amount;
        if (record.action === "remove") pendingEffect -= record.amount;
      }
    });

    const trueAvailableStock =
      (currentStockInfo ? currentStockInfo.qty : 0) + pendingEffect;

    if (adjustmentType === "remove" && Number(amount) > trueAvailableStock) {
      toast.error(
        "Cannot issue more than the available stock (including pending items)!",
      );
      return;
    }

    const newRecord = {
      id: Date.now(),
      date,
      itemType: activeTab,
      itemName: selectedItem,
      action: adjustmentType,
      amount: Number(amount),
      reason,
      unit: currentStockInfo?.unit || (activeTab === "tea" ? "kg" : "units"),
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success("Adjustment added to pending list!");

    // Reset fields
    setAmount("");
    setReason("");
    setSelectedItem("");
    setSearchQuery("");
  };

  const handleRemoveFromList = (idToRemove) => {
    setPendingRecords(
      pendingRecords.filter((record) => record.id !== idToRemove),
    );
  };

  // --- NEW: Save All to Database ---
  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) {
      toast.error("No records in the list to save!");
      return;
    }

    setIsSavingAll(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

    try {
      const token = localStorage.getItem("token");

      // We use Promise.all to send all pending records to the backend
      const promises = pendingRecords.map((record) => {
        const payload = {
          date: record.date,
          itemType: record.itemType,
          itemName: record.itemName,
          action: record.action,
          amount: record.amount,
          reason: record.reason,
        };

        return fetch(`${BACKEND_URL}/api/stock-adjustment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Failed to save record");
          }
          return res.json();
        });
      });

      await Promise.all(promises);

      toast.success("All stock adjustments saved successfully!", {
        id: toastId,
      });
      setPendingRecords([]);
      fetchStockData(); // Refresh actual stock

      // Navigate to History page
      setTimeout(() => {
        navigate("/packing/stock-adjustment-view");
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Error saving some records. Please check the history.", {
        id: toastId,
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const inputStyles =
    "w-full p-3.5 bg-gray-50 border border-teal-200 rounded-xl font-medium text-gray-700 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all";

  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 relative"
      style={{ backgroundColor: THEME.pageBg }}
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-white border-teal-200 text-[#0d5e4d]">
              <Settings2 size={25} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0d5e4d]">
                Stock Adjustments
              </h2>
              <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-[#0f766e]">
                Correct & Balance Inventory
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/packing/stock-adjustment-view")}
            className="px-5 py-2.5 bg-white text-[#0f766e] border border-teal-200 rounded-lg font-bold hover:bg-teal-50 shadow-sm transition-colors"
          >
            View History
          </button>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- LEFT SIDE: FORM --- */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              {/* TABS */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === "tea" ? "bg-green-500 text-white border-b-2 border-green-700" : "text-gray-500 hover:bg-gray-100"}`}
                  onClick={() => {
                    setActiveTab("tea");
                    setSelectedItem("");
                    setSearchQuery("");
                  }}
                >
                  <Leaf size={18} /> Tea Stock
                </button>
                <button
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === "raw" ? "bg-blue-500 text-white border-b-2 border-blue-800" : "text-gray-500 hover:bg-gray-100"}`}
                  onClick={() => {
                    setActiveTab("raw");
                    setSelectedItem("");
                    setSearchQuery("");
                  }}
                >
                  <Package size={18} /> Raw Materials
                </button>
              </div>

              <div className="p-6 md:p-8">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-700 rounded-full animate-spin mb-4"></div>
                    Loading Inventory Data...
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddToList}
                    className="space-y-6 bg-teal-50/40 p-6 rounded-2xl border border-teal-100"
                  >
                    {/* 1. DATE SELECTION */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Adjustment Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className={`${inputStyles} md:w-1/2`}
                      />
                    </div>

                    {/* 2. CUSTOM SEARCHABLE DROPDOWN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative" ref={dropdownRef}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Select{" "}
                          {activeTab === "tea" ? "Tea Product" : "Material"}
                        </label>

                        <div
                          className={`${inputStyles} flex items-center justify-between cursor-text bg-white`}
                          onClick={() => setIsDropdownOpen(true)}
                        >
                          <input
                            type="text"
                            className="w-full bg-transparent outline-none cursor-text placeholder-gray-400"
                            placeholder="Select..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setIsDropdownOpen(true);
                              if (
                                selectedItem &&
                                e.target.value !== selectedItem
                              )
                                setSelectedItem("");
                            }}
                          />
                        </div>

                        {/* Dropdown Options */}
                        {isDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-2 custom-scrollbar">
                            {filteredItems.length > 0 ? (
                              filteredItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="px-4 py-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition-colors border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    setSelectedItem(item.name);
                                    setSearchQuery(item.name);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-2.5 h-2.5 rounded-full ${item.colorClass}`}
                                    ></div>
                                    <span className="text-gray-700 font-semibold">
                                      {item.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                      item.category.includes("Spicy")
                                        ? "bg-blue-100 text-blue-800"
                                        : item.category.includes("Packing")
                                          ? "bg-orange-100 text-orange-800"
                                          : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {item.category}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-gray-400 text-sm italic">
                                No items found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. CURRENT STOCK DISPLAY */}
                    {currentStockInfo && (
                      <div className="bg-white border border-[#99f6e4] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-50 rounded-lg text-[#0d5e4d]">
                            <Search size={20} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                              DB Available Stock
                            </p>
                            <p className="font-bold text-gray-800 text-sm">
                              {currentStockInfo.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <h3 className="text-2xl font-black text-[#0d5e4d]">
                            {currentStockInfo.qty.toFixed(2)}{" "}
                            <span className="text-sm">
                              {currentStockInfo.unit}
                            </span>
                          </h3>
                        </div>
                      </div>
                    )}

                    {/* 4. ACTION TYPE */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Adjustment Action
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label
                          className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${adjustmentType === "add" ? "border-[#0d5e4d] bg-[#f0fdfa]" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        >
                          <input
                            type="radio"
                            name="action"
                            value="add"
                            checked={adjustmentType === "add"}
                            onChange={() => setAdjustmentType("add")}
                            className="hidden"
                          />
                          <ArrowDownCircle
                            size={24}
                            className={
                              adjustmentType === "add"
                                ? "text-[#0d5e4d]"
                                : "text-gray-400"
                            }
                          />
                          <div>
                            <p
                              className={`font-bold ${adjustmentType === "add" ? "text-[#0d5e4d]" : "text-gray-600"}`}
                            >
                              Trans In (Add)
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold">
                              Increase stock level
                            </p>
                          </div>
                        </label>

                        <label
                          className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${adjustmentType === "remove" ? "border-red-600 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        >
                          <input
                            type="radio"
                            name="action"
                            value="remove"
                            checked={adjustmentType === "remove"}
                            onChange={() => setAdjustmentType("remove")}
                            className="hidden"
                          />
                          <ArrowUpCircle
                            size={24}
                            className={
                              adjustmentType === "remove"
                                ? "text-red-600"
                                : "text-gray-400"
                            }
                          />
                          <div>
                            <p
                              className={`font-bold ${adjustmentType === "remove" ? "text-red-600" : "text-gray-600"}`}
                            >
                              Issue (Remove)
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold">
                              Decrease stock level
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 5. AMOUNT & REASON */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Adjustment Amount
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          onWheel={(e) => e.target.blur()} // 👈 මේ කොටස එකතු කරන්න
                          required
                          placeholder="Enter amount..."
                          className={inputStyles}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Reason (Optional)
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Enter reason..."
                          className={`${inputStyles} resize-none`}
                          rows="2"
                        ></textarea>
                      </div>
                    </div>

                    {adjustmentType === "remove" && (
                      <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm font-semibold">
                        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                        <p>
                          Ensure the amount is correct to avoid negative overall
                          stock.
                        </p>
                      </div>
                    )}

                    {/* SUBMIT */}
                    <button
                      type="submit"
                      disabled={!selectedItem}
                      className="w-full py-4 rounded-2xl text-[#0f766e] font-black text-lg border border-[#0d9488] bg-white hover:bg-teal-50 flex justify-center items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Add to Pending List
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT SIDE: PENDING LIST & SUMMARY --- */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-sm border border-teal-200 overflow-hidden flex flex-col max-h-[70vh] transition-colors duration-300">
              <div className="bg-teal-50 flex items-center justify-between p-5 border-b border-teal-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg text-[#0f766e] shadow-sm">
                    <ListChecks size={20} />
                  </div>
                  <h3 className="font-bold text-[#0d5e4d] text-lg">
                    Pending List
                  </h3>
                </div>
                <span className="bg-[#0f766e] text-white text-xs font-bold px-3 py-1 rounded-full shadow-inner">
                  {pendingRecords.length} Items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
                {pendingRecords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                    <ListChecks size={40} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">List is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 border border-gray-200 rounded-xl bg-white relative group shadow-sm hover:border-[#2dd4bf] transition-colors"
                      >
                        <button
                          onClick={() => handleRemoveFromList(record.id)}
                          className="absolute top-2 right-2 text-gray-300 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${record.itemType === "tea" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                          >
                            {record.itemType}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {record.date}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-800 text-sm mb-2 pr-6">
                          {record.itemName}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          {record.action === "add" ? (
                            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md flex items-center gap-1">
                              <ArrowDownCircle size={12} /> Add
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1">
                              <ArrowUpCircle size={12} /> Issue
                            </span>
                          )}
                          <span
                            className={`font-black ${record.action === "add" ? "text-teal-600" : "text-red-600"}`}
                          >
                            {record.action === "add" ? "+" : "-"}
                            {record.amount}{" "}
                            <span className="text-[10px] text-gray-400">
                              {record.unit}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-200">
                <button
                  onClick={handleSaveAll}
                  disabled={isSavingAll || pendingRecords.length === 0}
                  className={`w-full py-3.5 rounded-xl text-white text-base uppercase tracking-wider font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${isSavingAll || pendingRecords.length === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#0f766e] to-[#0d9488] hover:-translate-y-0.5 hover:shadow-teal-500/30"}`}
                >
                  <Save size={20} />{" "}
                  {isSavingAll ? "Saving..." : "Save All Records"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
