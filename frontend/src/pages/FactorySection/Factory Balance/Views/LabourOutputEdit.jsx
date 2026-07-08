import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Users,
    Calculator,
    Activity,
    Calendar,
    Plus,
    Trash2,
    Save,
    ArrowLeft
} from "lucide-react";

const LabourOutputEdit = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    // Grab the grouped data passed from the table route
    const groupData = location.state?.recordData;

    // --- Form State ---
    const [recordDate, setRecordDate] = useState("");
    const [sections, setSections] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- Auto Fetch Made Tea State ---
    const [madeTeaToday, setMadeTeaToday] = useState(0);
    const [isLoadingTea, setIsLoadingTea] = useState(false);

    // --- Live Calculation State ---
    const [liveMetrics, setLiveMetrics] = useState({
        otShifts: 0,
        totalEquivalentShifts: 0,
        finalOutput: 0
    });

    // --- Initialize Data on Mount ---
    useEffect(() => {
        if (!groupData) {
            toast.error("No record data found. Redirecting...");
            navigate("/factory/labouroutputlist");
            return;
        }

        setRecordDate(groupData.date || "");

        // Populate sections from the existing entries
        if (groupData.entries && groupData.entries.length > 0) {
            const mappedSections = groupData.entries.map(entry => ({
                id: entry._id || Math.random().toString(36).substr(2, 9),
                section: entry.section || "",
                noOfLabours: entry.noOfLabours || "",
                otHours: entry.otHours || ""
            }));
            setSections(mappedSections);
        } else {
            setSections([{ id: Date.now(), section: "", noOfLabours: "", otHours: "" }]);
        }
    }, [groupData, navigate]);

    // --- FETCH MADE TEA FROM DAILY PRODUCTION ---
    useEffect(() => {
        if (!recordDate) return;

        const fetchMadeTea = async () => {
            setIsLoadingTea(true);
            try {
                const token = localStorage.getItem('token');
                const month = recordDate.substring(0, 7); // Extract YYYY-MM
                const response = await fetch(`${BACKEND_URL}/api/factory-logs?month=${month}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Find the log for this specific date
                    const dailyLog = data.records?.find(r => r.date.split('T')[0] === recordDate);
                    
                    // Extract Made Tea (Check both nested and flat structures based on your DB)
                    const teaAmount = dailyLog?.madeTea?.today || dailyLog?.calculatedMadeTea || 0;
                    setMadeTeaToday(teaAmount);
                } else {
                    setMadeTeaToday(0);
                }
            } catch (error) {
                console.error("Failed to fetch made tea", error);
                setMadeTeaToday(0);
            } finally {
                setIsLoadingTea(false);
            }
        };

        fetchMadeTea();
    }, [recordDate, BACKEND_URL]);

    // --- Live Calculations Effect ---
    useEffect(() => {
        let totalLabours = 0;
        let totalOtHours = 0;

        sections.forEach(sec => {
            totalLabours += Number(sec.noOfLabours) || 0;
            totalOtHours += Number(sec.otHours) || 0;
        });

        const otShifts = totalOtHours / 5.5;
        const totalEquivalentShifts = totalLabours + otShifts;
        const finalOutput = totalEquivalentShifts > 0 ? (Number(madeTeaToday) / totalEquivalentShifts) : 0;

        setLiveMetrics({
            otShifts,
            totalEquivalentShifts,
            finalOutput
        });
    }, [sections, madeTeaToday]);

    // --- Section Handlers ---
    const handleAddSection = () => {
        setSections([...sections, { id: Date.now(), section: "", noOfLabours: "", otHours: "" }]);
    };

    const handleRemoveSection = (idToRemove) => {
        setSections(sections.filter(sec => sec.id !== idToRemove));
    };

    const handleSectionChange = (id, field, value) => {
        setSections(sections.map(sec =>
            sec.id === id ? { ...sec, [field]: value } : sec
        ));
    };

    // --- Save Handler ---
    const handleSave = async () => {
        if (!recordDate) return toast.error("Record Date is required.");
        if (sections.length === 0) return toast.error("Please add at least one section.");

        const hasEmptyFields = sections.some(s => !s.section || s.noOfLabours === "" || s.otHours === "");
        if (hasEmptyFields) return toast.error("Please fill in all section fields.");

        setIsSaving(true);
        const toastId = toast.loading("Updating records...");

        try {
            const loggedInUser = localStorage.getItem('username') || 'System User';

            const payload = {
                date: recordDate,
                madeTea: Number(madeTeaToday),
                username: loggedInUser,
                entries: sections.map(sec => ({
                    _id: sec.id.toString().length > 15 ? sec.id : undefined, 
                    section: sec.section,
                    noOfLabours: Number(sec.noOfLabours),
                    otHours: Number(sec.otHours),
                    labourOutput: liveMetrics.finalOutput 
                }))
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/labour-output/date/${groupData.date}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error("Failed to update records.");

            toast.success("Records updated successfully!", { id: toastId });
            navigate("/factory/labouroutputlist");
        } catch (error) {
            console.error("Save Error:", error);
            toast.error(error.message || "Failed to save data.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const sectionOptions = ["Drying", "Packing", "Fermentation", "Sorting", "Maintenance", "Plucking"];

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto font-sans min-h-screen bg-[#f3faf7] text-gray-800">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
                        <Users className="text-[#1B6A31]" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#1c4b3a] tracking-tight">Labour Output</h1>
                        <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mt-0.5">
                            Shift & Efficiency Tracking
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Input Form */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

                        {/* Top Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">
                                    Record Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={recordDate}
                                        disabled
                                        className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#1B6A31] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                            </div>

                            {/* AUTO-FETCHED MADE TEA FIELD */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    Made Tea (kg)
                                </label>
                                <div className={`w-full p-3 border rounded-xl flex items-center h-[50px] font-black transition-colors ${
                                    isLoadingTea 
                                        ? 'bg-gray-50 text-gray-400 border-gray-200' 
                                        : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
                                }`}>
                                    {isLoadingTea ? 'Fetching...' : madeTeaToday.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Input Fields Area */}
                        <div className="bg-[#f8fbf9] border border-gray-100 rounded-2xl p-6 mb-8">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity className="text-[#1B6A31]" size={20} />
                                <h3 className="text-base font-bold text-[#1c4b3a]">Input Fields</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Desktop Header Row */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-2">
                                    <div className="col-span-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Section</div>
                                    <div className="col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. of Labours</div>
                                    <div className="col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">O/T Hours</div>
                                    <div className="col-span-2"></div>
                                </div>

                                {/* Dynamic Rows */}
                                {sections.map((sec, index) => (
                                    <div key={sec.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                                        <div className="col-span-1 md:col-span-4">
                                            <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase mb-1 block">Section</label>
                                            <select
                                                value={sec.section}
                                                onChange={(e) => handleSectionChange(sec.id, 'section', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#1B6A31] appearance-none"
                                            >
                                                <option value="" disabled>-- Select Factory Section --</option>
                                                {sectionOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-1 md:col-span-3">
                                            <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase mb-1 block">No. of Labours</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 12"
                                                value={sec.noOfLabours}
                                                onChange={(e) => handleSectionChange(sec.id, 'noOfLabours', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#1B6A31]"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-3">
                                            <label className="md:hidden text-[10px] font-bold text-gray-400 uppercase mb-1 block">O/T Hours</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 11"
                                                value={sec.otHours}
                                                onChange={(e) => handleSectionChange(sec.id, 'otHours', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#1B6A31]"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-2 flex justify-end md:justify-center">
                                            <button
                                                onClick={() => handleRemoveSection(sec.id)}
                                                disabled={sections.length === 1} 
                                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                                                title="Remove Section"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add New Section Button */}
                                <div className="pt-2">
                                    <button
                                        onClick={handleAddSection}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-200/60 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition-colors uppercase tracking-wide"
                                    >
                                        <Plus size={16} /> ADD SECTION
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-[#809f94] hover:bg-[#6c8b7f] text-white font-bold text-sm tracking-widest uppercase rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={20} />
                            )}
                            Save Record
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Live Calculations */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 sticky top-8">
                        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <Calculator className="text-gray-600" size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-[#1c4b3a]">Live Calculations</h3>
                        </div>

                        <div className="space-y-8">
                            {/* O/T Shifts */}
                            <div className="flex justify-between items-end">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700">O/T Shifts</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">(O/T Hours ÷ 5.5)</p>
                                </div>
                                <span className="text-2xl font-extrabold text-[#1c4b3a]">
                                    {liveMetrics.otShifts.toFixed(2)}
                                </span>
                            </div>

                            {/* Total Equivalent Shifts */}
                            <div className="flex justify-between items-end pb-8 border-b border-gray-100">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700">Total Equivalent Shifts</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">(Labours + O/T Shifts)</p>
                                </div>
                                <span className="text-2xl font-extrabold text-[#1c4b3a]">
                                    {liveMetrics.totalEquivalentShifts.toFixed(2)}
                                </span>
                            </div>

                            {/* Final Labour Output */}
                            <div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700">Final Labour Output</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5 mb-4">(Made Tea ÷ Total Shifts)</p>
                                </div>
                                <div className="bg-[#f5f6f8] border border-gray-200 rounded-2xl p-8 text-center flex flex-col justify-center items-center">
                                    <span className="text-5xl font-black text-[#8ba29a] tracking-tight">
                                        {liveMetrics.finalOutput.toFixed(2)}
                                    </span>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                                        KG / Shift
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default LabourOutputEdit;