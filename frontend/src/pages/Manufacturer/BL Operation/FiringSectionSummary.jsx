import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Clock,            // <-- Added missing Clock import
    CheckCircle2,     // <-- Added CheckCircle2 import
    RefreshCw,
    Languages,
    Flame,
    Scale,
    Fuel,
    Calculator,
    Filter,
    X,
    Package,
    Sparkles,
    UserCheck,
    FileSpreadsheet
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PDFDownloader from '@/components/PDFDownloader';

// Helper to normalize date values
const normalizeDate = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    try {
        return new Date(dateVal).toISOString().split('T')[0];
    } catch {
        return '';
    }
};

// Helper to get local date in YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const FiringSectionSummary = () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    const userRole = localStorage.getItem("userRole") || "Admin";
    const currentUsername = localStorage.getItem("username") || "admin";

    const [allRecords, setAllRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(getTodayDate());
    const [lang, setLang] = useState('EN');

    // Dynamic Translations Dictionary
    const t = useMemo(() => ({
        title: lang === 'SI' ? "ගිනි තැබීමේ සහ ඩ්‍රයර් අංශ වාර්තාව" : "DRIER ROOM RECORD SHEET",
        subtitle: lang === 'SI' ? "දෛනික ඩ්‍රයර් කාලසටහන, ධූල් ශ්‍රේණි, දර ප්‍රතිදානය සහ පිරිවැය සාරාංශය." : "Consolidated report of drier schedules, dhool fractionation, firewood output, and combustion costs.",
        sync: lang === 'SI' ? "යාවත්කාලීන කරන්න" : "Sync",
        refreshing: lang === 'SI' ? "යාවත්කාලීන වෙමින්..." : "Refreshing...",
        downloadPdf: lang === 'SI' ? "PDF බාගත කරන්න" : "Download PDF",
        filterDay: lang === 'SI' ? "නිෂ්පාදිත දිනය අනුව තෝරන්න (M/F Date):" : "Filter by M/F Date:",
        clear: lang === 'SI' ? "මකන්න" : "Clear",
        noRecordFound: lang === 'SI' ? "තෝරාගත් දිනය සඳහා වාර්තා හමු නොවීය" : "No Drier Records Found",
        noRecordDesc: lang === 'SI' ? "මෙම නිෂ්පාදිත දිනය සඳහා තවමත් ගිනි තැබීමේ සටහනක් ඇතුලත් කර නොමැත." : "There is no drier room sheet recorded for the selected manufacturing date.",

        dom: lang === 'SI' ? "නිෂ්පාදිත දිනය" : "DATE OF MANUFACTURE",

        // Section 1
        sec1Title: lang === 'SI' ? "කොටස 1: ඩ්‍රයර් කාලසටහන" : "SECTION 1: FIRING SCHEDULE",
        drier1: "DRIER 01",
        drier2: "DRIER 02",
        start: lang === 'SI' ? "ආරම්භය" : "START",
        finish: lang === 'SI' ? "අවසන්" : "FINISH",
        day: lang === 'SI' ? "දිනය" : "DAY",
        period: lang === 'SI' ? "කාලය" : "PERIOD",
        ffrw: "F : F : R : W",
        totalHours: lang === 'SI' ? "මුළු පැය ගණන" : "TOTAL HOURS",
        outputPerHour: lang === 'SI' ? "පැයට නිෂ්පාදනය (Kg/H)" : "DRIER OUTPUT / H (KG)",

        // Section 2
        sec2Title: lang === 'SI' ? "කොටස 2: ධූල් ශ්‍රේණිගත කිරීම" : "SECTION 2: DHOOLS OUTPUT",
        grade: lang === 'SI' ? "ශ්‍රේණිය" : "GRADE",
        kg: lang === 'SI' ? "කි.ග්‍රෑ." : "KG",
        pct: "%",
        first: "FIRST (KG)",
        second: "SECOND (KG)",
        third: "THIRD (KG)",
        dir: "DIR / R",
        bigBulk: "BIG BULK (KG)",
        firedTea: "FIRED TEA (KG)",

        // Section 3
        sec3Title: lang === 'SI' ? "කොටස 3: දර නිෂ්පාදන ප්‍රතිදානය" : "SECTION 3: FIREWOOD OUTPUT",
        desc: lang === 'SI' ? "විස්තරය" : "DESCRIPTION",
        withoutWithering: "WITHOUT WITHERING (KG)",
        withWithering: "WITH WITHERING (KG)",
        rf: "R/F (KG)",
        totalOutput: "TOTAL OUTPUT (KG)",

        // Section 4
        sec4Title: lang === 'SI' ? "කොටස 4: දර පිරිවැය" : "SECTION 4: COST OF FIREWOOD",
        item: lang === 'SI' ? "අයිතමය" : "ITEM",
        totalFw: "TOTAL F/W KG",
        unitPrice: "UNIT PRICE (Rs.)",
        madeTea: "MADE TEA KG",
        costFw: "COST OF F/W (RS.)",

        // Sign-offs
        officerName: lang === 'SI' ? "නිලධාරී නම 01" : "OFFICER NAME 01",
        checkedBy: lang === 'SI' ? "පරීක්ෂා කළේ" : "CHECKED BY"
    }), [lang]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BACKEND_URL}/api/firing-section`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (response.ok && result.success) {
                const records = Array.isArray(result.data) ? result.data : [];
                setAllRecords(records);

                if (records.length > 0) {
                    const matchExists = records.some(
                        r => normalizeDate(r?.dateOfManufacture) === filterDate
                    );
                    if (!matchExists) {
                        const latestMfDate = normalizeDate(records[0]?.dateOfManufacture);
                        if (latestMfDate) setFilterDate(latestMfDate);
                    }
                }
            } else {
                toast.error("Failed to load firing records.");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Connection error while fetching firing records.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentRecord = useMemo(() => {
        if (!allRecords || allRecords.length === 0) return null;
        if (!filterDate) return allRecords[0];

        return allRecords.find(r =>
            normalizeDate(r?.dateOfManufacture) === filterDate
        ) || null;
    }, [allRecords, filterDate]);

    // Derived calculations with safe defaults
    const calcData = useMemo(() => {
        if (!currentRecord) return null;

        const d1 = currentRecord?.dhools?.drier1 || {};
        const d2 = currentRecord?.dhools?.drier2 || {};

        const d1First = Number(d1?.first) || 0;
        const d1Second = Number(d1?.second) || 0;
        const d1Third = Number(d1?.third) || 0;
        const d1Dir = Number(d1?.dir) || 0;
        const d1BB = Number(d1?.bigBulk) || 0;
        const d1TotalFired = d1First + d1Second + d1Third + d1Dir + d1BB;

        const d2First = Number(d2?.first) || 0;
        const d2Second = Number(d2?.second) || 0;
        const d2Third = Number(d2?.third) || 0;
        const d2Dir = Number(d2?.dir) || 0;
        const d2BB = Number(d2?.bigBulk) || 0;
        const d2TotalFired = d2First + d2Second + d2Third + d2Dir + d2BB;

        // Firewood Outputs
        const f1 = currentRecord?.firewoodOutput?.drier1 || {};
        const f2 = currentRecord?.firewoodOutput?.drier2 || {};
        const d1FwOut = (Number(f1?.withoutWithering) || 0) + (Number(f1?.withWithering) || 0) + (Number(f1?.rf) || 0);
        const d2FwOut = (Number(f2?.withoutWithering) || 0) + (Number(f2?.withWithering) || 0) + (Number(f2?.rf) || 0);

        // Firewood Costs
        const c1 = currentRecord?.firewoodCost?.drier1 || {};
        const c2 = currentRecord?.firewoodCost?.drier2 || {};
        const d1FwCost = (Number(c1?.totalFwKg) || 0) * (Number(c1?.unitPrice) || 0);
        const d2FwCost = (Number(c2?.totalFwKg) || 0) * (Number(c2?.unitPrice) || 0);

        return {
            d1: { first: d1First, second: d1Second, third: d1Third, dir: d1Dir, bigBulk: d1BB, totalFired: d1TotalFired },
            d2: { first: d2First, second: d2Second, third: d2Third, dir: d2Dir, bigBulk: d2BB, totalFired: d2TotalFired },
            grandTotalFired: d1TotalFired + d2TotalFired,
            d1FwOut,
            d2FwOut,
            grandTotalFwOut: d1FwOut + d2FwOut,
            d1FwCost,
            d2FwCost,
            grandTotalFwCost: d1FwCost + d2FwCost
        };
    }, [currentRecord]);

    const docRefCode = `DRS/${(currentRecord?.dateOfManufacture || filterDate || '').replace(/-/g, '')}`;

    // =========================================================================
    // 💡 MULTI-TIER HEADERS & DATA FOR DHOOLS TABLE (PDF GENERATION)
    // =========================================================================
    // =========================================================================
    // 💡 MULTI-TIER HEADERS FOR DHOOLS (TABLE 1)
    // =========================================================================
    const pdfHeaders = useMemo(() => [
        [
            { content: 'DHOOLS (kg) - 01', colSpan: 3, styles: { halign: 'center', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' } },
            { content: 'DHOOLS (kg) - 02', colSpan: 3, styles: { halign: 'center', fillColor: [238, 242, 255], textColor: [30, 58, 138], fontStyle: 'bold' } },
            { content: 'DHOOLS (kg) TOTAL', colSpan: 3, styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' } }
        ],
        [
            { content: 'Item', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: 'Kg', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: '%', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: 'Item', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: 'Kg', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: '%', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: 'Item', styles: { halign: 'left', fontStyle: 'bold' } },
            { content: 'Kg', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: '%', styles: { halign: 'right', fontStyle: 'bold' } }
        ]
    ], []);

    const pdfData = useMemo(() => {
        if (!currentRecord || !calcData) return [];

        const grades = [
            { label: '1ST', k: 'first' },
            { label: '2ND', k: 'second' },
            { label: '3RD', k: 'third' },
            { label: 'DIR / R', k: 'dir' },
            { label: 'BIG BULK', k: 'bigBulk' }
        ];

        const totalFiredGrand = calcData.grandTotalFired;

        const rows = grades.map(g => {
            const d1Kg = calcData.d1[g.k] || 0;
            const d2Kg = calcData.d2[g.k] || 0;
            const totKg = d1Kg + d2Kg;

            const d1Pct = calcData.d1.totalFired > 0 ? ((d1Kg / calcData.d1.totalFired) * 100).toFixed(2) : '0.00';
            const d2Pct = calcData.d2.totalFired > 0 ? ((d2Kg / calcData.d2.totalFired) * 100).toFixed(2) : '0.00';
            const totPct = totalFiredGrand > 0 ? ((totKg / totalFiredGrand) * 100).toFixed(2) : '0.00';

            return [
                g.label, d1Kg > 0 ? d1Kg.toFixed(2) : '', `${d1Pct}%`,
                g.label, d2Kg > 0 ? d2Kg.toFixed(2) : '', `${d2Pct}%`,
                g.label, totKg > 0 ? totKg.toFixed(2) : '', `${totPct}%`
            ];
        });

        // Total Row
        rows.push({
            data: [
                'TOTAL FIRED TEA', calcData.d1.totalFired.toFixed(2), '100%',
                'TOTAL FIRED TEA', calcData.d2.totalFired.toFixed(2), '100%',
                'TOTAL FIRED TEA', totalFiredGrand.toFixed(2), '100%'
            ],
            isFooter: true
        });

        return rows;
    }, [currentRecord, calcData]);

    // =========================================================================
    // 💡 FULL SHEET LAYOUT (PORTRAIT)
    // =========================================================================
    const autoTableOptions = useMemo(() => ({
        startY: 48,
        margin: { left: 12, right: 12, top: 12, bottom: 12 },
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 2,
            valign: 'middle',
            lineColor: [100, 116, 139],
            lineWidth: 0.15,
            textColor: [15, 23, 42]
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            lineWidth: 0.15,
            lineColor: [100, 116, 139]
        },
        footStyles: {
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: 0.15,
            lineColor: [100, 116, 139]
        },
        columnStyles: {
            0: { cellWidth: 20 }, 1: { cellWidth: 21, halign: 'right' }, 2: { cellWidth: 21, halign: 'right' },
            3: { cellWidth: 20 }, 4: { cellWidth: 21, halign: 'right' }, 5: { cellWidth: 21, halign: 'right' },
            6: { cellWidth: 20 }, 7: { cellWidth: 21, halign: 'right' }, 8: { cellWidth: 21, halign: 'right' }
        },
        didDrawPage: (hookData) => {
            const { doc } = hookData;
            const startX = 12;
            const pageWidth = doc.internal.pageSize.getWidth();
            const contentWidth = pageWidth - 24; // 186mm printable width
            const col3Width = contentWidth / 3;

            // ----------------------------------------------------
            // Top Header & Metadata
            // ----------------------------------------------------
            doc.setFontSize(13);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('DRIER ROOM RECORD SHEET', pageWidth / 2, 16, { align: 'center' });
            doc.setLineWidth(0.8);
            doc.line(pageWidth / 2 - 38, 17.5, pageWidth / 2 + 38, 17.5);

            doc.setFontSize(8);
            doc.text('M/F DATE   :', startX, 24);
            doc.setFont(undefined, 'normal');
            doc.text(currentRecord?.dateOfManufacture || '____ / ____ / ____', startX + 22, 24);

            doc.setFont(undefined, 'bold');
            doc.text('CROP DATE :', startX, 30);
            doc.setFont(undefined, 'normal');
            doc.text(currentRecord?.cropDate || '____ / ____ / ____', startX + 22, 30);

            doc.setFont(undefined, 'bold');
            doc.text('CROP (Kg)  :', startX, 36);
            doc.setFont(undefined, 'normal');
            doc.text(currentRecord?.cropKg ? `${currentRecord.cropKg} kg` : '____________________', startX + 22, 36);

            const tableStyles = {
                theme: 'grid',
                margin: { left: startX, right: startX },
                styles: { fontSize: 7, cellPadding: 1.8, lineColor: [100, 116, 139], lineWidth: 0.15, textColor: [15, 23, 42], valign: 'middle' },
                headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' }
            };

            // ----------------------------------------------------
            // Table 2: Firewood Usage (kg)
            // ----------------------------------------------------
            const d1 = currentRecord?.drier1 || {};
            const d2 = currentRecord?.drier2 || {};
            const f1 = currentRecord?.firewoodOutput?.drier1 || {};
            const f2 = currentRecord?.firewoodOutput?.drier2 || {};

            doc.autoTable({
                ...tableStyles,
                startY: hookData.cursor.y + 4,
                head: [
                    [
                        { content: 'FIREWOOD USAGE (kg) - 01', colSpan: 4 },
                        { content: 'FIREWOOD USAGE (kg) - 02', colSpan: 4 },
                        { content: 'FIREWOOD USAGE (kg) TOTAL', colSpan: 4 }
                    ],
                    ['F', 'R/F', 'W', 'TOTAL', 'F', 'R/F', 'W', 'TOTAL', 'F', 'R/F', 'W', 'TOTAL']
                ],
                body: [
                    [
                        d1.ffrw1 || '', d1.ffrw2 || '', d1.ffrw4 || '', calcData?.d1FwOut || '',
                        d2.ffrw1 || '', d2.ffrw2 || '', d2.ffrw4 || '', calcData?.d2FwOut || '',
                        (Number(d1.ffrw1 || 0) + Number(d2.ffrw1 || 0)) || '',
                        (Number(d1.ffrw2 || 0) + Number(d2.ffrw2 || 0)) || '',
                        (Number(d1.ffrw4 || 0) + Number(d2.ffrw4 || 0)) || '',
                        calcData?.grandTotalFwOut || ''
                    ]
                ],
                columnStyles: Array(12).fill({ halign: 'center' })
            });

            // ----------------------------------------------------
            // Table 3: Firewood Output
            // ----------------------------------------------------
            doc.autoTable({
                ...tableStyles,
                startY: doc.lastAutoTable.finalY + 4,
                head: [
                    [
                        { content: 'FIREWOOD OUTPUT - 01', colSpan: 2 },
                        { content: 'FIREWOOD OUTPUT - 02', colSpan: 2 },
                        { content: 'FIREWOOD OUTPUT TOTAL', colSpan: 2 }
                    ]
                ],
                body: [
                    ['MANUFACTURING', f1.withoutWithering || '', 'MANUFACTURING', f2.withoutWithering || '', '', (Number(f1.withoutWithering || 0) + Number(f2.withoutWithering || 0)) || ''],
                    ['WITHERING', f1.withWithering || '', 'WITHERING', f2.withWithering || '', '', (Number(f1.withWithering || 0) + Number(f2.withWithering || 0)) || ''],
                    ['R/F', f1.rf || '', 'R/F', f2.rf || '', '', (Number(f1.rf || 0) + Number(f2.rf || 0)) || ''],
                    ['TOTAL OUTPUT', calcData?.d1FwOut || '', 'TOTAL OUTPUT', calcData?.d2FwOut || '', '', calcData?.grandTotalFwOut || '']
                ],
                columnStyles: {
                    0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 27, halign: 'right' },
                    2: { cellWidth: 35, fontStyle: 'bold' }, 3: { cellWidth: 27, halign: 'right' },
                    4: { cellWidth: 35 }, 5: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
                }
            });

            // ----------------------------------------------------
            // Table 4: Firing Schedule (Times & Output/H)
            // ----------------------------------------------------
            const totHours = (Number(d1.totalHours || 0) + Number(d2.totalHours || 0)).toFixed(1);
            doc.autoTable({
                ...tableStyles,
                startY: doc.lastAutoTable.finalY + 4,
                head: [
                    [
                        { content: 'DRIER - 01', colSpan: 2 },
                        { content: 'DRIER - 02', colSpan: 2 },
                        { content: 'TOTAL', colSpan: 2 }
                    ]
                ],
                body: [
                    ['START TIME', d1.start || '', 'START TIME', d2.start || '', '', ''],
                    ['END TIME', d1.finish || '', 'END TIME', d2.finish || '', '', ''],
                    ['TOTAL HOURS', d1.totalHours ? `${d1.totalHours} h` : '', 'TOTAL HOURS', d2.totalHours ? `${d2.totalHours} h` : '', 'TOTAL HOURS', `${totHours} h`],
                    ['DRIER OUTPUT / H', d1.outputPerHour ? `${d1.outputPerHour} kg` : '', 'DRIER OUTPUT / H', d2.outputPerHour ? `${d2.outputPerHour} kg` : '', '', '']
                ],
                columnStyles: {
                    0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 27, halign: 'center' },
                    2: { cellWidth: 35, fontStyle: 'bold' }, 3: { cellWidth: 27, halign: 'center' },
                    4: { cellWidth: 35, fontStyle: 'bold' }, 5: { cellWidth: 27, halign: 'center', fontStyle: 'bold' }
                }
            });

            // ----------------------------------------------------
            // Table 5: Cost of Firewood
            // ----------------------------------------------------
            const fc1 = currentRecord?.firewoodCost?.drier1 || {};
            const fc2 = currentRecord?.firewoodCost?.drier2 || {};
            const totFwKg = (Number(fc1.totalFwKg || 0) + Number(fc2.totalFwKg || 0));
            const totMadeTea = (Number(fc1.madeTeaKg || 0) + Number(fc2.madeTeaKg || 0));

            doc.autoTable({
                ...tableStyles,
                startY: doc.lastAutoTable.finalY + 4,
                head: [
                    [
                        { content: 'DRIER - 01', colSpan: 2 },
                        { content: 'DRIER - 02', colSpan: 2 },
                        { content: 'TOTAL', colSpan: 2 }
                    ]
                ],
                body: [
                    ['TOTAL F/W KG', fc1.totalFwKg || '', 'TOTAL F/W KG', fc2.totalFwKg || '', 'TOTAL F/W KG', totFwKg || ''],
                    ['UNIT PRICE (Rs.)', fc1.unitPrice ? Number(fc1.unitPrice).toFixed(2) : '', 'UNIT PRICE (Rs.)', fc2.unitPrice ? Number(fc2.unitPrice).toFixed(2) : '', 'UNIT PRICE (Rs.)', ''],
                    ['MADE TEA KG', fc1.madeTeaKg || '', 'MADE TEA KG', fc2.madeTeaKg || '', 'MADE TEA KG', totMadeTea || ''],
                    ['COST OF F/W (Rs.)', calcData ? calcData.d1FwCost.toFixed(2) : '', 'COST OF F/W (Rs.)', calcData ? calcData.d2FwCost.toFixed(2) : '', 'COST OF F/W (Rs.)', calcData ? calcData.grandTotalFwCost.toFixed(2) : '']
                ],
                columnStyles: {
                    0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 27, halign: 'right' },
                    2: { cellWidth: 35, fontStyle: 'bold' }, 3: { cellWidth: 27, halign: 'right' },
                    4: { cellWidth: 35, fontStyle: 'bold' }, 5: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
                }
            });

            // ----------------------------------------------------
            // Officer Signatures
            // ----------------------------------------------------
            const signY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.text(`OFFICER NAME 01 :  ${currentRecord?.officerName || '_______________________________'}`, startX, signY);
            doc.text(`CHECK BY :  ${currentRecord?.checkedBy || '_______________________________'}`, pageWidth / 2 + 10, signY);

            // ----------------------------------------------------
            // Bottom Conversion Box
            // ----------------------------------------------------
            const boxY = signY + 6;
            const boxHeight = 22;
            const boxWidth = contentWidth - 20;
            const boxX = startX + 10;

            doc.setDrawColor(30, 41, 59);
            doc.setLineWidth(0.4);
            doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'S');

            doc.setFontSize(6.8);
            doc.setFont(undefined, 'bold');

            const colLeftX = boxX + 6;
            const colMidX = boxX + 44;
            const colRightX = boxX + 58;

            const lines = [
                { label: 'Firewood output', rule: 'WITHOUT WITHERING 1KG FIREWOOD (MAXIMUM)' },
                { label: '1kg F/T', rule: 'WITH WITHERING 1.2KG FIREWOOD (MAXIMUM)' },
                { label: 'DRIER OUTPUT', rule: 'WITHOUT WITHERING 200 (MINIMUM)' },
                { label: '1 YARD', rule: 'WITH WITHERING 180 (MINIMUM)' }
            ];

            lines.forEach((item, idx) => {
                const itemY = boxY + 5 + (idx * 4.2);
                doc.text(item.label, colLeftX, itemY);
                doc.text('--->', colMidX, itemY);
                doc.text(item.rule, colRightX, itemY);
            });
        }
    }), [currentRecord, calcData]);


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-200">
            <Toaster position="bottom-right" />

            <div className="max-w-7xl mx-auto flex flex-col gap-6">

                {/* --- Top Header Bar --- */}
                <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center gap-3.5 z-10">
                        <div className="p-3 bg-gradient-to-br from-orange-600 via-amber-600 to-slate-900 text-white rounded-2xl shadow-md shadow-orange-900/10 ring-4 ring-orange-50 dark:ring-orange-950/40">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    {t.title}
                                </h1>
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-full border border-orange-200/60 dark:border-orange-800/60">
                                    <Sparkles className="w-3 h-3 text-orange-500" /> Executive Report
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end z-10">
                        <PDFDownloader
                            title={`ATHUKORALA GROUP (PVT) LTD - ${t.title}`}
                            subtitle={`${t.filterDay} ${currentRecord?.dateOfManufacture || filterDate}`}
                            headers={pdfHeaders}
                            data={pdfData}
                            fileName={`Drier_Room_Sheet_${lang}_MF_${currentRecord?.dateOfManufacture || filterDate || 'Report'}.pdf`}
                            orientation="portrait"
                            uniqueCode={docRefCode}
                            userName={currentUsername}
                            userRole={userRole}
                            autoTableOptions={autoTableOptions}
                            disabled={!currentRecord || pdfData.length === 0}
                        />

                        {/* Language Switcher */}
                        <button
                            type="button"
                            onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                        >
                            <Languages size={15} className="text-slate-500 dark:text-slate-400" />
                            {lang === 'EN' ? "සිංහල" : "English"}
                        </button>

                        {/* Sync Button */}
                        <button
                            type="button"
                            onClick={fetchRecords}
                            disabled={loading}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-600' : 'text-slate-500 dark:text-slate-400'} />
                            {loading ? t.refreshing : t.sync}
                        </button>
                    </div>
                </div>

                {/* --- Date Filter Bar --- */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-xl">
                            <Filter className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{t.filterDay}</span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Filter drier logs by tea manufacturing date (M/F Date)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none px-3.5 py-2 transition-all"
                        />
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate("")}
                                className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/70 border border-rose-200/60 dark:border-rose-900/40 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" /> {t.clear}
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Main Dashboard Content --- */}
                {loading && allRecords.length === 0 ? (
                    <div className="text-center py-28 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="w-10 h-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Loading drier room records...</p>
                    </div>
                ) : !currentRecord ? (
                    <div className="text-center py-24 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Package className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t.noRecordFound}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium">{t.noRecordDesc}</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 md:p-10 overflow-hidden font-sans transition-colors duration-200 flex flex-col gap-8">

                        {/* Title Header */}
                        <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-2">
                                Athukorala Tea Factory
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
                                DRIER ROOM RECORD SHEET
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                Date of Manufacture: <span className="text-slate-900 dark:text-white font-bold">{currentRecord.dateOfManufacture}</span>
                            </p>
                        </div>

                        {/* --- SECTION 1: FIRING SCHEDULE OVERVIEW --- */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="p-1.5 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 rounded-lg">
                                    <Clock size={16} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{t.sec1Title}</h3>
                            </div>

                            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                <table className="w-full min-w-[700px] border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-3 text-left w-52 border-r border-slate-200 dark:border-slate-700">Metric Parameter</th>
                                            <th className="p-3 text-center bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                                            <th className="p-3 text-center bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.start}</td>
                                            <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.start || '-'}</td>
                                            <td className="p-3 text-center font-bold">{currentRecord.drier2?.start || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.finish}</td>
                                            <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.finish || '-'}</td>
                                            <td className="p-3 text-center font-bold">{currentRecord.drier2?.finish || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.day}</td>
                                            <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.day || '-'}</td>
                                            <td className="p-3 text-center">{currentRecord.drier2?.day || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.period}</td>
                                            <td className="p-3 text-center font-extrabold text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.periodStr || '-'}</td>
                                            <td className="p-3 text-center font-extrabold text-emerald-700 dark:text-emerald-400">{currentRecord.drier2?.periodStr || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.ffrw}</td>
                                            <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">
                                                {currentRecord.drier1?.ffrw1 || 0} : {currentRecord.drier1?.ffrw2 || 0} : {currentRecord.drier1?.ffrw3 || 0} : {currentRecord.drier1?.ffrw4 || 0}
                                            </td>
                                            <td className="p-3 text-center font-bold">
                                                {currentRecord.drier2?.ffrw1 || 0} : {currentRecord.drier2?.ffrw2 || 0} : {currentRecord.drier2?.ffrw3 || 0} : {currentRecord.drier2?.ffrw4 || 0}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.totalHours}</td>
                                            <td className="p-3 text-center font-black border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.totalHours || 0} hrs</td>
                                            <td className="p-3 text-center font-black">{currentRecord.drier2?.totalHours || 0} hrs</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.outputPerHour}</td>
                                            <td className="p-3 text-center font-black text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 border-r border-slate-200 dark:border-slate-800">{currentRecord.drier1?.outputPerHour || 0} kg/h</td>
                                            <td className="p-3 text-center font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">{currentRecord.drier2?.outputPerHour || 0} kg/h</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- SECTION 2: DHOOLS FRACTIONATION --- */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-lg">
                                    <Scale size={16} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{t.sec2Title}</h3>
                            </div>

                            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                                <table className="w-full min-w-[700px] border-collapse text-center text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-3 text-left w-52 border-r border-slate-200 dark:border-slate-700">{t.grade}</th>
                                            <th colSpan={2} className="p-3 bg-blue-100/90 dark:bg-blue-950/80 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                                            <th colSpan={2} className="p-3 bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                                            <th className="border-r border-slate-200 dark:border-slate-700"></th>
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.pct}</th>
                                            <th className="p-2 border-r border-slate-200 dark:border-slate-700">{t.kg}</th>
                                            <th className="p-2">{t.pct}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                                        {[
                                            { label: t.first, k: 'first' },
                                            { label: t.second, k: 'second' },
                                            { label: t.third, k: 'third' },
                                            { label: t.dir, k: 'dir' },
                                            { label: t.bigBulk, k: 'bigBulk' }
                                        ].map(({ label, k }) => {
                                            const d1Kg = calcData?.d1[k] || 0;
                                            const d2Kg = calcData?.d2[k] || 0;
                                            const d1Pct = calcData?.d1.totalFired > 0 ? ((d1Kg / calcData.d1.totalFired) * 100).toFixed(2) : '0.00';
                                            const d2Pct = calcData?.d2.totalFired > 0 ? ((d2Kg / calcData.d2.totalFired) * 100).toFixed(2) : '0.00';

                                            return (
                                                <tr key={k} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{label}</td>
                                                    <td className="p-3 font-bold border-r border-slate-200 dark:border-slate-800">{d1Kg.toFixed(2)}</td>
                                                    <td className="p-3 text-slate-500 dark:text-slate-400 font-semibold border-r border-slate-200 dark:border-slate-800">{d1Pct}%</td>
                                                    <td className="p-3 font-bold border-r border-slate-200 dark:border-slate-800">{d2Kg.toFixed(2)}</td>
                                                    <td className="p-3 text-slate-500 dark:text-slate-400 font-semibold">{d2Pct}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                                            <td className="p-3 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.firedTea}</td>
                                            <td className="p-3 text-blue-700 dark:text-blue-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/30">{calcData?.d1.totalFired.toFixed(2)} kg</td>
                                            <td className="p-3 text-blue-800 dark:text-blue-300 font-bold border-r border-slate-200 dark:border-slate-700">100%</td>
                                            <td className="p-3 text-emerald-700 dark:text-emerald-400 text-sm border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/30">{calcData?.d2.totalFired.toFixed(2)} kg</td>
                                            <td className="p-3 text-emerald-800 dark:text-emerald-300 font-bold">100%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* --- SECTION 3 & 4 GRID --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Section 3: Firewood Output */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{t.sec3Title}</h4>
                                    </div>

                                    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                                        <table className="w-full border-collapse text-center text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                                                    <th className="p-2.5 text-left border-r border-slate-200 dark:border-slate-700">{t.desc}</th>
                                                    <th className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                                                    <th className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.withoutWithering}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">{currentRecord.firewoodOutput?.drier1?.withoutWithering || 0} kg</td>
                                                    <td className="p-2.5">{currentRecord.firewoodOutput?.drier2?.withoutWithering || 0} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.withWithering}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">{currentRecord.firewoodOutput?.drier1?.withWithering || 0} kg</td>
                                                    <td className="p-2.5">{currentRecord.firewoodOutput?.drier2?.withWithering || 0} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.rf}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">{currentRecord.firewoodOutput?.drier1?.rf || 0} kg</td>
                                                    <td className="p-2.5">{currentRecord.firewoodOutput?.drier2?.rf || 0} kg</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                                                    <td className="p-2.5 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.totalOutput}</td>
                                                    <td className="p-2.5 text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">{calcData?.d1FwOut.toFixed(2)} kg</td>
                                                    <td className="p-2.5 text-emerald-700 dark:text-emerald-400">{calcData?.d2FwOut.toFixed(2)} kg</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Cost of Firewood */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{t.sec4Title}</h4>
                                    </div>

                                    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                                        <table className="w-full border-collapse text-center text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                                                    <th className="p-2.5 text-left border-r border-slate-200 dark:border-slate-700">{t.item}</th>
                                                    <th className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-r border-slate-200 dark:border-slate-700">{t.drier1}</th>
                                                    <th className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">{t.drier2}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.totalFw}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">{currentRecord.firewoodCost?.drier1?.totalFwKg || 0} kg</td>
                                                    <td className="p-2.5">{currentRecord.firewoodCost?.drier2?.totalFwKg || 0} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.unitPrice}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">Rs. {Number(currentRecord.firewoodCost?.drier1?.unitPrice || 0).toFixed(2)}</td>
                                                    <td className="p-2.5">Rs. {Number(currentRecord.firewoodCost?.drier2?.unitPrice || 0).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800">{t.madeTea}</td>
                                                    <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">{currentRecord.firewoodCost?.drier1?.madeTeaKg || 0} kg</td>
                                                    <td className="p-2.5">{currentRecord.firewoodCost?.drier2?.madeTeaKg || 0} kg</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                                                    <td className="p-2.5 text-left uppercase border-r border-slate-200 dark:border-slate-700">{t.costFw}</td>
                                                    <td className="p-2.5 text-blue-700 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">Rs. {calcData?.d1FwCost.toFixed(2)}</td>
                                                    <td className="p-2.5 text-emerald-700 dark:text-emerald-400">Rs. {calcData?.d2FwCost.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* --- SECTION 5: SIGN-OFFS & VERIFICATION --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
                                        <UserCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.officerName}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentRecord.officerName || 'Not recorded'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.checkedBy}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{currentRecord.checkedBy || 'Not recorded'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};

export default FiringSectionSummary;