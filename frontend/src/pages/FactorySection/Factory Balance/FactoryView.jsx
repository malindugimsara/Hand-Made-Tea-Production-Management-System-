import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function FactoryView() {
    // Dummy data to demonstrate the table structure
    const [records, setRecords] = useState([
        { date: '1', glToday: 120.5, glToDate: 120.5, mtToday: 25.2, mtToDate: 25.2, dispatch: 10.0, localSales: 2.0, totalSales: 12.0, returnInvoice: 0, factoryBalance: 13.2 },
        { date: '2', glToday: 110.0, glToDate: 230.5, mtToday: 22.1, mtToDate: 47.3, dispatch: 15.0, localSales: 5.0, totalSales: 20.0, returnInvoice: 1.0, factoryBalance: 16.3 },
        { date: '3', glToday: 95.0, glToDate: 325.5, mtToday: 18.5, mtToDate: 65.8, dispatch: 0.0, localSales: 3.5, totalSales: 3.5, returnInvoice: 0, factoryBalance: 31.3 },
    ]);

    // B/F (Brought Forward) Initial Balance Data
    const broughtForward = {
        date: 'B/F', glToday: '-', glToDate: 500.0, mtToday: '-', mtToDate: 100.0, dispatch: '-', localSales: '-', totalSales: '-', returnInvoice: '-', factoryBalance: 50.0
    };

    // --- EXPORT TO EXCEL ---
    const exportToExcel = () => {
        // 1. Prepare data array
        const exportData = [
            broughtForward,
            ...records
        ].map(row => ({
            "Date": row.date,
            "G/L - Today": row.glToday,
            "G/L - To Date": row.glToDate,
            "M/T - Today": row.mtToday,
            "M/T - To Date": row.mtToDate,
            "Dispatch": row.dispatch,
            "Local Sales & Gratis": row.localSales,
            "Total (Local Sale + Dispatch)": row.totalSales,
            "Return Invoice": row.returnInvoice,
            "Factory Balance": row.factoryBalance
        }));

        // 2. Create Workbook and Worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Factory View");

        // 3. Download the file
        XLSX.writeFile(workbook, "Factory_View_Report.xlsx");
    };

    // --- EXPORT TO PDF ---
    const exportToPDF = () => {
        const doc = new jsPDF('landscape'); // Landscape for wide tables
        
        doc.text("Factory View", 14, 15);

        // Map data for autoTable
        const tableBody = [
            [broughtForward.date, broughtForward.glToday, broughtForward.glToDate, broughtForward.mtToday, broughtForward.mtToDate, broughtForward.dispatch, broughtForward.localSales, broughtForward.totalSales, broughtForward.returnInvoice, broughtForward.factoryBalance],
            ...records.map(r => [r.date, r.glToday, r.glToDate, r.mtToday, r.mtToDate, r.dispatch, r.localSales, r.totalSales, r.returnInvoice, r.factoryBalance])
        ];

        doc.autoTable({
            startY: 20,
            head: [
                [{ content: 'Date', rowSpan: 2 }, { content: 'G/L', colSpan: 2, styles: { halign: 'center' } }, { content: 'M/T', colSpan: 2, styles: { halign: 'center' } }, { content: 'Dispatch', rowSpan: 2 }, { content: 'Local Sales & Gratis', rowSpan: 2 }, { content: 'Total (Local Sale + Dispatch)', rowSpan: 2 }, { content: 'Return Invoice', rowSpan: 2 }, { content: 'Factory Balance', rowSpan: 2 }],
                ['Today', 'To Date', 'Today', 'To Date']
            ],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [27, 106, 49] }, // Hand Made Tea Factory Green
            styles: { fontSize: 9, halign: 'center' },
            didParseCell: function (data) {
                // Highlight the B/F row
                if (data.row.index === 0 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.save("Factory_View_Report.pdf");
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto font-sans flex flex-col min-h-0">
            {/* Header & Export Buttons */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#1B6A31] flex items-center gap-2">
                        Factory View
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Master view of G/L, M/T, Dispatch, and Balances</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={exportToExcel}
                        className="px-4 py-2 bg-white text-[#1B6A31] border border-[#1B6A31] hover:bg-green-50 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <FileSpreadsheet size={18} />
                        Export Excel
                    </button>
                    <button 
                        onClick={exportToPDF}
                        className="px-4 py-2 bg-[#1B6A31] text-white hover:bg-[#145325] rounded-md text-sm font-semibold flex items-center gap-2 shadow-md transition-all"
                    >
                        <FileText size={18} />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden w-full">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
                        
                        {/* THEAD matches your handwritten sketch perfectly */}
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-xs tracking-wider border-b border-gray-300">
                                <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle w-16 bg-gray-200">Date</th>
                                <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-[#8CC63F]/20 text-[#1B6A31]">G/L</th>
                                <th colSpan="2" className="px-4 py-2 border-r border-gray-300 bg-purple-100 text-purple-800">M/T</th>
                                <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50">Dispatch</th>
                                <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-800 bg-orange-50 whitespace-normal min-w-[120px]">Local Sales &<br/>Gratis</th>
                                <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-orange-900 bg-orange-100 font-extrabold whitespace-normal min-w-[140px]">Total<br/><span className="text-[10px] font-normal">(Local Sale + Dispatch)</span></th>
                                <th rowSpan="2" className="px-4 py-4 border-r border-gray-300 align-middle text-red-700 bg-red-50">Return<br/>Invoice</th>
                                <th rowSpan="2" className="px-4 py-4 align-middle text-blue-800 bg-blue-50 font-extrabold">Factory<br/>Balance</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-600 text-xs border-b-2 border-gray-400">
                                <th className="px-3 py-2 border-r border-gray-300 font-semibold">Today</th>
                                <th className="px-3 py-2 border-r border-gray-300 font-semibold">To Date</th>
                                <th className="px-3 py-2 border-r border-gray-300 font-semibold">Today</th>
                                <th className="px-3 py-2 border-r border-gray-300 font-semibold">To Date</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {/* B/F ROW (Brought Forward) */}
                            <tr className="bg-gray-100 font-bold text-gray-800 border-b-2 border-red-400">
                                <td className="px-4 py-3 border-r border-gray-300 bg-gray-200">{broughtForward.date}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.glToday}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.glToDate}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.mtToday}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.mtToDate}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.dispatch}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.localSales}</td>
                                <td className="px-3 py-3 border-r border-gray-300 bg-orange-50/50">{broughtForward.totalSales}</td>
                                <td className="px-3 py-3 border-r border-gray-300">{broughtForward.returnInvoice}</td>
                                <td className="px-3 py-3 bg-blue-50/50">{broughtForward.factoryBalance}</td>
                            </tr>

                            {/* DYNAMIC DATA ROWS */}
                            {records.map((record, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 border-r border-gray-300 font-semibold bg-gray-50 text-gray-700">{record.date}</td>
                                    
                                    <td className="px-3 py-3 border-r border-gray-200">{record.glToday}</td>
                                    <td className="px-3 py-3 border-r border-gray-300 font-medium">{record.glToDate}</td>
                                    
                                    <td className="px-3 py-3 border-r border-gray-200">{record.mtToday}</td>
                                    <td className="px-3 py-3 border-r border-gray-300 font-medium">{record.mtToDate}</td>
                                    
                                    <td className="px-3 py-3 border-r border-gray-200 text-gray-600">{record.dispatch}</td>
                                    <td className="px-3 py-3 border-r border-gray-300 text-gray-600">{record.localSales}</td>
                                    
                                    <td className="px-3 py-3 border-r border-gray-300 font-bold text-gray-800 bg-orange-50/30">{record.totalSales}</td>
                                    
                                    <td className="px-3 py-3 border-r border-gray-300 text-red-600">{record.returnInvoice === 0 ? '-' : record.returnInvoice}</td>
                                    
                                    <td className="px-3 py-3 font-bold text-blue-800 bg-blue-50/30">{record.factoryBalance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}