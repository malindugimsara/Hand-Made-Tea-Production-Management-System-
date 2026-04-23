import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, ListChecks, Save, X, CalendarClock, Zap, AlertCircle, Search, Sun, Moon, ChevronRight, MoreVertical, Leaf, Factory, Users, RefreshCw } from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
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

export default function GreenLeafForm() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigation = useNavigate();

    // --- THEME STATE LOGIC ---
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsDark(!isDark);
    };

    // --- CUSTOM ANIMATED DROPDOWN STATE ---
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const userRole = localStorage.getItem('userRole') || ''; 
    const isViewer = userRole.toLowerCase() === 'viewer' || userRole.toLowerCase() === 'view';

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teaType, setTeaType] = useState('All');
    const [dryerType, setDryerType] = useState('All');
    const [filterMonth, setFilterMonth] = useState('');

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
                
                const isGlEdited = glUpdated > 0 && glCreated > 0 && (glUpdated - glCreated > 5000);
                const isLabEdited = labUpdated > 0 && labCreated > 0 && (labUpdated - labCreated > 5000);
                
                const isEdited = isGlEdited || isLabEdited;

                let lastUpdatedDate = '';
                let editedBy = '';

                if (isEdited) {
                    const times = [];
                    if (isGlEdited) times.push({ time: glUpdated, user: gl.updatedBy || gl.username || 'Admin' });
                    if (isLabEdited) times.push({ time: labUpdated, user: lab.updatedBy || lab.username || 'Admin' });

                    if (times.length > 0) {
                        times.sort((a, b) => b.time - a.time);
                        lastUpdatedDate = new Date(times[0].time).toISOString().split('T')[0];
                        editedBy = times[0].user;
                    }
                }

                let rType = 'M/R';
                if (lab && lab.rollingType) {
                    if (lab.rollingType === 'Machine Rolling') rType = 'M/R';
                    else if (lab.rollingType === 'Hand Rolling') rType = 'H/R';
                    else rType = lab.rollingType;
                }
                
                return {
                    date: dateStr,
                    isEdited,
                    lastUpdatedDate,
                    editedBy, 
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
                    rollerPoints: prod?.dryerDetails?.rollerPoints ?? 0, 
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
        const recordMonth = record.date.slice(0, 7); // YYYY-MM

        const monthMatch = !filterMonth || recordMonth === filterMonth;

        const dateMatch =
            (!startDate || record.date >= startDate) &&
            (!endDate || record.date <= endDate);

        const typeMatch = teaType === 'All' || record.teaType === teaType;
        const dryerMatch = dryerType === 'All' || record.dryerName === dryerType;

        return monthMatch && dateMatch && typeMatch && dryerMatch;
    });

    // --- GROUP BY DATE LOGIC FOR UI DISPLAY ---
    const groupedRecordsByDate = filteredRecords.reduce((acc, record) => {
        if (!acc[record.date]) {
            acc[record.date] = [];
        }
        acc[record.date].push(record);
        return acc;
    }, {});

    const groupMap = {};
    filteredRecords.forEach(r => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            if (!groupMap[key]) {
                groupMap[key] = { count: 0, uiColor: '', pdfColor: [] };
            }
            groupMap[key].count += 1;
        }
    });

    const highlightColors = [
        { ui: 'bg-green-200/80 dark:bg-green-900/40', pdf: '#bbf7d0' },
        { ui: 'bg-yellow-200/80 dark:bg-yellow-900/40', pdf: '#fef08a' },
        { ui: 'bg-purple-200/80 dark:bg-purple-900/40', pdf: '#e9d5ff' },
        { ui: 'bg-blue-200/80 dark:bg-blue-900/40', pdf: '#bfdbfe' },
        { ui: 'bg-pink-200/80 dark:bg-pink-900/40', pdf: '#fbcfe8' },
        { ui: 'bg-orange-200/80 dark:bg-orange-900/40', pdf: '#fed7aa' }
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
            const key = `${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            const count = groupMap[key]?.count || 1;
            return sum + ((Number(r.units) || 0) / count);
        }
        return sum + (Number(r.units) || 0);
    }, 0);

    const totalRollerPoints = filteredRecords.reduce((sum, r) => {
        if (r.meterStart !== '-' && r.meterEnd !== '-' && r.meterStart !== '' && r.meterEnd !== '') {
            const key = `${r.dryerName}_${r.meterStart}_${r.meterEnd}`;
            const count = groupMap[key]?.count || 1;
            return sum + ((Number(r.rollerPoints) || 0) / count);
        }
        return sum + (Number(r.rollerPoints) || 0);
    }, 0);

    const handleEditClick = (record) => {
        navigation('/edit-record', { state: { recordData: record } });
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
        let currentGroupDate = null;
        const tableRows = filteredRecords.map(record => {
            let displayUnits = record.units;
            let displayRollerPoints = record.rollerPoints; 
            let rowColor = null;

            if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                const key = `${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                const groupInfo = groupMap[key];
                if (groupInfo && groupInfo.count > 1) {
                    const adjustedUnits = Number(record.units) / groupInfo.count;
                    displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                    
                    const adjustedRoller = Number(record.rollerPoints) / groupInfo.count;
                    displayRollerPoints = Number.isInteger(adjustedRoller) ? adjustedRoller : adjustedRoller.toFixed(2);
                    rowColor = groupInfo.pdfColor; 
                }
            }

            const pdfDryerName = record.dryerName !== '-' ? `${record.dryerName}\n(${record.dryerUpdatedDate})` : '-';
            let pdfDateCell = record.isEdited ? `${record.date}\n(Edited: ${record.lastUpdatedDate} by ${record.editedBy})` : record.date;

            if (currentGroupDate === record.date) {
                pdfDateCell = ''; 
            } else {
                currentGroupDate = record.date;
            }
            
            const rollingText = record.rollingType === 'H/R' && record.rollingWorkerCount > 0 ? `H/R\n(${record.rollingWorkerCount} wkrs)` : record.rollingType;

            return {
                data: [
                    pdfDateCell, 
                    Number(record.totalWeight) === 0 ? '-' : record.totalWeight, 
                    Number(record.selectedWeight) === 0 ? '-' : record.selectedWeight,
                    Number(record.returnedWeight) === 0 ? '-' : record.returnedWeight,
                    record.teaType, 
                    Number(record.madeTeaWeight) === 0 ? '-' : record.madeTeaWeight, 
                    pdfDryerName,
                    record.meterStart, record.meterEnd,
                    Number(displayUnits) === 0 || displayUnits === '-' ? '-' : displayUnits,
                    Number(displayRollerPoints) === 0 || displayRollerPoints === '-' ? '-' : displayRollerPoints, 
                    Number(record.workerCount) === 0 || record.workerCount === '-' ? '-' : record.workerCount,
                    rollingText
                ],
                fillColor: rowColor 
            };
        });

        tableRows.push({
            data: [
                "TOTAL", 
                totalGL === 0 ? '-' : totalGL.toFixed(2), 
                totalSelectedGL === 0 ? '-' : totalSelectedGL.toFixed(2), 
                totalReturnedGL === 0 ? '-' : totalReturnedGL.toFixed(2), 
                "-",
                totalMadeTea === 0 ? '-' : totalMadeTea.toFixed(3), 
                "-", 
                "-", 
                "-",
                totalUnits === 0 ? '-' : (Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2)),
                totalRollerPoints === 0 ? '-' : (Number.isInteger(totalRollerPoints) ? totalRollerPoints : totalRollerPoints.toFixed(2)), 
                totalSelectionLabour === 0 ? '-' : totalSelectionLabour, 
                totalHandRollingLabour === 0 ? '-' : totalHandRollingLabour
            ],
            isFooter: true
        });

        return tableRows;
    };

    const uniqueCode = `HT/DR/${new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}.${new Date().getFullYear()}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="p-8 max-w-[1600px] mx-auto font-sans relative">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2"> <Leaf size={28} /> Daily Production Log</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Master overview of Green Leaf, Production, & Labour</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <PDFDownloader 
                            title="Daily Production Log"
                            subtitle={`Filters Applied -> Date: ${startDate || 'All'} to ${endDate || 'All'} | Tea: ${teaType} | Dryer: ${dryerType}`}
                            headers={["Date", "Received GL", "Selected GL", "Return GL", "Tea Type", "Made Tea", "Dryer", "Start", "End", "Units", "Roller", "Sel. Lab", "Rolling"]}
                            data={getPdfData()} 
                            uniqueCode={uniqueCode}
                            fileName={`Production_Log_${new Date().toISOString().split('T')[0]}.pdf`}
                            orientation="landscape"
                            disabled={loading || filteredRecords.length === 0}
                        />

                        <button 
                            onClick={fetchMergedRecords}
                            disabled={loading}
                            className={`px-4 py-2.5 bg-white dark:bg-zinc-800 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8] dark:hover:bg-zinc-700'}`}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Sync Data
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-300 dark:border-zinc-800 shadow-sm transition-colors duration-300">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">MONTH</label>
                        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">FROM DATE</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">TO DATE</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">TEA TYPE</label>
                        <select value={teaType} onChange={(e) => setTeaType(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors">
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
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">DRYER</label>
                        <select value={dryerType} onChange={(e) => setDryerType(e.target.value)} className="border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors">
                            <option value="All">All Dryers</option>
                            <option value="Dryer 1">Dryer 1</option>
                            <option value="Dryer 2">Dryer 2</option>
                        </select>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden self-start w-full max-w-full transition-colors duration-300">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-[#8CC63F] dark:border-green-700 border-t-[#1B6A31] dark:border-t-green-400 rounded-full animate-spin mb-4"></div>
                            <p className="font-medium">Loading production records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-800">
                                        <th rowSpan="2" className="px-4 py-3 font-semibold border-r border-gray-200 dark:border-zinc-800 align-bottom w-24">Date</th>
                                        <th colSpan="3" className="px-4 py-2 font-bold text-[#1B6A31] dark:text-green-500 border-r border-gray-200 dark:border-zinc-800 bg-[#eef8f2] dark:bg-green-900/20 text-center uppercase tracking-wider text-[11px]">
                                            <div className="flex items-center justify-center gap-1.5"><Leaf size={14}/> Raw Material</div>
                                        </th>
                                        <th colSpan="2" className="px-4 py-2 font-bold text-purple-700 dark:text-purple-400 border-r border-gray-200 dark:border-zinc-800 bg-[#f5f0ff] dark:bg-purple-900/20 text-center uppercase tracking-wider text-[11px]">
                                            <div className="flex items-center justify-center gap-1.5"><Factory size={14}/> Output</div>
                                        </th>
                                        <th colSpan="5" className="px-4 py-2 font-bold text-orange-700 dark:text-orange-400 border-r border-gray-200 dark:border-zinc-800 bg-[#fff5eb] dark:bg-orange-900/20 text-center uppercase tracking-wider text-[11px]">
                                            <div className="flex items-center justify-center gap-1.5"><Zap size={14}/> Machine Usage</div>
                                        </th>
                                        <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-200 dark:border-zinc-800 bg-[#f0f4ff] dark:bg-blue-900/30 text-center uppercase tracking-wider text-[11px]">
                                            <div className="flex items-center justify-center gap-1.5"><Users size={14}/> Labour Info</div>
                                        </th>
                                        {!isViewer && (
                                            <th rowSpan="2" className="px-4 py-3 font-semibold align-bottom text-center w-24 bg-gray-50 dark:bg-zinc-950/50">Action</th>
                                        )}
                                    </tr>
                                    <tr className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-gray-400 text-[11px] border-b border-gray-200 dark:border-zinc-800 uppercase tracking-wider">
                                        <th className="px-3 py-2 font-semibold bg-[#eef8f2]/50 dark:bg-green-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Received</th>
                                        <th className="px-3 py-2 font-semibold bg-[#eef8f2]/50 dark:bg-green-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Selected</th>
                                        <th className="px-3 py-2 font-semibold bg-[#eef8f2]/50 dark:bg-green-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Return</th>
                                        
                                        <th className="px-3 py-2 font-semibold bg-[#f5f0ff]/50 dark:bg-purple-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Type</th>
                                        <th className="px-3 py-2 font-semibold bg-[#f5f0ff]/50 dark:bg-purple-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Made (kg)</th>
                                        
                                        <th className="px-3 py-2 font-semibold bg-[#fff5eb]/50 dark:bg-orange-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Dryer</th>
                                        <th className="px-3 py-2 font-semibold bg-[#fff5eb]/50 dark:bg-orange-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Start</th>
                                        <th className="px-3 py-2 font-semibold bg-[#fff5eb]/50 dark:bg-orange-900/10 text-center border-r border-gray-200 dark:border-zinc-800">End</th>
                                        <th className="px-3 py-2 font-semibold bg-[#fff5eb]/50 dark:bg-orange-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Units</th>
                                        <th className="px-3 py-2 font-semibold bg-[#fff5eb]/50 dark:bg-orange-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Roller</th>

                                        <th className="px-3 py-2 font-semibold bg-[#f0f4ff]/50 dark:bg-blue-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Selection</th>
                                        <th className="px-3 py-2 font-semibold bg-[#f0f4ff]/50 dark:bg-blue-900/10 text-center border-r border-gray-200 dark:border-zinc-800">Rolling</th>
                                    </tr>
                                </thead>

                                <tbody className="bg-white dark:bg-zinc-950 text-gray-700 dark:text-gray-300">
                                    {Object.keys(groupedRecordsByDate).length > 0 ? (
                                        Object.entries(groupedRecordsByDate).map(([date, dayRecords]) => {
                                            const isMulti = dayRecords.length > 1;
                                            const totalRowSpan = dayRecords.length;
                                            const paddingY = isMulti ? 'py-1.5' : 'py-3';

                                            return (
                                                <React.Fragment key={date}>
                                                    {dayRecords.map((record, index) => {
                                                        const isLastDataRow = index === dayRecords.length - 1;
                                                        const cellBottomBorder = isLastDataRow ? 'border-b border-gray-200 dark:border-zinc-800' : 'border-b-0';

                                                        let displayUnits = record.units;
                                                        let displayRollerPoints = record.rollerPoints; 

                                                        if (record.meterStart !== '-' && record.meterEnd !== '-' && record.meterStart !== '' && record.meterEnd !== '') {
                                                            const key = `${record.dryerName}_${record.meterStart}_${record.meterEnd}`;
                                                            const groupInfo = groupMap[key];
                                                            
                                                            if (groupInfo && groupInfo.count > 1) {
                                                                const adjustedUnits = Number(record.units) / groupInfo.count;
                                                                displayUnits = Number.isInteger(adjustedUnits) ? adjustedUnits : adjustedUnits.toFixed(2);
                                                                const adjustedRoller = Number(record.rollerPoints) / groupInfo.count;
                                                                displayRollerPoints = Number.isInteger(adjustedRoller) ? adjustedRoller : adjustedRoller.toFixed(2);
                                                            }
                                                        }

                                                        return (
                                                            <tr key={record.productionId} className={`transition-colors group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20`}>
                                                                {index === 0 && (
                                                                    <td rowSpan={totalRowSpan} className="px-4 py-3 border-r border-b border-gray-200 dark:border-zinc-800 align-top bg-gray-50/30 dark:bg-zinc-900/30">
                                                                        <div className="flex flex-col items-start gap-1 mt-1">
                                                                            <span className="font-semibold text-gray-900 dark:text-gray-100">{record.date}</span>
                                                                            {record.isEdited && (
                                                                                <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 px-1.5 py-0.5 rounded font-bold w-max text-left leading-tight mt-1">
                                                                                    Edited: {record.lastUpdatedDate} <br />
                                                                                    {record.editedBy && `by ${record.editedBy}`}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div className="font-medium">{Number(record.totalWeight) === 0 ? '-' : record.totalWeight}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div>{Number(record.selectedWeight) === 0 ? '-' : <span className="text-[#1B6A31] dark:text-[#8CC63F] font-bold text-xs bg-[#eef8f2] dark:bg-[#8CC63F]/20 px-2 py-0.5 rounded-full inline-block">{record.selectedWeight}</span>}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 text-gray-500 align-middle ${cellBottomBorder}`}>
                                                                    <div>{Number(record.returnedWeight) === 0 ? '-' : record.returnedWeight}</div>
                                                                </td>
                                                                
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div>{record.teaType !== '-' ? <span className="text-purple-700 dark:text-purple-300 font-medium text-xs bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">{record.teaType}</span> : '-'}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div className="font-bold">{Number(record.madeTeaWeight) === 0 ? '-' : record.madeTeaWeight}</div>
                                                                </td>
                                                                
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    {record.dryerName !== '-' ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="font-semibold leading-tight">{record.dryerName}</span>
                                                                            <span className="text-[9px] text-orange-600 dark:text-orange-400 px-1 py-0.5 rounded mt-0.5 font-bold">
                                                                                {record.dryerUpdatedDate}
                                                                            </span>
                                                                        </div>
                                                                    ) : <span className="text-gray-400">-</span>}
                                                                </td>

                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 text-xs align-middle ${cellBottomBorder}`}>
                                                                    <div>{record.meterStart}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 text-xs align-middle ${cellBottomBorder}`}>
                                                                    <div>{record.meterEnd}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div>{Number(displayUnits) === 0 || displayUnits === '-' ? '-' : <span className="font-bold text-orange-600 dark:text-orange-400">{displayUnits}</span>}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div>{Number(displayRollerPoints) === 0 || displayRollerPoints === '-' ? '-' : <span className="font-bold text-orange-600 dark:text-orange-400">{displayRollerPoints}</span>}</div>
                                                                </td>

                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div className="font-bold text-blue-700 dark:text-blue-400">{Number(record.workerCount) === 0 ? '-' : record.workerCount}</div>
                                                                </td>
                                                                <td className={`px-3 ${paddingY} text-center border-r border-gray-200 dark:border-zinc-800 align-middle ${cellBottomBorder}`}>
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <span className="font-medium text-sm text-blue-700 dark:text-blue-400">
                                                                            {record.rollingType === 'Hand Rolling' ? 'H/R' : record.rollingType.startsWith('Machine') ? `M/R` : record.rollingType}
                                                                        </span>
                                                                        {record.rollingWorkerCount > 0 && (
                                                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                                {record.rollingWorkerCount} wkrs
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                
                                                                {!isViewer && (
                                                                    <td className={`px-3 ${paddingY} text-center align-middle bg-white dark:bg-zinc-950 ${cellBottomBorder}`}>
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button onClick={() => handleEditClick(record)} className="p-1 text-gray-400 hover:text-[#1B6A31] transition-all"><MdOutlineEdit size={18} /></button>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <button onClick={() => setRecordToDelete(record)} className="p-1 text-gray-400 hover:text-red-500 transition-all"><MdOutlineDeleteOutline size={18} /></button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent className="bg-white rounded-2xl max-w-md">
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle className="text-xl font-bold">Delete Record</AlertDialogTitle>
                                                                                        <AlertDialogDescription>Permanently delete data for {record.date}?</AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={isViewer ? "13" : "14"} className="p-16 text-center text-gray-400 dark:text-gray-500">
                                                <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-lg font-medium">No records found matching filters</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                                {/* --- GRAND TOTAL ROW AT THE END --- */}
                                {filteredRecords.length > 0 && (
                                    <tfoot className="bg-gray-100/80 dark:bg-zinc-900/80 border-t-[3px] border-gray-300 dark:border-zinc-700 font-bold text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.05)] text-[13px] tracking-wide">
                                        <tr>
                                            <td className="px-4 py-4 border-r border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white uppercase text-sm">Total</td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-[#1B6A31] dark:text-green-500">
                                                {totalGL === 0 ? '-' : totalGL.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-[#1B6A31] dark:text-green-500">
                                                {totalSelectedGL === 0 ? '-' : totalSelectedGL.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400">
                                                {totalReturnedGL === 0 ? '-' : totalReturnedGL.toFixed(2)}
                                            </td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800">-</td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-purple-700 dark:text-purple-400">
                                                {totalMadeTea === 0 ? '-' : totalMadeTea.toFixed(3)}
                                            </td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800">-</td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800">-</td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800">-</td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-orange-600 dark:text-orange-500">
                                                {totalUnits === 0 ? '-' : (Number.isInteger(totalUnits) ? totalUnits : totalUnits.toFixed(2))}
                                            </td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-orange-600 dark:text-orange-500">
                                                {totalRollerPoints === 0 ? '-' : (Number.isInteger(totalRollerPoints) ? totalRollerPoints : totalRollerPoints.toFixed(2))}
                                            </td>
                                            
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-blue-700 dark:text-blue-500">
                                                {totalSelectionLabour === 0 ? '-' : totalSelectionLabour}
                                            </td>
                                            <td className="px-3 py-4 border-r border-gray-200 dark:border-zinc-800 text-blue-700 dark:text-blue-500">
                                                {totalHandRollingLabour === 0 ? '-' : totalHandRollingLabour}
                                            </td>
                                            
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
        </div>
    );
}
