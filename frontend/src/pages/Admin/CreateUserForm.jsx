import React, { useState } from 'react';
import toast from 'react-hot-toast'; 
import { UserPlus, Shield, User, Key, CheckSquare, Layers } from "lucide-react";

// 💡 සියලුම අංශ සහ ඒවායේ ඇතුළත පිටු (URLs) මෙහි අඩංගු වේ
const SYSTEM_PERMISSIONS = [
    {
        id: 'handmade',
        label: 'Handmade Section (H/T Factory)',
        pages: [
            { id: '/green-leaf-form', label: 'G/L Record Entry' },
            { id: '/view-green-leaf', label: 'G/L View Records' },
            { id: '/loft-leaf-count', label: 'L/L Record Entry' },
            { id: '/view-loft-leaf', label: 'L/L View Records' },
            { id: '/summary-loft-leaf', label: 'L/L Weighted Average' },
            { id: '/simple-average', label: 'L/L Simple Average' },
            { id: '/dehydrator-record-form', label: 'D/L Record Entry' },
            { id: '/view-dehydrator-records', label: 'D/L View Records' },
            { id: '/raw-material-cost', label: 'Raw Material Cost' },
            { id: '/view-raw-material-cost', label: 'View RM Costs' },
            { id: '/production-summary', label: 'Production Summary' },
            { id: '/selling-details-table', label: 'Selling Details' },
            { id: '/cost-of-production', label: 'Cost of Production' },
            { id: '/transfer-out', label: 'Transfer Out' },
            { id: '/transfer-out-view', label: 'Transfer Out Records' }
        ]
    },
    {
        id: 'packing',
        label: 'Packing Section',
        pages: [
            { id: '/packing/local-record-entry', label: 'Local Record Entry' },
            { id: '/packing/local-record-view', label: 'Local Record View' },
            { id: '/packing/tea-center-record-entry', label: 'Tea Center Record Entry' },
            { id: '/packing/tea-center-record-view', label: 'Tea Center Record View' },
            { id: '/packing/product-issue-summary', label: 'Product-Issue Summary' },
            { id: '/packing/summary-reports', label: 'Stock Summary' },
            { id: '/packing/historical-stock', label: 'Historical Stock' },
            { id: '/packing/trans-in-entry', label: 'H/T - Trans In' },
            { id: '/packing/trans-in-factory-entry', label: 'Factory - Trans In' },
            { id: '/packing/trans-in-other', label: 'Other - Trans In' },
            { id: '/packing/trans-in-raw-material', label: 'Raw Material - Trans In' },
            { id: '/packing/trans-in-view', label: 'H/T - Trans In View' },
            { id: '/packing/trans-in-factory-view', label: 'Factory - Trans In View' },
            { id: '/packing/trans-in-view-other', label: 'Other - Trans In View' },
            { id: '/packing/trans-in-view-raw-material', label: 'Raw Material - Trans In View' },
            { id: '/packing/stock-adjustment-entry', label: 'Stock Adjustment Entry' },
            { id: '/packing/stock-adjustment-view', label: 'Stock Adjustment View' }
        ]
    },
    {
        id: 'localsale',
        label: 'Local Sale Section',
        pages: [
            { id: '/localsale/dailysummary', label: 'Enter Daily Summary' },
            { id: '/localsale/viewdailysummary', label: 'Daily Summary View' },
            { id: '/localsale/issuesummary', label: 'Enter Issue Summary' },
            { id: '/localsale/issuesummaryview', label: 'Issue Summary View' },
            { id: '/localsale/dailyextendedstock', label: 'Daily Extended Stock' },
            { id: '/localsale/monthlysummaryview', label: 'Month End Summary View' },
            { id: '/localsale/freeissuesummary', label: 'Free Issue Summary' },
            { id: '/localsale/balancereport', label: 'Balance Report' }
        ]
    },
    {
        id: 'factory',
        label: 'Factory Section',
        pages: [
            { id: '/factory/dailyproduction', label: 'Enter Daily G/L' },
            { id: '/factory/view', label: 'View Daily G/L' },
            { id: '/factory/dispatchandreturn', label: 'Enter Dispatch & Return' },
            { id: '/factory/dispatchrecords', label: 'View Dispatch Records' },
            { id: '/factory/dispatchdashboard', label: 'Dispatch Dashboard' },
            { id: '/factory/labouroutput', label: 'Enter Labour Output' },
            { id: '/factory/labouroutputlist', label: 'View Labour Output' },
            { id: '/factory/factorypacking', label: 'Enter Packing Materials' },
            { id: '/factory/packingsummary', label: 'View Packing Summary' }
        ]
    },
    {
        id: 'manufacturer',
        label: 'Manufacturer Section',
        pages: [
            { id: '/manufacturer/bl-production/witherLeafForm', label: 'Enter Wither Leaf' },
            { id: '/manufacturer/bl-production/witherLeafSummary', label: 'Wither Leaf Summary' },
            { id: '/manufacturer/bl-production/dhoolRollingSection', label: 'Enter Dhool Rolling' },
            { id: '/manufacturer/bl-production/dhoolRollingSummary', label: 'Dhool Rolling Summary' },
            { id: '/manufacturer/bl-production/hydroMetersentry', label: 'Enter HydroMeter' },
            { id: '/manufacturer/bl-production/hydroMeterview', label: 'View HydroMeter' },
            { id: '/manufacturer/bl-production/firingSection', label: 'Enter Drier Section' },
            { id: '/manufacturer/bl-production/firingSectionSummary', label: 'View Drier Section' },
            { id: '/manufacturer/factory-loft-leaf', label: 'Enter L/L Count' },
            { id: '/manufacturer/view-factory-loft-leaf', label: 'View L/L Count' },
            { id: '/manufacturer/weekly-loft-leaf-summary', label: 'Weekly L/L Summary' },
            { id: '/manufacturer/collector-quality-difference', label: 'Collector L/L Summary' },
            { id: '/manufacturer/simple-avg-factory-loft-leaf', label: 'Simple Average' },
            { id: '/manufacturer/weight-avg-factory-loft-leaf', label: 'Weight Average' },
            { id: '/manufacturer/green-leaf-monthly-ranking', label: 'G/L Ranking Report' },
            { id: '/manufacturer/green-leaf-monthly-report', label: 'G/L Quality Report' },
            { id: '/manufacturer/tc5report', label: 'TC5 Report' }
        ]
    }
];

