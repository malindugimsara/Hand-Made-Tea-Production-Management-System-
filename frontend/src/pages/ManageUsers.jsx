import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, UserPlus, Edit, Trash2, X } from "lucide-react";

export default function ManageUsers() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State for Editing Users
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({ username: '', role: '', password: '' });

    useEffect(() => {
        // Grab the role using the correct key ('userRole')
        // We use || localStorage.getItem('role') just as a fallback in case it was saved differently!
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
    const handleDelete = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to permanently delete user: ${username}?`)) return;

        const toastId = toast.loading("Deleting user...");
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
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
        }
    };

    // --- EDIT LOGIC ---
    const openEditModal = (user) => {
        setEditingUser(user._id);
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
                toast.success("User updated successfully!", { id: toastId });
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
        <div className="p-8 max-w-5xl mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center gap-3">
                        <Users size={32} /> User Management
                    </h2>
                    <p className="text-gray-500 mt-2 font-medium">Administer system access and roles</p>
                </div>
                {/* Button to navigate to the Create User page you made earlier */}
                <button 
                    onClick={() => navigate('/create-user')}
                    className="bg-[#1B6A31] hover:bg-green-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <UserPlus size={20} /> Add New User
                </button>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500">Loading users...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-bold">Username</th>
                                <th className="px-6 py-4 font-bold">System Role</th>
                                <th className="px-6 py-4 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1
                                            ${user.role === 'Admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                                              user.role === 'Officer' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                              'bg-gray-100 text-gray-700 border-gray-300'}`}
                                        >
                                            {user.role === 'Admin' && <Shield size={12}/>}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-3">
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user._id, user.username)}
                                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                        <button 
                            onClick={() => setEditingUser(null)} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
                        >
                            <X size={24} />
                        </button>
                        
                        <h3 className="text-2xl font-bold text-[#1B6A31] mb-6">Edit User Details</h3>
                        
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    value={editFormData.username}
                                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                                <select 
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none"
                                >
                                    <option value="Viewer">Viewer</option>
                                    <option value="Officer">Officer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Reset Password <span className="font-normal text-gray-400">(Optional)</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Leave blank to keep current password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#8CC63F] outline-none" 
                                />
                            </div>
                            <button type="submit" className="w-full mt-4 bg-[#1B6A31] hover:bg-green-800 text-white font-bold py-3 rounded-lg transition-colors">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}