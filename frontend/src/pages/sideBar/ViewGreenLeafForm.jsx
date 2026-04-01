import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Leaf, Factory, Users, Zap, AlertCircle } from "lucide-react";

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

import { useNavigate } from 'react-router-dom';
 
export default function DailyRecordsView() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    
    const navigate = useNavigate(); 
    useEffect(() => {
        fetchMergedRecords();
    }, []);

    const fetchMergedRecords = async () => {
        setLoading(true); 
        
        try {
            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`),
                fetch(`${BACKEND_URL}/api/labour`)
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) throw new Error("Failed to fetch data");

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const mergedData = greenLeafData.map(gl => {
                const dateStr = new Date(gl.date).toISOString().split('T')[0];
                const prod = productionData.find(p => new Date(p.date).toISOString().split('T')[0] === dateStr);
                const lab = labourData.find(l => new Date(l.date).toISOString().split('T')[0] === dateStr);
                
                return {
                    date: dateStr,
                    greenLeafId: gl._id,
                    productionId: prod ? prod._id : null,
                    labourId: lab ? lab._id : null,
                    totalWeight: gl.totalWeight,
                    selectedWeight: gl.selectedWeight,
                    returnedWeight: gl.returnedWeight,
                    teaType: prod ? prod.teaType : '-',
                    madeTeaWeight: prod ? prod.madeTeaWeight : '-',
                    dryerName: prod?.dryerDetails?.dryerName || '-',
                    meterStart: prod?.dryerDetails?.meterStart || '-',
                    meterEnd: prod?.dryerDetails?.meterEnd || '-',
                    units: prod?.dryerDetails?.units || '-',
                    workerCount: lab ? lab.workerCount : '-'
                };
            });

            mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(mergedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (record) => {
        console.log("Editing record:", record);
        toast('Edit feature coming soon!', {
            icon: '✍️',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        
        const { greenLeafId, productionId, labourId } = recordToDelete;
        const toastId = toast.loading('Deleting record...');
        
        try {
            const promises = [];
            if (greenLeafId) promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${greenLeafId}`, { method: 'DELETE' }));
            if (productionId) promises.push(fetch(`${BACKEND_URL}/api/production/${productionId}`, { method: 'DELETE' }));
            if (labourId) promises.push(fetch(`${BACKEND_URL}/api/labour/${labourId}`, { method: 'DELETE' }));

            await Promise.all(promises);
            toast.success("Record deleted successfully!", { id: toastId });
            
            fetchMergedRecords(); 
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null); 
    const handleDelete = async (greenLeafId, productionId, labourId, recordDate) => {
        if (window.confirm(`Are you sure you want to delete the record for ${recordDate}?`)) {
            const toastId = toast.loading('Deleting record...');
            try {
                const promises = [];
                if (greenLeafId) promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${greenLeafId}`, { method: 'DELETE' }));
                if (productionId) promises.push(fetch(`${BACKEND_URL}/api/production/${productionId}`, { method: 'DELETE' }));
                if (labourId) promises.push(fetch(`${BACKEND_URL}/api/labour/${labourId}`, { method: 'DELETE' }));

                await Promise.all(promises);
                toast.success("Record deleted successfully!", { id: toastId });
                fetchMergedRecords(); 
            } catch (error) {
                console.error("Delete Error:", error);
                toast.error("Failed to delete record.", { id: toastId });
            }
        }
    };


    const goToEditPage = (record) => {
        navigate('/edit-record', { state: { recordData: record } });
    };

    return (
        <div className="p-8 max-w-[1500px] mx-auto font-sans relative">
            <Toaster position="top-center" />
            
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2">
                        Daily Production Log
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Master overview of Green Leaf, Production, & Labour</p>
                </div>
                
                <button 
                    onClick={fetchMergedRecords}
                    disabled={loading}
                    className={`px-4 py-2 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all duration-300
                        ${loading ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'hover:bg-[#F8FAF8] hover:shadow-md'}
                    `}
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin text-[#4A9E46]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {loading ? 'Syncing...' : 'Sync Data'}
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden self-start w-full max-w-full">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading production records...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 align-bottom w-24">Date</th>
                                    <th colSpan="3" className="px-4 py-2 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 text-center">
                                        <div className="flex items-center justify-center gap-1"><Leaf size={14}/> Raw Material (kg)</div>
                                    </th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-purple-700 border-r border-gray-200 bg-purple-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Factory size={14}/> Output</div>
                                    </th>
                                    <th colSpan="4" className="px-4 py-2 font-bold text-orange-700 border-r border-gray-200 bg-orange-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Zap size={14}/> Machine Usage</div>
                                    </th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 align-bottom text-center">
                                        <div className="flex flex-col items-center gap-1"><Users size={14}/> Labour</div>
                                    </th>
                                    <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50">Action</th>
                                </tr>
                                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-200/60">Received</th>
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-200/60">Selected</th>
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-200">Return</th>
                                    <th className="px-3 py-2 font-medium bg-purple-50/50 text-center border-r border-gray-200/60">Type</th>
                                    <th className="px-3 py-2 font-medium bg-purple-50/50 text-center border-r border-gray-200">Made (kg)</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60">Dryer</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200/60">End</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-200">Units</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {records.length > 0 ? (
                                    records.map((record) => (
                                        <tr key={record.date} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-4 py-3 border-r border-gray-100">
                                                <span className="font-semibold text-gray-800">{record.date}</span>
                                            </td>
                                            
                                            <td className="px-3 py-3 text-center text-gray-600 border-r border-gray-100">{record.totalWeight}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                <span className="px-2 py-1 rounded-full bg-[#8CC63F]/20 text-[#1B6A31] font-bold text-xs">{record.selectedWeight}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-500">
                                                {record.returnedWeight > 0 ? record.returnedWeight : '-'}
                                            </td>
                                            
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                {record.teaType !== '-' ? <span className="text-purple-700 font-medium text-xs bg-purple-50 px-2 py-1 rounded border border-purple-100">{record.teaType}</span> : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                <span className="font-bold text-gray-800">{record.madeTeaWeight}</span>
                                            </td>
                                            
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-600">{record.dryerName}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-500 text-xs">{record.meterStart}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100 text-gray-500 text-xs">{record.meterEnd}</td>
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                {record.units !== '-' ? <span className="font-bold text-orange-600">{record.units}</span> : '-'}
                                            </td>
                                            
                                            <td className="px-3 py-3 text-center border-r border-gray-100">
                                                {record.workerCount !== '-' ? <span className="font-bold text-blue-700">{record.workerCount}</span> : '-'}
                                            </td>
                                            
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* REMOVED opacity classes so buttons are always visible */}
                                                    <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-[#1B6A31] hover:bg-[#8CC63F]/20 rounded transition-all" title="Edit Record">
                                                        <MdOutlineEdit size={20} />
                                                    </button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Delete Record">
                                                                <MdOutlineDeleteOutline size={20} />
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        
                                                        <AlertDialogContent className="bg-white rounded-2xl border-gray-100 shadow-xl max-w-md">
                                                            <AlertDialogHeader>
                                                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200">
                                                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                                                </div>
                                                                <AlertDialogTitle className="text-xl font-bold text-gray-900">Delete Production Record</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-gray-500 text-base">
                                                                    Are you sure you want to permanently delete the production data for <span className="font-bold text-gray-800 ml-1">{record.date}</span>?<br/><br/>
                                                                    This will remove the associated Green Leaf, Labour, and Production metrics. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-6">
                                                                <AlertDialogCancel onClick={() => setRecordToDelete(null)} className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-6 font-semibold">Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 font-semibold shadow-sm transition-colors">Delete Record</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="12" className="p-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <AlertCircle size={40} className="mb-3 opacity-20" />
                                                <p className="text-lg font-medium text-gray-500">No records found</p>
                                                <p className="text-sm mt-1">Start by adding data from the entry forms.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}