import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

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
                const prodCreated = getSafeTime(prod, 'createdAt');
                const prodUpdated = getSafeTime(prod, 'updatedAt');

                const isGlEdited = glUpdated > 0 && glCreated > 0 && (glUpdated - glCreated > 5000);
                const isLabEdited = labUpdated > 0 && labCreated > 0 && (labUpdated - labCreated > 5000);
                const isProdEdited = prodUpdated > 0 && prodCreated > 0 && (prodUpdated - prodCreated > 5000);
                
                const isEdited = isGlEdited || isLabEdited || isProdEdited;

                let lastUpdatedDate = '';
                let editedBy = '';

                if (isEdited) {
                    const times = [];
                    if (isGlEdited) times.push({ time: glUpdated, user: gl.updatedBy || gl.username || 'Admin' });
                    if (isLabEdited) times.push({ time: labUpdated, user: lab.updatedBy || lab.username || 'Admin' });
                    if (isProdEdited) times.push({ time: prodUpdated, user: prod.updatedBy || prod.username || 'Admin' });

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
        const dateMatch = (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
        const typeMatch = teaType === 'All' || record.teaType === teaType;
        const dryerMatch = dryerType === 'All' || record.dryerName === dryerType;
        return dateMatch && typeMatch && dryerMatch;
    });

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

            const pdfDryerName = record.dryerName !== '-' 
                ? `${record.dryerName}\n(${record.dryerUpdatedDate})` 
                : '-';

            const pdfTitle = teaType === 'All' ? 'All Tea Types' : teaType;

            const pdfDateCell = record.isEdited 
                ? `${record.date}\n(Edited: ${record.lastUpdatedDate} by ${record.editedBy})` 
                : record.date;
            
            const rollingText = record.rollingType === 'H/R' 
                ? `H/R\n(${record.rollingWorkerCount} wkrs)` 
                : record.rollingType;

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
                    displayRollerPoints !== '-' ? displayRollerPoints : '-', 
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
                Number.isInteger(totalRollerPoints) ? totalRollerPoints : totalRollerPoints.toFixed(2), 
                totalSelectionLabour,
                totalHandRollingLabour > 0 ? `${totalHandRollingLabour} (H/R)` : '-'
            ],
            isFooter: true
        });

        return tableRows;
    };

    const getCurrentMonthCode = () => {
        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return `HT/DR/${month}.${year}`; 
    };

    const uniqueCode = getCurrentMonthCode();

    // ==========================================
    // ADD NEW RECORD FORM STATES (DAY 1)
    // ==========================================
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);

    const getTodayLocalString = () => {
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    };

    const [formData, setFormData] = useState({
        date: getTodayLocalString(),
        totalWeight: '',
        selectedWeight: '',
        outputs: [{ teaType: '', madeTeaWeight: '' }], 
        expectedDryerDate: '', 
        workerCount: '',
        rollingType: 'Machine Rolling',
        rollingWorkerCount: ''
    });

    const [existingDates, setExistingDates] = useState([]);
    const [lastReadings, setLastReadings] = useState({ 'Dryer 1': '', 'Dryer 2': '' });
    const [allProductionData, setAllProductionData] = useState([]); 

    // ==========================================
    // DRYER POPUP STATES (DAY 2) - UPDATED FOR MULTIPLE
    // ==========================================
    const [pendingDryerTasks, setPendingDryerTasks] = useState([]);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [isSubmittingDryer, setIsSubmittingDryer] = useState(false);
    const [dryerOutputs, setDryerOutputs] = useState([{
        dryerName: '',
        meterStart: '',
        meterEnd: '',
        rollerPoints: '' 
    }]);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const [glRes, prodRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`, { headers: authHeaders }),
                fetch(`${BACKEND_URL}/api/production`, { headers: authHeaders })
            ]);

            if (glRes.ok) {
                const glData = await glRes.json();
                const dates = glData.map(record => record.date ? record.date.substring(0, 10) : '');
                setExistingDates(dates);
            }

            if (prodRes.ok) {
                const prodData = await prodRes.json();
                prodData.sort((a, b) => new Date(b.date) - new Date(a.date)); 
                setAllProductionData(prodData); 

                let d1Last = '';
                let d2Last = '';

                const d1Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 1');
                if (d1Record) d1Last = d1Record.dryerDetails.meterEnd;

                const d2Record = prodData.find(p => p.dryerDetails?.dryerName === 'Dryer 2');
                if (d2Record) d2Last = d2Record.dryerDetails.meterEnd;

                setLastReadings({ 'Dryer 1': d1Last, 'Dryer 2': d2Last });

                const todayStr = getTodayLocalString();
                const tasksNeedingDryer = prodData.filter(p => {
                    const hasNoDryer = !p.dryerDetails || !p.dryerDetails.dryerName || p.dryerDetails.dryerName === "";
                    const expectedDateStr = p.expectedDryerDate ? p.expectedDryerDate.substring(0, 10) : null;
                    const isDue = expectedDateStr && expectedDateStr <= todayStr;
                    return hasNoDryer && isDue;
                });

                if (tasksNeedingDryer.length > 0) {
                    setPendingDryerTasks(tasksNeedingDryer.reverse()); 
                }
            }
        } catch (error) {
            console.error("Data fetch error:", error);
        }
    };

    const handleLoadDateTasks = () => {
        const tasksForDate = allProductionData.filter(p => {
            const hasNoDryer = !p.dryerDetails || !p.dryerDetails.dryerName || p.dryerDetails.dryerName === "";
            const expectedDateStr = p.expectedDryerDate ? p.expectedDryerDate.substring(0, 10) : null;
            return hasNoDryer && expectedDateStr === formData.date;
        });

        if (tasksForDate.length > 0) {
            setPendingDryerTasks(tasksForDate);
            setActiveTaskIndex(0);
            setDryerOutputs([{ dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }]);
            toast.success(`Found ${tasksForDate.length} pending task(s) expected to be dried on this date!`);
        } else {
            toast.success("No pending dryer tasks scheduled for this date.");
        }
    };

    const returnedWeight = (Number(formData.totalWeight) || 0) - (Number(formData.selectedWeight) || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'rollingType' && value !== 'Hand Rolling') {
            setFormData({ ...formData, [name]: value, rollingWorkerCount: '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleOutputChange = (index, field, value) => {
        const newOutputs = [...formData.outputs];
        newOutputs[index][field] = value;
        setFormData({ ...formData, outputs: newOutputs });
    };

    const addOutput = () => {
        setFormData({ ...formData, outputs: [...formData.outputs, { teaType: '', madeTeaWeight: '' }] });
    };

    const removeOutput = (index) => {
        const newOutputs = formData.outputs.filter((_, i) => i !== index);
        setFormData({ ...formData, outputs: newOutputs });
    };

    // --- DRYER MODAL HANDLERS ---
    const handleDryerOutputChange = (index, field, value) => {
        const newDryers = [...dryerOutputs];
        newDryers[index][field] = value;

        if (field === 'dryerName') {
            newDryers[index].meterStart = lastReadings[value] !== undefined ? String(lastReadings[value]) : '';
        }
        setDryerOutputs(newDryers);
    };

    const addDryerOutput = () => {
        setDryerOutputs([...dryerOutputs, { dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }]);
    };

    const removeDryerOutput = (index) => {
        setDryerOutputs(dryerOutputs.filter((_, i) => i !== index));
    };

    const playErrorSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(150, ctx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gainNode); gainNode.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log("Audio not supported");
        }
    };

    const handleAddToList = (e) => {
        e.preventDefault();

        const total = Number(formData.totalWeight);
        const selected = Number(formData.selectedWeight);
        
        let totalMade = 0;
        for (let out of formData.outputs) {
            if (!out.teaType || !out.madeTeaWeight) {
                toast.error("Please fill all tea types and weights!");
                return;
            }
            totalMade += Number(out.madeTeaWeight);
        }

        if (selected > total) {
            playErrorSound(); toast.error("Selected weight must be less than Total weight!"); return;
        }
        if (totalMade > selected) {
            playErrorSound(); toast.error("Total Made tea weight must be less than Selected weight!"); return;
        }
        if (formData.expectedDryerDate < formData.date) {
            playErrorSound(); toast.error("Expected Dryer Date cannot be before the collection date!"); return;
        }

        const newRecord = { ...formData, returnedWeight };
        setPendingRecords([...pendingRecords, newRecord]);
        toast.success("Added to list!");

        setFormData({
            ...formData,
            totalWeight: '', 
            selectedWeight: '', 
            outputs: [{ teaType: '', madeTeaWeight: '' }],
            expectedDryerDate: '', 
            workerCount: '', 
            rollingType: 'Machine Rolling', 
            rollingWorkerCount: ''
        });
    };

    const handleRemoveFromList = (indexToRemove) => {
        const updatedList = pendingRecords.filter((_, index) => index !== indexToRemove);
        setPendingRecords(updatedList);
    };

    const handleSaveAll = async () => {
        if (pendingRecords.length === 0) {
            toast.error("No records in the list to save!"); return;
        }

        setIsSavingAll(true);
        const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            const promises = pendingRecords.map(async (record) => {
                const total = Number(record.totalWeight);
                const selected = Number(record.selectedWeight);

                const greenLeafPayload = { date: record.date, totalWeight: total, selectedWeight: selected };
                const labourPayload = { 
                    date: record.date, workerCount: Number(record.workerCount), rollingType: record.rollingType,
                    rollingWorkerCount: record.rollingType === 'Hand Rolling' ? Number(record.rollingWorkerCount) : 0
                };

                const [glRes, labRes] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/green-leaf`, { method: 'POST', headers: authHeaders, body: JSON.stringify(greenLeafPayload) }),
                    fetch(`${BACKEND_URL}/api/labour`, { method: 'POST', headers: authHeaders, body: JSON.stringify(labourPayload) })
                ]);

                if (!glRes.ok || !labRes.ok) {
                    if (glRes.status === 403 || labRes.status === 403) throw new Error('Access Denied');
                    throw new Error('Failed to save GL or Labour record');
                }

                const prodPromises = record.outputs.map(out => {
                    const productionPayload = { 
                        date: record.date, 
                        teaType: out.teaType, 
                        madeTeaWeight: Number(out.madeTeaWeight), 
                        expectedDryerDate: record.expectedDryerDate 
                    };
                    return fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: authHeaders, body: JSON.stringify(productionPayload) });
                });

                const prodResults = await Promise.all(prodPromises);
                for (let res of prodResults) {
                    if (!res.ok) {
                        if (res.status === 403) throw new Error('Access Denied');
                        throw new Error('Failed to save a Production record');
                    }
                }
            });

            await Promise.all(promises);
            toast.success("All records saved successfully!", { id: toastId });
            setExistingDates([...existingDates, ...pendingRecords.map(r => r.date)]);
            setPendingRecords([]); 
            
            setTimeout(() => { 
                fetchInitialData();
                fetchMergedRecords();
            }, 1000);

        } catch (error) {
            playErrorSound();
            if (error.message === 'Access Denied') toast.error("Access Denied. You do not have permission to add records.", { id: toastId });
            else toast.error("Error saving some records. Please check.", { id: toastId });
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        
        for (let dryer of dryerOutputs) {
            if (!dryer.dryerName || !dryer.meterStart || !dryer.meterEnd) {
                toast.error("Please fill all dryer details completely!");
                return;
            }
            if (Number(dryer.meterEnd) < Number(dryer.meterStart)) {
                playErrorSound(); 
                toast.error("End Reading must be greater than Start Reading!"); 
                return;
            }
        }

        setIsSubmittingDryer(true);
        const toastId = toast.loading("Saving dryer readings...");
        const currentTask = pendingDryerTasks[activeTaskIndex];

        try {
            const token = localStorage.getItem('token');
            const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

            // For multiple dryers, we need to save the first one to the current Task,
            // and if there are more, we need to create duplicate Production records for the SAME date/teaType but with different dryer details.
            
            const firstDryer = dryerOutputs[0];
            const payload = {
                dryerDetails: {
                    dryerName: firstDryer.dryerName, 
                    meterStart: Number(firstDryer.meterStart), 
                    meterEnd: Number(firstDryer.meterEnd), 
                    rollerPoints: Number(firstDryer.rollerPoints || 0)
                }
            };

            const res = await fetch(`${BACKEND_URL}/api/production/${currentTask._id}`, {
                method: 'PUT', headers: authHeaders, body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to update record");

            // Update local state for last readings
            setLastReadings(prev => {
                const newReadings = { ...prev };
                dryerOutputs.forEach(d => { newReadings[d.dryerName] = Number(d.meterEnd); });
                return newReadings;
            });

            // If there are additional dryers used for this same Task, create new identical records just for the extra dryers
            if (dryerOutputs.length > 1) {
                const extraPromises = dryerOutputs.slice(1).map(extraDryer => {
                    const extraPayload = {
                        date: currentTask.date,
                        teaType: currentTask.teaType,
                        madeTeaWeight: 0, // Set to 0 so we don't duplicate the yield weight in reports
                        expectedDryerDate: currentTask.expectedDryerDate,
                        dryerDetails: {
                            dryerName: extraDryer.dryerName,
                            meterStart: Number(extraDryer.meterStart),
                            meterEnd: Number(extraDryer.meterEnd),
                            rollerPoints: Number(extraDryer.rollerPoints || 0)
                        }
                    };
                    return fetch(`${BACKEND_URL}/api/production`, { method: 'POST', headers: authHeaders, body: JSON.stringify(extraPayload) });
                });
                await Promise.all(extraPromises);
            }

            toast.success("Dryer details saved!", { id: toastId });

            if (activeTaskIndex < pendingDryerTasks.length - 1) {
                setActiveTaskIndex(prev => prev + 1);
                setDryerOutputs([{ dryerName: '', meterStart: '', meterEnd: '', rollerPoints: '' }]);
            } else {
                setPendingDryerTasks([]); 
                toast.success("All pending dryer tasks complete!");
                fetchMergedRecords();
            }
        } catch (error) {
            toast.error("Error saving dryer readings.", { id: toastId });
        } finally {
            setIsSubmittingDryer(false);
        }
    };

    const handleCancel = () => {
        if (pendingRecords.length > 0) {
            if (window.confirm("You have unsaved records in the list. Are you sure you want to leave?")) {
                navigation(-1);
            }
        } else {
            navigation(-1);
        }
    };

    const inputStyles = "w-full p-3.5 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-600 disabled:cursor-not-allowed";
    const labelStyles = "block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300 pb-20">
            
            {/* --- TOP HEADER NAVIGATION --- */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800 shadow-sm px-8 py-4 mb-8 flex justify-between items-center transition-colors duration-300">
                <div>
                    <h2 className="text-2xl font-black text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
                        <Leaf size={24} /> New Production Entry
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-medium">Record Green Leaf, Production, and Labour data</p>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto relative">

                {/* --- DAY 2 PENDING DRYER MODAL (UPDATED FOR MULTIPLE DRYERS) --- */}
                {pendingDryerTasks.length > 0 && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border  dark:border-green-800 my-auto relative">
                            <div className="bg-green-700 dark:bg-green-700 p-6 text-white relative">
                                <button onClick={() => setPendingDryerTasks([])} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors focus:outline-none">
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-3 mb-1">
                                    <AlertCircle size={28} className="opacity-90" />
                                    <h2 className="text-2xl font-black m-0 leading-none">Pending Dryers</h2>
                                </div>
                                <p className="text-orange-100 font-medium m-0 mt-2 ml-10">Task {activeTaskIndex + 1} of {pendingDryerTasks.length}</p>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-2xl mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 dark:text-orange-400 mb-3">Record Details</p>
                                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between border-b border-orange-100 dark:border-orange-900/30 pb-2">
                                            <span className="text-gray-500 dark:text-gray-400">Date Collected</span>
                                            <span className="font-bold">{new Date(pendingDryerTasks[activeTaskIndex].date).toISOString().split('T')[0]}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-orange-100 dark:border-orange-900/30 pb-2">
                                            <span className="text-gray-500 dark:text-gray-400">Tea Type</span>
                                            <span className="font-bold text-purple-600 dark:text-purple-400">{pendingDryerTasks[activeTaskIndex].teaType}</span>
                                        </div>
                                        <div className="flex justify-between pt-1">
                                            <span className="text-gray-500 dark:text-gray-400">Made Tea Output</span>
                                            <span className="font-black text-gray-900 dark:text-white">{pendingDryerTasks[activeTaskIndex].madeTeaWeight} kg</span>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleModalSubmit} className="space-y-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Dryer Readings</h3>
                                        <button type="button" onClick={addDryerOutput} className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                                            <PlusCircle size={14} /> Add Dryer
                                        </button>
                                    </div>

                                    {dryerOutputs.map((dryer, index) => (
                                        <div key={index} className="p-5 border border-orange-100 dark:border-orange-900/30 rounded-2xl bg-orange-50/30 dark:bg-orange-900/5 relative shadow-sm">
                                            {dryerOutputs.length > 1 && (
                                                <button type="button" onClick={() => removeDryerOutput(index)} className="absolute -top-3 -right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm">
                                                    <X size={14} />
                                                </button>
                                            )}
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <label className={labelStyles}>Select Dryer</label>
                                                    <select name="dryerName" value={dryer.dryerName} onChange={(e) => handleDryerOutputChange(index, 'dryerName', e.target.value)} required className={inputStyles}>
                                                        <option value="">Choose...</option>
                                                        <option value="Dryer 1">Dryer 1</option>
                                                        <option value="Dryer 2">Dryer 2</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={labelStyles}>Start Reading</label>
                                                        <input type="number" min="0" value={dryer.meterStart} onChange={(e) => handleDryerOutputChange(index, 'meterStart', e.target.value)} onWheel={(e) => e.target.blur()} required className={inputStyles} />
                                                    </div>
                                                    <div>
                                                        <label className={labelStyles}>End Reading</label>
                                                        <input type="number" min="0" value={dryer.meterEnd} onChange={(e) => handleDryerOutputChange(index, 'meterEnd', e.target.value)} onWheel={(e) => e.target.blur()} required className={inputStyles} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelStyles}>Roller (Points)</label>
                                                    <input type="number" min="0" value={dryer.rollerPoints} onChange={(e) => handleDryerOutputChange(index, 'rollerPoints', e.target.value)} onWheel={(e) => e.target.blur()} className={inputStyles} placeholder="Optional" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button type="submit" disabled={isSubmittingDryer} className="w-full py-4 mt-4 bg-green-700 hover:bg-green-800 text-white font-black rounded-xl transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">
                                        {isSubmittingDryer ? "Saving..." : activeTaskIndex < pendingDryerTasks.length - 1 ? "Save & Next" : "Save & Complete"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* --- LEFT SIDE: FORM --- */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-4">
                                <div className="w-full sm:w-1/2">
                                    <label className={labelStyles}>Date of Collection</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className={inputStyles} />
                                </div>
                            </div>
                            <button type="button" onClick={handleLoadDateTasks} className="w-full sm:w-auto px-5 py-3.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-500/20">
                                <Search size={18} /> Load Tasks for Date
                            </button>
                        </div>

                        <form onSubmit={handleAddToList} className="space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* 1. GREEN LEAF */}
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-fit">
                                    <div className="bg-green-50/50 dark:bg-green-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg text-green-700 dark:text-green-400"><Leaf size={18}/></div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Green Leaf Details</h3>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        <div>
                                            <label className={labelStyles}>Total Received (kg)</label>
                                            <input type="number" step="0.01" min="0" name="totalWeight" value={formData.totalWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Selected for Handmade (kg)</label>
                                            <input type="number" step="0.01" min="0" name="selectedWeight" value={formData.selectedWeight} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Return Weight</span>
                                            <span className="text-lg font-black text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-500/10 px-3 py-1 rounded-lg border border-green-100 dark:border-green-500/20">
                                                {returnedWeight > 0 ? returnedWeight.toFixed(2) : 0} kg
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. DRYER SCHEDULE */}
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden h-fit">
                                    <div className="bg-orange-50/50 dark:bg-orange-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400"><CalendarClock size={18}/></div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Dryer Schedule</h3>
                                    </div>
                                    <div className="p-5">
                                        <label className={labelStyles}>Expected Dryer Date</label>
                                        <input type="date" name="expectedDryerDate" value={formData.expectedDryerDate} onChange={handleInputChange} required className={inputStyles} />
                                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-2 leading-relaxed">Selecting a date here will trigger a popup on that day to enter meter readings for all tea types added below.</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. MULTIPLE MADE TEA PRODUCTION OUTPUTS */}
                            <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-6 transition-colors duration-300 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg text-purple-700 dark:text-purple-400"><Factory size={18}/></div>
                                        Production Output
                                    </h3>
                                    <button type="button" onClick={addOutput} className="text-sm font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 px-3 py-1.5 rounded-lg transition-colors">
                                        <PlusCircle size={16} /> Add Type
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.outputs.map((out, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-purple-100 dark:border-purple-900/30 relative shadow-sm">
                                            {formData.outputs.length > 1 && (
                                                <button type="button" onClick={() => removeOutput(index)} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm border border-red-200 dark:border-red-800/50">
                                                    <X size={14} />
                                                </button>
                                            )}
                                            <div>
                                                <label className={labelStyles}>Tea Type</label>
                                                <select value={out.teaType} onChange={(e) => handleOutputChange(index, 'teaType', e.target.value)} required className={inputStyles}>
                                                    <option value="">Select Type...</option>
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
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelStyles}>Made Tea (kg)</label>
                                                <input type="number" step="0.001" min="0" value={out.madeTeaWeight} onChange={(e) => handleOutputChange(index, 'madeTeaWeight', e.target.value)} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. LABOUR DETAILS */}
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400"><Users size={18}/></div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Labour & Workforce</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className={labelStyles}>Selection Workers</label>
                                            <input type="number" min="0" step="0.01" name="workerCount" value={formData.workerCount} onChange={handleInputChange} onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} required className={inputStyles} />
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Rolling Method</label>
                                            <select name="rollingType" value={formData.rollingType} onChange={handleInputChange} className={inputStyles}>
                                                <option value="Machine Rolling">Machine</option>
                                                <option value="Hand Rolling">Hand Rolled</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelStyles}>Rolling Workers</label>
                                            <input 
                                                type="number" 
                                                name="rollingWorkerCount" 
                                                step="any"
                                                min="0" 
                                                value={formData.rollingWorkerCount} 
                                                onChange={handleInputChange} 
                                                disabled={formData.rollingType !== 'Hand Rolling'}
                                                placeholder={formData.rollingType === 'Hand Rolling' ? "Enter count" : "N/A"}
                                                required={formData.rollingType === 'Hand Rolling'}
                                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                className={inputStyles} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 rounded-2xl text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 font-black text-lg flex justify-center items-center gap-2 shadow-lg shadow-green-600/20 transition-all hover:-translate-y-0.5">
                                <PlusCircle size={22} /> Add to Pending Queue
                            </button>
                        </form>
                    </div>

                    {/* --- RIGHT SIDE: PENDING QUEUE --- */}
                    <div className="lg:col-span-4 flex flex-col h-full max-h-[85vh]">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex-1 flex flex-col overflow-hidden sticky top-24 transition-colors duration-300">
                            
                            <div className="bg-gray-50/80 dark:bg-zinc-950/50 p-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-zinc-800 shadow-sm border border-gray-100 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300">
                                        <ListChecks size={18} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Pending Queue</h3>
                                </div>
                                <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-black px-3 py-1 rounded-full">
                                    {pendingRecords.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-zinc-950/20">
                                {pendingRecords.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 py-10">
                                        <div className="p-6 bg-gray-50 dark:bg-zinc-900 rounded-full mb-4 border border-gray-100 dark:border-zinc-800">
                                            <ListChecks size={32} className="opacity-50" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">Queue is empty</p>
                                        <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Fill the form and add records here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingRecords.map((item, index) => (
                                            <div key={index} className="bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm relative group hover:border-green-300 dark:hover:border-green-700/50 transition-colors">
                                                
                                                <button 
                                                    onClick={() => handleRemoveFromList(index)}
                                                    className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="flex flex-col gap-3 pr-10">
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{item.date}</span>
                                                        <div className="mt-2 space-y-2">
                                                            {item.outputs.map((out, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                                                    <span className="font-bold text-purple-900 dark:text-purple-300 text-sm">{out.teaType}</span>
                                                                    <span className="text-[10px] bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded font-bold">Made: {out.madeTeaWeight}kg</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        <div className="bg-gray-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 transition-colors">
                                                            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Leaf</span>
                                                            <span className="text-green-600 dark:text-green-400 font-black">{item.selectedWeight}kg</span> / {item.totalWeight}kg
                                                        </div>
                                                        <div className="bg-gray-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 transition-colors">
                                                            <span className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Total Output</span>
                                                            <span className="text-purple-600 dark:text-purple-400 font-black">
                                                                {item.outputs.reduce((sum, out) => sum + Number(out.madeTeaWeight), 0).toFixed(3)}kg
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-zinc-800">
                                                        <span className="text-[10px] uppercase text-gray-400 font-bold flex items-center gap-1"><CalendarClock size={10}/> Dryer Date</span>
                                                        <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">{item.expectedDryerDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-5 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 transition-colors">
                                <button 
                                    onClick={handleSaveAll}
                                    disabled={isSavingAll || pendingRecords.length === 0}
                                    className={`w-full py-4 rounded-2xl text-white font-black flex justify-center items-center gap-2 transition-all ${
                                        isSavingAll || pendingRecords.length === 0 
                                        ? 'bg-gray-300 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5'
                                    }`}
                                >
                                    <Save size={18} /> {isSavingAll ? "Saving..." : `Save to Database (${pendingRecords.length})`}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}