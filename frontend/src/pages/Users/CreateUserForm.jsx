import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, User, Key, ArrowLeft, CheckSquare } from "lucide-react";

// System එකේ තියෙන ප්‍රධාන අංශ (Sections) ලැයිස්තුව
const SYSTEM_SECTIONS = [
    { id: 'localsale', label: 'Local Sale Section' },
    { id: 'handmade', label: 'Handmade Section' },
    { id: 'packing', label: 'Packing Section' },
    { id: 'factory', label: 'Factory Section' },
];

export default function CreateUserForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    
    // formData එකට අලුතින් allowedPaths Array එකක් එක් කර ඇත
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'User', // Default to User
        allowedPaths: [] 
    });

    // Frontend security check: Ensure only Admins can view this page
    useEffect(() => {
        const currentRole = localStorage.getItem('userRole') || localStorage.getItem('role');
        if (currentRole !== 'Admin') {
            toast.error("Access Denied. Admins only.");
            navigate('/'); // Redirect to dashboard
        }
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Checkbox Click කරන විට allowedPaths Array එක Update කරන Function එක
    const handleCheckboxChange = (sectionId) => {
        setFormData((prev) => {
            const isSelected = prev.allowedPaths.includes(sectionId);
            return {
                ...prev,
                allowedPaths: isSelected
                    ? prev.allowedPaths.filter(id => id !== sectionId) // අයින් කිරීම
                    : [...prev.allowedPaths, sectionId] // එකතු කිරීම
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        // User කෙනෙක් නම්, අඩුම තරමේ එක අංශයකටවත් access දීලා තියෙන්න ඕනේ
        if (formData.role === 'User' && formData.allowedPaths.length === 0) {
            toast.error("Please select at least one accessible section for the user.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating new user...');

        try {
            // 1. Get the Admin's token
            const token = localStorage.getItem('token');
            
            // 2. Make the POST request to your backend
            const response = await fetch(`${BACKEND_URL}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData) // role, allowedPaths ඔක්කොම යවනවා
            });

            const textResponse = await response.text();
            let data = {};
            try {
                data = textResponse ? JSON.parse(textResponse) : {};
            } catch (parseError) {
                console.warn("Non-JSON response received from server");
            }

            if (response.ok) {
                toast.success(`User ${formData.username} created successfully!`, { id: toastId });
                
                // Reset form
                setFormData({ username: '', password: '', role: 'User', allowedPaths: [] });
                
                setTimeout(() => {
                    navigate('/manage-users');
                }, 1500);
            } else {
                if (response.status === 403) {
                    toast.error("Access Denied. Only Admins can create users.", { id: toastId });
                } else {
                    const errorMsg = data.message || data.error || "Failed to create user.";
                    toast.error(errorMsg, { id: toastId });
                }
            }
        } catch (error) {
            console.error("User Creation Error:", error);
            toast.error("Network error. Could not connect to server.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-2xl mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-4 sm:top-8 left-4 sm:left-8 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back
            </button>
            
            <div className="mb-8 mt-12 sm:mt-10 text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                    <UserPlus size={32} />
                </div>
                <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500">Create System User</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Add new staff members and assign their access</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
                
                <div className="space-y-6">
                    {/* Username Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <User size={16} className="text-[#1B6A31] dark:text-green-500"/> Username
                        </label>
                        <input 
                            type="text" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="e.g., kamal_officer"
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-zinc-600 transition-all" 
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <Key size={16} className="text-[#1B6A31] dark:text-green-500"/> Initial Password
                        </label>
                        <input 
                            type="text"
                            name="password" 
                            value={formData.password} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="Enter a secure password (min 6 characters)"
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-zinc-600 transition-all" 
                        />
                    </div>

                    {/* Role Selection Field */}
                    <div className="mb-4 pb-4 border-b border-gray-100 dark:border-zinc-800 transition-colors">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <Shield size={16} className="text-[#1B6A31] dark:text-green-500"/> System Role
                        </label>
                        <select 
                            name="role" 
                            value={formData.role} 
                            onChange={(e) => {
                                handleInputChange(e);
                                // Admin තේරුවොත් allowed paths හිස් කරනවා
                                if (e.target.value === 'Admin') {
                                    setFormData(prev => ({ ...prev, allowedPaths: [] }));
                                }
                            }} 
                            required 
                            className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="User" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100">Standard User (Specific Sections Only)</option>
                            <option value="Viewer">Viewer (Read-Only Access)</option>
                            <option value="Admin" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100">Admin (Full System Access)</option>
                        </select>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 italic">
                            {formData.role === 'Admin' 
                                ? "⚠️ Admins have full access to view, edit, delete data, and create other users." 
                                : "Users will only have access to the specific sections you select below."}
                        </p>
                    </div>

                    {/* --- Accessible Sections (Checkboxes) --- */}
                    {(formData.role === 'User' || formData.role === 'Viewer') && (
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                <CheckSquare size={16} className="text-[#1B6A31] dark:text-green-500"/> Select Accessible Sections
                            </label>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SYSTEM_SECTIONS.map(section => (
                                    <label 
                                        key={section.id} 
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                                            ${formData.allowedPaths.includes(section.id) 
                                                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20' 
                                                : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.allowedPaths.includes(section.id)}
                                            onChange={() => handleCheckboxChange(section.id)}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            {section.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                <button
                    type="submit"
                    className={`w-full h-14 mt-6 text-white font-bold rounded-lg text-lg transition-all shadow-md flex justify-center items-center gap-2 ${
                        loading ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226] dark:bg-green-700 dark:hover:bg-green-600 active:scale-95'
                    }`}
                    disabled={loading}
                >
                    <UserPlus size={20} />
                    {loading ? "Creating User..." : "Create User Account"}
                </button> 
            </form>
        </div>
    );
}