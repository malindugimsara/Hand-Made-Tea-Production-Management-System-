import React, { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation, useParams } from "react-router-dom";

// 1. Reusable input styles
const inputStyle = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all";

// 2. Helper component for the bag categories (Includes Received, Used, Damaged, and Balance)
const BagSection = ({ title, stateData, categoryStr, themeClass, onChange }) => (
    <div className="p-5 rounded-2xl border bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700">
        <h3 className={`text-sm font-black uppercase tracking-wider mb-4 ${themeClass}`}>{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Received</label>
                <input
                    type="number"
                    min="0"
                    value={stateData.received}
                    onChange={(e) => onChange(categoryStr, 'received', e.target.value)}
                    className={inputStyle}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Used</label>
                <input
                    type="number"
                    min="0"
                    value={stateData.used}
                    onChange={(e) => onChange(categoryStr, 'used', e.target.value)}
                    className={inputStyle}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-rose-500 dark:text-rose-400 mb-1">Damaged Qty</label>
                <input
                    type="number"
                    min="0"
                    value={stateData.damaged}
                    onChange={(e) => onChange(categoryStr, 'damaged', e.target.value)}
                    className={`${inputStyle} focus:border-rose-500 focus:ring-rose-500/20`}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Net / Balance</label>
                <input
                    type="number"
                    value={stateData.balance}
                    onChange={(e) => onChange(categoryStr, 'balance', e.target.value)}
                    className={`${inputStyle} bg-white dark:bg-gray-800`}
                />
            </div>
        </div>
    </div>
);

const FactoryPackingEdit = () => {
    const navigate = useNavigate();
    const { date } = useParams();
    const location = useLocation();
    const existingRecord = location.state?.record || {};

    const [isSaving, setIsSaving] = useState(false);

    const getInitialCategoryState = (catData) => ({
        received: catData?.received || 0,
        used: catData?.used || 0,
        damaged: catData?.damaged || 0,
        balance: catData?.balance || 0
    });

    const [agSuper, setAgSuper] = useState(() => getInitialCategoryState(existingRecord.agSuper));
    const [aGroup, setAGroup] = useState(() => getInitialCategoryState(existingRecord.aGroup));
    const [sampleBags, setSampleBags] = useState(() => getInitialCategoryState(existingRecord.sampleBags));
    const [unmarked, setUnmarked] = useState(() => getInitialCategoryState(existingRecord.unmarked));

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading("Updating ledger record...");

        try {
            const token = localStorage.getItem("token");
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

            const sanitizeCategory = (cat) => ({
                received: Number(cat.received) || 0,
                used: Number(cat.used) || 0,
                damaged: Number(cat.damaged) || 0,
                balance: Number(cat.balance) || 0
            });

            const response = await fetch(`${BACKEND_URL}/api/factory-packs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: date,
                    agSuper: sanitizeCategory(agSuper),
                    aGroup: sanitizeCategory(aGroup),
                    sampleBags: sanitizeCategory(sampleBags),
                    unmarked: sanitizeCategory(unmarked)
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update ledger');

            toast.success("Ledger updated successfully!", { id: toastId });
            navigate('/factory/packingsummary');
        } catch (error) {
            toast.error(error.message || "Failed to update record.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (category, field, value) => {
        const numValue = value === "" ? "" : Number(value);

        const updateCategoryState = (prev) => {
            const updated = { ...prev, [field]: numValue };
            // Automatically recalculate daily net change if received, used, or damaged changes
            if (field === 'received' || field === 'used' || field === 'damaged') {
                const rec = Number(updated.received) || 0;
                const used = Number(updated.used) || 0;
                const dmg = Number(updated.damaged) || 0;
                updated.balance = rec - (used + dmg);
            }
            return updated;
        };

        if (category === 'agSuper') setAgSuper(updateCategoryState);
        if (category === 'aGroup') setAGroup(updateCategoryState);
        if (category === 'sampleBags') setSampleBags(updateCategoryState);
        if (category === 'unmarked') setUnmarked(updateCategoryState);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[900px] mx-auto font-sans min-h-screen">

            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Edit Ledger Row</h1>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase mt-0.5">
                        Updating records for: <span className="text-teal-600 dark:text-teal-400">{date}</span>
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                <form onSubmit={handleUpdate} className="space-y-6">

                    <BagSection
                        title="A / G / Super"
                        stateData={agSuper}
                        categoryStr="agSuper"
                        themeClass="text-teal-600 dark:text-teal-400"
                        onChange={handleChange}
                    />
                    <BagSection
                        title="A / Group"
                        stateData={aGroup}
                        categoryStr="aGroup"
                        themeClass="text-blue-600 dark:text-blue-400"
                        onChange={handleChange}
                    />
                    <BagSection
                        title="Sample Bags"
                        stateData={sampleBags}
                        categoryStr="sampleBags"
                        themeClass="text-indigo-600 dark:text-indigo-400"
                        onChange={handleChange}
                    />
                    <BagSection
                        title="Unmarked"
                        stateData={unmarked}
                        categoryStr="unmarked"
                        themeClass="text-amber-600 dark:text-amber-400"
                        onChange={handleChange}
                    />

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 px-8 py-3.5 text-white font-black text-sm tracking-widest uppercase rounded-xl transition-all bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md hover:-translate-y-0.5">
                            {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                            {isSaving ? "Saving..." : "Update Row"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FactoryPackingEdit;