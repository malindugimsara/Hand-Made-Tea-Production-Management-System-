import React from 'react';
import { FileDown } from "lucide-react";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PDFDownloader({
    title = "Document",
    subtitle = "",
    headers = [],
    data = [],
    fileName = "document.pdf",
    orientation = "portrait",
    disabled = false,
    className = "",
    uniqueCode = "",
    userName,
    userRole,
    autoTableOptions = {} // <-- NEW PROP: Allows custom table styling!
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
                    doc.addImage(dataUrl, "PNG", 14, 10, 25, 25, "", "FAST");
                }
            } catch (err) {
                console.warn("Logo not found or couldn't be loaded.");
            }

            // 2. Add Titles
            doc.setFontSize(16);
            doc.setTextColor(27, 106, 49);
            doc.text(title, 45, 25);

            if (subtitle) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(subtitle, 45, 30);
            }

            // --- Generate Current Date & Time ---
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            hours = hours % 12 || 12;
            const generatedDateTime = `${year}/${month}/${day} ${hours}.${minutes}${ampm}`;

            doc.setFontSize(10);
            doc.setTextColor(150);
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.text(`Doc Ref: ${uniqueCode}`, pageWidth - 14, 12, { align: 'right' });
            doc.text(`Generated: ${generatedDateTime}`, pageWidth - 14, 17, { align: 'right' });

            // --- Advanced Sorting ---
            let totalRow = null;
            const groups = [];
            let currentGroup = null;

            data.forEach((row) => {
                const val = Array.isArray(row) ? row[0] : row.data[0];
                const strVal = String(val || '').trim();

                if (strVal.toUpperCase().includes("TOTAL")) {
                    totalRow = row;
                    return;
                }

                const dateMatch = strVal.match(/\d{4}-\d{2}-\d{2}/);

                if (dateMatch) {
                    currentGroup = { dateValue: new Date(dateMatch[0]).getTime(), rows: [row] };
                    groups.push(currentGroup);
                } else {
                    if (currentGroup) {
                        currentGroup.rows.push(row);
                    } else {
                        currentGroup = { dateValue: 0, rows: [row] }; // DateValue 0 keeps "B/F" at the top!
                        groups.push(currentGroup);
                    }
                }
            });

            groups.sort((a, b) => a.dateValue - b.dateValue);

            const sortedData = [];
            groups.forEach(g => sortedData.push(...g.rows));
            if (totalRow) sortedData.push(totalRow);

            const processedBody = sortedData.map(item => Array.isArray(item) ? item : item.data);

            // --- FIX: Support 2D Array Headers ---
            // If headers[0] is an array, it's a multi-row header, so don't wrap it!
            const isMultiRowHeader = headers.length > 0 && Array.isArray(headers[0]);
            const finalHeaders = isMultiRowHeader ? headers : [headers];

            // 3. Generate Table
            autoTable(doc, {
                startY: 40,
                head: finalHeaders, // <-- Fixed Header Wrapping
                body: processedBody,
                theme: 'grid',
                headStyles: { fillColor: [57, 106, 49], textColor: 255, fontSize: 9, halign: 'center' },
                bodyStyles: { fontSize: 8, halign: 'center' },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
                ...autoTableOptions, // <-- NEW: Injects custom styles (like our gray theme!)

                didParseCell: function (dataInfo) {
                    // Call the custom parsed cell function if passed in autoTableOptions
                    if (autoTableOptions.didParseCell) {
                        autoTableOptions.didParseCell(dataInfo);
                    }

                    if (dataInfo.section === 'body') {
                        const rowIndex = dataInfo.row.index;
                        const originalRowData = sortedData[rowIndex];

                        if (!Array.isArray(originalRowData)) {
                            if (originalRowData.fillColor) {
                                dataInfo.cell.styles.fillColor = originalRowData.fillColor;
                                dataInfo.cell.styles.fontStyle = 'bold';
                            }
                            if (originalRowData.isFooter) {
                                dataInfo.cell.styles.fillColor = [230, 240, 230];
                                dataInfo.cell.styles.fontStyle = 'bold';
                                dataInfo.cell.styles.textColor = [27, 106, 49];
                                if (dataInfo.column.index === 0) dataInfo.cell.styles.halign = 'right';
                            }
                        } else {
                            if (rowIndex === sortedData.length - 1) {
                                const firstCellText = String(sortedData[sortedData.length - 1][0] || '').toUpperCase();
                                if (firstCellText.includes("TOTAL")) {
                                    dataInfo.cell.styles.fillColor = [230, 240, 230];
                                    dataInfo.cell.styles.fontStyle = 'bold';
                                    dataInfo.cell.styles.textColor = [27, 106, 49];
                                    if (dataInfo.column.index === 0) dataInfo.cell.styles.halign = 'right';
                                }
                            }
                        }
                    }
                }
            });

            // --- ADD SIGNATURE BLOCK ---
            let finalY = (doc.lastAutoTable.finalY || 40) + 25;
            if (finalY > pageHeight - 30) {
                doc.addPage();
                finalY = 30;
            }

            const finalUserName = userName || localStorage.getItem('username') || localStorage.getItem('userName') || 'System User';
            const finalUserRole = userRole || localStorage.getItem('userRole') || localStorage.getItem('role') || 'Authorized User';

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("Generated By:", 14, finalY);
            doc.setTextColor(30, 30, 30);
            doc.setFont(undefined, 'bold');
            doc.text(`${finalUserName} (${finalUserRole})`, 14, finalY + 6);
            doc.setFont(undefined, 'normal');

            doc.setTextColor(100, 100, 100);
            doc.text(".................................................................", pageWidth - 14, finalY, { align: 'right' });
            doc.text("Checked By / Signature", pageWidth - 26, finalY + 6, { align: 'right' });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            doc.save(fileName);
            toast.success("PDF Downloaded successfully!", { id: toastId });

        } catch (error) {
            console.error("PDF Generation Error: ", error);
            toast.error("Failed to generate PDF.", { id: toastId });
        }
    };

    return (
        <button onClick={handleDownload} disabled={disabled} className={`px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
            <FileDown size={18} /> Download PDF
        </button>
    );
}