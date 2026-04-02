import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calculator, Calendar, Leaf, Zap, Users, Settings2, FileDown, RefreshCw } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

export default function ProductionSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTeaTypes, setSelectedTeaTypes] = useState([]); 

    // Rates (Editable with Defaults)
    const [labourRate, setLabourRate] = useState(1350);
    const [electricityRate, setElectricityRate] = useState(10);

    // Manual Inputs (State object to hold data per tea type)
    const [manualInputs, setManualInputs] = useState({});

    // Updated Full Tea Options List
    const teaOptions = [
        "Purple Tea", "Pink Tea", "White Tea", "Silver Tips", 
        "Silver Green", "VitaGlow Tea", "Slim Beauty", "Golden Tips", 
        "Flower", "Chakra"
    ];

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [greenLeafRes, productionRes, labourRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/green-leaf`),
                fetch(`${BACKEND_URL}/api/production`),
                fetch(`${BACKEND_URL}/api/labour`)
            ]);

            if (!greenLeafRes.ok || !productionRes.ok || !labourRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const greenLeafData = await greenLeafRes.json();
            const productionData = await productionRes.json();
            const labourData = await labourRes.json();

            const merged = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                const gl = greenLeafData.find(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const lab = labourData.find(l => new Date(l.date).toISOString().split('T')[0] === dateStr);
                
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                const calculatedUnits = mEnd > mStart ? (mEnd - mStart) : 0;

                return {
                    date: dateStr,
                    teaType: prod.teaType || 'Unknown',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    workerCount: lab ? lab.workerCount : 0,
                    dryerUnits: calculatedUnits
                };
            });

            setRecords(merged);
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Could not load data from server.");
        } finally {
            setLoading(false);
        }
    };

    const toggleTeaType = (type) => {
        if (selectedTeaTypes.includes(type)) {
            setSelectedTeaTypes(selectedTeaTypes.filter(t => t !== type));
        } else {
            setSelectedTeaTypes([...selectedTeaTypes, type]);
        }
    };

    const handleManualChange = (type, field, value) => {
        setManualInputs(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: Number(value) || 0
            }
        }));
    };

    const generateTableData = () => {
        let dateFiltered = records;
        if (startDate) dateFiltered = dateFiltered.filter(r => r.date >= startDate);
        if (endDate) dateFiltered = dateFiltered.filter(r => r.date <= endDate);

        const rowsToShow = selectedTeaTypes.length > 0 ? selectedTeaTypes : ["All Types"];

        return rowsToShow.map(type => {
            const relevantRecords = type === "All Types" 
                ? dateFiltered 
                : dateFiltered.filter(r => r.teaType === type);

            const totalGL = relevantRecords.reduce((sum, r) => sum + Number(r.selectedWeight || 0), 0);
            const totalMT = relevantRecords.reduce((sum, r) => sum + Number(r.madeTeaWeight || 0), 0);
            const totalSelectionWorkers = relevantRecords.reduce((sum, r) => sum + Number(r.workerCount || 0), 0);
            const totalDryerUnits = relevantRecords.reduce((sum, r) => sum + Number(r.dryerUnits || 0), 0);

            const hrWorkers = manualInputs[type]?.handRolling || 0;
            const rPoints = manualInputs[type]?.roller || 0;

            const selectionCost = totalSelectionWorkers * labourRate;
            const handRollingCost = hrWorkers * labourRate;
            const dryerCost = totalDryerUnits * electricityRate;
            const rollerCost = rPoints * electricityRate;
            const totalElectricityCost = dryerCost + rollerCost;

            return {
                type,
                totalGL,
                totalMT,
                totalSelectionWorkers,
                hrWorkers,
                selectionCost,
                handRollingCost,
                totalDryerUnits,
                rPoints,
                dryerCost,
                rollerCost,
                totalElectricityCost
            };
        });
    };

    const tableData = generateTableData();

    const grandTotals = tableData.reduce((acc, row) => ({
        totalGL: acc.totalGL + row.totalGL,
        totalMT: acc.totalMT + row.totalMT,
        totalSelectionWorkers: acc.totalSelectionWorkers + row.totalSelectionWorkers,
        hrWorkers: acc.hrWorkers + row.hrWorkers,
        selectionCost: acc.selectionCost + row.selectionCost,
        handRollingCost: acc.handRollingCost + row.handRollingCost,
        totalDryerUnits: acc.totalDryerUnits + row.totalDryerUnits,
        rPoints: acc.rPoints + row.rPoints,
        dryerCost: acc.dryerCost + row.dryerCost,
        rollerCost: acc.rollerCost + row.rollerCost,
        totalElectricityCost: acc.totalElectricityCost + row.totalElectricityCost
    }), {
        totalGL: 0, totalMT: 0, totalSelectionWorkers: 0, hrWorkers: 0,
        selectionCost: 0, handRollingCost: 0, totalDryerUnits: 0, rPoints: 0,
        dryerCost: 0, rollerCost: 0, totalElectricityCost: 0
    });

    const generatePDF = () => {
        const doc = new jsPDF('landscape'); 
        
        doc.setFontSize(20);
        doc.setTextColor(27, 106, 49); 
        doc.text("Hand Made Tea Factory - Production Summary", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Date Range: ${startDate || 'All'} to ${endDate || 'All'}`, 14, 32);
        doc.text(`Selected Tea Types: ${selectedTeaTypes.length > 0 ? selectedTeaTypes.join(', ') : 'All Types'}`, 14, 38);
        doc.text(`Rates -> Labour: Rs. ${labourRate} | Electricity: Rs. ${electricityRate}`, 14, 44);

        const tableHead = [
            [
                { content: "Type of Tea", rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [27, 106, 49] } },
                { content: "Quantity (kg)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Labour Requirement", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Labour Cost (Rs.)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Electricity (pts)", colSpan: 2, styles: { halign: 'center', fillColor: [27, 106, 49] } },
                { content: "Electricity Cost (Rs.)", colSpan: 3, styles: { halign: 'center', fillColor: [27, 106, 49] } }
            ],
            [
                { content: "G/L", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "M/T", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Selection", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Hand Roll", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Selection", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Hand Roll", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Dryer", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Roller", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Dryer", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Roller", styles: { halign: 'center', fillColor: [40, 130, 60] } },
                { content: "Total Cost", styles: { halign: 'center', fillColor: [40, 130, 60] } }
            ]
        ];
        
        const tableRows = tableData.map(row => [
            row.type,
            row.totalGL.toFixed(2),
            row.totalMT.toFixed(3),
            row.totalSelectionWorkers.toString(),
            row.hrWorkers.toString(),
            row.selectionCost.toLocaleString(),
            row.handRollingCost.toLocaleString(),
            row.totalDryerUnits.toString(),
            row.rPoints.toString(),
            row.dryerCost.toLocaleString(),
            row.rollerCost.toLocaleString(),
            row.totalElectricityCost.toLocaleString()
        ]);

        tableRows.push([
            "GRAND TOTAL",
            grandTotals.totalGL.toFixed(2),
            grandTotals.totalMT.toFixed(3),
            grandTotals.totalSelectionWorkers.toString(),
            grandTotals.hrWorkers.toString(),
            grandTotals.selectionCost.toLocaleString(),
            grandTotals.handRollingCost.toLocaleString(),
            grandTotals.totalDryerUnits.toString(),
            grandTotals.rPoints.toString(),
            grandTotals.dryerCost.toLocaleString(),
            grandTotals.rollerCost.toLocaleString(),
            grandTotals.totalElectricityCost.toLocaleString()
        ]);

        autoTable(doc, {
            startY: 52,
            head: tableHead,
            body: tableRows,
            theme: 'grid',
            headStyles: { textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8, halign: 'center', valign: 'middle' },
            columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' } },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    // Update text colors based on the columns to match web view
                    const colIdx = data.column.index;
                    
                    // Quantity (G/L, M/T) -> Green
                    if (colIdx === 1 || colIdx === 2) {
                        data.cell.styles.textColor = [27, 106, 49]; 
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Labour Requirement -> Blue
                    else if (colIdx === 3 || colIdx === 4) {
                        data.cell.styles.textColor = [29, 78, 216];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Electricity Points -> Orange
                    else if (colIdx === 7 || colIdx === 8) {
                        data.cell.styles.textColor = [234, 88, 12];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Total Electricity Cost -> Red
                    else if (colIdx === 11) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }

                    // Special styling for Grand Total Row
                    if (data.row.index === tableRows.length - 1) {
                        data.cell.styles.fillColor = [240, 240, 240];
                        data.cell.styles.fontStyle = 'bold';
                        // Keep the column specific colors but ensure row stands out
                    }
                }
            }
        });

        doc.save(`Production_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success("PDF Downloaded Successfully!");
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto font-sans relative">
            
            <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1B6A31] flex items-center justify-center sm:justify-start gap-2">
                        <Calculator size={28} /> Production Summary
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium">Calculate costs and export PDF reports</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={fetchAllData}
                        disabled={loading}
                        className={`px-5 py-2.5 bg-white text-[#1B6A31] border border-[#8CC63F] rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F8FAF8]'}`}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Sync Data
                    </button>
                    
                    <button 
                        onClick={generatePDF}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all duration-300"
                    >
                        <FileDown size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Top Control Panel: Filters & Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* 1. Filters */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider border-b pb-2">
                        <Calendar size={16} className="text-blue-600"/> 1. Select Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500">FROM DATE</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500">TO DATE</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs font-bold text-gray-500">SELECT TEA TYPES (MULTIPLE)</label>
                        <div className="flex flex-wrap gap-2">
                            {teaOptions.map(type => (
                                <button
                                    key={type}
                                    onClick={() => toggleTeaType(type)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                                        selectedTeaTypes.includes(type) 
                                        ? 'bg-blue-100 border-blue-400 text-blue-700 shadow-sm' 
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {type} {selectedTeaTypes.includes(type) && '✓'}
                                </button>
                            ))}
                            {selectedTeaTypes.length > 0 && (
                                <button 
                                    onClick={() => {setSelectedTeaTypes([]); setManualInputs({});}} 
                                    className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 rounded-full transition-all"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Rate Settings */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider border-b pb-2">
                        <Settings2 size={16} className="text-orange-500"/> 2. Adjust Rates (LKR)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Users size={12}/> LABOUR RATE (PER HEAD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                                <input type="number" value={labourRate} onChange={(e) => setLabourRate(Number(e.target.value))} className="w-full border rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/30" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Zap size={12}/> ELECTRICITY RATE (PER UNIT)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                                <input type="number" value={electricityRate} onChange={(e) => setElectricityRate(Number(e.target.value))} className="w-full border rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/30" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-12">
                <div className="bg-[#1B6A31] p-4 border-b border-gray-200 flex items-center gap-2">
                    <Leaf className="text-white" size={20}/>
                    <h3 className="text-lg font-bold text-white">Calculation Board</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 text-gray-800 uppercase text-xs tracking-wider border-b border-gray-200">
                                <th rowSpan="2" className="px-4 py-4 font-extrabold border-r border-gray-200 align-middle bg-gray-100 w-48 text-center">Type of Tea</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-[#1B6A31] border-r border-gray-200 bg-[#8CC63F]/10 text-center">Quantity (kg)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-700 border-r border-gray-200 bg-blue-50 text-center">Labour Requirement</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-blue-900 border-r border-gray-200 bg-blue-100/50 text-center">Labour Cost (Rs.)</th>
                                <th colSpan="2" className="px-4 py-2 font-bold text-orange-600 border-r border-gray-200 bg-orange-50 text-center">Electricity (points)</th>
                                <th colSpan="3" className="px-4 py-2 font-bold text-orange-900 border-r border-gray-200 bg-orange-100/50 text-center">Electricity Cost (Rs.)</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                                <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 text-center border-r border-gray-200/60 w-24">G/L</th>
                                <th className="px-3 py-2 font-semibold bg-[#8CC63F]/5 text-center border-r border-gray-200 w-24">M/T</th>
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 text-center border-r border-gray-200/60 w-24">Selection</th>
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 text-center border-r border-gray-200 w-32">Hand Rolling</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200/60 w-28">Selection</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200 w-28">Hand Rolling</th>
                                <th className="px-3 py-2 font-semibold bg-orange-50/50 text-center border-r border-gray-200/60 w-24">Dryer</th>
                                <th className="px-3 py-2 font-semibold bg-orange-50/50 text-center border-r border-gray-200 w-28">Roller</th>
                                <th className="px-3 py-2 font-semibold bg-orange-100/30 text-center border-r border-gray-200/60 w-28">Dryer</th>
                                <th className="px-3 py-2 font-semibold bg-orange-100/30 text-center border-r border-gray-200/60 w-28">Roller</th>
                                <th className="px-3 py-2 font-black bg-orange-200/40 text-center text-orange-900 w-32">Total Cost</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {tableData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50/80 transition-colors group text-center">
                                    
                                    <td className="px-4 py-4 border-r border-gray-200 font-bold text-[#1B6A31] bg-gray-50/50 whitespace-normal">
                                        {row.type}
                                    </td>

                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-[#1B6A31] text-base">{row.totalGL.toFixed(2)}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-[#1B6A31] text-base">{row.totalMT.toFixed(3)}</td>

                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-blue-700 bg-blue-50/10">{row.totalSelectionWorkers}</td>
                                    <td className="px-2 py-2 border-r border-gray-200 bg-blue-50/30">
                                        <input 
                                            type="number" 
                                            value={row.hrWorkers || ''} 
                                            onChange={(e) => handleManualChange(row.type, 'handRolling', e.target.value)} 
                                            onWheel={(e) => e.target.blur()}
                                            className="w-full p-2 border border-blue-300 rounded text-center font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-white"
                                            placeholder="0"
                                        />
                                    </td>

                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.selectionCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.handRollingCost.toLocaleString()}</td>

                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-orange-600 bg-orange-50/10">{row.totalDryerUnits}</td>
                                    <td className="px-2 py-2 border-r border-gray-200 bg-orange-50/30">
                                        <input 
                                            type="number" 
                                            value={row.rPoints || ''} 
                                            onChange={(e) => handleManualChange(row.type, 'roller', e.target.value)} 
                                            onWheel={(e) => e.target.blur()}
                                            className="w-full p-2 border border-orange-300 rounded text-center font-bold text-orange-800 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner bg-white"
                                            placeholder="0"
                                        />
                                    </td>

                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.dryerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.rollerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 font-black text-lg text-red-600 bg-red-50/30">{row.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        
                        {/* Grand Total Footer */}
                        <tfoot className="bg-gray-100/90 border-t-[3px] border-gray-300 font-black text-gray-900 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                            <tr>
                                <td className="px-4 py-5 border-r border-gray-200 text-right uppercase tracking-wider text-sm">
                                    Grand Total
                                </td>
                                <td className="px-3 py-5 border-r border-gray-200 text-[#1B6A31] text-base">{grandTotals.totalGL.toFixed(2)}</td>
                                <td className="px-3 py-5 border-r border-gray-200 text-[#1B6A31] text-base">{grandTotals.totalMT.toFixed(3)}</td>
                                <td className="px-3 py-5 border-r border-gray-200 text-blue-800 text-base">{grandTotals.totalSelectionWorkers}</td>
                                <td className="px-3 py-5 border-r border-gray-200 text-blue-800 text-base">{grandTotals.hrWorkers}</td>
                                <td className="px-3 py-5 border-r border-gray-200">{grandTotals.selectionCost.toLocaleString()}</td>
                                <td className="px-3 py-5 border-r border-gray-200">{grandTotals.handRollingCost.toLocaleString()}</td>
                                <td className="px-3 py-5 border-r border-gray-200 text-orange-700 text-base">{grandTotals.totalDryerUnits}</td>
                                <td className="px-3 py-5 border-r border-gray-200 text-orange-700 text-base">{grandTotals.rPoints}</td>
                                <td className="px-3 py-5 border-r border-gray-200">{grandTotals.dryerCost.toLocaleString()}</td>
                                <td className="px-3 py-5 border-r border-gray-200">{grandTotals.rollerCost.toLocaleString()}</td>
                                <td className="px-3 py-5 text-red-700 text-xl bg-red-100/50">{grandTotals.totalElectricityCost.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}