export default function CreateUserForm({ onSuccess }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'User',
        allowedPaths: [], 
        allowedPages: [] // 💡 අලුතින් එක් කරන ලදී
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // ප්‍රධාන අංශ සඳහා
    // 💡 Main Section එකක් Click කළ විට
    const handlePathChange = (sectionId) => {
        const section = SYSTEM_PERMISSIONS.find(s => s.id === sectionId);
        const sectionPageIds = section ? section.pages.map(p => p.id) : [];

        setFormData(prev => {
            const isSelected = prev.allowedPaths.includes(sectionId);
            
            if (isSelected) {
                // Section එක Uncheck කළොත්, ඒකෙ තියෙන Sub-pages ඔක්කොමත් අයින් වෙනවා
                return {
                    ...prev,
                    allowedPaths: prev.allowedPaths.filter(id => id !== sectionId),
                    allowedPages: prev.allowedPages.filter(pageId => !sectionPageIds.includes(pageId))
                };
            } else {
                // Section එක Check කළොත්, ඒකෙ තියෙන Sub-pages ඔක්කොම Auto Select වෙනවා
                return {
                    ...prev,
                    allowedPaths: [...prev.allowedPaths, sectionId],
                    allowedPages: [...new Set([...prev.allowedPages, ...sectionPageIds])]
                };
            }
        });
    };

    // 💡 ඇතුළත Sub-Page එකක් Click කළ විට
    const handlePageChange = (pageId) => {
        setFormData(prev => ({
            ...prev,
            allowedPages: prev.allowedPages.includes(pageId)
                ? prev.allowedPages.filter(id => id !== pageId)
                : [...prev.allowedPages, pageId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        if (formData.role === 'User' && formData.allowedPaths.length === 0) {
            toast.error("Please select at least one main section.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating new user...');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });

            const textResponse = await response.text();
            let data = {};
            try { data = textResponse ? JSON.parse(textResponse) : {}; } catch (e) {}

            if (response.ok) {
                toast.success(`User ${formData.username} created successfully!`, { id: toastId });
                setFormData({ username: '', password: '', role: 'User', allowedPaths: [], allowedPages: [] });
                if(onSuccess) onSuccess(); // Go back to Manage Users tab
            } else {
                const errorMsg = data.message || data.error || "Failed to create user.";
                toast.error(errorMsg, { id: toastId });
            }
        } catch (error) {
            toast.error("Network error. Could not connect to server.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl font-sans animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Create System User</h3>
                <p className="text-sm text-gray-500">Fill in the details below to add a new user to the system.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <User size={14} className="text-[#1B6A31] dark:text-green-500"/> Username
                        </label>
                        <input 
                            type="text" name="username" value={formData.username} onChange={handleInputChange} required placeholder="e.g., kamal_officer"
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <Key size={14} className="text-[#1B6A31] dark:text-green-500"/> Password
                        </label>
                        <input 
                            type="text" name="password" value={formData.password} onChange={handleInputChange} required placeholder="Min 6 characters"
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100" 
                        />
                    </div>
                </div>

                <div className="pb-4 border-b border-gray-100 dark:border-zinc-800">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                        <Shield size={14} className="text-[#1B6A31] dark:text-green-500"/> System Role
                    </label>
                    <select 
                        name="role" value={formData.role} 
                        onChange={(e) => {
                            handleInputChange(e);
                            if (e.target.value === 'Admin') setFormData(prev => ({ ...prev, allowedPaths: [], allowedPages: [] }));
                        }} 
                        className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#8CC63F] outline-none"
                    >
                        <option value="User">Standard User (Specific Sections Only)</option>
                        <option value="Viewer">Viewer (Read-Only Access)</option>
                        <option value="Admin">Admin (Full System Access)</option>
                    </select>
                </div>

                {/* --- Permissions Checkboxes --- */}
                {/* --- Permissions Checkboxes --- */}
                {(formData.role === 'User' || formData.role === 'Viewer') && (
                    <div className="space-y-4 bg-white dark:bg-zinc-950 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <label className="block text-sm font-bold text-[#1B6A31] dark:text-green-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <CheckSquare size={16} /> Assign System Permissions
                        </label>

                        {SYSTEM_PERMISSIONS.map(section => (
                            <div key={section.id} className="mb-2 bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 transition-all">
                                
                                {/* Main Section Checkbox */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.allowedPaths.includes(section.id)} 
                                        onChange={() => handlePathChange(section.id)} 
                                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer" 
                                    />
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-green-600 transition-colors">
                                        {section.label}
                                    </span>
                                </label>

                                {/* Sub-Pages Checkboxes (Main Section එක Check කළ විට පමණක් පෙන්වයි) */}
                                {formData.allowedPaths.includes(section.id) && (
                                    <div className="mt-3 ml-6 pl-4 border-l-2 border-green-200 dark:border-green-900/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                                        {section.pages.map(page => (
                                            <label key={page.id} className="flex items-center gap-2 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.allowedPages.includes(page.id)} 
                                                    onChange={() => handlePageChange(page.id)} 
                                                    className="w-3.5 h-3.5 text-green-500 border-gray-300 rounded focus:ring-green-500 cursor-pointer" 
                                                />
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                    {page.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <button type="submit" disabled={loading} className={`w-full h-14 mt-4 text-white font-bold rounded-lg text-base transition-all shadow-md flex justify-center items-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226]'}`}>
                    <UserPlus size={20} /> {loading ? "Creating..." : "Create User Account"}
                </button> 
            </form>
        </div>
    );
}