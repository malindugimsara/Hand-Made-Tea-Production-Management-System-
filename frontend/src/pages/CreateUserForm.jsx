import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, User, Key, ArrowLeft } from "lucide-react";

export default function CreateUserForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'Viewer' // Default to lowest privilege for safety
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
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
                    'Authorization': `Bearer ${token}` // The magic key!
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`User ${formData.username} created successfully!`, { id: toastId });
                // Reset form so the admin can add another user if needed
                setFormData({ username: '', password: '', role: 'Viewer' });
                
                // Optional: Redirect back to the manage users page after a short delay
                setTimeout(() => {
                    navigate('/manage-users');
                }, 1500);
            } else {
                // Handle 403 Forbidden or 400 Bad Request (e.g., username already exists)
                if (response.status === 403) {
                    toast.error("Access Denied. Only Admins can create users.", { id: toastId });
                } else {
                    toast.error(data.message || "Failed to create user.", { id: toastId });
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
        <div className="p-8 max-w-2xl mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#1B6A31] transition-colors font-medium"
            >
                <ArrowLeft size={20} /> Back
            </button>
            
            <div className="mb-8 mt-10 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus size={32} />
                </div>
                <h2 className="text-3xl font-bold text-[#1B6A31]">Create System User</h2>
                <p className="text-gray-500 mt-2 font-medium">Add new staff members and assign roles</p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                
                <div className="space-y-6">
                    {/* Username Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <User size={16} className="text-[#1B6A31]"/> Username
                        </label>
                        <input 
                            type="text" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="e.g., kamal_officer"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none transition-all" 
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <Key size={16} className="text-[#1B6A31]"/> Initial Password
                        </label>
                        <input 
                            type="text" // Kept as text so the Admin can see what password they are setting for the new user
                            name="password" 
                            value={formData.password} 
                            onChange={handleInputChange} 
                            required 
                            placeholder="Enter a secure password (min 6 characters)"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none transition-all" 
                        />
                    </div>

                    {/* Role Selection Field */}
                    <div className="mb-8 pb-6 border-b border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <Shield size={16} className="text-[#1B6A31]"/> System Role
                        </label>
                        <select 
                            name="role" 
                            value={formData.role} 
                            onChange={handleInputChange} 
                            required 
                            className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#8CC63F] outline-none transition-all cursor-pointer"
                        >
                            <option value="Viewer">Viewer (Read-Only Access)</option>
                            <option value="Officer">Officer (Data Entry & Editing)</option>
                            <option value="Admin">Admin (Full Control & User Management)</option>
                        </select>
                        
                        {/* Dynamic Help Text based on selected role */}
                        <p className="text-xs text-gray-500 mt-2 italic">
                            {formData.role === 'Admin' && "⚠️ Admins have full access to view, edit, delete data, and create other users."}
                            {formData.role === 'Officer' && "Officers can enter and edit daily production data but cannot manage users."}
                            {formData.role === 'Viewer' && "Viewers can only look at records and reports. They cannot change any data."}
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    className={`w-full h-14 mt-4 text-white font-bold rounded-lg text-lg transition-all shadow-md flex justify-center items-center gap-2 ${
                        loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1B6A31] hover:bg-[#145226] active:scale-95'
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