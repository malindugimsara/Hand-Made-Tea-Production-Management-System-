import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Calendar, Table as TableIcon, LayoutList, LayoutGrid, FileSpreadsheet, FileDown, FileUp, Loader2, Save } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function WeightAverage() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const currentUsername = localStorage.getItem("username") || "Unknown User";
  const userRole = localStorage.getItem("userRole");

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [viewMode, setViewMode] = useState("simplified"); 

  // 💡 States: Live Uploaded Data vs DB Saved Data
  const [uploadedDailyTotals, setUploadedDailyTotals] = useState({});
  const [dbPdfTotals, setDbPdfTotals] = useState({}); // New State for DB records
  
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isSavingPdfData, setIsSavingPdfData] = useState(false);
  const fileInputRef = useRef(null);

  const routeOptions = [
    "c1 - MATHTHAKA",
    "c2 - walallawita",
    "c3 - pelawaththa",
    "c4 - polgampala",
    "c5 - manampita",
    "c7 - ganegoda",
    "c8 - thundola",
    "fa - factory"
  ];

  useEffect(() => {
    fetchRecords();
    setUploadedDailyTotals({});
  }, [selectedMonth]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // 1. Fetch System Records (Standard Calculation)
      const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch records.");
      const result = await response.json();
      setRecords(result.data || []);

      // 💡 2. Fetch Saved PDF Totals from New Model
      const pdfResponse = await fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pdfResponse.ok) {
          const pdfResult = await pdfResponse.json();
          const formattedDbTotals = {};
          if (pdfResult.data) {
              pdfResult.data.forEach(item => {
                  if (!formattedDbTotals[item.routeKey]) formattedDbTotals[item.routeKey] = {};
                  formattedDbTotals[item.routeKey][item.day] = item.totalKg;
              });
          }
          setDbPdfTotals(formattedDbTotals);
      }

    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Could not load records.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 💡 PDF UPLOAD & PARSING LOGIC 
  // =========================================================================
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error("Failed to load PDF processing library."));
        document.head.appendChild(script);
    });
  };

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPdf(true);
    const toastId = toast.loading(`Parsing ${files.length} PDF(s) to map Daily Totals...`);

    try {
        const pdfjs = await loadPdfJs();
        const newDailyTotals = { ...uploadedDailyTotals };
        let successCount = 0;

        for (const file of files) {
            if (file.type !== 'application/pdf') continue;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

            let fullText = "";
            let allTextItems = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                textContent.items.forEach(item => {
                    allTextItems.push({
                        str: item.str.trim(),
                        x: Math.round(item.transform[4]),
                        y: Math.round(item.transform[5])
                    });
                });
                fullText += textContent.items.map(item => item.str).join(" ") + " ";
            }

            let routeKey = null;
            const upperText = fullText.toUpperCase();
            const cleanText = upperText.replace(/\s+/g, ''); 

            if (cleanText.includes("KALUARACHCHI")) routeKey = "c1";
            else if (cleanText.includes("DARMAKEERTHI")) routeKey = "c2";
            else if (cleanText.includes("KWWPKUMARA")) routeKey = "c3";
            else if (cleanText.includes("MADUSHANKA")) routeKey = "c4";
            else if (cleanText.includes("CHANDRAKUMARA")) routeKey = "c5";
            else if (cleanText.includes("JAYASINGHA") || cleanText.includes("JAYASINGHE")) routeKey = "c7";
            else if (cleanText.includes("SAMPATH")) routeKey = "c8";
            else if (cleanText.includes("ADPKUMARA")) routeKey = "fa";

            if (!routeKey) {
                if (cleanText.includes("C1MATHTHAKA")) routeKey = "c1";
                else if (cleanText.includes("C2WALALLAWITA")) routeKey = "c2";
                else if (cleanText.includes("C3PALAWATTA") || cleanText.includes("C3PELAWATHTHA")) routeKey = "c3";
                else if (cleanText.includes("C4POLGAMPALA")) routeKey = "c4";
                else if (cleanText.includes("C5MANAMPITA")) routeKey = "c5";
                else if (cleanText.includes("C7GANEGODA")) routeKey = "c7";
                else if (cleanText.includes("C8THUNDOLA")) routeKey = "c8";
                else if (cleanText.includes("FAFACTORY")) routeKey = "fa";
            }

            if (!routeKey) continue;

            if (!newDailyTotals[routeKey]) newDailyTotals[routeKey] = {};

            const dateHeaders = [];
            allTextItems.forEach(item => {
                const dateMatch = item.str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (dateMatch) {
                    const day = parseInt(dateMatch[2], 10);
                    dateHeaders.push({ day, x: item.x, y: item.y });
                }
            });

            const totalLabels = allTextItems.filter(i => i.str.toLowerCase() === "total" && i.x < 150);
            
            if (totalLabels.length > 0 && dateHeaders.length > 0) {
                const targetTotalRowY = totalLabels[totalLabels.length - 1].y;
                const totalRowNumbers = allTextItems.filter(i => {
                    return Math.abs(i.y - targetTotalRowY) <= 6 && /^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(i.str);
                });

                dateHeaders.forEach(dh => {
                    let closestNum = null;
                    let minDiff = 40; 
                    totalRowNumbers.forEach(numItem => {
                        const diff = Math.abs(numItem.x - dh.x);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestNum = numItem;
                        }
                    });

                    if (closestNum) {
                        const val = parseFloat(closestNum.str.replace(/,/g, ''));
                        if (!isNaN(val)) {
                            newDailyTotals[routeKey][dh.day] = val;
                        }
                    }
                });
            }
            successCount++;
        }

        setUploadedDailyTotals(newDailyTotals);

        if (successCount > 0) {
            toast.success(`Mapped Daily Totals! Please click 'Save PDF Data to DB'.`, { id: toastId, duration: 5000 });
        } else {
            toast.error("Could not find valid Route or Total rows.", { id: toastId });
        }

    } catch (error) {
        console.error("PDF Parsing Error:", error);
        toast.error("Failed to parse PDFs.", { id: toastId });
    } finally {
        setIsUploadingPdf(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // =========================================================================
  // 💡 SAVE PDF DATA TO NEW BACKEND DB
  // =========================================================================
  const handleSavePdfDataToDB = async () => {
    if (Object.keys(uploadedDailyTotals).length === 0) return;

    setIsSavingPdfData(true);
    const toastId = toast.loading("Saving PDF Totals to Database...");

    try {
      const token = localStorage.getItem("token");
      const totalsArray = [];

      Object.keys(uploadedDailyTotals).forEach((routeKey) => {
        Object.keys(uploadedDailyTotals[routeKey]).forEach((day) => {
          totalsArray.push({
            date: `${selectedMonth}-${String(day).padStart(2, "0")}`,
            month: selectedMonth,
            routeKey: routeKey,
            day: Number(day),
            totalKg: uploadedDailyTotals[routeKey][day]
          });
        });
      });

      // 💡 අලුත් API Endpoint එකට දත්ත යැවීම
      const res = await fetch(`${BACKEND_URL}/api/pdf-totals/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ totals: totalsArray }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("PDF Data successfully saved!", { id: toastId });
      
      setUploadedDailyTotals({}); // Clear live preview
      fetchRecords(); // Refresh to pull directly from DB

    } catch (error) {
      console.error("Save Error:", error);
      toast.error("Failed to save to DB.", { id: toastId });
    } finally {
      setIsSavingPdfData(false);
    }
  };

  // --- MATRIX GENERATION LOGIC ---
  const [yearStr, monthStr] = selectedMonth.split("-");
  const daysInMonth = new Date(yearStr, monthStr, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const matrixData = {};
  routeOptions.forEach((r) => {
    const routeKey = r.split(" - ")[0].toLowerCase(); 
    matrixData[routeKey] = { fullName: r.toUpperCase() };
    daysArray.forEach((day) => {
      matrixData[routeKey][day] = { 
        totalLeafQty: 0, 
        bestProd: 0, 
        belowBestProd: 0, 
        poorProd: 0,
        bestPct: 0,
        belowBestPct: 0,
        poorPct: 0
      };
    });
  });

  records.forEach((r) => {
    if (!r.date || !r.factorySample || !r.factorySample.isEntered) return; 

    const recordRouteKey = (r.route || "").split(" - ")[0].toLowerCase();
    const day = parseInt(r.date.split("-")[2], 10); 

    if (matrixData[recordRouteKey] && matrixData[recordRouteKey][day]) {
      const originalTotalKg = Number(r.totalLeafQtyKg) || 0;
      const netDailyTotalKg = originalTotalKg * 0.97; 

      const bPct = Math.round(Number(r.factorySample.bestPct) || 0);
      const bbPct = Math.round(Number(r.factorySample.belowBestPct) || 0);
      const pPct = Math.round(Number(r.factorySample.poorPct) || 0);

      matrixData[recordRouteKey][day].totalLeafQty += netDailyTotalKg;
      matrixData[recordRouteKey][day].bestPct = bPct;
      matrixData[recordRouteKey][day].belowBestPct = bbPct;
      matrixData[recordRouteKey][day].poorPct = pPct;
    }
  });

  // 💡 Data Resolve Logic: Uploaded PDF (Live) -> Saved PDF (DB) -> Standard Logic
  const getDailyTotalQty = (routeKey, day) => {
    if (uploadedDailyTotals[routeKey] && uploadedDailyTotals[routeKey][day] !== undefined) {
      return uploadedDailyTotals[routeKey][day];
    }
    if (dbPdfTotals[routeKey] && dbPdfTotals[routeKey][day] !== undefined) {
      return dbPdfTotals[routeKey][day];
    }
    return matrixData[routeKey][day].totalLeafQty;
  };

  const isValueFromPdf = (routeKey, day) => {
      return (uploadedDailyTotals[routeKey] && uploadedDailyTotals[routeKey][day] !== undefined) || 
             (dbPdfTotals[routeKey] && dbPdfTotals[routeKey][day] !== undefined);
  };

  // --- PDF EXPORT LOGIC (SIMPLIFIED ONLY) ---
  const generateSimplifiedPDF = async () => {
    if (Object.keys(matrixData).length === 0) {
      toast.error("No data available to generate report!");
      return;
    }

    const toastId = toast.loading("Generating PDF Report...");
    
    try {
        const doc = new jsPDF("p", "pt", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            const res = await fetch("/logo.png");
            if (res.ok) {
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                doc.addImage(dataUrl, "PNG", 40, 30, 68, 68, "", "FAST");
            }
        } catch (err) {
            console.warn("Logo not found or couldn't be loaded.");
        }

        doc.setFontSize(20);
        doc.setTextColor(27, 106, 49); 
        doc.setFont("helvetica", "bold");
        doc.text("ATHUKORALA GROUP (PVT) LTD", 120, 50);

        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40); 
        doc.text("Loft Leaf Summary Averages", 120, 75);

        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80); 
        doc.setFont("helvetica", "normal");
        doc.text(`Reporting Month: ${selectedMonth} (Factory Samples Only)`, 120, 95);

        const now = new Date();
        const yearStrNow = now.getFullYear();
        const monthStrNow = String(now.getMonth() + 1).padStart(2, '0');
        const dayStrNow = String(now.getDate()).padStart(2, '0');
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        hours = hours % 12 || 12;
        const generatedDateTime = `${yearStrNow}/${monthStrNow}/${dayStrNow} ${hours}.${minutes}${ampm}`;

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated: ${generatedDateTime}`, pageWidth - 40, 80, { align: 'right' });

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(1);
        doc.line(40, 115, pageWidth - 40, 115);

        let currentY = 140; 

        const drawPdfTable = (doc, title, pctField, themeColorRgb) => {
            doc.setFontSize(12);
            doc.setTextColor(themeColorRgb[0], themeColorRgb[1], themeColorRgb[2]);
            doc.setFont("helvetica", "bold");
            doc.text(title, 40, currentY);
            currentY += 15;

            const body = [];
            Object.keys(matrixData).forEach((routeKey) => {
                const data = matrixData[routeKey];
                let rowSumTotalQty = 0;
                let rowSumProduct = 0;
                let hasPdfValues = false;

                daysArray.forEach((day) => {
                    const dailyTotal = getDailyTotalQty(routeKey, day);
                    const pct = data[day][pctField];
                    const prodKg = dailyTotal * (pct / 100);

                    if (isValueFromPdf(routeKey, day)) hasPdfValues = true;

                    rowSumTotalQty += dailyTotal;
                    rowSumProduct += prodKg; 
                });

                const finalAvgPct = rowSumTotalQty > 0 ? (rowSumProduct / rowSumTotalQty) * 100 : 0;

                body.push([
                    data.fullName,
                    rowSumTotalQty > 0 ? `${rowSumTotalQty.toFixed(2)} Kg` : "-",
                    rowSumProduct > 0 ? `${rowSumProduct.toFixed(2)} Kg` : "-",
                    rowSumTotalQty > 0 ? `${Math.round(finalAvgPct)}%` : "-"
                ]);
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Route', 'Total Leaf Qty (Kg)', 'Product (Kg)', 'Final Average %']],
                body: body,
                theme: 'grid',
                headStyles: { 
                    fillColor: themeColorRgb, 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center', fontStyle: 'bold' }
                },
                styles: { fontSize: 10, cellPadding: 5 }
            });

            currentY = doc.lastAutoTable.finalY + 30;
            
            if(currentY > pageHeight - 100) {
                doc.addPage();
                currentY = 40;
            }
        };

        drawPdfTable(doc, "1. BEST TEA MATRIX SUMMARY", "bestPct", [27, 106, 49]); 
        drawPdfTable(doc, "2. BELOW BEST TEA MATRIX SUMMARY", "belowBestPct", [217, 119, 6]); 
        drawPdfTable(doc, "3. POOR TEA MATRIX SUMMARY", "poorPct", [220, 38, 38]); 

        // --- ADD SIGNATURE BLOCK & PAGE NUMBERS ---
        let finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY) + 60;
        if (finalY > pageHeight - 80) {
            doc.addPage();
            finalY = 80;
        }

        const finalUserName = currentUsername || 'System User';

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text("Generated By:", 40, finalY);
        
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.text(`${finalUserName}`, 40, finalY + 15);
        doc.setFont("helvetica", "normal");

        doc.setTextColor(100, 100, 100);
        doc.text(".................................................................", pageWidth - 40, finalY, { align: 'right' });
        doc.text("Checked By / Signature", pageWidth - 75, finalY + 15, { align: 'right' });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pageWidth / 2, pageHeight - 20, { align: 'center' });
        }

        doc.save(`Loft_Leaf_Simplified_Summary_${selectedMonth}.pdf`);
        toast.success("PDF downloaded successfully!", { id: toastId });

    } catch (error) {
        console.error(error);
        toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  // --- EXCEL EXPORT LOGIC ---
  const exportToExcel = () => {
    if (Object.keys(matrixData).length === 0) {
      toast.error("No data to export!");
      return;
    }

    const toastId = toast.loading("Generating styled Excel file...");
    try {
      const wb = XLSX.utils.book_new();

      const createSheetData = (pctField, sheetTitle, themeColor) => {
        const aoa = []; 
        
        const titleStyle = { font: { bold: true, sz: 16, color: { rgb: themeColor } } };
        const headerStyle = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: themeColor } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
        };
        const subHeaderStyle = {
          font: { bold: true, color: { rgb: "4B5563" } },
          fill: { fgColor: { rgb: "F3F4F6" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
        };
        const cellStyle = {
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: {style: "thin", color:{rgb:"E5E7EB"}}, right: {style: "thin", color:{rgb:"E5E7EB"}}, left: {style: "thin", color:{rgb:"E5E7EB"}} }
        };
        const boldCell = { ...cellStyle, font: { bold: true } };
        const summaryCell = { ...cellStyle, font: { bold: true }, fill: { fgColor: { rgb: "ECFDF5" } } };

        aoa.push([{ v: sheetTitle, s: titleStyle }]);
        aoa.push([{ v: "Data calculated using Total Leaf Qty (Kg) * Percentage Value", s: { font: { italic: true, color: { rgb: "6B7280" } } } }]);
        aoa.push([]); 

        const header1 = [{ v: "Route", s: headerStyle }];
        daysArray.forEach(d => { 
          header1.push({ v: `Date ${d}`, s: headerStyle }, { v: "", s: headerStyle }, { v: "", s: headerStyle }); 
        });
        header1.push({ v: "Monthly Summary", s: headerStyle }, { v: "", s: headerStyle }, { v: "", s: headerStyle });
        aoa.push(header1);

        const header2 = [{ v: "", s: subHeaderStyle }];
        daysArray.forEach(() => { 
          header2.push({ v: "Total Kg", s: subHeaderStyle }, { v: "%", s: subHeaderStyle }, { v: "Prod Kg", s: subHeaderStyle }); 
        });
        header2.push({ v: "Sum Total Kg", s: subHeaderStyle }, { v: "Sum Prod Kg", s: subHeaderStyle }, { v: "Final Avg %", s: subHeaderStyle });
        aoa.push(header2);

        const numToCol = (n) => {
            let ordA = 'A'.charCodeAt(0);
            let ordZ = 'Z'.charCodeAt(0);
            let len = ordZ - ordA + 1;
            let s = "";
            while(n >= 0) {
                s = String.fromCharCode(n % len + ordA) + s;
                n = Math.floor(n / len) - 1;
            }
            return s;
        };

        let currentRow = 6; 

        Object.keys(matrixData).forEach(routeKey => {
          const data = matrixData[routeKey];
          const row = [{ v: data.fullName, s: boldCell }];
          
          let sumTotalKgCells = [];
          let sumProdKgCells = [];
          let currentColIndex = 1; 

          daysArray.forEach(day => {
            const totalQty = getDailyTotalQty(routeKey, day);
            const roundedPct = data[day][pctField];
            const customProdKg = totalQty * roundedPct; 

            const colTotalLetter = numToCol(currentColIndex);
            const colProdLetter = numToCol(currentColIndex + 2);
            
            sumTotalKgCells.push(`${colTotalLetter}${currentRow}`);
            sumProdKgCells.push(`${colProdLetter}${currentRow}`);

            row.push(
              { v: totalQty > 0 ? Number(totalQty.toFixed(2)) : 0, t: 'n', s: cellStyle }, 
              { v: totalQty > 0 ? roundedPct / 100 : 0, t: 'n', s: { ...cellStyle, numFmt: "0%", font: { bold: true, color: { rgb: themeColor } } } },
              { v: totalQty > 0 ? Number(customProdKg.toFixed(2)) : 0, t: 'n', s: cellStyle } 
            );
            
            currentColIndex += 3;
          });

          const sumTotalColLetter = numToCol(currentColIndex);
          const sumProdColLetter = numToCol(currentColIndex + 1);

          row.push(
              { f: `SUM(${sumTotalKgCells.join(',')})`, s: summaryCell },
              { f: `SUM(${sumProdKgCells.join(',')})`, s: summaryCell },
              { f: `IF(${sumTotalColLetter}${currentRow}>0, (${sumProdColLetter}${currentRow}/${sumTotalColLetter}${currentRow})/100, 0)`, s: { ...summaryCell, numFmt: "0%", font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: themeColor } } } }
          );
          
          aoa.push(row);
          currentRow++;
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 4, c: 0 } });
        
        let colIndex = 1;
        daysArray.forEach(() => {
          ws['!merges'].push({ s: { r: 3, c: colIndex }, e: { r: 3, c: colIndex + 2 } });
          colIndex += 3;
        });
        ws['!merges'].push({ s: { r: 3, c: colIndex }, e: { r: 3, c: colIndex + 2 } });

        const colWidths = [{ wch: 18 }]; 
        for(let i=0; i<daysArray.length; i++){
           colWidths.push({ wch: 9 }, { wch: 6 }, { wch: 9 }); 
        }
        colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }); 
        ws['!cols'] = colWidths;

        return ws;
      };

      XLSX.utils.book_append_sheet(wb, createSheetData("bestPct", `BEST TEA MATRIX - ${selectedMonth}`, "1B6A31"), "Best Tea");
      XLSX.utils.book_append_sheet(wb, createSheetData("belowBestPct", `BELOW BEST TEA - ${selectedMonth}`, "D97706"), "Below Best");
      XLSX.utils.book_append_sheet(wb, createSheetData("poorPct", `POOR TEA MATRIX - ${selectedMonth}`, "DC2626"), "Poor Tea");

      XLSX.writeFile(wb, `Loft_Leaf_Matrices_${selectedMonth}.xlsx`);
      toast.success("Excel file downloaded!", { id: toastId });
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to generate Excel file.", { id: toastId });
    }
  };

  const [hoveredCol, setHoveredCol] = useState(null);

  const renderTable = (title, pctField, theme) => {
    return (
      <div className="mb-10 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 w-full overflow-hidden">
        <div className={`px-4 py-3 border-b ${theme.headerBorder} ${theme.headerBg}`}>
            <h3 className={`font-black text-lg ${theme.titleText}`}>{title}</h3>
        </div>

        <div className="overflow-x-auto custom-scrollbar w-full max-h-[60vh]" onMouseLeave={() => setHoveredCol(null)}>
          <table className="w-full text-xs text-center border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-950 text-gray-600 dark:text-gray-300">
                <th
                  rowSpan={2}
                  className={`bg-gray-100 dark:bg-zinc-950 border-b border-r border-gray-300 dark:border-zinc-700 px-4 py-3 font-bold uppercase ${viewMode === "detailed" ? "sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}`}
                >
                  Route
                </th>

                {viewMode === "detailed" && daysArray.map((day) => (
                  <th
                    key={day}
                    colSpan={3}
                    className="border-b border-r border-gray-300 dark:border-zinc-700 py-2 font-black text-sm bg-gray-50 dark:bg-zinc-900/50"
                  >
                    {day}
                  </th>
                ))}

                <th
                  colSpan={3}
                  className={`border-b border-l py-2 font-black text-sm ${theme.summaryBg} ${theme.summaryText} ${theme.summaryBorder} ${viewMode === "detailed" ? "sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" : ""}`}
                >
                  Monthly Summary (Kg)
                </th>
              </tr>

              <tr className="bg-gray-50 dark:bg-zinc-900/50 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">
                {viewMode === "detailed" && daysArray.map((day) => (
                  <React.Fragment key={`sub-${day}`}>
                    <th className="border-b border-r border-gray-200 dark:border-zinc-700 px-2 py-2">Total Kg</th>
                    <th className="border-b border-r border-gray-200 dark:border-zinc-700 px-2 py-2">%</th>
                    <th className="border-b border-r border-gray-300 dark:border-zinc-600 px-2 py-2 bg-black/5">Prod Kg</th>
                  </React.Fragment>
                ))}
                
                <th className={`border-b border-l px-3 py-2 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[160px] z-20" : ""}`}>Sum Total Kg</th>
                <th className={`border-b border-l px-3 py-2 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[80px] z-20" : ""}`}>Sum Prod Kg</th>
                <th className={`text-white border-b border-l px-3 py-2 ${theme.finalAvgBg} ${theme.finalAvgBorder} ${viewMode === "detailed" ? "sticky right-0 z-20" : ""}`}>Final Avg %</th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-zinc-950">
              {Object.keys(matrixData).map((routeKey) => {
                const data = matrixData[routeKey];
                
                let rowSumTotalQty = 0;
                let rowSumProduct = 0;

                daysArray.forEach((day) => {
                  const dailyTotal = getDailyTotalQty(routeKey, day);
                  const roundedPct = data[day][pctField];
                  const customProdKg = dailyTotal * roundedPct; 

                  rowSumTotalQty += dailyTotal;
                  rowSumProduct += customProdKg; 
                });

                const finalAvgPct = rowSumTotalQty > 0 ? (rowSumProduct / rowSumTotalQty): 0;

                return (
                  <tr key={routeKey} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group">
                    <td className={`bg-white dark:bg-zinc-950 group-hover:bg-gray-50 dark:group-hover:bg-zinc-900/50 border-b border-r border-gray-200 dark:border-zinc-800 px-4 py-3 font-bold text-gray-800 dark:text-gray-200 text-left whitespace-nowrap ${viewMode === "detailed" ? "sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {data.fullName}
                    </td>

                    {viewMode === "detailed" && daysArray.map((day) => {
                      const dailyTotal = getDailyTotalQty(routeKey, day);
                      const roundedPct = data[day][pctField];
                      const customProdKg = dailyTotal * roundedPct;
                      
                      const isDailyFromPdf = isValueFromPdf(routeKey, day);

                      return (
                        <React.Fragment key={`${routeKey}-${day}`}>
                          <td onMouseEnter={() => setHoveredCol(`${day}-t`)} className={`border-b border-r border-gray-100 dark:border-zinc-800 px-2 py-3 text-gray-700 dark:text-gray-300 transition-colors ${hoveredCol === `${day}-t` ? 'bg-gray-100 dark:bg-zinc-800' : ''}`}>
                            {dailyTotal > 0 ? (
                                <div>
                                    <span>{dailyTotal.toFixed(2)}</span>
                                    {isDailyFromPdf && <span className="block text-[8px] text-purple-600 font-bold leading-none mt-1">PDF</span>}
                                </div>
                            ) : "-"}
                          </td>
                          <td onMouseEnter={() => setHoveredCol(`${day}-p`)} className={`border-b border-r border-gray-100 dark:border-zinc-800 px-2 py-3 font-semibold ${theme.pctColor} transition-colors ${hoveredCol === `${day}-p` ? 'bg-gray-100 dark:bg-zinc-800' : ''}`}>
                            {dailyTotal > 0 ? `${roundedPct}%` : "-"}
                          </td>
                          <td onMouseEnter={() => setHoveredCol(`${day}-k`)} className={`border-b border-r border-gray-300 dark:border-zinc-700 px-2 py-3 bg-black/5 text-gray-800 dark:text-gray-200 font-mono transition-colors ${hoveredCol === `${day}-k` ? 'bg-gray-200 dark:bg-zinc-700' : ''}`}>
                            {dailyTotal > 0 ? customProdKg.toFixed(2) : "-"}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className={`border-b border-l px-3 py-3 font-bold text-gray-800 dark:text-gray-200 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[160px] z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {rowSumTotalQty > 0 ? rowSumTotalQty.toFixed(2) : "-"}
                    </td>
                    
                    <td className={`border-b border-l px-3 py-3 font-bold text-gray-800 dark:text-gray-200 ${theme.subSummaryBg} ${theme.subSummaryBorder} ${viewMode === "detailed" ? "sticky right-[80px] z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]" : ""}`}>
                      {rowSumTotalQty > 0 ? rowSumProduct.toFixed(2) : "-"}
                    </td>
                    
                    <td className={`border-b border-l px-3 py-3 font-black text-white text-base ${theme.finalAvgBg} ${theme.finalAvgBorder} ${viewMode === "detailed" ? "sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "text-lg"}`}>
                      {rowSumTotalQty > 0 ? `${Math.round(finalAvgPct)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[95vw] mx-auto font-sans relative min-h-screen transition-colors duration-300">
      {/* HEADER CONTROLS */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <TableIcon size={24} /> Weight Average View
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Categorized Weighted Averages (Factory Samples Only - Kg)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setViewMode("simplified")}
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                viewMode === "simplified" ? "bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutList size={16} /> Simplified
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                viewMode === "detailed" ? "bg-white dark:bg-zinc-900 text-[#1B6A31] dark:text-green-500 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={16} /> Detailed
            </button>
          </div>

          <div className="flex items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-1 shadow-sm w-full sm:w-auto">
            <div className="pl-3 pr-2 text-gray-400"><Calendar size={18} /></div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-200 p-2 w-full cursor-pointer"
            />
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className={`px-4 py-2.5 bg-gray-200 text-black rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-300 w-full sm:w-auto ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-400"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> 
          </button>

          <div className="w-full sm:w-auto">
              <input 
                  type="file" 
                  accept="application/pdf" 
                  multiple
                  ref={fileInputRef} 
                  onChange={handlePdfUpload} 
                  className="hidden" 
              />
              <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPdf || loading}
                  className={`w-full sm:w-auto px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all duration-300 ${
                      isUploadingPdf || loading ? "opacity-70 cursor-not-allowed" : "hover:bg-purple-700"
                  }`}
                  title="Upload Monthly Route PDFs to map official Daily & Monthly Totals"
              >
                  {isUploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  {isUploadingPdf ? "Mapping..." : "Map PDF Totals"}
              </button>
          </div>

          {Object.keys(uploadedDailyTotals).length > 0 && (
            <button
                onClick={handleSavePdfDataToDB}
                disabled={isSavingPdfData || loading}
                className={`w-full sm:w-auto px-4 py-2.5 bg-yellow-600 text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all duration-300 ${
                    isSavingPdfData || loading ? "opacity-70 cursor-not-allowed" : "hover:bg-yellow-700"
                }`}
            >
                {isSavingPdfData ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSavingPdfData ? "Saving..." : "Save PDF Data to DB"}
            </button>
          )}

          {viewMode === "simplified" && (
            <button
              onClick={generateSimplifiedPDF}
              disabled={loading}
              className={`w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all duration-300 ${
                loading ? "opacity-70 cursor-not-allowed" : "hover:bg-green-700"
              }`}
            >
              <FileDown size={16} /> Download PDF
            </button>
          )}

          {viewMode === "detailed" && (
          <button
            onClick={exportToExcel}
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-all duration-300 ${
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Calculating Matrices...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderTable("1. BEST TEA MATRIX (Kg)", "bestPct", {
            headerBg: "bg-green-100 dark:bg-green-950/50",
            headerBorder: "border-green-200 dark:border-green-800",
            titleText: "text-[#1B6A31] dark:text-green-500",
            summaryBg: "bg-green-100 dark:bg-green-950/80",
            summaryText: "text-[#1B6A31] dark:text-green-400",
            summaryBorder: "border-green-300 dark:border-green-800",
            subSummaryBg: "bg-green-50 dark:bg-green-950/40",
            subSummaryBorder: "border-green-200 dark:border-green-800/50",
            finalAvgBg: "bg-[#1B6A31] dark:bg-green-700",
            finalAvgBorder: "border-green-800",
            pctColor: "text-green-600 dark:text-green-400",
            hoverBg: "bg-green-50"
          })}

          {renderTable("2. BELOW BEST TEA MATRIX (Kg)", "belowBestPct", {
            headerBg: "bg-orange-100 dark:bg-orange-950/50",
            headerBorder: "border-orange-200 dark:border-orange-800",
            titleText: "text-orange-700 dark:text-orange-500",
            summaryBg: "bg-orange-100 dark:bg-orange-950/80",
            summaryText: "text-orange-700 dark:text-orange-400",
            summaryBorder: "border-orange-300 dark:border-orange-800",
            subSummaryBg: "bg-orange-50 dark:bg-orange-950/40",
            subSummaryBorder: "border-orange-200 dark:border-orange-800/50",
            finalAvgBg: "bg-orange-500 dark:bg-orange-700",
            finalAvgBorder: "border-orange-600",
            pctColor: "text-orange-600 dark:text-orange-400",
            hoverBg: "bg-orange-50"
          })}

          {renderTable("3. POOR TEA MATRIX (Kg)", "poorPct", {
            headerBg: "bg-red-100 dark:bg-red-950/50",
            headerBorder: "border-red-200 dark:border-red-800",
            titleText: "text-red-700 dark:text-red-500",
            summaryBg: "bg-red-100 dark:bg-red-950/80",
            summaryText: "text-red-700 dark:text-red-400",
            summaryBorder: "border-red-300 dark:border-red-800",
            subSummaryBg: "bg-red-50 dark:bg-red-950/40",
            subSummaryBorder: "border-red-200 dark:border-red-800/50",
            finalAvgBg: "bg-red-600 dark:bg-red-700",
            finalAvgBorder: "border-red-800",
            pctColor: "text-red-600 dark:text-red-400",
            hoverBg: "bg-red-50"
          })}
        </div>
      )}
    </div>
  );
}