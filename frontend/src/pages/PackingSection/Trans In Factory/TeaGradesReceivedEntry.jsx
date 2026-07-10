import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Trash2, ListChecks, Save, Package, ShoppingCart, Calendar, Weight, Tag, X, FileText, CheckCircle2, AlertCircle, ArrowRightCircle, RefreshCw } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';
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

const getTeaColor = (grade) => {
    const p = grade.toLowerCase();
    if (p === 'bopf') return 'bg-[#fde047] text-yellow-900 border-yellow-500'; 
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p === 'dust') return 'bg-[#3b82f6] text-white border-blue-600'; 
    if (p === 'dust 1') return 'bg-[#06b6d4] text-white border-cyan-500'; 
    if (p.includes('premium')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awrudu')) return 'bg-[#c084fc] text-white border-purple-500'; 
    if (p.includes('green')) return 'bg-[#4ade80] text-green-900 border-green-600'; 
    if (p.includes('local sale (auto)')) return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700'; 
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700'; 
};

const TEA_TYPES = [
    "BOPF SP", "BOPF", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Awurudu Special", "Local Sale (Auto)"
];

// Helper function to remove "Local Sale", "(Auto)" and extra hyphens from the name
const getCleanTeaName = (grade, teaType) => {
    let name = teaType && teaType.trim() !== "" ? teaType : grade;
    return name.replace(/Local Sale/gi, '').replace(/\(Auto\)/gi, '').replace(/-/g, '').trim() || grade;
};

export default function TeaGradesReceivedEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    
    const [factoryTransfers, setFactoryTransfers] = useState([]);
    const [isFetchingPending, setIsFetchingPending] = useState(true);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [receivedWeight, setReceivedWeight] = useState("");
    const [acceptingId, setAcceptingId] = useState(null);

    const [showSpinner, setShowSpinner] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        transactionNo: '',
    });
    const [itemsList, setItemsList] = useState([{ id: Date.now(), grade: '', qtyKg: '' }]);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const dropdownRefs = useRef({}); 

    const [transferToRemove, setTransferToRemove] = useState(null);

    useEffect(() => {
        fetchPendingTransfers();
    }, []);

    const fetchPendingTransfers = async () => {
        setIsFetchingPending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/api/tea-received/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFactoryTransfers(data);
                setSelectedTransfer(null);
                setReceivedWeight("");
            }
        } catch (error) {
            console.error("Error fetching pending transfers:", error);
            toast.error("Failed to load pending transfers from factory.");
        } finally {
            setIsFetchingPending(false);
        }
    };

    const handleSelectTransfer = (transfer) => {
        setSelectedTransfer(transfer);
        setReceivedWeight(transfer.sentQtyKg);
    };

    const confirmRejectTransfer = async () => {
        if (!transferToRemove) return;

        const toastId = toast.loading("Removing transfer...");
        try {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username') || "Packing Officer";

            // Database එකේ Reject කරලා Status එක update කරනවා
            const res = await fetch(`${BACKEND_URL}/api/tea-received/reject`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ transferId: transferToRemove, username })
            });

            if (!res.ok) throw new Error("Failed to reject transfer");

            toast.success("Transfer removed successfully!", { id: toastId });
            
            // Queue එකෙන් අයින් කරනවා
            setFactoryTransfers(prev => prev.filter(t => t._id !== transferToRemove));
            
            // අයින් කරපු එකම දකුණු පැත්තේ Form එකේ තේරිලා තියෙනවා නම් ඒකත් clear කරනවා
            if (selectedTransfer && selectedTransfer._id === transferToRemove) {
                setSelectedTransfer(null);
                setReceivedWeight("");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error removing transfer.", { id: toastId });
        } finally {
            setTransferToRemove(null); // Process එක ඉවර උනාම state එක clear කරනවා
        }
    };

    const handleAcceptTransfer = async (e) => {
        e.preventDefault();
        
        if (!receivedWeight || Number(receivedWeight) <= 0) {
            toast.error("Please enter a valid received quantity.");
            return;
        }

        setAcceptingId(selectedTransfer._id);
        const toastId = toast.loading(`Accepting transfer ${selectedTransfer.transferNo}...`);

        try {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username') || "Packing Officer";
            
            // 🌟 අලුත්: පිරිසිදු කරපු නම කෙලින්ම backend එකට යැවීම 🌟
            const cleanName = getCleanTeaName(selectedTransfer.grade, selectedTransfer.teaType);

            const res = await fetch(`${BACKEND_URL}/api/tea-received/accept`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    transferId: selectedTransfer._id,
                    receivedQtyKg: Number(receivedWeight),
                    username: username,
                    cleanProductName: cleanName // Send explicit clean name
                })
            });

            if (!res.ok) throw new Error("Failed to accept transfer");

            toast.success("Stock received and updated successfully!", { id: toastId });
            
            setFactoryTransfers(prev => prev.filter(t => t._id !== selectedTransfer._id));
            setSelectedTransfer(null);
            setReceivedWeight("");

        } catch (error) {
            console.error(error);
            toast.error("Error accepting transfer.", { id: toastId });
        } finally {
            setAcceptingId(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            let isOutside = true;
            Object.values(dropdownRefs.current).forEach(ref => {
                if (ref && ref.contains(event.target)) {
                    isOutside = false;
                }
            });
            if (isOutside) setOpenDropdownId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddItemRow = () => setItemsList([...itemsList, { id: Date.now(), grade: '', qtyKg: '' }]);
    const handleRemoveItemRow = (idToRemove) => {
        if (itemsList.length === 1) return; 
        setItemsList(itemsList.filter(row => row.id !== idToRemove));
    };
    const handleItemChange = (id, field, value) => {
        if (field === 'qtyKg' && value !== '' && (Number(value) < 0 || value.includes('-'))) return;
        setItemsList(itemsList.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const totalQtyKg = itemsList.reduce((sum, row) => sum + (Number(row.qtyKg) || 0), 0);

    const handleAddToList = (e) => {
        e.preventDefault();
        if (!formData.transactionNo.trim()) return toast.error("Please enter a Transaction No!");
        const hasEmptyItem = itemsList.some(row => !row.grade || row.qtyKg === '');
        if (hasEmptyItem) return toast.error("Please fill out all Grade and Qty details completely!");

        const newRecord = { 
            date: formData.date,
            transactionNo: formData.transactionNo,
            items: itemsList.map(item => ({ ...item })),
            totalQtyKg
        };

        setPendingRecords([...pendingRecords, newRecord]);
        toast.success(`Record added to list!`);
        setItemsList([{ id: Date.now(), grade: '', qtyKg: '' }]);
        setFormData(prev => ({ ...prev, transactionNo: '' }));
    };

    const handleRemoveFromList = (indexToRemove) => setPendingRecords(pendingRecords.filter((_, index) => index !== indexToRemove));

    const handleSaveAllManual = async () => {
        if (pendingRecords.length === 0) return toast.error("No records in the list to save!");
        setShowSpinner(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} manual records...`);

        try {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username') || "Packing Staff";

            const promises = pendingRecords.map(record => {
                const payload = {
                    date: record.date,
                    transactionNo: `HO/TO/${record.transactionNo}`,
                    totalQtyKg: record.totalQtyKg,
                    
                    // 🌟 මෙතන තමයි වෙනස: teaType එක අනිවාර්යයෙන් යැවිය යුතුයි 🌟
                    receivedItems: record.items.map(item => ({ 
                        grade: item.grade, 
                        teaType: item.grade, 
                        qtyKg: Number(item.qtyKg) 
                    })),
                    username: username 
                };
                
                return fetch(`${BACKEND_URL}/api/tea-received/manual`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.message || 'Failed');
                    }
                    return res.json();
                });
            });

            await Promise.all(promises);
            toast.success("All manual records saved successfully!", { id: toastId });
            setPendingRecords([]);
        } catch (error) {
            console.error(error);
            toast.error("Error saving manual records. Please check the terminal.", { id: toastId });
        } finally {
            setShowSpinner(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400 flex items-center gap-3">
                        <ArrowRightCircle size={28} /> Trans In (Factory)
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Verify and accept incoming tea grades from Main Factory.</p>
                </div>
                <button 
                    onClick={fetchPendingTransfers} 
                    disabled={isFetchingPending} 
                    className={`px-4 py-2.5 bg-white dark:bg-zinc-900 text-[#0f766e] dark:text-teal-400 border border-teal-200 dark:border-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${isFetchingPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-zinc-800'}`}
                >
                    <RefreshCw size={18} className={isFetchingPending ? 'animate-spin' : ''} /> Check For New Stock
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                
                {/* --- LEFT SIDE: PENDING LIST --- */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                        <AlertCircle size={18} className="text-orange-500" /> Waiting For Packing Approval
                    </h3>
                    
                    {isFetchingPending ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700">Loading incoming stock...</div>
                    ) : factoryTransfers.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                            <CheckCircle2 size={48} className="mb-4 text-[#0f766e] opacity-50" />
                            <p className="font-bold text-lg">All caught up!</p>
                            <p className="text-sm mt-1">No pending stock transfers from the Factory.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
                            {factoryTransfers.map((transfer) => (
                                <div 
                                    key={transfer._id} 
                                    className={`p-4 rounded-xl border-2 transition-all shadow-sm ${
                                        selectedTransfer?._id === transfer._id 
                                        ? 'border-[#0f766e] dark:border-teal-500 bg-[#f0fdfa] dark:bg-teal-900/20' 
                                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shadow-sm ${getTeaColor(transfer.grade)}`}>
                                            {getCleanTeaName(transfer.grade, transfer.teaType)}
                                        </span>
                                        <span className="text-xs font-black text-gray-600 dark:text-gray-300">{transfer.sentQtyKg} Kg</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2 mt-2 font-medium">
                                        <Calendar size={12}/> Sent: {new Date(transfer.date).toISOString().split('T')[0]} | Ref: {transfer.transferNo}
                                    </p>
                                    
                                    {/* 🌟 අලුත්: Accept & Remove Buttons (With Confirmation Dialog) 🌟 */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button 
                                                    onClick={() => setTransferToRemove(transfer._id)}
                                                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <X size={14} /> Remove
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-[90vw]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl font-bold dark:text-gray-100">Remove Transfer</AlertDialogTitle>
                                                    <AlertDialogDescription className="dark:text-gray-400">
                                                        Are you sure you want to remove this stock transfer? It will be marked as rejected and permanently removed from your queue.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel 
                                                        onClick={() => setTransferToRemove(null)} 
                                                        className="dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700 rounded-xl"
                                                    >
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={confirmRejectTransfer} 
                                                        className="bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-800 rounded-xl"
                                                    >
                                                        Yes, Remove
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <button 
                                            onClick={() => handleSelectTransfer(transfer)}
                                            className="flex-1 py-2 bg-[#0f766e]/10 hover:bg-[#0f766e]/20 text-[#0f766e] dark:bg-teal-900/20 dark:hover:bg-teal-900/40 dark:text-teal-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#0f766e]/20 dark:border-teal-800"
                                        >
                                            <CheckCircle2 size={14} /> Review
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- RIGHT SIDE: VERIFICATION FORM --- */}
                <div className="lg:col-span-2">
                    {!selectedTransfer ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-8">
                            <ListChecks size={64} className="mb-6 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">Select a transfer to verify</h3>
                            <p className="text-sm mt-2 max-w-md">Click "Review" on an incoming stock ticket on the left to review the weights and accept it into the Packing inventory.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleAcceptTransfer} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 flex flex-col transition-colors duration-300 h-full">
                            
                            <div className="border-b border-gray-100 dark:border-zinc-800 pb-5 mb-6 flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-[#0f766e] dark:text-teal-400">Verify Incoming Stock</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Transfer No: {selectedTransfer.transferNo}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Sent By</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedTransfer.factoryUsername || 'Factory Staff'}</p>
                                </div>
                            </div>

                            <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-xl overflow-hidden mb-8">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-teal-100/50 dark:bg-zinc-800/80 border-b border-teal-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200">
                                            <th className="px-4 py-3 font-bold">Grade</th>
                                            <th className="px-4 py-3 font-bold text-center">Factory Sent (Kg)</th>
                                            <th className="px-4 py-3 font-bold text-center text-[#0f766e] dark:text-teal-400">Actual Received (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-100 dark:divide-zinc-700/50">
                                        <tr className="hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-6 align-middle">
                                                <span className={`font-bold border px-3 py-1.5 rounded shadow-sm text-sm ${getTeaColor(selectedTransfer.grade)}`}>
                                                    {getCleanTeaName(selectedTransfer.grade, selectedTransfer.teaType)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-6 text-center align-middle font-bold text-gray-600 dark:text-gray-300 text-2xl">
                                                {Number(selectedTransfer.sentQtyKg).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-6 align-middle bg-[#f0fdfa] dark:bg-teal-900/10">
                                                <div className="flex flex-col items-center">
                                                    <div className="relative w-40">
                                                        <input 
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            value={receivedWeight}
                                                            onChange={(e) => setReceivedWeight(e.target.value)}
                                                            onWheel={(e) => e.target.blur()}
                                                            required
                                                            className={`w-full p-3 pr-10 border rounded-lg text-center font-bold text-xl focus:ring-2 outline-none transition-colors ${
                                                                Number(receivedWeight) === Number(selectedTransfer.sentQtyKg)
                                                                ? 'border-gray-300 dark:border-zinc-600 focus:ring-[#2dd4bf]/50 bg-white dark:bg-zinc-900 dark:text-gray-100' 
                                                                : 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 focus:ring-orange-400'
                                                            }`}
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Kg</span>
                                                    </div>
                                                    
                                                    {Number(receivedWeight) !== Number(selectedTransfer.sentQtyKg) && receivedWeight !== "" && (
                                                        <span className="text-xs font-bold mt-2 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded">
                                                            Difference: {(Number(receivedWeight) - Number(selectedTransfer.sentQtyKg)) > 0 ? '+' : ''}{(Number(receivedWeight) - Number(selectedTransfer.sentQtyKg)).toFixed(2)} Kg
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <button 
                                type="submit" 
                                disabled={acceptingId === selectedTransfer._id}
                                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all mt-auto ${
                                    acceptingId === selectedTransfer._id 
                                    ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-[#0d9488]/40 hover:-translate-y-1'
                                }`}
                            >
                                <CheckCircle2 size={24} /> {acceptingId === selectedTransfer._id ? "Processing..." : "Confirm & Complete Trans In"}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* --- MANUAL ENTRY --- */}
            {/* ... Your Existing Manual Entry code ... */}
            <div className="pt-8 border-t border-gray-200 dark:border-zinc-800">
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
                    <FileText size={20} /> Manual Entry (Other Receipts)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    <div className="lg:col-span-3">
                        <form onSubmit={handleAddToList} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
                            
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar size={16} className="text-[#0d9488]"/> Date
                                    </label>
                                    <input 
                                        type="date" 
                                        name="date" 
                                        value={formData.date} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={16} className="text-[#0d9488]"/> Transaction No
                                    </label>
                                    <div className="flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 sm:text-sm font-bold">
                                            HO/TO/
                                        </span>
                                        <input 
                                            type="text" 
                                            name="transactionNo" 
                                            value={formData.transactionNo} 
                                            onChange={handleInputChange} 
                                            placeholder="000851"
                                            required 
                                            className="flex-1 block w-full min-w-0 p-3 rounded-none rounded-r-md border border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8 bg-gray-50 dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-700 rounded-lg p-6 transition-colors duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <ShoppingCart size={20} /> Items Received
                                    </h3>
                                </div>

                                <div className="space-y-6">
                                    {itemsList.map((row) => (
                                        <div key={row.id} className="relative bg-white dark:bg-zinc-950 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                                            
                                            {itemsList.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItemRow(row.id)}
                                                    className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative" ref={el => dropdownRefs.current[`grade-${row.id}`] = el}>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                                                        <Tag size={12} className="text-[#0d9488] dark:text-teal-400"/> Grade
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. BOPF SP"
                                                        value={row.grade}
                                                        onChange={(e) => handleItemChange(row.id, 'grade', e.target.value)}
                                                        onFocus={() => setOpenDropdownId(`grade-${row.id}`)}
                                                        required
                                                        className={`w-full p-2.5 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.grade ? getTeaColor(row.grade) : 'bg-white dark:bg-zinc-950 dark:text-gray-100'}`}
                                                    />
                                                    
                                                    {openDropdownId === `grade-${row.id}` && (
                                                        <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar">
                                                            {TEA_TYPES
                                                                .filter(tea => tea.toLowerCase().includes(row.grade.toLowerCase()))
                                                                .map((tea, idx) => (
                                                                <li 
                                                                    key={idx} 
                                                                    onMouseDown={(e) => e.preventDefault()} 
                                                                    onClick={() => {
                                                                        handleItemChange(row.id, 'grade', tea);
                                                                        setOpenDropdownId(null);
                                                                    }}
                                                                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2"
                                                                >
                                                                    <div className={`w-3 h-3 rounded-full ${getTeaColor(tea)} border border-white/20`}></div> {tea}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase whitespace-nowrap">Qty (KG)</label>
                                                    <input 
                                                        type="number" 
                                                        step="any"
                                                        min="0"
                                                        value={row.qtyKg} 
                                                        onChange={(e) => handleItemChange(row.id, 'qtyKg', e.target.value)}
                                                        onWheel={(e) => e.target.blur()} 
                                                        required 
                                                        placeholder="e.g. 5.5"
                                                        className="w-full p-2.5 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end w-full">
                                    <button 
                                        type="button" 
                                        onClick={handleAddItemRow}
                                        className="text-sm mt-4 font-bold bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <PlusCircle size={16} /> Add Grade
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 border-t border-gray-200 dark:border-zinc-700 pt-4">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <Package size={16}/> Total Weight: <span className="font-bold text-lg">{Number(totalQtyKg.toFixed(4))} Kg</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full py-3 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 font-bold flex justify-center items-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                            >
                                <PlusCircle size={18} /> Add To Manual Queue
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[60vh] transition-colors duration-300">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-400">
                                        <ListChecks size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Manual Queue</h3>
                                </div>
                                <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-3 py-1 rounded-full">
                                    {pendingRecords.length} Items
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[150px]">
                                {pendingRecords.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8">
                                        <ListChecks size={32} className="mb-2 opacity-20" />
                                        <p className="text-sm font-medium">Queue is empty.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingRecords.map((record, index) => (
                                            <div key={index} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group">
                                                <button 
                                                    onClick={() => handleRemoveFromList(index)}
                                                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="flex flex-col gap-2 pr-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-gray-800 dark:text-gray-200">{record.date}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 border border-gray-300 dark:border-zinc-600 px-2 py-0.5 rounded">HO/TO/{record.transactionNo}</span>
                                                    </div>
                                                    
                                                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-gray-100 dark:border-zinc-700/50 text-xs mt-1">
                                                        <div className="space-y-2 mb-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
                                                            {record.items.map((item, i) => (
                                                                <div key={i} className="flex justify-between items-center text-[11px]">
                                                                    <span className={`font-bold border px-2 py-0.5 rounded shadow-sm text-[10px] ${getTeaColor(item.grade)}`}>{item.grade}</span>
                                                                    <span className="font-bold text-gray-600 dark:text-gray-300">{Number(item.qtyKg).toFixed(2)} kg</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-between items-center font-bold">
                                                            <span className="text-gray-500 uppercase text-[10px]">Total:</span>
                                                            <span className="text-gray-800 dark:text-gray-200">{record.totalQtyKg.toFixed(2)} Kg</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                                <button 
                                    onClick={handleSaveAllManual}
                                    disabled={showSpinner || pendingRecords.length === 0}
                                    className={`w-full py-3.5 rounded-xl text-white font-bold flex justify-center items-center gap-2 shadow-sm transition-all ${
                                        showSpinner || pendingRecords.length === 0 ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-900 dark:bg-zinc-700 dark:hover:bg-zinc-600'
                                    }`}
                                >
                                    <Save size={18} /> {showSpinner ? "Saving..." : "Save Manual Records"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}