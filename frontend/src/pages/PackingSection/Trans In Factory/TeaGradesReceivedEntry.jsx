import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { PlusCircle, Trash2, ListChecks, Save, Package, ShoppingCart, Calendar, Tag, X, FileText, ArrowRightCircle } from "lucide-react"; 
import { useNavigate } from 'react-router-dom';

const getTeaColor = (grade) => {
    const p = grade.toLowerCase();
    if (p === 'bopf') return 'bg-[#fde047] text-yellow-900 border-yellow-500'; 
    if (p.includes('bopf sp')) return 'bg-[#bef264] text-lime-900 border-lime-500'; 
    if (p === 'dust') return 'bg-[#3b82f6] text-white border-blue-600'; 
    if (p === 'dust 1') return 'bg-[#06b6d4] text-white border-cyan-500'; 
    if (p.includes('premium')) return 'bg-[#f472b6] text-white border-pink-500'; 
    if (p.includes('awrudu')) return 'bg-[#c084fc] text-white border-purple-500'; 
    if (p.includes('green')) return 'bg-[#4ade80] text-green-900 border-green-600'; 
    return 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700'; 
};

const TEA_TYPES = [
    "BOPF SP", "BOPF", "OPA", "OP 1", "OP", "Pekoe", "BOP", "FBOP", 
    "FF SP", "FF EX SP", "Dust", "Dust 1", "Premium", "Green tea", 
    "Awurudu Special"
];

export default function TeaGradesReceivedEntry() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [showSpinner, setShowSpinner] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        transactionNo: '',
    });
    const [itemsList, setItemsList] = useState([{ id: Date.now(), grade: '', qtyKg: '' }]);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const dropdownRefs = useRef({}); 

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
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username') || "Packing Staff";

            const promises = pendingRecords.map(record => {
                const payload = {
                    date: record.date,
                    transactionNo: `HO/TO/${record.transactionNo}`,
                    totalQtyKg: record.totalQtyKg,
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
            toast.success("All records saved successfully!", { id: toastId });
            setPendingRecords([]);
            
            // Navigate to view page after successful save
            setTimeout(() => {
                navigate('/packing/tea-received-records');
            }, 1500);

        } catch (error) {
            console.error(error);
            toast.error("Error saving records. Please check the terminal.", { id: toastId });
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
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Add incoming tea grades to Packing inventory.</p>
                </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    {/* --- LEFT SIDE: MANUAL ENTRY FORM --- */}
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
                                <PlusCircle size={18} /> Add To Queue
                            </button>
                        </form>
                    </div>

                    {/* --- RIGHT SIDE: QUEUE --- */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[60vh] transition-colors duration-300">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-600 dark:text-gray-400">
                                        <ListChecks size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Save Queue</h3>
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
                                        showSpinner || pendingRecords.length === 0 ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed' : 'bg-[#0f766e] hover:bg-[#0d9488]'
                                    }`}
                                >
                                    <Save size={18} /> {showSpinner ? "Saving..." : "Save Records"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}