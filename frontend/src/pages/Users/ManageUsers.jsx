import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, UserPlus, Edit, Trash2, X, AlertCircle } from "lucide-react";

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

export default function ManageUsers() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State for Editing Users
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({ username: '', role: '', password: '' });

    // Delete State
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
                fetchUsers(); // Refresh list
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
        // Backend එක password එක හිස්ව ආවොත් skip කරන නිසා මෙතන password: '' ලෙස තැබීම නිවැරදියි
        setEditFormData({ username: user.username, role: user.role, password: '' });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
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
                setEditingUser(null); // Close modal
                fetchUsers(); // Refresh list
            } else {
                toast.error(data.message || "Failed to update.", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error.", { id: toastId });
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans relative min-h-screen bg-transparent transition-colors duration-300 border border-gray-200 dark:border-zinc-800 rounded-xl mt-5">

            
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 dark:border-zinc-800 pb-4 transition-colors">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-3">
                        <Users size={32} /> User Management
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Administer system access and roles</p>
                </div>
                {/* Button to navigate to the Create User page you made earlier */}
                <button 
                    onClick={() => navigate('/create-user')}
                    className="bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <UserPlus size={20} /> Add New User
                </button>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500 dark:text-gray-400">Loading users...</div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 transition-colors">
                                <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-800/60">Username</th>
                                <th className="px-6 py-4 font-bold border-r border-gray-200 dark:border-zinc-800/60">System Role</th>
                                <th className="px-6 py-4 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-zinc-800/60">{user.username}</td>
                                    <td className="px-6 py-4 border-r border-gray-100 dark:border-zinc-800/60">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1 transition-colors
                                            ${user.role === 'Admin' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' : 
                                              user.role === 'HandMade Officer' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 
                                              user.role === 'Packing Officer' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50' :
                                              'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-zinc-700'}`}
                                        >
                                            {user.role === 'Admin' && <Shield size={12}/>}
                                            {user.role}
                                        </span>
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
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-gray-200 dark:border-zinc-800 transition-colors duration-300">
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
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                <select 
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                                >
                                    <option value="Viewer">Viewer</option>
                                    <option value="HandMade Officer">HandMade Officer</option>
                                    <option value="Packing Officer">Packing Officer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Reset Password <span className="font-normal text-gray-400 dark:text-gray-500">(Optional)</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Leave blank to keep current password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                                    className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#8CC63F] dark:focus:ring-green-600 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 transition-colors" 
                                />
                            </div>
                            <button type="submit" className="w-full mt-4 bg-[#1B6A31] hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}