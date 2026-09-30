import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, UserPlus, Edit, Trash2, X, AlertCircle, User as UserIcon, CheckSquare } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// 💡 සියලුම ප්‍රධාන අංශ සහ ඒවායේ ඇතුළත පිටු (URLs) 
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

export default function ManageUsers() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Editing States
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({ 
        username: '', role: 'User', password: '', allowedPaths: [], allowedPages: [] 
    });

    const [userToDelete, setUserToDelete] = useState(null);

    useEffect(() => {
        const currentRole = localStorage.getItem('userRole') || localStorage.getItem('role');
        if (currentRole !== 'Admin') {
            toast.error("Access Denied. Admins only.");
            navigate('/');
            return;
        }
        fetchUsers();
    }, [navigate]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            toast.error("Could not load users.");
        } finally {
            setLoading(false);
        }
    };

    // --- DELETE LOGIC ---
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        const toastId = toast.loading("Deleting user...");
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/users/${userToDelete._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message, { id: toastId });
                fetchUsers();
            } else {
                toast.error(data.message || "Failed to delete.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        } finally {
            setUserToDelete(null);
        }
    };

    // --- EDIT LOGIC ---
    const openEditModal = (user) => {
        setEditingUser(user._id);

        let mappedRole = user.role;
        let mappedPaths = user.allowedPaths ? [...user.allowedPaths] : [];
        let mappedPages = user.allowedPages ? [...user.allowedPages] : []; 

        if (mappedRole !== 'Admin' && mappedRole !== 'User' && mappedRole !== 'Viewer') {
            mappedRole = 'User'; 
            
            if (mappedPaths.length === 0) {
                if (user.role === 'Local Sale') mappedPaths = ['localsale'];
                else if (user.role === 'HandMade Officer') mappedPaths = ['handmade'];
                else if (user.role === 'Packing Officer') mappedPaths = ['packing'];
                else if (user.role === 'Factory Officer') mappedPaths = ['factory'];
                else if (user.role === 'Manufacturer Officer') mappedPaths = ['manufacturer'];
            }
        }

        setEditFormData({ 
            username: user.username, 
            role: mappedRole, 
            password: '', 
            allowedPaths: mappedPaths,
            allowedPages: mappedPages
        });
    };

    // 💡 Main Section එක ටික් කිරීම (Auto-select/Deselect Sub-pages)
    const handlePathChange = (sectionId) => {
        const section = SYSTEM_PERMISSIONS.find(s => s.id === sectionId);
        const sectionPageIds = section ? section.pages.map(p => p.id) : [];

        setEditFormData(prev => {
            const isSelected = prev.allowedPaths.includes(sectionId);
            
            if (isSelected) {
                // Uncheck කළ විට සියලුම Sub-pages ඉවත් වේ
                return {
                    ...prev,
                    allowedPaths: prev.allowedPaths.filter(id => id !== sectionId),
                    allowedPages: prev.allowedPages.filter(pageId => !sectionPageIds.includes(pageId))
                };
            } else {
                // Check කළ විට සියලුම Sub-pages එකතු වේ
                return {
                    ...prev,
                    allowedPaths: [...prev.allowedPaths, sectionId],
                    allowedPages: [...new Set([...prev.allowedPages, ...sectionPageIds])]
                };
            }
        });
    };

    // 💡 කුඩා පිටුවක් (Sub-page) වෙනස් කිරීම
    const handlePageChange = (pageUrl) => {
        setEditFormData(prev => ({
            ...prev,
            allowedPages: prev.allowedPages.includes(pageUrl)
                ? prev.allowedPages.filter(url => url !== pageUrl)
                : [...prev.allowedPages, pageUrl]
        }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if ((editFormData.role === 'User' || editFormData.role === 'Viewer') && editFormData.allowedPaths.length === 0) {
            toast.error("Please select at least one main section for the user.");
            return;
        }

        const toastId = toast.loading("Updating user...");

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/users/${editingUser}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(editFormData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "User updated successfully!", { id: toastId });
                setEditingUser(null);
                fetchUsers(); 
            } else {
                toast.error(data.message || "Failed to update.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        }
    };

    return (
        <div className="font-sans animate-in fade-in zoom-in-95 duration-300 w-full">
            
            {loading ? (
                <div className="text-center p-10 text-gray-500 dark:text-gray-400">Loading users...</div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-800/60">Username</th>
                                <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-800/60">System Role & Access</th>
                                <th className="px-6 py-4 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-zinc-800/60">
                                        {user.username}
                                    </td>
                                    <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800/60">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1 transition-colors
                                                ${user.role === 'Admin' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                                                'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'}`}
                                            >
                                                {user.role === 'Admin' ? <Shield size={12}/> : <UserIcon size={12}/>}
                                                {user.role === 'Admin' || user.role === 'User' || user.role === 'Viewer' ? user.role : `Legacy: ${user.role}`}
                                            </span>

                                            {/* Sections Badge for Users */}
                                            {(user.role === 'User' || user.role === 'Viewer' || (user.role !== 'Admin' && user.allowedPaths)) && user.allowedPaths && user.allowedPaths.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {user.allowedPaths.map(pathId => {
                                                        const sectionLabel = SYSTEM_PERMISSIONS.find(s => s.id === pathId)?.label || pathId;
                                                        return (
                                                            <span key={pathId} className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-700">
                                                                {sectionLabel}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {user.role === 'Admin' && (
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1">Full System Access</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button 
                                                    onClick={() => setUserToDelete(user)}
                                                    className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-md">
                                                <AlertDialogHeader>
                                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800/50">
                                                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete User Account</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-base">
                                                        Are you sure you want to permanently delete user <span className="font-bold text-gray-800 dark:text-gray-200">{user.username}</span>? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-6">
                                                    <AlertDialogCancel 
                                                        onClick={() => setUserToDelete(null)} 
                                                        className="border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-6 font-semibold"
                                                    >
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={handleConfirmDelete} 
                                                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors"
                                                    >
                                                        Delete User
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative border border-gray-200 dark:border-zinc-800 transition-colors duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button 
                            onClick={() => setEditingUser(null)} 
                            className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        
                        <h3 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 mb-6">Edit User Details</h3>
                        
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    value={editFormData.username}
                                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                <select 
                                    value={editFormData.role}
                                    onChange={(e) => {
                                        const newRole = e.target.value;
                                        setEditFormData({
                                            ...editFormData, 
                                            role: newRole,
                                            allowedPaths: newRole === 'Admin' ? [] : editFormData.allowedPaths,
                                            allowedPages: newRole === 'Admin' ? [] : editFormData.allowedPages
                                        });
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 transition-colors cursor-pointer"
                                >
                                    <option value="User">Standard User</option>
                                    <option value="Viewer">Viewer (Read-Only)</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>

                            {/* --- Permissions Checkboxes --- */}
                            {(editFormData.role === 'User' || editFormData.role === 'Viewer') && (
                                <div className="space-y-4 bg-gray-50 dark:bg-zinc-950 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm mt-4">
                                    <label className="block text-sm font-bold text-[#1B6A31] dark:text-green-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                        <CheckSquare size={16} /> Assign System Permissions
                                    </label>

                                    {SYSTEM_PERMISSIONS.map(section => (
                                        <div key={section.id} className="mb-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 transition-all">
                                            
                                            {/* Main Section Checkbox */}
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={editFormData.allowedPaths.includes(section.id)} 
                                                    onChange={() => handlePathChange(section.id)} 
                                                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer" 
                                                />
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-green-600 transition-colors">
                                                    {section.label}
                                                </span>
                                            </label>

                                            {/* Sub-Pages Checkboxes (Shows only when Main Section is checked) */}
                                            {editFormData.allowedPaths.includes(section.id) && (
                                                <div className="mt-3 ml-6 pl-4 border-l-2 border-green-200 dark:border-green-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                                    {section.pages.map(page => (
                                                        <label key={page.id} className="flex items-center gap-2 cursor-pointer group">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={editFormData.allowedPages.includes(page.id)} 
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

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Reset Password <span className="font-normal text-gray-400 dark:text-gray-500">(Optional)</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Leave blank to keep current password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-gray-50 dark:bg-zinc-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 transition-colors" 
                                />
                            </div>

                            <button type="submit" className="w-full mt-6 bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors shadow-sm">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}