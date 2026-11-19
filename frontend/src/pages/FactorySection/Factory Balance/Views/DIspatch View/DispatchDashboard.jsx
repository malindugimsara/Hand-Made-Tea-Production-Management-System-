import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter, PieChart as PieChartIcon, BarChart3, Table as TableIcon, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import api from '@/services/api';

// 💡 1. Grade Classification Arrays
const MAIN_GRADES = ["OP", "OPA", "OP 1", "OP1", "BOP", "BOPF", "BOPF SP", "BOPSP","BOP SP", "BOPA", "BOPF", "FF", "FF SP", "FF EX SP", "FF EX SP 1", "FBOP", "FBOP1", "FBOPF1", "FBOPF", "DUST 1",  "PEKOE", "PEKOE1", "PEKOE 1", "BOP1", "BOP 1", "FF 1", "FBOPF SP",];
const OFF_GRADES = ["BOP1A","BOP 1 A", "BOP 1A", "DUST", "BT", "BM", "BP", "FNGS"];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e', '#3b82f6', '#eab308'];

export default function DispatchDashboard() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Helper functions for dates in local timezone
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- States ---
  const [activeView, setActiveView] = useState('table'); 
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [rawData, setRawData] = useState([]);

  // DOM Refs for Chart Export
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  
  // Filters
  const [filters, setFilters] = useState({
    fromDate: getFirstDayOfMonth(), 
    toDate: getTodayDate(), 
    grade: 'ALL',
    broker: 'ALL',
    sellingMark: 'ALL',
    factoryName: 'ATHUKORALA TEA FACTORY'
  });

  // --- Fetch Data ---
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/factory-logs?startDate=${filters.fromDate}&endDate=${filters.toDate}`);
      
      if (res.ok) {
        const data = await res.json();
        setRawData(data.records || data || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Failed to fetch: ${errData.message || "Bad Request"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); 

  // Extract unique grades present in data + standard predefined grades
  const availableGrades = useMemo(() => {
    const gradeSet = new Set();
    if (Array.isArray(rawData)) {
      rawData.forEach(record => {
        if (record.dispatches && Array.isArray(record.dispatches)) {
          record.dispatches.forEach(d => {
            const t = (d.teaType || '').trim();
            if (t) gradeSet.add(t);
          });
        }
      });
    }
    MAIN_GRADES.forEach(g => gradeSet.add(g));
    OFF_GRADES.forEach(g => gradeSet.add(g));
    return Array.from(gradeSet).sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  // --- Data Aggregation Logic ---
  const { chartData, summary, sellingMarkData } = useMemo(() => {
    let totalKg = 0;
    let mainGradeKg = 0;
    let offGradeKg = 0;
    let otherGradeKg = 0; // Handling for OTHER category
    const gradeMap = {};

    // 1. Filter by Date Range
    const filteredRecords = rawData.filter(record => {
      const rDate = record.date.split('T')[0];
      return rDate >= filters.fromDate && rDate <= filters.toDate;
    });

    // 2. Aggregate Dispatches
    filteredRecords.forEach(record => {
      if (record.dispatches && Array.isArray(record.dispatches)) {
        record.dispatches.forEach(d => {
          const weight = Number(d.weight) || 0;
          if (weight <= 0) return;

          const exactDbName = d.teaType || "UNKNOWN";
          const checkGrade = exactDbName.trim().toUpperCase();

          // 💡 Classify Grade
          let category = 'OTHER';
          if (MAIN_GRADES.includes(checkGrade)) {
            category = 'MAIN';
          } else if (OFF_GRADES.includes(checkGrade)) {
            category = 'OFF';
          }

          // Filter by Grade if specified
          if (filters.grade && filters.grade !== 'ALL') {
            if (filters.grade === 'MAIN_GRADES' || filters.grade === 'MAIN') {
              if (category !== 'MAIN') return;
            } else if (filters.grade === 'OFF_GRADES' || filters.grade === 'OFF') {
              if (category !== 'OFF') return;
            } else {
              if (exactDbName.trim().toLowerCase() !== filters.grade.trim().toLowerCase() &&
                  checkGrade !== filters.grade.trim().toUpperCase()) {
                return;
              }
            }
          }

          totalKg += weight;
          if (category === 'MAIN') mainGradeKg += weight;
          else if (category === 'OFF') offGradeKg += weight;
          else otherGradeKg += weight;

          if (!gradeMap[exactDbName]) {
            gradeMap[exactDbName] = { dbName: exactDbName, weight: 0, category };
          }
          gradeMap[exactDbName].weight += weight;
        });
      }
    });

    // 3. Format Chart Data (Calculate Percentages & Display Name)
    const formattedChartData = Object.values(gradeMap).map(item => {
      // Append "(OTHER)" suffix only for items in OTHER category
      const displayName = item.category === 'OTHER' ? `${item.dbName} (OTHER)` : item.dbName;
      
      return {
        ...item,
        name: displayName,
        percentage: totalKg > 0 ? ((item.weight / totalKg) * 100).toFixed(1) : 0
      };
    }).sort((a, b) => b.weight - a.weight); 

    // 4. Summaries
    const summaryData = {
      total: totalKg,
      main: mainGradeKg,
      mainPct: totalKg > 0 ? ((mainGradeKg / totalKg) * 100).toFixed(2) : 0,
      off: offGradeKg,
      offPct: totalKg > 0 ? ((offGradeKg / totalKg) * 100).toFixed(2) : 0,
      other: otherGradeKg,
      otherPct: totalKg > 0 ? ((otherGradeKg / totalKg) * 100).toFixed(2) : 0,
    };

    // 5. Mock Selling Mark Data
    const mockSellingMarkData = [
      { mark: "ATHUKORALA GROUP", weight: mainGradeKg * 0.4, percentage: 40 },
      { mark: "ATHUKORALA SUPER", weight: mainGradeKg * 0.6, percentage: 60 }
    ];

    return { chartData: formattedChartData, summary: summaryData, sellingMarkData: mockSellingMarkData };
  }, [rawData, filters]);

  // --- Input Handlers ---
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // --- Helper to Render Grade Summary Cards on PDF ---
  const drawGradeSummaryCards = (doc, currentY, pageWidth) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 106, 49);
    doc.text("GRADE SUMMARY", 14, currentY);

    const cards = [
      {
        title: "MAIN GRADE",
        weight: summary.main,
        percentage: summary.mainPct,
        theme: {
          bg: [240, 249, 242],        // soft green background
          border: [167, 219, 182],     // soft green border
          titleColor: [27, 106, 49],   // dark green
          valColor: [20, 83, 45],      // forest green
          badgeBg: [220, 245, 228],    // green badge fill
          badgeText: [27, 106, 49]     // green badge text
        }
      },
      {
        title: "OFF GRADE",
        weight: summary.off,
        percentage: summary.offPct,
        theme: {
          bg: [255, 248, 240],        // soft orange background
          border: [254, 215, 170],     // soft orange border
          titleColor: [194, 65, 12],   // deep amber/orange
          valColor: [154, 52, 18],     // dark rust
          badgeBg: [254, 237, 213],    // orange badge fill
          badgeText: [194, 65, 12]     // orange badge text
        }
      }
    ];

    if (summary.other > 0) {
      cards.push({
        title: "OTHER GRADE",
        weight: summary.other,
        percentage: summary.otherPct,
        theme: {
          bg: [239, 246, 255],        // soft blue background
          border: [191, 219, 254],     // soft blue border
          titleColor: [29, 78, 216],   // deep blue
          valColor: [30, 64, 175],     // dark blue
          badgeBg: [219, 234, 254],    // blue badge fill
          badgeText: [29, 78, 216]     // blue badge text
        }
      });
    }

    cards.push({
      title: "TOTAL DISPATCH",
      weight: summary.total,
      percentage: "100.0",
      theme: {
        bg: [248, 250, 252],        // clean slate background
        border: [203, 213, 225],     // light slate border
        titleColor: [30, 41, 59],    // dark slate
        valColor: [15, 23, 42],      // deep charcoal
        badgeBg: [226, 232, 240],    // slate badge fill
        badgeText: [51, 65, 85]      // slate badge text
      }
    });

    const numCards = cards.length;
    const cardGap = 4.5;
    const totalAvailableWidth = pageWidth - 28; // 182 mm
    const cardWidth = (totalAvailableWidth - (cardGap * (numCards - 1))) / numCards;
    const cardHeight = 24;
    const cardStartY = currentY + 4;

    cards.forEach((card, index) => {
      const cardX = 14 + (index * (cardWidth + cardGap));
      const cardY = cardStartY;

      // Card Container Box
      doc.setFillColor(card.theme.bg[0], card.theme.bg[1], card.theme.bg[2]);
      doc.setDrawColor(card.theme.border[0], card.theme.border[1], card.theme.border[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      // Top Accent Color Bar
      doc.setFillColor(card.theme.titleColor[0], card.theme.titleColor[1], card.theme.titleColor[2]);
      doc.roundedRect(cardX, cardY, cardWidth, 1.2, 0.5, 0.5, 'F');

      // Card Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(card.theme.titleColor[0], card.theme.titleColor[1], card.theme.titleColor[2]);
      doc.text(card.title, cardX + 3.5, cardY + 5.5);

      // Weight Value
      const formattedWeight = card.weight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(card.theme.valColor[0], card.theme.valColor[1], card.theme.valColor[2]);
      doc.text(formattedWeight, cardX + 3.5, cardY + 12.5);

      const valWidth = doc.getTextWidth(formattedWeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(" Kg", cardX + 3.5 + valWidth, cardY + 12.5);

      // Percentage Pill / Badge
      const badgeText = `${card.percentage}%`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const badgeTextWidth = doc.getTextWidth(badgeText);
      const badgeWidth = badgeTextWidth + 3.5;
      const badgeHeight = 4.2;
      const badgeX = cardX + 3.5;
      const badgeY = cardY + 15.5;

      doc.setFillColor(card.theme.badgeBg[0], card.theme.badgeBg[1], card.theme.badgeBg[2]);
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1, 1, 'F');

      doc.setTextColor(card.theme.badgeText[0], card.theme.badgeText[1], card.theme.badgeText[2]);
      doc.text(badgeText, badgeX + 1.75, badgeY + 3.1);

      // Subtext next to badge ("of Total" or "Total Vol")
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 130, 140);
      const subText = card.title === "TOTAL DISPATCH" ? "Total Vol" : "of Total";
      doc.text(subText, badgeX + badgeWidth + 2, badgeY + 3.1);
    });

    return cardStartY + cardHeight;
  };

  // Helper to load and compress logo to thumbnail size (~4KB)
  const addCompressedLogo = async (doc) => {
    try {
      const res = await fetch("/logo.png");
      if (!res.ok) return false;
      const blob = await res.blob();
      const img = new Image();
      const blobUrl = URL.createObjectURL(blob);
      img.src = blobUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 80, 80);
      URL.revokeObjectURL(blobUrl);
      const compressedLogo = canvas.toDataURL('image/png');
      doc.addImage(compressedLogo, "PNG", 14, 10, 22, 22, undefined, "FAST");
      return true;
    } catch (err) {
      return false;
    }
  };

  // --- Header Topic Button: Complete Comprehensive Report ---
  const handleDownloadPDF = async () => {
    if (!chartData || chartData.length === 0) {
      toast.error("No dispatch data available to generate PDF.");
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading("Generating Dispatch Report PDF...");

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Compress PDF streams to minimize file size
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Load Compressed Company Logo
      const logoAdded = await addCompressedLogo(doc);
      const textStartX = logoAdded ? 40 : 14;

      // 2. Add Company Name, Title & Period
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(27, 106, 49); // #1B6A31
      doc.text("ATHUKORALA TEA FACTORY", textStartX, 17);

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55); // Dark Slate
      doc.text("FACTORY DISPATCH DASHBOARD REPORT", textStartX, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const gradeFilterLabel = filters.grade === 'ALL' 
        ? '' 
        : filters.grade === 'MAIN_GRADES' 
          ? ' | Filter: Main Grades' 
          : filters.grade === 'OFF_GRADES' 
            ? ' | Filter: Off Grades' 
            : ` | Grade: ${filters.grade}`;
      doc.text(`Period: ${filters.fromDate} to ${filters.toDate}${gradeFilterLabel}`, textStartX, 28);

      // Meta Info (Top-Right)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      hours = hours % 12 || 12;
      const generatedDateTime = `${year}/${month}/${day} ${hours}.${minutes} ${ampm}`;

      const docRef = `ATF/DISP/${filters.fromDate.replace(/-/g, '')}-${filters.toDate.replace(/-/g, '')}`;

      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`Doc Ref: ${docRef}`, pageWidth - 14, 17, { align: 'right' });
      doc.text(`Generated: ${generatedDateTime}`, pageWidth - 14, 22, { align: 'right' });

      // Horizontal Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.4);
      doc.line(14, 34, pageWidth - 14, 34);

      // 3. Section 1: Grade Summary Cards
      const cardsBottomY = drawGradeSummaryCards(doc, 40, pageWidth);

      // 4. Section 2: Detailed Grades Breakdown Table
      let currentY = cardsBottomY + 8;
      if (currentY + 25 > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(27, 106, 49);
      doc.text("GRADE-WISE DISPATCH BREAKDOWN", 14, currentY);

      const tableRows = chartData.map((item, index) => [
        index + 1,
        item.name,
        item.category,
        item.weight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        `${item.percentage}%`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'Grade Name', 'Category', 'Amount (Kg)', 'Percentage (%)']],
        body: tableRows,
        foot: [
          [
            '',
            'Total Dispatched Weight',
            '',
            `${summary.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`,
            '100.0%'
          ]
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        footStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: 'bold',
          fontSize: 9,
          lineColor: [209, 213, 219],
          lineWidth: 0.2
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          lineColor: [230, 230, 230],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { fontStyle: 'bold', cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 32 },
          3: { halign: 'right', cellWidth: 45 },
          4: { halign: 'right', cellWidth: 35 }
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        }
      });

      // 5. Multi-page Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.text(
          "Generated by Unified Management System",
          14,
          pageHeight - 7
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 14,
          pageHeight - 7,
          { align: 'right' }
        );
      }

      // Download file
      const fileName = `Dispatch_Report_${filters.fromDate}_to_${filters.toDate}.pdf`;
      doc.save(fileName);

      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- Controls Bar "Export PDF" Button: Exports Currently Selected View (Table / Bar / Pie) ---
  const handleExportCurrentViewPDF = async () => {
    if (!chartData || chartData.length === 0) {
      toast.error("No dispatch data available to export.");
      return;
    }

    setIsGeneratingPDF(true);
    const viewName = activeView === 'table' ? 'Table' : activeView === 'bar' ? 'Bar Graph' : 'Pie Chart';
    const toastId = toast.loading(`Generating ${viewName} PDF...`);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Compress PDF streams to minimize file size
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Load Compressed Company Logo
      const logoAdded = await addCompressedLogo(doc);
      const textStartX = logoAdded ? 40 : 14;

      // 2. Corporate Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(27, 106, 49);
      doc.text("ATHUKORALA TEA FACTORY", textStartX, 17);

      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      const subHeading = activeView === 'table'
        ? "FACTORY DISPATCH REPORT - TABLE VIEW"
        : activeView === 'bar'
          ? "FACTORY DISPATCH REPORT - BAR GRAPH"
          : "FACTORY DISPATCH REPORT - PIE CHART";
      doc.text(subHeading, textStartX, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const gradeFilterLabel = filters.grade === 'ALL'
        ? ''
        : filters.grade === 'MAIN_GRADES'
          ? ' | Filter: Main Grades'
          : filters.grade === 'OFF_GRADES'
            ? ' | Filter: Off Grades'
            : ` | Grade: ${filters.grade}`;
      doc.text(`Period: ${filters.fromDate} to ${filters.toDate}${gradeFilterLabel}`, textStartX, 28);

      // Meta Info
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      hours = hours % 12 || 12;
      const generatedDateTime = `${year}/${month}/${day} ${hours}.${minutes} ${ampm}`;
      const docRef = `ATF/DISP/${filters.fromDate.replace(/-/g, '')}-${filters.toDate.replace(/-/g, '')}`;

      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`Doc Ref: ${docRef}`, pageWidth - 14, 17, { align: 'right' });
      doc.text(`Generated: ${generatedDateTime}`, pageWidth - 14, 22, { align: 'right' });

      // Horizontal Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.4);
      doc.line(14, 34, pageWidth - 14, 34);

      // 3. GRADE SUMMARY CARDS (Always Included)
      const cardsBottomY = drawGradeSummaryCards(doc, 40, pageWidth);

      // 4. View Specific Section
      let currentY = cardsBottomY + 8;

      if (activeView === 'table') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(27, 106, 49);
        doc.text("GRADE-WISE DISPATCH BREAKDOWN", 14, currentY);

        const tableRows = chartData.map((item, index) => [
          index + 1,
          item.name,
          item.category,
          item.weight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          `${item.percentage}%`
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['#', 'Grade Name', 'Category', 'Amount (Kg)', 'Percentage (%)']],
          body: tableRows,
          foot: [
            [
              '',
              'Total Dispatched Weight',
              '',
              `${summary.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`,
              '100.0%'
            ]
          ],
          theme: 'striped',
          headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          footStyles: {
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontStyle: 'bold',
            fontSize: 9,
            lineColor: [209, 213, 219],
            lineWidth: 0.2
          },
          styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: [230, 230, 230],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { fontStyle: 'bold', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 32 },
            3: { halign: 'right', cellWidth: 45 },
            4: { halign: 'right', cellWidth: 35 }
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          }
        });
      } else if (activeView === 'bar' && barChartRef.current) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(27, 106, 49);
        doc.text("DISPATCH VISUALIZATION - BAR GRAPH", 14, currentY);

        const canvas = await html2canvas(barChartRef.current, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            clonedDoc.documentElement.classList.remove('dark');
          }
        });

        // Use compressed JPEG (0.72 quality) instead of huge raw PNG (shrinks size by >90%)
        const imgData = canvas.toDataURL('image/jpeg', 0.72);
        const imgWidth = 182;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        const maxHeight = pageHeight - currentY - 22;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
        }

        doc.addImage(imgData, 'JPEG', 14, currentY + 3, imgWidth, imgHeight, undefined, 'FAST');
      } else if (activeView === 'pie' && pieChartRef.current) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(27, 106, 49);
        doc.text("DISPATCH VISUALIZATION - PIE CHART", 14, currentY);

        const canvas = await html2canvas(pieChartRef.current, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            clonedDoc.documentElement.classList.remove('dark');
          }
        });

        // Use compressed JPEG (0.72 quality) to drastically reduce size
        const imgData = canvas.toDataURL('image/jpeg', 0.72);
        const imgWidth = 182;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (imgHeight > 95) {
          imgHeight = 95;
        }

        doc.addImage(imgData, 'JPEG', 14, currentY + 3, imgWidth, imgHeight, undefined, 'FAST');
        currentY = currentY + 3 + imgHeight + 6;

        // Clean, compact Grade Values Summary Table directly under the Pie Chart
        if (currentY + 35 > pageHeight - 15) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(27, 106, 49);
        doc.text("GRADE VALUES BREAKDOWN", 14, currentY);

        const pieTableRows = chartData.map((item, index) => [
          index + 1,
          item.name,
          item.category,
          item.weight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          `${item.percentage}%`
        ]);

        autoTable(doc, {
          startY: currentY + 2.5,
          head: [['#', 'Grade Name', 'Category', 'Dispatched (Kg)', 'Share (%)']],
          body: pieTableRows,
          foot: [
            ['', 'Total Dispatched Weight', '', `${summary.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`, '100.0%']
          ],
          theme: 'striped',
          headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5
          },
          footStyles: {
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontStyle: 'bold',
            fontSize: 8.5,
            lineColor: [209, 213, 219],
            lineWidth: 0.2
          },
          styles: {
            fontSize: 8,
            cellPadding: 2.2,
            lineColor: [230, 230, 230],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { fontStyle: 'bold', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 28 },
            3: { halign: 'right', cellWidth: 40 },
            4: { halign: 'right', cellWidth: 30 }
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          }
        });
      }

      // 5. Multi-page Footers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.text(
          "Generated by Unified Management System",
          14,
          pageHeight - 7
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 14,
          pageHeight - 7,
          { align: 'right' }
        );
      }

      const fileName = `Dispatch_${activeView}_${filters.fromDate}_to_${filters.toDate}.pdf`;
      doc.save(fileName);

      toast.success(`${viewName} PDF downloaded successfully!`, { id: toastId });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export view PDF. Please try again.", { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-sans min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-950">
      
     {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 transition-colors">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-gray-100 tracking-tight">Dispatch Dashboard</h1>
            <p className="font-semibold mt-1 uppercase tracking-wider text-sm text-gray-500 dark:text-gray-400">Visual Reporting Dashboard</p>
          </div>
        </div>

        {/* PDF Download Action */}
        <button
          onClick={handleDownloadPDF}
          disabled={isLoading || isGeneratingPDF || chartData.length === 0}
          className={`px-5 py-2.5 bg-[#1B6A31] hover:bg-[#145226] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-200 ${
            (isLoading || isGeneratingPDF || chartData.length === 0)
              ? 'opacity-50 cursor-not-allowed'
              : 'active:scale-95 hover:shadow-md'
          }`}
          title="Download Dispatch PDF Report"
        >
          {isGeneratingPDF ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Download PDF</span>
            </>
          )}
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
          <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 dark:text-gray-200" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
          <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 dark:text-gray-200" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tea Grade</label>
          <select 
            name="grade" 
            value={filters.grade} 
            onChange={handleFilterChange} 
            className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold outline-none focus:border-green-500 dark:text-gray-200 cursor-pointer"
          >
            <option value="ALL">All Grades</option>
            <optgroup label="Categories">
              <option value="MAIN_GRADES">All Main Grades</option>
              <option value="OFF_GRADES">All Off Grades</option>
            </optgroup>
            <optgroup label="Specific Tea Grades">
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <button onClick={fetchDashboardData} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px]">
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAIN VISUAL AREA (Left Side) */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          
          {/* View Toggles & Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveView('table')} 
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'table' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
              >
                <TableIcon size={16}/> Table
              </button>
              <button 
                onClick={() => setActiveView('bar')} 
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'bar' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
              >
                <BarChart3 size={16}/> Bar Graph
              </button>
              <button 
                onClick={() => setActiveView('pie')} 
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeView === 'pie' ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
              >
                <PieChartIcon size={16}/> Pie Chart
              </button>
            </div>

            <button
              onClick={handleExportCurrentViewPDF}
              disabled={isLoading || isGeneratingPDF || chartData.length === 0}
              className="px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export Current View as PDF"
            >
              <Download size={14} className="text-green-600 dark:text-green-400" />
              <span>Export PDF</span>
            </button>
          </div>

          {/* Dynamic Content Area */}
          <div className="flex-1 p-6 min-h-[450px] flex flex-col relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <BarChart3 size={48} className="mb-4 opacity-20" />
                <p className="font-semibold text-lg">No dispatch records found for this period.</p>
              </div>
            ) : (
              <>
                {/* 1. TABLE VIEW */}
                {activeView === 'table' && (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 h-[450px] custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 font-black">Grade Name</th>
                          <th className="px-6 py-4 font-black text-right">Amount (Kg)</th>
                          <th className="px-6 py-4 font-black text-right">Percentage (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {chartData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-3 font-bold text-gray-800 dark:text-gray-200">
                                {row.name}
                            </td>
                            <td className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 text-right">{row.weight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                            <td className="px-6 py-3 font-semibold text-green-600 dark:text-green-400 text-right">{row.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. BAR GRAPH VIEW */}
                {activeView === 'bar' && (
                  <div ref={barChartRef} className="h-[450px] w-full mt-4 bg-white dark:bg-gray-900 p-2 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12, fontWeight: 'bold'}} angle={-45} textAnchor="end" />
                        <YAxis tick={{fill: '#6b7280', fontSize: 12, fontWeight: 'bold'}} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="weight" name="Amount (Kg)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 3. PIE CHART VIEW */}
                {activeView === 'pie' && (
                  <div ref={pieChartRef} className="h-[460px] w-full flex items-center justify-center bg-white dark:bg-gray-900 p-2 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="42%"
                          isAnimationActive={false}
                          labelLine={{ stroke: '#64748b', strokeWidth: 1.2 }}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={105}
                          fill="#8884d8"
                          dataKey="weight"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg`} 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          wrapperStyle={{ paddingTop: '8px' }}
                          formatter={(value) => {
                            const item = chartData.find(d => d.name === value);
                            if (!item) return value;
                            return (
                              <span style={{ color: '#1f2937', fontSize: '11px', fontWeight: '500', marginRight: '6px' }}>
                                <strong style={{ color: '#111827' }}>{value}</strong>: {item.weight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Kg ({item.percentage}%)
                              </span>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* SUMMARIES AREA (Right Side) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main/Off Grade Summaries */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-5 border-b border-gray-100 dark:border-gray-800 pb-2">Grade Summary</h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 p-4 rounded-xl flex justify-between items-center">
                <span className="font-bold text-green-800 dark:text-green-400">MAIN GRADE</span>
                <div className="text-right">
                  <p className="text-lg font-black text-green-900 dark:text-green-300">{summary.main.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-xs font-semibold">Kg</span></p>
                  <p className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/50 inline-block px-2 py-0.5 rounded mt-1">{summary.mainPct}%</p>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4 rounded-xl flex justify-between items-center">
                <span className="font-bold text-orange-800 dark:text-orange-400">OFF GRADE</span>
                <div className="text-right">
                  <p className="text-lg font-black text-orange-900 dark:text-orange-300">{summary.off.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-xs font-semibold">Kg</span></p>
                  <p className="text-xs font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/50 inline-block px-2 py-0.5 rounded mt-1">{summary.offPct}%</p>
                </div>
              </div>

              {/* 💡 NEW: OTHER GRADE Summary */}
              {summary.other > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-4 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-blue-800 dark:text-blue-400">OTHER GRADE</span>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-900 dark:text-blue-300">{summary.other.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-xs font-semibold">Kg</span></p>
                    <p className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 inline-block px-2 py-0.5 rounded mt-1">{summary.otherPct}%</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex justify-between items-center mt-6">
                <span className="font-black text-gray-800 dark:text-gray-200">TOTAL</span>
                <p className="text-xl font-black text-gray-900 dark:text-white">{summary.total.toLocaleString(undefined, {minimumFractionDigits: 1})} <span className="text-sm font-semibold">Kg</span></p>
              </div>
            </div>
          </div>          
        </div>
      </div>
    </div>
  );
}