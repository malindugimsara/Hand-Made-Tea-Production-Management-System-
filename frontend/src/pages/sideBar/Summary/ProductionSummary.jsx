import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; 
import { Calculator, Calendar, Leaf, Zap, Users, Settings2, FileDown, RefreshCw, CheckSquare, Square } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

export default function ProductionSummary() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterMonth, setFilterMonth] = useState(''); 
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

            const glUsage = {};
            const labUsage = {};

            const merged = productionData.map(prod => {
                const dateStr = new Date(prod.date).toISOString().split('T')[0];
                
                const glsForDate = greenLeafData.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr);
                const labsForDate = labourData.filter(l => new Date(l.date).toISOString().split('T')[0] === dateStr);

                if (glUsage[dateStr] === undefined) glUsage[dateStr] = 0;
                if (labUsage[dateStr] === undefined) labUsage[dateStr] = 0;

                const gl = glsForDate[glUsage[dateStr]] || null;
                const lab = labsForDate[labUsage[dateStr]] || null;

                glUsage[dateStr]++;
                labUsage[dateStr]++;
                
                const mStart = Number(prod?.dryerDetails?.meterStart) || 0;
                const mEnd = Number(prod?.dryerDetails?.meterEnd) || 0;
                const calculatedUnits = mEnd > mStart ? (mEnd - mStart) : 0;

                return {
                    date: dateStr,
                    teaType: prod.teaType || 'Unknown',
                    madeTeaWeight: prod.madeTeaWeight || 0,
                    selectedWeight: gl ? gl.selectedWeight : 0,
                    workerCount: lab ? lab.workerCount : 0,
                    meterStart: mStart, 
                    meterEnd: mEnd,     
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

    const handleSelectAll = () => {
        if (selectedTeaTypes.length === teaOptions.length) {
            setSelectedTeaTypes([]); 
            setManualInputs({});
        } else {
            setSelectedTeaTypes([...teaOptions]); 
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

        if (filterMonth) {
            dateFiltered = dateFiltered.filter(r => r.date.startsWith(filterMonth));
        }
        
        if (startDate) dateFiltered = dateFiltered.filter(r => r.date >= startDate);
        if (endDate) dateFiltered = dateFiltered.filter(r => r.date <= endDate);

        const rowsToShow = selectedTeaTypes.length > 0 ? selectedTeaTypes : ["All Types"];

        return rowsToShow.map(type => {
            const relevantRecords = type === "All Types" 
                ? dateFiltered 
                : dateFiltered.filter(r => r.teaType === type);

            const totalGL = relevantRecords.reduce((sum, r) => sum + Number(r.selectedWeight || 0), 0);
            const totalSelectionWorkers = relevantRecords.reduce((sum, r) => sum + Number(r.workerCount || 0), 0);
            const totalMT = relevantRecords.reduce((sum, r) => sum + Number(r.madeTeaWeight || 0), 0);

            const uniqueDryerRecords = [];
            relevantRecords.forEach(r => {
                const isDuplicate = uniqueDryerRecords.some(ud => ud.date === r.date && ud.meterStart === r.meterStart && ud.meterEnd === r.meterEnd);
                if (!isDuplicate) uniqueDryerRecords.push(r);
            });
            const totalDryerUnits = uniqueDryerRecords.reduce((sum, r) => sum + Number(r.dryerUnits || 0), 0);

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

    const generatePDF = async () => {
        const doc = new jsPDF('landscape'); 

        try {
            const res = await fetch("/logo.png");
            if (res.ok) {
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(dataUrl, "PNG", 14, 10, 30, 30); 
            }
        } catch (err) {
            console.error("Failed to load logo for PDF", err);
        }
        
        doc.setFontSize(20);
        doc.setTextColor(27, 106, 49); 
        doc.text("Hand Made Tea Factory - Production Summary", 50, 18);
        
        doc.setFontSize(11);
        doc.setTextColor(100);

        let dateFilterText = 'All Time';
        if(filterMonth) {
            const dateObj = new Date(`${filterMonth}-01`);
            dateFilterText = `Month: ${dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        } else if (startDate || endDate) {
            dateFilterText = `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'}`;
        }
        doc.text(dateFilterText, 50, 25);
        doc.text(`Selected Tea Types: ${selectedTeaTypes.length > 0 ? selectedTeaTypes.join(', ') : 'All Types'}`, 50, 31);
        doc.text(`Rates -> Labour: Rs. ${labourRate} | Electricity: Rs. ${electricityRate}`, 50, 37);

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
            startY: 45,
            head: tableHead,
            body: tableRows,
            theme: 'grid',
            headStyles: { textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8, halign: 'center', valign: 'middle' },
            columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' } },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const colIdx = data.column.index;
                    if (colIdx === 1 || colIdx === 2) {
                        data.cell.styles.textColor = [27, 106, 49]; 
                        data.cell.styles.fontStyle = 'bold';
                    } else if (colIdx === 3 || colIdx === 4) {
                        data.cell.styles.textColor = [29, 78, 216];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (colIdx === 7 || colIdx === 8) {
                        data.cell.styles.textColor = [234, 88, 12];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (colIdx === 11) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }

                    if (data.row.index === tableRows.length - 1) {
                        data.cell.styles.fillColor = [240, 240, 240];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            didDrawPage: function (data) {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                doc.text(`Page ${data.pageNumber} of ${pageCount} - Hand Made Tea Factory`, pageWidth / 2, pageHeight - 10, { align: "center" });
            }
        });

        const safeDateString = new Date().toISOString().split('T')[0];
        doc.save(`Production_Summary_${safeDateString}.pdf`);
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

            {/* --- TEA TYPE SELECTION (MOVED ABOVE) --- */}
            <div className="bg-gradient-to-br from-green-50/50 to-white p-6 rounded-xl border border-green-200 shadow-lg shadow-green-900/5 mb-6 relative overflow-hidden">
    {/* වම් පස ඇති කොළ පාට Accent Line එක */}
    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1B6A31]"></div>
    
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-green-100 pb-3'>
        <h3 className="text-sm md:text-base font-extrabold text-[#1B6A31] flex items-center gap-2 uppercase tracking-wider">
            <div className="p-1.5 bg-green-100 rounded-lg">
                <Leaf size={18} className="text-[#1B6A31]"/> 
            </div>
            SELECT TEA TYPES
        </h3>
        <button 
            onClick={handleSelectAll}
            className="text-xs font-bold flex items-center gap-1.5 px-4 py-2 bg-white border border-green-200 text-[#1B6A31] rounded-lg hover:bg-green-50 hover:border-green-300 transition-all shadow-sm"
        >
            {selectedTeaTypes.length === teaOptions.length ? <CheckSquare size={16}/> : <Square size={16}/>}
            {selectedTeaTypes.length === teaOptions.length ? "Deselect All" : "Select All Tea Types"}
        </button>
    </div>
    
    <div className="flex flex-wrap gap-2.5">
        {teaOptions.map(type => (
            <button
                key={type}
                onClick={() => toggleTeaType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${
                    selectedTeaTypes.includes(type) 
                    ? 'bg-[#1B6A31] border-[#1B6A31] text-white shadow-md shadow-green-900/20 transform scale-105' 
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#8CC63F] hover:text-[#1B6A31]'
                }`}
            >
                {type} {selectedTeaTypes.includes(type) && '✓'}
            </button>
        ))}
    </div>
</div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    
    {/* 1. Date Filters */}
    <div className="bg-gradient-to-br from-blue-50/50 to-white p-6 rounded-xl border border-blue-200 shadow-lg shadow-blue-900/5 flex flex-col gap-5 relative overflow-hidden">
        {/* වම් පස ඇති නිල් පාට Accent Line එක */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        
        <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <h3 className="text-sm md:text-base font-extrabold text-blue-700 flex items-center gap-2 uppercase tracking-wider">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Calendar size={18} className="text-blue-700"/>
                </div>
                1. Select Dates
            </h3>
        </div>

        <div className="flex flex-col gap-1.5 relative z-10">
            <label className="text-xs font-bold text-gray-500">MONTHLY FILTER (Overrides Date Range)</label>
            <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => {setFilterMonth(e.target.value); setStartDate(''); setEndDate('');}} 
                className="border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" 
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-blue-100 relative z-10">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500">OR FROM DATE</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => {setStartDate(e.target.value); setFilterMonth('');}} 
                    className="border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" 
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500">TO DATE</label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => {setEndDate(e.target.value); setFilterMonth('');}} 
                    className="border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm" 
                />
            </div>
        </div>
    </div>

    {/* 2. Rate Settings */}
    <div className="bg-gradient-to-br from-orange-50/50 to-white p-6 rounded-xl border border-orange-200 shadow-lg shadow-orange-900/5 h-fit relative overflow-hidden">
        {/* වම් පස ඇති තැඹිලි පාට Accent Line එක */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        
        <div className="flex items-center gap-2 mb-5 border-b border-orange-100 pb-3">
            <h3 className="text-sm md:text-base font-extrabold text-orange-700 flex items-center gap-2 uppercase tracking-wider">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                    <Settings2 size={18} className="text-orange-600"/>
                </div>
                2. Adjust Rates (LKR)
            </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Users size={12}/> LABOUR RATE (PER HEAD)</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                    <input 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        value={labourRate} 
                        onChange={(e) => setLabourRate(e.target.value.replace(/^0+(?=\d)/, ''))} 
                        className="w-full border border-gray-300 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm" 
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Zap size={12}/> ELECTRICITY RATE (PER UNIT)</label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">Rs.</span>
                    <input 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        value={electricityRate} 
                        onChange={(e) => setElectricityRate(e.target.value.replace(/^0+(?=\d)/, ''))} 
                        className="w-full border border-gray-300 rounded-md p-2.5 pl-10 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm" 
                    />
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
                                <th className="px-3 py-2 font-semibold bg-blue-50/50 text-center border-r border-gray-200 w-32">Hand Roll</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200/60 w-28">Selection</th>
                                <th className="px-3 py-2 font-semibold bg-blue-100/30 text-center border-r border-gray-200 w-28">Hand Roll</th>
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
                                    <td className="px-4 py-4 border-r border-gray-200 font-bold text-[#1B6A31] bg-gray-50/50 whitespace-normal">{row.type}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.totalGL.toFixed(2)}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.totalMT.toFixed(3)}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-blue-700 bg-blue-50/10">{row.totalSelectionWorkers}</td>
                                    <td className="px-2 py-2 border-r border-gray-200 bg-blue-50/30">
                                        <input type="number" onWheel={(e) => e.target.blur()} value={row.hrWorkers || ''} onChange={(e) => handleManualChange(row.type, 'handRolling', e.target.value.replace(/^0+(?=\d)/, ''))} className="w-full p-2 border border-blue-300 rounded text-center font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-white" placeholder="0" />
                                    </td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.selectionCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.handRollingCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-orange-600 bg-orange-50/10">{row.totalDryerUnits}</td>
                                    <td className="px-2 py-2 border-r border-gray-200 bg-orange-50/30">
                                        <input type="number" onWheel={(e) => e.target.blur()} value={row.rPoints || ''} onChange={(e) => handleManualChange(row.type, 'roller', e.target.value.replace(/^0+(?=\d)/, ''))} className="w-full p-2 border border-orange-300 rounded text-center font-bold text-orange-800 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner bg-white" placeholder="0" />
                                    </td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.dryerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 border-r border-gray-200 font-bold text-gray-700">{row.rollerCost.toLocaleString()}</td>
                                    <td className="px-3 py-4 font-black text-lg text-red-600 bg-red-50/30">{row.totalElectricityCost.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        
                        <tfoot className="bg-gray-100/90 border-t-[3px] border-gray-300 font-black text-gray-900 text-center shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
                            <tr>
                                <td className="px-4 py-5 border-r border-gray-200 text-right uppercase tracking-wider text-sm">Grand Total</td>
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