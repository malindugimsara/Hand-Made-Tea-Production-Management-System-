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

                const getSafeTime = (item, field) => item && item[field] ? new Date(item[field]).getTime() : 0;
                
                const glCreated = getSafeTime(gl, 'createdAt');
                const glUpdated = getSafeTime(gl, 'updatedAt');
                const labCreated = getSafeTime(lab, 'createdAt');
                const labUpdated = getSafeTime(lab, 'updatedAt');
                const prodUpdated = getSafeTime(prod, 'updatedAt');

                // FIX: Only consider it an "Edit" if Green Leaf or Labour records were updated. 
                // The Dryer Modal only updates the Production record, so it won't trigger the "Edited" badge anymore!
                const isEdited = (glUpdated - glCreated > 5000) || (labUpdated - labCreated > 5000);
                
                const lastUpdatedDate = isEdited ? new Date(Math.max(glUpdated, labUpdated, prodUpdated)).toISOString().split('T')[0] : '';
                
                let rType = '-';
                if (lab && lab.rollingType) {
                    rType = lab.rollingType;
                } else if (lab) {
                    rType = 'Machine Rolling'; 
                }
                
                return {
                    date: dateStr,
                    isEdited,
                    lastUpdatedDate,
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
                    workerCount: lab ? lab.workerCount : 0,
                    rollingType: rType,
                    rollingWorkerCount: (lab && lab.rollingType === 'Hand Rolling') ? lab.rollingWorkerCount : 0
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

    const filteredRecords = records.filter(record => {
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const typeMatch = teaType === 'All' || record.teaType === teaType;
        const dryerMatch = dryerType === 'All' || record.dryerName === dryerType;
        return dateMatch && typeMatch && dryerMatch;
    });

    const groupMap = {};
    filteredRecords.forEach(r => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.date}_${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            if (!groupMap[key]) {
                groupMap[key] = { count: 0, uiColor: '', pdfColor: '' };
            }
            groupMap[key].count += 1;
        }
    });

    const highlightColors = [
        { ui: 'bg-green-200/80', pdf: '#bbf7d0' },  
        { ui: 'bg-yellow-200/80', pdf: '#fef08a' }, 
        { ui: 'bg-purple-200/80', pdf: '#e9d5ff' }, 
        { ui: 'bg-blue-200/80', pdf: '#bfdbfe' },   
        { ui: 'bg-pink-200/80', pdf: '#fbcfe8' },   
        { ui: 'bg-orange-200/80', pdf: '#fed7aa' }  
    ];
    let colorIndex = 0;

    Object.keys(groupMap).forEach(key => {
        if (groupMap[key].count > 1) {
            const colorObj = highlightColors[colorIndex % highlightColors.length];
            groupMap[key].uiColor = colorObj.ui;
            groupMap[key].pdfColor = colorObj.pdf;
            colorIndex++;
        }
    });

    const totalGL = filteredRecords.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
    const totalSelectedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.selectedWeight) || 0), 0);
    const totalReturnedGL = filteredRecords.reduce((sum, r) => sum + (Number(r.returnedWeight) || 0), 0);
    const totalMadeTea = filteredRecords.reduce((sum, r) => sum + (Number(r.madeTeaWeight) || 0), 0);
    const totalSelectionLabour = filteredRecords.reduce((sum, r) => sum + (Number(r.workerCount) || 0), 0);
    const totalHandRollingLabour = filteredRecords.reduce((sum, r) => sum + (Number(r.rollingWorkerCount) || 0), 0);

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

    const getPdfData = () => {
        const tableRows = filteredRecords.map(record => {
            let displayUnits = record.units;
            let rowColor = null;

            if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                const key = `${record.date}_${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                const groupInfo = groupMap[key];
                if (groupInfo && groupInfo.count > 1) {
                    const adjustedUnits = Number(record.units) / groupInfo.count;
                    displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                    rowColor = groupInfo.pdfColor; 
                }
            }

            const pdfDryerName = record.dryerName !== '-' 
                ? `${record.dryerName}\n(${record.dryerUpdatedDate})` 
                : '-';

            const pdfDateCell = record.isEdited ? `${record.date}\n(Edited: ${record.lastUpdatedDate})` : record.date;
            
            let rTypeShort = record.rollingType;
            if(rTypeShort === 'Machine Rolling') rTypeShort = 'M/R';
            if(rTypeShort === 'Hand Rolling') rTypeShort = 'H/R';

            const rollingText = record.rollingType === 'Hand Rolling' 
                ? `${rTypeShort}\n(${record.rollingWorkerCount} wkrs)` 
                : rTypeShort;

            return {
                data: [
                    pdfDateCell,
                    record.totalWeight,
                    record.selectedWeight,
                    record.returnedWeight > 0 ? record.returnedWeight : '-',
                    record.teaType,
                    record.madeTeaWeight,
                    pdfDryerName,
                    record.meterStart,
                    record.meterEnd,
                    displayUnits !== '-' ? displayUnits : '-',
                    record.workerCount !== '-' ? record.workerCount : '-',
                    rollingText
                ],
                fillColor: rowColor 
            };
        });

        tableRows.push({
            data: [
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
                totalSelectionLabour,
                totalHandRollingLabour > 0 ? `${totalHandRollingLabour} (H/R)` : '-'
            ],
            isFooter: true
        });

        return tableRows;
    };

    return (
        <div className="p-8 max-w-[1500px] mx-auto font-sans relative">
            
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2"> <Leaf size={28} /> Daily Production Log</h2>
                    <p className="text-sm text-gray-500 mt-1">Master overview of Green Leaf, Production, & Labour</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PDFDownloader 
                        title="Daily Production Log"
                        subtitle={`Filters Applied -> Date: ${startDate || 'All'} to ${endDate || 'All'} | Tea: ${teaType} | Dryer: ${dryerType}`}
                        headers={["Date", "Received GL", "Selected GL", "Return GL", "Tea Type", "Made Tea", "Dryer", "Start Meter", "End Meter", "Units", "Sel. Lab", "Rolling"]}
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
                                    
                                    <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 border-r border-gray-300 bg-blue-50 text-center">
                                        <div className="flex items-center justify-center gap-1"><Users size={14}/> Labour Info</div>
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

                                    <th className="px-3 py-2 font-medium bg-blue-50/50 text-center border-r border-gray-300">Selection</th>
                                    <th className="px-3 py-2 font-medium bg-blue-50/50 text-center border-r border-gray-300">Rolling</th>
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
                                                highlightClass = groupInfo.uiColor;
                                                const adjustedUnits = Number(record.units) / groupInfo.count;
                                                displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                                            }
                                        }

                                        return (
                                            <tr key={record.productionId} className={`transition-colors group ${isShared ? highlightClass : 'hover:bg-gray-50/80'}`}>
                                                <td className="px-4 py-3 border-r border-gray-300 align-top">
                                                    <div className="flex flex-col items-start gap-1 mt-1">
                                                        <span className="font-semibold text-gray-800">{record.date}</span>
                                                        {record.isEdited && (
                                                            <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold w-max">
                                                                Edited: {record.lastUpdatedDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-600 border-r border-gray-300 align-top"><div className="mt-1">{record.totalWeight}</div></td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300 align-top">
                                                    <div className="mt-1"><span className="px-2 py-1 rounded-full bg-[#8CC63F]/20 text-[#1B6A31] font-bold text-xs">{record.selectedWeight}</span></div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300 text-gray-500 align-top">
                                                    <div className="mt-1">{record.returnedWeight > 0 ? record.returnedWeight : '-'}</div>
                                                </td>
                                                
                                                <td className="px-3 py-3 text-center border-r border-gray-300 align-top">
                                                    <div className="mt-1">{record.teaType !== '-' ? <span className="text-purple-700 font-medium text-xs bg-purple-50 px-2 py-1 rounded border border-purple-200">{record.teaType}</span> : '-'}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300 align-top">
                                                    <div className="mt-1"><span className="font-bold text-gray-800">{record.madeTeaWeight}</span></div>
                                                </td>
                                                
                                                <td className="px-3 py-2 text-center border-r border-gray-300">
                                                    {record.dryerName !== '-' ? (
                                                        <div className="flex flex-col items-center mt-1">
                                                            <span className="font-semibold text-gray-700 leading-tight">{record.dryerName}</span>
                                                            <span className="text-[9px] text-green-700 px-1.5 py-0.5 rounded mt-0.5 shadow-sm font-bold whitespace-nowrap">
                                                                {record.dryerUpdatedDate}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 mt-1 block">-</span>
                                                    )}
                                                </td>

                                                <td className={`px-3 py-3 text-center border-r border-gray-300 text-xs align-top ${isShared ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                    <div className="mt-1">{record.meterStart}</div>
                                                </td>
                                                <td className={`px-3 py-3 text-center border-r border-gray-300 text-xs align-top ${isShared ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                    <div className="mt-1">{record.meterEnd}</div>
                                                </td>
                                                <td className={`px-3 py-3 text-center border-r border-gray-300 align-top ${isShared ? '' : ''}`}>
                                                    <div className="mt-1">{record.units !== '-' ? <span className={`font-bold ${isShared ? 'text-gray-900' : 'text-orange-600'}`}>{displayUnits}</span> : '-'}</div>
                                                </td>

                                                <td className="px-3 py-3 text-center border-r border-gray-300 bg-blue-50/10 align-top">
                                                    <div className="mt-1 font-bold text-blue-700">{record.workerCount !== '-' ? record.workerCount : '-'}</div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-300 bg-blue-50/10 align-top">
                                                    <div className="flex flex-col items-center gap-0.5 mt-1">
                                                        <span className="text-gray-700 font-medium">
                                                            {record.rollingType === 'Hand Rolling' 
                                                                ? 'H/R' 
                                                                : (record.rollingType === 'Machine Rolling' ? 'M/R' : record.rollingType)
                                                            }
                                                        </span>
                                                        {record.rollingWorkerCount > 0 && (
                                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                {record.rollingWorkerCount} wkrs
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                {!isViewer && (
                                                    <td className="px-3 py-3 text-center align-top bg-white">
                                                        <div className="flex items-center justify-center gap-1 mt-0.5">
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
                                        <td colSpan={isViewer ? "12" : "13"} className="p-16 text-center text-gray-400">
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
                                        
                                        <td className="px-3 py-4 border-r border-gray-300 text-blue-700 text-base">{totalSelectionLabour}</td>
                                        <td className="px-3 py-4 border-r border-gray-300 text-blue-700 text-base">{totalHandRollingLabour > 0 ? `${totalHandRollingLabour} (H/R)` : '-'}</td>
                                        
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