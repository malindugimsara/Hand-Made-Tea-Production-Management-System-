import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { Leaf, Factory, Users, Zap, AlertCircle, RefreshCw } from "lucide-react";
import PDFDownloader from '@/components/PDFDownloader';

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

export default function ViewGreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    // --- ROLE BASED ACCESS CONTROL ---
    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    // Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teaType, setTeaType] = useState('All');
    const [dryerType, setDryerType] = useState('All');

    const navigate = useNavigate(); 
    
    useEffect(() => {
        fetchMergedRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMergedRecords = async () => {
        setLoading(true); 
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/labour`, { headers: authHeaders })
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) {
                throw new Error("Failed to fetch data. Check your login token.");
            }

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const glUsage = {};
            const labUsage = {};

            const mergedData = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                
                const glsForDate = greenLeafData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const labsForDate = labourData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                const gl = glsForDate[glUsage[dateStr]] || null;
                const lab = labsForDate[labUsage[dateStr]] || null;

                glUsage[dateStr]++;
                labUsage[dateStr]++;
                
                return {
                    date: dateStr,
                    greenLeafId: gl ? gl._id : null,
                    productionId: prod._id, 
                    labourId: lab ? lab._id : null,
                    totalWeight: gl ? gl.totalWeight : 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    returnedWeight: gl ? gl.returnedWeight : 0,
                    teaType: prod.teaType || '-',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    dryerName: prod?.dryerDetails?.dryerName || '-',
                    meterStart: prod?.dryerDetails?.meterStart ?? '-',
                    meterEnd: prod?.dryerDetails?.meterEnd ?? '-',
                    units: prod?.dryerDetails?.units ?? 0,
                    dryerUpdatedDate: (prod?.dryerDetails?.dryerName && prod.updatedAt) 
                        ? new Date(prod.updatedAt).toISOString().split('T')[0] 
                        : '-',
                    workerCount: lab ? lab.workerCount : 0
                };
            });

            mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(mergedData);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error(error.message || "Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRecords = records.filter(record => {
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const typeMatch = teaType === 'All' || record.teaType === teaType;
        const dryerMatch = dryerType === 'All' || record.dryerName === dryerType;
        return dateMatch && typeMatch && dryerMatch;
    });

    // Grouping Overlapped Dryer Records
    const groupMap = {};
    filteredRecords.forEach(r => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.date}_${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            if (!groupMap[key]) {
                groupMap[key] = { count: 0, color: '' };
            }
            groupMap[key].count += 1;
        }
    });

    const highlightColors = ['bg-green-200/80', 'bg-yellow-200/80', 'bg-purple-200/80', 'bg-blue-200/80', 'bg-pink-200/80', 'bg-orange-200/80'];
    let colorIndex = 0;

    Object.keys(groupMap).forEach(key => {
        if (groupMap[key].count > 1) {
            groupMap[key].color = highlightColors[colorIndex % highlightColors.length];
            colorIndex++;
        }
    });

    // ACCURATE TOTAL CALCULATION
    const totalGL = filteredRecords.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
    const totalSelectedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.selectedWeight) || 0), 0);
    const totalReturnedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.returnedWeight) || 0), 0);
    const totalMadeTea = filteredRecords.reduce((sum, r) => sum + (Number(r.madeTeaWeight) || 0), 0);
    const totalLabour = filteredRecords.reduce((sum, r) => sum + (Number(r.workerCount) || 0), 0);

    const totalUnits = filteredRecords.reduce((sum, r) => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.date}_${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            const count = groupMap[key]?.count || 1;
            return sum + ((Number(r.units) || 0) / count);
        }
        return sum + (Number(r.units) || 0);
    }, 0);

    const handleEditClick = (record) => {
        navigate('/edit-record', { state: { recordData: record } });
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        const { greenLeafId, productionId, labourId } = recordToDelete;
        const toastId = toast.loading('Deleting record...');
        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            const promises = [];
            if (greenLeafId) promises.push(fetch(`${BACKEND_URL}/api/green-leaf/${greenLeafId}`, { method: 'DELETE', headers: authHeaders }));
            if (productionId) promises.push(fetch(`${BACKEND_URL}/api/production/${productionId}`, { method: 'DELETE', headers: authHeaders }));
            if (labourId) promises.push(fetch(`${BACKEND_URL}/api/labour/${labourId}`, { method: 'DELETE', headers: authHeaders }));

            await Promise.all(promises);
            toast.success("Record deleted successfully!", { id: toastId });
            fetchMergedRecords(); 
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Failed to delete record.", { id: toastId });
        } finally {
            setRecordToDelete(null);
        }
    };

    // -------------------------------------------------------------
    // PREPARE PDF DATA
    // -------------------------------------------------------------
    const getPdfData = () => {
        const tableRows = filteredRecords.map(record => {
            let displayUnits = record.units;
            if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                const key = `${record.date}_${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                const groupInfo = groupMap[key];
                if (groupInfo && groupInfo.count > 1) {
                    const adjustedUnits = Number(record.units) / groupInfo.count;
                    displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                }
            }

            const pdfDryerName = record.dryerName !== '-' 
                ? `${record.dryerName}\n(${record.dryerUpdatedDate})` 
                : '-';

            return [
                record.date,
                record.totalWeight,
                record.selectedWeight,
                record.returnedWeight > 0 ? record.returnedWeight : '-',
                record.teaType,
                record.madeTeaWeight,
                pdfDryerName,
                record.meterStart,
                record.meterEnd,
                displayUnits !== '-' ? displayUnits : '-',
                record.workerCount !== '-' ? record.workerCount : '-'
            ];
        });

        tableRows.push([
            "GRAND TOTAL",
            totalGL.toFixed(2),
            totalSelectedGL.toFixed(2),
            totalReturnedGL.toFixed(2),
            "-",
            totalMadeTea.toFixed(3),
            "-",
            "-",
            "-",
            Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2),
            totalLabour
        ]);

        return tableRows;
    };

    return (
        <div className="p-8 max-w-[1500px] mx-auto font-sans relative">
            
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2">Daily Production Log</h2>
                    <p className="text-sm text-gray-500 mt-1">Master overview of Green Leaf, Production, & Labour</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Daily Production Log"
                        subtitle={`Filters Applied -> Date: ${startDate || 'All'} to ${endDate || 'All'} | Tea: ${teaType} | Dryer: ${dryerType}`}
                        headers={["Date", "Received GL", "Selected GL", "Return GL", "Tea Type", "Made Tea", "Dryer", "Start Meter", "End Meter", "Units", "Labour"]}
                        data={getPdfData()}
                        fileName={`Production_Log_${new Date().toISOString().split('T')[0]}.pdf`}
                        orientation="landscape"
                        disabled={loading || filteredRecords.length === 0}
                    />

                    <button 
                        onClick={fetchMergedRecords}
                        disabled={loading}
                        className={`px-4 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8]'}`}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Sync Data
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-300 shadow-sm">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">FROM DATE</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#8CC63F]" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">TO DATE</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#8CC63F]" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">TEA TYPE</label>
                    <select value={teaType} onChange={(e) => setTeaType(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#8CC63F]">
                        <option value="All">All Types</option>
                        <option value="Purple Tea">Purple Tea</option>
                        <option value="Pink Tea">Pink Tea</option>
                        <option value="White Tea">White Tea</option>
                        <option value="Silver Tips">Silver Tips</option>
                        <option value="Silver Green">Silver Green</option>
                        <option value="VitaGlow Tea">VitaGlow Tea</option>
                        <option value="Slim Beauty">Slim Beauty</option>
                        <option value="Golden Tips">Golden Tips</option>
                        <option value="Flower">Flower</option>
                        <option value="Chakra">Chakra</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500">DRYER</label>
                    <select value={dryerType} onChange={(e) => setDryerType(e.target.value)} className="border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#8CC63F]">
                        <option value="All">All Dryers</option>
                        <option value="Dryer 1">Dryer 1</option>
                        <option value="Dryer 2">Dryer 2</option>
                    </select>
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden self-start w-full max-w-full">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
                        <p className="font-medium">Loading production records...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-300">
                                    <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-300 align-bottom w-24">Date</th>
                                    <th colSpan="3" className="px-4 py-2 font-bold text-[#1B6A31] border-r border-gray-300 bg-[#8CC63F]/10 text-center">
                                        <div className="flex items-center justify-center gap-1"><Leaf size={14}/> Raw Material (kg)</div>
                                    </th>
                                    <th colSpan="2" className="px-4 py-2 font-bold text-purple-700 border-r border-gray-300 bg-purple-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Factory size={14}/> Output</div>
                                    </th>
                                    <th colSpan="4" className="px-4 py-2 font-bold text-orange-700 border-r border-gray-300 bg-orange-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Zap size={14}/> Machine Usage</div>
                                    </th>
                                    <th rowSpan="2" className="px-4 py-3 font-bold text-blue-700 border-r border-gray-300 bg-blue-50 align-bottom text-center">
                                        <div className="flex flex-col items-center gap-1"><Users size={14}/> Labour</div>
                                    </th>
                                    
                                    {!isViewer && (
                                        <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50">Action</th>
                                    )}
                                </tr>
                                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-300">
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-300">Received</th>
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-300">Selected</th>
                                    <th className="px-3 py-2 font-medium bg-[#8CC63F]/5 text-center border-r border-gray-300">Return</th>
                                    <th className="px-3 py-2 font-medium bg-purple-50/50 text-center border-r border-gray-300">Type</th>
                                    <th className="px-3 py-2 font-medium bg-purple-50/50 text-center border-r border-gray-300">Made (kg)</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-300">Dryer</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-300">Start</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-300">End</th>
                                    <th className="px-3 py-2 font-medium bg-orange-50/50 text-center border-r border-gray-300">Units</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-300">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => {
                                        let isShared = false;
                                        let highlightClass = '';
                                        let displayUnits = record.units;

                                        if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                                            const key = `${record.date}_${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                                            const groupInfo = groupMap[key];
                                            
                                            if (groupInfo && groupInfo.count > 1) {
                                                isShared = true;
                                                highlightClass = groupInfo.color;
                                                const adjustedUnits = Number(record.units) / groupInfo.count;
                                                displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                                            }
                                        }

                                        return (
                                            <tr key={record.productionId} className="hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-4 py-3 border-r border-gray-300">
                                                    <span className="font-semibold text-gray-800">{record.date}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-600 border-r border-gray-300">{record.totalWeight}</td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300">
                                                    <span className="px-2 py-1 rounded-full bg-[#8CC63F]/20 text-[#1B6A31] font-bold text-xs">{record.selectedWeight}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300 text-gray-500">
                                                    {record.returnedWeight > 0 ? record.returnedWeight : '-'}
                                                </td>
                                                
                                                <td className="px-3 py-3 text-center border-r border-gray-300">
                                                    {record.teaType !== '-' ? <span className="text-purple-700 font-medium text-xs bg-purple-50 px-2 py-1 rounded border border-purple-200">{record.teaType}</span> : '-'}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300">
                                                    <span className="font-bold text-gray-800">{record.madeTeaWeight}</span>
                                                </td>
                                                
                                                <td className="px-3 py-2 text-center border-r border-gray-300">
                                                    {record.dryerName !== '-' ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-semibold text-gray-700 leading-tight">{record.dryerName}</span>
                                                            <span className="text-[9px] text-green-700 px-1.5 py-0.5 rounded mt-0.5 shadow-sm font-bold whitespace-nowrap">
                                                                {record.dryerUpdatedDate}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>

                                                <td className={`px-3 py-3 text-center border-r border-gray-300 text-xs ${isShared ? `${highlightClass} font-bold text-gray-900` : 'text-gray-500'}`}>
                                                    {record.meterStart}
                                                </td>
                                                <td className={`px-3 py-3 text-center border-r border-gray-300 text-xs ${isShared ? `${highlightClass} font-bold text-gray-900` : 'text-gray-500'}`}>
                                                    {record.meterEnd}
                                                </td>
                                                <td className={`px-3 py-3 text-center border-r border-gray-300 ${isShared ? highlightClass : ''}`}>
                                                    {record.units !== '-' ? <span className={`font-bold ${isShared ? 'text-gray-900' : 'text-orange-600'}`}>{displayUnits}</span> : '-'}
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-300">
                                                    {record.workerCount !== '-' ? <span className="font-bold text-blue-700">{record.workerCount}</span> : '-'}
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleEditClick(record)} className="p-1.5 text-gray-500 hover:text-[#1B6A31] hover:bg-[#8CC63F]/20 rounded transition-all">
                                                                <MdOutlineEdit size={20} />
                                                            </button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <button onClick={() => setRecordToDelete(record)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all">
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
                                                                            Are you sure you want to permanently delete data for <span className="font-bold text-gray-800 ml-1">{record.date}</span>?
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
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={isViewer ? "11" : "12"} className="p-16 text-center text-gray-400">
                                            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-lg font-medium text-gray-500">No records found matching filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* --- TOTAL ROW --- */}
                            {filteredRecords.length > 0 && (
                                <tfoot className="bg-gray-100/90 border-t-[3px] border-gray-400 font-black text-gray-900 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <td className="px-4 py-4 border-r border-gray-300 text-right uppercase tracking-wider text-sm">Total</td>
                                        <td className="px-3 py-4 border-r border-gray-300 text-[#1B6A31] text-base">{totalGL.toFixed(2)}</td>
                                        <td className="px-3 py-4 border-r border-gray-300 text-[#1B6A31] text-base">{totalSelectedGL.toFixed(2)}</td>
                                        <td className="px-3 py-4 border-r border-gray-300 text-gray-600 text-base">{totalReturnedGL.toFixed(2)}</td>
                                        <td className="px-3 py-4 border-r border-gray-300">-</td>
                                        <td className="px-3 py-4 border-r border-gray-300 text-purple-700 text-base">{totalMadeTea.toFixed(3)}</td>
                                        <td className="px-3 py-4 border-r border-gray-300">-</td>
                                        <td className="px-3 py-4 border-r border-gray-300">-</td>
                                        <td className="px-3 py-4 border-r border-gray-300">-</td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-300 text-orange-600 text-base">
                                            {Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2)}
                                        </td>
                                        
                                        <td className="px-3 py-4 border-r border-gray-300 text-blue-700 text-base">{totalLabour}</td>
                                        
                                        {!isViewer && (
                                            <td className="px-3 py-4"></td>
                                        )}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}