import React from 'react';
import { FileDown } from "lucide-react";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export default function PDFDownloader({ 
    title = "Document", 
    subtitle = "", 
    headers = [], 
    data = [], // Now accepts either an array of arrays OR an array of objects { data: [], fillColor: [r,g,b], isFooter: boolean }
    fileName = "document.pdf",
    orientation = "portrait", // 'portrait' or 'landscape'
    disabled = false,
    className = "",
    uniqueCode = ""
}) {
    
    const handleDownload = async () => {
        if (!data || data.length === 0) {
            toast.error("No data available to download.");
            return;
        }

        const toastId = toast.loading("Generating PDF...");
        const doc = new jsPDF(orientation);

        try {
            // 1. Load Logo (Optional)
            try {
                const res = await fetch("/logo.png");
                if (res.ok) {
                    const blob = await res.blob();
                    const dataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    doc.addImage(dataUrl, "PNG", 14, 10, 25, 25); 
                }
            } catch (err) {
                console.warn("Logo not found or couldn't be loaded.");
            }

            // 2. Add Titles
            doc.setFontSize(22);
            doc.setTextColor(27, 106, 49); // Dark Green
            doc.text(title, 45, 20);
            
            if (subtitle) {
                doc.setFontSize(10);
                doc.setTextColor(100); // Gray
                doc.text(subtitle, 45, 27);
            }

            doc.setFontSize(10);
            doc.setTextColor(150); // Light gray for the code
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(`Doc Ref: ${uniqueCode}`, pageWidth - 14, 12, { align: 'right' });

            // --- Pre-process data for autoTable ---
            // Extract just the array of strings/numbers for the body
            const processedBody = data.map(item => Array.isArray(item) ? item : item.data);

            // 3. Generate Table
            autoTable(doc, {
                startY: 40,
                head: [headers],
                body: processedBody,
                theme: 'grid',
                headStyles: { fillColor: [27, 106, 49], textColor: 255, fontSize: 9, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center' },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
                didParseCell: function(dataInfo) {
                    if (dataInfo.section === 'body') {
                        const rowIndex = dataInfo.row.index;
                        const originalRowData = data[rowIndex];

                        // If the row was passed as an object with specific configurations
                        if (!Array.isArray(originalRowData)) {
                            
                            // Apply custom fillColor if provided (for highlighted rows)
                            if (originalRowData.fillColor) {
                                dataInfo.cell.styles.fillColor = originalRowData.fillColor;
                                dataInfo.cell.styles.fontStyle = 'bold'; // Optional: make highlighted rows bold
                            }

                            // Footer row styling (Grand Total)
                            if (originalRowData.isFooter) {
                                dataInfo.cell.styles.fillColor = [230, 240, 230];
                                dataInfo.cell.styles.fontStyle = 'bold';
                                dataInfo.cell.styles.textColor = [27, 106, 49];
                                if(dataInfo.column.index === 0) dataInfo.cell.styles.halign = 'right';
                            }
                        } else {
                            // Fallback for simple arrays (Legacy support)
                            if (rowIndex === data.length - 1) {
                                const firstCellText = String(data[data.length - 1][0] || '').toUpperCase();
                                if (firstCellText.includes("TOTAL")) {
                                    dataInfo.cell.styles.fillColor = [230, 240, 230];
                                    dataInfo.cell.styles.fontStyle = 'bold';
                                    dataInfo.cell.styles.textColor = [27, 106, 49];
                                    if(dataInfo.column.index === 0) dataInfo.cell.styles.halign = 'right';
                                }
                            }
                        }
                    }
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Page ${i} of ${pageCount} - Generated by HandMade Tea Factory`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // 4. Save the file
            doc.save(fileName);
            toast.success("PDF Downloaded successfully!", { id: toastId });

        } catch (error) {
            console.error("PDF Generation Error: ", error);
            toast.error("Failed to generate PDF.", { id: toastId });
        }
    };

    return (
        <button 
            onClick={handleDownload}
            disabled={disabled}
            className={`px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <FileDown size={18} />
            Download PDF
        </button>
    );
} 