import React, { useState, useEffect } from "react";
import toast from "react-hot-toast"; // Removed { Toaster } from import
import {
  Calendar,
  Save,
  Trash2,
  Edit,
  Factory,
  Leaf,
  Package,
  RefreshCcw,
  PlusCircle,
  ArrowLeft,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────
// NEW THEME — Teal / Dark Green
// ─────────────────────────────────────────────
const THEME = {
  pageBg: "#f3faf7",
  textPrimary: "#0d5e4d",
  textSecondary: "#0f766e",
  accent: "#0d9488",
  btnGradient: "linear-gradient(135deg,#163d2e 0%,#0d5e4d 45%,#0f766e 100%)",
  badgeBorder: "#99f6e4",
  badgeBg: "#f0fdfa",
  badgeText: "#0d5e4d",
};

export default function FactoryManagement() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [records, setRecords] = useState([]);
  const [bfBalance, setBfBalance] = useState(0);
  const [existingDates, setExistingDates] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    greenLeafToday: "",
    dispatch: "",
    localSaleAndGratis: "",
    returnAmount: "",
  });

  const username = localStorage.getItem("username") || "Unknown User";
  const userRole = localStorage.getItem("userRole") || "";
  const isViewer =
    userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";

  // Real-time calculations for the form
  const calculatedMadeTea = (Number(formData.greenLeafToday) || 0) * 0.215;
  const calculatedTotalOut =
    (Number(formData.dispatch) || 0) +
    (Number(formData.localSaleAndGratis) || 0);

  // Fetch existing records to get balance and prevent duplicate dates
  const fetchFactoryData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const fetchedRecords = data.records || [];
        setBfBalance(data.bfFromLastMonth || 0);
        setRecords(fetchedRecords);
        setExistingDates(fetchedRecords.map((r) => r.date.split("T")[0]));
      } else {
        toast.error("Failed to load factory data.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsLoading(false);
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

  // --- Add to Pending Queue ---
  const handleAddToList = (e) => {
    e.preventDefault();

    if (isViewer) {
      toast.error("Viewers cannot add records.");
      return;
    }

    if (existingDates.includes(formData.date)) {
      toast.error(
        `A record for ${formData.date} already exists in the database!`,
      );
      return;
    }

    const isAlreadyInQueue = pendingRecords.some(
      (r) => r.date === formData.date,
    );
    if (isAlreadyInQueue) {
      toast.error(
        `A record for ${formData.date} is already in the pending list!`,
      );
      return;
    }

    // 🌟 අලුත් Validation එක මෙතනින් එකතු කරන්න
    // 1. දැනට Database එකේ තියෙන අන්තිම Balance එක ගන්න
    let lastKnownBalance = bfBalance;
    if (records.length > 0) {
      lastKnownBalance = records[records.length - 1].factoryBalance;
    }

    // 2. දැනට Pending List එකේ තියෙන ඒවගෙන් Balance එකට වෙන බලපෑම එකතු කරන්න
    const pendingListNetBalance = pendingRecords.reduce((acc, curr) => {
      return (
        acc +
        curr.calculatedMadeTea +
        Number(curr.returnAmount || 0) -
        curr.calculatedTotalOut
      );
    }, 0);

    // 3. දැනට අතේ තියෙන ඇත්තම Balance එක
    const availableBalance = lastKnownBalance + pendingListNetBalance;

    // 4. දැන් ගහපු ෆෝම් එකේ අගයන් එක්ක Balance එක ඍණ (Negative) වෙනවද බලන්න
    const expectedFutureBalance =
      availableBalance +
      calculatedMadeTea +
      Number(formData.returnAmount || 0) -
      calculatedTotalOut;

    if (expectedFutureBalance < 0) {
      toast.error(
        `Error: Total Out (${calculatedTotalOut.toFixed(2)} kg) exceeds available Factory Balance!`,
      );
      return; // මෙතනින් නවතිනවා, පෝලිමට එකතු වෙන්නේ නෑ
    }
    // 🌟 Validation එක ඉවරයි

    const newRecord = {
      ...formData,
      calculatedMadeTea,
      calculatedTotalOut,
    };

    setPendingRecords([...pendingRecords, newRecord]);
    toast.success("Added to list!");

    setFormData({
      ...formData,
      greenLeafToday: "",
      dispatch: "",
      localSaleAndGratis: "",
      returnAmount: "",
    });
  };
  // --- Remove from Pending Queue ---
  const handleRemoveFromList = (indexToRemove) => {
    const updatedList = pendingRecords.filter(
      (_, index) => index !== indexToRemove,
    );
    setPendingRecords(updatedList);
  };

  // --- Save All Pending Records ---
  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) {
      toast.error("No records in the list to save!");
      return;
    }

    setIsSavingAll(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

    try {
      const token = localStorage.getItem("token");
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      for (const record of pendingRecords) {
        const payload = {
          date: record.date,
          greenLeafToday: Number(record.greenLeafToday) || 0,
          dispatch: Number(record.dispatch) || 0,
          localSaleAndGratis: Number(record.localSaleAndGratis) || 0,
          returnAmount: Number(record.returnAmount) || 0,
          username: username,
        };

        const res = await fetch(`${BACKEND_URL}/api/factory-logs`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 403) throw new Error("Access Denied");
          throw new Error(`Failed to save record for ${record.date}`);
        }
      }

      toast.success("All records saved successfully!", { id: toastId });
      setPendingRecords([]);
      navigate("/factory/view");

      setTimeout(() => {
        fetchFactoryData();
      }, 1000);
    } catch (error) {
      if (error.message === "Access Denied") {
        toast.error("Access Denied. You do not have permission.", {
          id: toastId,
        });
      } else {
        toast.error(
          error.message || "Error saving some records. Please check.",
          { id: toastId },
        );
      }
    } finally {
      setIsSavingAll(false);
    }
  };

  const inputStyles =
    "w-full p-3.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 focus:ring-4 focus:outline-none transition-all";

  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 relative"
      style={{ backgroundColor: THEME.pageBg }}
    >
      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border"
              style={{
                backgroundColor: THEME.badgeBg,
                borderColor: THEME.badgeBorder,
                color: THEME.textPrimary,
              }}
            >
              <Factory size={32} />
            </div>
            <div>
              <h2
                className="text-2xl sm:text-3xl font-black"
                style={{ color: THEME.textPrimary }}
              >
                Factory Data Entry
              </h2>
              <p
                className="font-semibold mt-1 uppercase tracking-wider text-sm"
                style={{ color: THEME.textSecondary }}
              >
                Daily Production & Dispatch Log
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* --- LEFT SIDE: ENTRY FORM --- */}
          <div className="lg:col-span-8 space-y-6">
            <form
              onSubmit={handleAddToList}
              className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100"
            >
              {/* DATE SECTION */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Record Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className={inputStyles}
                    style={{ ringColor: THEME.textSecondary }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 1. GREEN LEAF & MADE TEA */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3
                    className="text-lg font-bold mb-4 flex items-center gap-2"
                    style={{ color: THEME.textPrimary }}
                  >
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: THEME.badgeBg }}
                    >
                      <Leaf size={18} />
                    </div>
                    Production
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Green Leaf Today (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="greenLeafToday"
                        value={formData.greenLeafToday}
                        onChange={handleInputChange}
                        onWheel={(e) => e.target.blur()}
                        required
                        placeholder="e.g. 1500"
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Est. Made Tea (21.5%)
                      </label>
                      <div
                        className="w-full p-3.5 border rounded-xl flex items-center h-[54px] font-black"
                        style={{
                          backgroundColor: THEME.badgeBg,
                          borderColor: THEME.badgeBorder,
                          color: THEME.textPrimary,
                        }}
                      >
                        {calculatedMadeTea > 0
                          ? calculatedMadeTea.toFixed(3)
                          : "0.000"}{" "}
                        kg
                      </div>
                      <p
                        className="text-[10px] mt-1.5 font-bold flex items-center gap-1"
                        style={{ color: THEME.textSecondary }}
                      >
                        <Sparkles size={10} /> Auto calculated
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. DISPATCH & LOCAL SALES */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3
                    className="text-lg font-bold mb-4 flex items-center gap-2"
                    style={{ color: THEME.textSecondary }}
                  >
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Package size={18} />
                    </div>
                    Dispatch & Sales
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Dispatch
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="dispatch"
                          value={formData.dispatch}
                          onChange={handleInputChange}
                          onWheel={(e) => e.target.blur()}
                          placeholder="0.00"
                          className={inputStyles}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Local Sales
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="localSaleAndGratis"
                          value={formData.localSaleAndGratis}
                          onChange={handleInputChange}
                          onWheel={(e) => e.target.blur()}
                          placeholder="0.00"
                          className={inputStyles}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Total Out
                      </label>
                      <div className="w-full p-3.5 border bg-gray-100 text-gray-700 border-gray-200 font-black rounded-xl flex items-center h-[54px]">
                        {calculatedTotalOut > 0
                          ? calculatedTotalOut.toFixed(2)
                          : "0.00"}{" "}
                        kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. RETURNS */}
              <div className="mb-8 bg-gray-50/50 border border-gray-100 rounded-2xl p-5 shadow-sm md:w-1/2">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-gray-200 rounded-lg">
                    <RefreshCcw size={18} />
                  </div>
                  Returns
                </h3>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Return Amount (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="returnAmount"
                    value={formData.returnAmount}
                    onChange={handleInputChange}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className={inputStyles}
                  />
                </div>
              </div>

              {/* ADD TO LIST BUTTON */}
              <button
                type="submit"
                disabled={isViewer}
                className="w-full py-4 rounded-2xl text-white font-black text-lg uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: THEME.btnGradient }}
              >
                <PlusCircle size={22} /> Add to Pending Queue
              </button>
            </form>
          </div>

          {/* --- RIGHT SIDE: PENDING QUEUE --- */}
          <div className="lg:col-span-4 flex flex-col h-full max-h-[85vh]">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden sticky top-6">
              <div className="bg-gray-50 p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-700">
                    <ListChecks size={18} />
                  </div>
                  <h3 className="font-bold text-gray-800">Pending Queue</h3>
                </div>
                <span className="bg-gray-200 text-gray-700 text-xs font-black px-3 py-1 rounded-full">
                  {pendingRecords.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
                {pendingRecords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                    <div className="p-6 bg-gray-100 rounded-full mb-4 border border-gray-200">
                      <ListChecks size={32} className="opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">
                      Queue is empty
                    </p>
                    <p className="text-xs mt-1 text-gray-400">
                      Fill the form and add records here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRecords.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm relative group hover:border-teal-300 transition-colors"
                      >
                        <button
                          onClick={() => handleRemoveFromList(index)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-md border border-gray-100 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex flex-col gap-3 pr-8">
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {item.date}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600">
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">
                                Leaf
                              </span>
                              <span
                                className="font-black"
                                style={{ color: THEME.textPrimary }}
                              >
                                {item.greenLeafToday} kg
                              </span>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                              <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">
                                Made Tea
                              </span>
                              <span
                                className="font-black"
                                style={{ color: THEME.textSecondary }}
                              >
                                {item.calculatedMadeTea.toFixed(2)} kg
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-between px-3 text-xs font-bold text-gray-600">
                            <span>Total Out:</span>
                            <span className="text-orange-600">
                              {item.calculatedTotalOut.toFixed(2)} kg
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 bg-white space-y-3">
                <button
                  onClick={handleSaveAll}
                  disabled={isSavingAll || pendingRecords.length === 0}
                  className={`w-full py-4 rounded-2xl text-white font-black flex justify-center items-center gap-2 transition-all ${
                    isSavingAll || pendingRecords.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "shadow-lg hover:-translate-y-0.5"
                  }`}
                  style={
                    !(isSavingAll || pendingRecords.length === 0)
                      ? { background: THEME.btnGradient }
                      : {}
                  }
                >
                  <Save size={18} />{" "}
                  {isSavingAll
                    ? "Saving..."
                    : `Save to Database (${pendingRecords.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
