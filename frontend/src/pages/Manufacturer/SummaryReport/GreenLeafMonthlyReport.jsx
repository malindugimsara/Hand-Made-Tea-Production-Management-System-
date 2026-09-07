import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Calendar, RefreshCw, Languages, FileDown, Award, TrendingUp, TrendingDown, Minus, Edit3 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function GreenLeafMonthlyReport() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const printAreaRef = useRef(null);
  const page1Ref = useRef(null); // 💡 අලුතින් එකතු කළ Ref එක
  const page2Ref = useRef(null);

  const currentUsername = localStorage.getItem("username") || "System User";
  const userRole = localStorage.getItem("userRole") || "Authorized User";

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [lang, setLang] = useState("SI"); 
  const [manualInputs, setManualInputs] = useState({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const routeOptions = [
    { key: "fa", display: "S/H" },
    { key: "c1", display: "C1" },
    { key: "c2", display: "C2" },
    { key: "c3", display: "C3" },
    { key: "c4", display: "C4" },
    { key: "c5", display: "C5" },
    { key: "c7", display: "C7" },
    { key: "c8", display: "C8" },
  ];

  // 💡 --- TRANSLATIONS ---
  const t = {
    pageTitle: lang === 'SI' ? "මාසික ගුණාත්ම ඇගයීමේ වාර්තාව" : "Monthly Quality Evaluation Report",
    pageSubtitle: lang === 'SI' ? "අමු තේ දළු වල ගුණාත්මය සහ සැපයුම්කරුවන්ගේ කාර්යසාධනය" : "Green Leaf Quality and Supplier Performance",
    reportTitle1: lang === 'SI' ? '"රන්දළු"' : '"Randalu"',
    reportTitle2: lang === 'SI' ? "අමු තේ වල ගුණාත්මය ඇගයීම පිළිබඳ වාර්තාව" : "Green Leaf Quality Evaluation Report",    
    route: lang === 'SI' ? "සැපයුම්කරු / මාර්ගය" : "Supplier / Route",
    rank: lang === 'SI' ? "ස්ථානය" : "Rank",
    qualityDist: lang === 'SI' ? "ගුණාත්මක බෙදාහැරීම" : "Quality Distribution",
    best: lang === 'SI' ? "හොඳ (%)" : "Best (%)",
    belowBest: lang === 'SI' ? "මධ්‍යම (%)" : "B/Best (%)",
    poor: lang === 'SI' ? "නරක (%)" : "Poor (%)",
    
    currMonth: lang === 'SI' ? "වත්මන් මාසය" : "Current Month",
    prevMonth: lang === 'SI' ? "පෙර මාසය" : "Previous Month",
    diff: lang === 'SI' ? "වෙනස" : "Difference",
    
    manual1: lang === 'SI' ? "නව සැපයුම්කරුවන්" : "New Suppliers",
    manual2: lang === 'SI' ? "නිවාඩු" : "Holidays",
    
    avgThisMonth: lang === 'SI' ? "මාසයේ සාමාන්‍යය :" : "This Month Average :",
    avgPrevMonth: lang === 'SI' ? "පසුගිය මාසයේ සාමාන්‍යය :" : "Previous Month Average :",
    grandTotal: lang === 'SI' ? "මුළු දළු ප්‍රමාණය (KG) :" : "Total Leaves (KG) :",

    sign1Pre: lang === 'SI' ? "සකස් කිරීම" : "Prepared By",
    sign1Post: lang === 'SI' ? "තත්ව නිලධාරිනි" : "Quality Officer",
    sign1Name: lang === 'SI' ? "එච්.වී.ඔ.බී.සෙනෙවිරත්න" : "H.V.O.B. Senevirathna",
    
    sign2Pre: lang === 'SI' ? "පරීක්ෂා කිරීම" : "Checked By",
    sign2Post: lang === 'SI' ? "කර්මාන්තශාලා කළමනාකාරතුමා" : "Factory Manager",
    sign2Name: lang === 'SI' ? "අල්විස් මහතා" : "Mr. Alwis",
    
    sign3Pre: lang === 'SI' ? "අනුමත කිරීම" : "Approved By",
    sign3Post: lang === 'SI' ? "අධ්‍යක්ෂකතුමා" : "Director",
    sign3Name: lang === 'SI' ? "අතුකෝරල තේ කර්මාන්තශාලාව" : "Athukorala Tea Factory",

    docRef: lang === 'SI' ? "ලේඛන අංකය " : "Doc Ref ",
    genTime: lang === 'SI' ? "වේලාව " : "Generated ",

  };

  useEffect(() => {
    fetchAndCalculateMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleManualInput = (routeKey, field, value) => {
    setManualInputs(prev => ({
      ...prev,
      [`${routeKey}_${field}`]: value
    }));
  };

  const fetchAndCalculateMonthlyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const [y, m] = selectedMonth.split("-");
      let prevM = parseInt(m, 10) - 1;
      let prevY = parseInt(y, 10);
      if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
      }
      const prevMonthStr = `${prevY}-${String(prevM).padStart(2, "0")}`;

      const [currRes, currPdfRes, prevRes, prevPdfRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?month=${prevMonthStr}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${prevMonthStr}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const currRecords = currRes.ok ? (await currRes.json()).data || [] : [];
      const currPdfTotals = currPdfRes.ok ? (await currPdfRes.json()).data || [] : [];
      const prevRecords = prevRes.ok ? (await prevRes.json()).data || [] : [];
      const prevPdfTotals = prevPdfRes.ok ? (await prevPdfRes.json()).data || [] : [];

      const processStats = (recordsList, pdfTotalsList, monthStr) => {
        const [yearS, monthS] = monthStr.split("-");
        const daysInM = new Date(yearS, monthS, 0).getDate();

        const routeMap = {};
        routeOptions.forEach((r) => {
          routeMap[r.key] = { totalKg: 0, bKg: 0, bbKg: 0, pKg: 0 };
        });

        const pdfMap = {};
        pdfTotalsList.forEach((item) => {
          if (!pdfMap[item.routeKey]) pdfMap[item.routeKey] = {};
          pdfMap[item.routeKey][item.day] = item.totalKg;
        });

        for (let day = 1; day <= daysInM; day++) {
          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;

          routeOptions.forEach((r) => {
            const matchedRecord = recordsList.find((rec) => {
              const recRouteKey = (rec.route || "").split(" - ")[0].toLowerCase();
              return rec.date === dateStr && recRouteKey === r.key && rec.factorySample?.isEntered;
            });

            let dailyTotal = 0;
            if (pdfMap[r.key] && pdfMap[r.key][day] !== undefined) {
              dailyTotal = pdfMap[r.key][day];
            } else if (matchedRecord) {
              dailyTotal = (Number(matchedRecord.totalLeafQtyKg) || 0) * 0.97;
            }

            if (dailyTotal > 0 && matchedRecord) {
              const bPct = Number(matchedRecord.factorySample.bestPct) || 0;
              const bbPct = Number(matchedRecord.factorySample.belowBestPct) || 0;
              const pPct = Number(matchedRecord.factorySample.poorPct) || 0;

              routeMap[r.key].totalKg += dailyTotal;
              routeMap[r.key].bKg += dailyTotal * (bPct / 100);
              routeMap[r.key].bbKg += dailyTotal * (bbPct / 100);
              routeMap[r.key].pKg += dailyTotal * (pPct / 100);
            }
          });
        }

        const items = routeOptions.map((r) => {
          const d = routeMap[r.key];
          const rawBest = d.totalKg > 0 ? (d.bKg / d.totalKg) * 100 : 0;
          const rawBb = d.totalKg > 0 ? (d.bbKg / d.totalKg) * 100 : 0;
          const rawPoor = d.totalKg > 0 ? (d.pKg / d.totalKg) * 100 : 0;

          let bestPct = Math.round(rawBest);
          let bbPct = Math.round(rawBb);
          let poorPct = Math.round(rawPoor);

          if (d.totalKg > 0) {
            let diff = 100 - (bestPct + bbPct + poorPct);
            while (diff !== 0) {
              const remBest = rawBest - bestPct;
              const remBb = rawBb - bbPct;
              const remPoor = rawPoor - poorPct;

              if (diff > 0) {
                if (remBest >= remBb && remBest >= remPoor) bestPct += 1;
                else if (remBb >= remBest && remBb >= remPoor) bbPct += 1;
                else poorPct += 1;
                diff -= 1;
              } else {
                if (remBest <= remBb && remBest <= remPoor) bestPct -= 1;
                else if (remBb <= remBest && remBb <= remPoor) bbPct -= 1;
                else poorPct -= 1;
                diff += 1;
              }
            }
          }

          return {
            routeKey: r.key,
            displayName: r.display,
            totalKg: d.totalKg,
            bestPct: d.totalKg > 0 ? bestPct : 0,
            bbPct: d.totalKg > 0 ? bbPct : 0,
            poorPct: d.totalKg > 0 ? poorPct : 0,
            bKg: d.bKg,
            bbKg: d.bbKg,
            pKg: d.pKg,
          };
        });

        // Calculate Ranking based on Best % descending
        const sorted = [...items].sort((a, b) => {
          if (b.bestPct !== a.bestPct) return Number(b.bestPct) - Number(a.bestPct);
          return Number(a.poorPct) - Number(b.poorPct);
        });

        let rank = 1;
        sorted.forEach((item, idx) => {
          if (idx > 0 && item.bestPct === sorted[idx - 1].bestPct && item.poorPct === sorted[idx - 1].poorPct) {
            item.rank = sorted[idx - 1].rank;
          } else {
            item.rank = rank;
          }
          rank++;
        });

        items.forEach((it) => {
          it.rank = sorted.find((s) => s.routeKey === it.routeKey).rank;
        });

        const grandTotal = items.reduce((acc, curr) => acc + curr.totalKg, 0);
        const grandB = items.reduce((acc, curr) => acc + curr.bKg, 0);
        const grandBB = items.reduce((acc, curr) => acc + curr.bbKg, 0);
        const grandP = items.reduce((acc, curr) => acc + curr.pKg, 0);

        let avgBest = Math.round(grandTotal > 0 ? (grandB / grandTotal) * 100 : 0);
        let avgBelow = Math.round(grandTotal > 0 ? (grandBB / grandTotal) * 100 : 0);
        let avgPoor = Math.round(grandTotal > 0 ? (grandP / grandTotal) * 100 : 0);

        if (grandTotal > 0) {
            let diff = 100 - (avgBest + avgBelow + avgPoor);
            while (diff !== 0) {
                if (diff > 0) { avgPoor += 1; diff -= 1; }
                else { avgPoor -= 1; diff += 1; }
            }
        }

        return { items, grandTotal, avgBest, avgBelow, avgPoor };
      };

      const currentStats = processStats(currRecords, currPdfTotals, selectedMonth);
      const prevStats = processStats(prevRecords, prevPdfTotals, prevMonthStr);

      const getSinhalaMonth = (dateStr) => {
          const m = new Date(dateStr + '-01').getMonth();
          const months = ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"];
          return months[m];
      };

      const currMonthNameEN = new Date(`${y}-${m}-01`).toLocaleString("en-US", { month: "long" }).toUpperCase();
      const prevMonthNameEN = new Date(`${prevY}-${prevM}-01`).toLocaleString("en-US", { month: "long" }).toUpperCase();

      const currMonthNameSI = getSinhalaMonth(`${y}-${m}`);
      const prevMonthNameSI = getSinhalaMonth(`${prevY}-${String(prevM).padStart(2, "0")}`);

      setReportData({
        currentStats,
        prevStats,
        currMonthNameEN,
        prevMonthNameEN,
        currMonthNameSI,
        prevMonthNameSI,
        year: y
      });
    } catch (error) {
      console.error("Calculation Error:", error);
      toast.error("Failed to calculate data.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const toastId = toast.loading("Generating PDF Report...");
    
    try {
      const printContainer = printAreaRef.current;
      const page1 = page1Ref.current;
      const page2 = page2Ref.current;

      // Element එක Render වී නොමැති නම් Error එකක් පෙන්වීම
      if (!printContainer || !page1 || !page2) {
          throw new Error("PDF Elements are not ready!");
      }

      printContainer.style.display = "block";
      printContainer.style.position = "absolute";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "-9999px";

      // පිටු 2ක වෙන වෙනම ලබාගැනීම
      const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1123 });
      const canvas2 = await html2canvas(page2, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1123 });
      
      printContainer.style.display = "none";
      printContainer.style.position = "static";
      
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxH = pdfPageHeight - (margin * 2);

      // --- PAGE 1 ---
      const imgData1 = canvas1.toDataURL("image/jpeg", 1.0);
      let finalW1 = pdfWidth;
      let finalH1 = (canvas1.height * finalW1) / canvas1.width;
      let xOffset1 = 0;
      if (finalH1 > maxH) {
          finalH1 = maxH;
          finalW1 = (canvas1.width * finalH1) / canvas1.height;
          xOffset1 = (pdfWidth - finalW1) / 2;
      }
      pdf.addImage(imgData1, "JPEG", xOffset1, margin, finalW1, finalH1);

      // --- PAGE 2 ---
      pdf.addPage();
      const imgData2 = canvas2.toDataURL("image/jpeg", 1.0);
      let finalW2 = pdfWidth;
      let finalH2 = (canvas2.height * finalW2) / canvas2.width;
      let xOffset2 = 0;
      if (finalH2 > maxH) {
          finalH2 = maxH;
          finalW2 = (canvas2.width * finalH2) / canvas2.height;
          xOffset2 = (pdfWidth - finalW2) / 2;
      }
      pdf.addImage(imgData2, "JPEG", xOffset2, margin, finalW2, finalH2);

      // පිටු අංක යෙදීම
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Page ${i} of ${pageCount} - Generated by Unified Management System`, pdfWidth / 2, pdfPageHeight - 18, { align: 'center' });
        }
        
      pdf.save(`Monthly_Report_${selectedMonth}.pdf`);
      toast.success("PDF Downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("PDF Generation Error: ", error);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Helper Functions
  const formatNumber = (num) => {
      if (!num || num === 0) return "-";
      return num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatDiff = (curr, prev) => {
      const diff = curr - prev;
      if (diff === 0) return "-";
      const formatted = Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return diff < 0 ? `(${formatted})` : formatted;
  };

  const getDiffIcon = (diff) => {
      if (diff > 0) return <TrendingUp size={14} className="text-green-600 inline mr-1" />;
      if (diff < 0) return <TrendingDown size={14} className="text-red-600 inline mr-1" />;
      return <Minus size={14} className="text-gray-400 inline mr-1" />;
  };

  // DateTime Formatter for Header
  const getFormattedDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12 || 12;
    return `${year}/${month}/${day} ${hours}.${minutes}${ampm}`;
  };

  const generatedDateTime = getFormattedDateTime();
  const uniqueCode = `GLMR-REP/${selectedMonth.replace(/-/g, '')}`;

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto min-h-screen bg-[#f8fafc] dark:bg-zinc-950 font-sans transition-colors">
      
      {/* --- TOP CONTROLS --- */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <Award className="text-yellow-500" size={28} /> {t.pageTitle}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
            className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <Languages size={18} /> {lang === 'EN' ? "සිංහල" : "English"}
          </button>

          <div className="flex items-center bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-2.5">
            <Calendar size={18} className="text-[#1B6A31] mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
            />
          </div>

          <button
            onClick={generatePDF}
            disabled={loading || !reportData || isGeneratingPDF}
            className="p-2.5 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-sm"          >
            <FileDown size={18} /> {isGeneratingPDF ? "Generating..." : "Download PDF"}
          </button>
          
          <button
            onClick={fetchAndCalculateMonthlyData}
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-xl transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-[#1B6A31]" : ""} />
          </button>
        </div>
      </div>

      {/* --- UI VIEW (Screen) --- */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-lg">Analyzing Monthly Data...</p>
        </div>
      ) : reportData ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          
          <div className="overflow-x-auto p-1 custom-scrollbar">
            <table className="w-full text-sm text-center border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] dark:bg-zinc-950/50">
                  <th rowSpan={2} className="p-4 font-extrabold text-gray-700 dark:text-gray-300 border-b border-r border-gray-300 dark:border-zinc-800 text-left min-w-[120px]">{t.route}</th>
                  <th rowSpan={2} className="p-4 font-extrabold text-[#1B6A31] border-b border-r border-gray-300 dark:border-zinc-800">{t.rank}</th>
                  <th colSpan={3} className="p-3 font-extrabold text-gray-600 dark:text-gray-400 border-b border-r border-gray-300 dark:border-zinc-800 bg-[#f1f5f9] dark:bg-zinc-800">{t.qualityDist}</th>
                  <th colSpan={3} className="p-3 font-extrabold text-gray-600 dark:text-gray-400 border-b border-r border-gray-300 dark:border-zinc-800 bg-[#f1f5f9] dark:bg-zinc-800">Weights (KG)</th>
                  <th colSpan={2} className="p-3 font-extrabold text-red-600 border-b border-red-100 bg-red-50/50 dark:bg-red-950/20"><span className="flex items-center justify-center gap-1"><Edit3 size={14}/> Manual Inputs</span></th>
                </tr>
                <tr className="text-[12px]">
                  <th className="p-3 font-bold text-blue-700 bg-blue-50/50 dark:bg-blue-950/20 border-b border-r border-gray-300 dark:border-zinc-800">{t.best}</th>
                  <th className="p-3 font-bold text-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20 border-b border-r border-gray-300 dark:border-zinc-800">{t.belowBest}</th>
                  <th className="p-3 font-bold text-red-700 bg-red-50/50 dark:bg-red-950/20 border-b border-r border-gray-300 dark:border-zinc-800">{t.poor}</th>
                  
                  <th className="p-3 font-bold text-green-700 bg-green-50/50 dark:bg-green-950/20 border-b border-r border-gray-300 dark:border-zinc-800">{t.currMonth}<br/><span className="text-[10px] text-green-600/70">{lang === 'SI' ? reportData.currMonthNameSI : reportData.currMonthNameEN}</span></th>
                  <th className="p-3 font-bold text-gray-600 bg-gray-50/50 dark:bg-zinc-800/50 border-b border-r border-gray-300 dark:border-zinc-800">{t.prevMonth}<br/><span className="text-[10px] text-gray-500/70">{lang === 'SI' ? reportData.prevMonthNameSI : reportData.prevMonthNameEN}</span></th>
                  <th className="p-3 font-bold text-gray-700 bg-gray-100/50 dark:bg-zinc-800 border-b border-r border-gray-300 dark:border-zinc-800">{t.diff}</th>
                  
                  <th className="p-3 font-bold text-red-600 bg-red-50/50 dark:bg-red-950/20 border-b border-r border-red-200 dark:border-red-900/50">{t.manual1}</th>
                  <th className="p-3 font-bold text-red-600 bg-red-50/50 dark:bg-red-950/20 border-b border-r border-red-200 dark:border-red-900/50">{t.manual2}</th>
                </tr>
              </thead>
              <tbody>
                {[...reportData.currentStats.items].sort((a,b) => a.rank - b.rank).map((it) => {
                    const prevStat = reportData.prevStats.items.find(p => p.routeKey === it.routeKey);
                    const prevKg = prevStat ? prevStat.totalKg : 0;
                    const diff = it.totalKg - prevKg;

                    return (
                        <tr key={it.routeKey} className="border-b border-gray-300 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-zinc-800 pl-4">{it.displayName}</td>
                            
                            <td className="p-3 border-r border-gray-300 dark:border-zinc-800">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-[13px] shadow-sm ${it.rank === 1 ? 'bg-yellow-400 text-white' : it.rank === 2 ? 'bg-gray-300 text-gray-800' : it.rank === 3 ? 'bg-orange-400 text-white' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'}`}>
                                    {it.rank}
                                </span>
                            </td>

                            <td className="p-3 font-bold text-blue-700 dark:text-blue-400 border-r border-gray-300 dark:border-zinc-800 bg-blue-50/10">{it.bestPct}</td>
                            <td className="p-3 font-bold text-yellow-600 dark:text-yellow-500 border-r border-gray-300 dark:border-zinc-800 bg-yellow-50/10">{it.bbPct}</td>
                            <td className="p-3 font-bold text-red-600 dark:text-red-500 border-r border-gray-300 dark:border-zinc-800 bg-red-50/10">{it.poorPct}</td>

                            <td className="p-3 font-black text-gray-800 dark:text-gray-200 border-r border-gray-300 dark:border-zinc-800 text-right pr-4 bg-green-50/10">{formatNumber(it.totalKg)}</td>
                            <td className="p-3 font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-300 dark:border-zinc-800 text-right pr-4">{formatNumber(prevKg)}</td>
                            <td className={`p-3 font-bold border-r border-gray-300 dark:border-zinc-800 text-right pr-4 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {getDiffIcon(diff)} {Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </td>

                            {/* Manual Inputs in UI */}
                            <td className="p-2 border-r border-red-50 bg-red-50/10 dark:bg-red-950/10">
                                <input 
                                    type="text" maxLength="4" placeholder="00"
                                    value={manualInputs[`${it.routeKey}_col1`] || ''}
                                    onChange={(e) => handleManualInput(it.routeKey, 'col1', e.target.value)}
                                    className="w-14 text-center bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 rounded-md py-1.5 text-sm font-bold text-red-700 dark:text-red-400 outline-none focus:ring-2 focus:ring-red-400 transition-all"
                                />
                            </td>
                            <td className="p-2 bg-red-50/10 dark:bg-red-950/10">
                                <input 
                                    type="text" maxLength="4" placeholder="00"
                                    value={manualInputs[`${it.routeKey}_col2`] || ''}
                                    onChange={(e) => handleManualInput(it.routeKey, 'col2', e.target.value)}
                                    className="w-14 text-center bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 rounded-md py-1.5 text-sm font-bold text-red-700 dark:text-red-400 outline-none focus:ring-2 focus:ring-red-400 transition-all"
                                />
                            </td>
                        </tr>
                    )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="bg-[#f8fafc] dark:bg-zinc-950 p-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-6">
             <div className="flex gap-8">
                 <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">{t.avgThisMonth}</p>
                     <div className="flex gap-4 mt-2 font-black text-lg">
                         <span className="text-blue-600">{reportData.currentStats.avgBest}%</span>
                         <span className="text-yellow-500">{reportData.currentStats.avgBelow}%</span>
                         <span className="text-red-500">{reportData.currentStats.avgPoor}%</span>
                     </div>
                 </div>
                 <div className="hidden sm:block w-px bg-gray-300 dark:bg-zinc-700"></div>
                 <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">{t.avgPrevMonth}</p>
                     <div className="flex gap-4 mt-2 font-bold text-base opacity-70">
                         <span className="text-blue-600">{reportData.prevStats.avgBest}%</span>
                         <span className="text-yellow-600">{reportData.prevStats.avgBelow}%</span>
                         <span className="text-red-600">{reportData.prevStats.avgPoor}%</span>
                     </div>
                 </div>
             </div>

             <div className="text-right bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                 <p className="text-xs font-bold text-green-700 dark:text-green-500 uppercase">{t.grandTotal}</p>
                 <div className="flex items-center gap-4 mt-1">
                     <span className="text-2xl font-black text-green-800 dark:text-green-400">{formatNumber(reportData.currentStats.grandTotal)}</span>
                     <span className="text-sm font-bold text-gray-500">vs {formatNumber(reportData.prevStats.grandTotal)}</span>
                 </div>
             </div>
          </div>
        </div>
      ) : null}


      {/* ========================================================================================= */}
      {/* 💡 HIDDEN PRINT AREA FOR PDF DIRECT DOWNLOAD */}
      {/* ========================================================================================= */}
      <div 
         id="pdf-print-area" 
         ref={printAreaRef}
         style={{ display: 'none' }}
      >
          <style>{`
              #pdf-print-area * {
                  border-color: #cbd5e1 !important;
                  outline-color: transparent !important;
                  box-shadow: none !important;
              }
              .pdf-text-blue { color: #1e40af !important; }
              .pdf-text-yellow { color: #b45309 !important; }
              .pdf-text-red { color: #b91c1c !important; }
              .pdf-text-green { color: #15803d !important; }
              .pdf-text-gray { color: #4b5563 !important; }
              .pdf-text-dark { color: #374151 !important; }
              .pdf-text-light { color: #6b7280 !important; }
              
              .pdf-bg-gray { background-color: #f3f4f6 !important; }
              .pdf-bg-light { background-color: #f9fafb !important; }
              .pdf-bg-yellow { background-color: #fefce8 !important; }
              .pdf-bg-green { background-color: #dcfce7 !important; }
              .pdf-bg-red { background-color: #fff5f5 !important; }
          `}</style>

          {/* 📄 PAGE 1: MAIN REPORT */}
          <div id="pdf-page-1" ref={page1Ref} className="p-10 font-sans flex flex-col justify-between" style={{ backgroundColor: '#ffffff', color: '#000000', width: '1123px', minHeight: '794px' }}>
              <div className="flex justify-between items-start mb-6 border-b border-[#d1d5db] pb-4">
                  <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" onError={(e) => e.target.style.display = 'none'} />
                      <div>
                          <h1 className="text-3xl font-bold text-[#1B6A31] uppercase" style={{ fontFamily: 'sans-serif' }}>
                              Athukorala Group (Pvt) Ltd
                          </h1>
                          <h2 className="text-2xl font-bold mt-2" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                               {t.reportTitle1} - {t.reportTitle2}
                          </h2>                          
                          <h3 className="text-xl font-black mt-1" style={{ color: '#1f2937', fontFamily: 'Iskoola Pota, sans-serif' }}>
                              {lang === 'SI' ? `${reportData?.currMonthNameSI} මාසය` : reportData?.currMonthNameEN} {reportData?.year}
                          </h3>
                      </div>
                  </div>
                  <div className="text-right text-sm text-[#6b7280] flex flex-col gap-1.5" style={{ fontFamily: 'sans-serif' }}>
                      <p><strong className="text-[#4b5563]">{t.docRef}:</strong> {uniqueCode}</p>
                      <p><strong className="text-[#4b5563]">{t.genTime}:</strong> {generatedDateTime}</p>
                  </div>
              </div>

              {/* text-center border border-[#cbd5e1] p-2.5 font-extrabold bg-[#f3f4f6] text-[#000000] */}

              <table className="w-full table-fixed border-collapse border border-[#cbd5e1] text-center text-[16px]" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                  <thead>
                      <tr>
                          {/* 💡 rowSpan={2} යොදා align-middle මඟින් අකුරු මැදට ගෙන ඇත */}
                          <th rowSpan={2} className="border p-2 font-extrabold text-center pl-4 w-[16%] align-middle pdf-bg-gray">{t.route}</th>
                          <th colSpan={3} className="border p-2 font-extrabold w-[21%] pdf-bg-gray">{t.qualityDist}</th>
                          <th colSpan={3} className="border p-2 font-extrabold w-[43%] pdf-bg-gray">Weights (KG)</th>
                          <th colSpan={2} className="border p-2 font-extrabold w-[20%] pdf-bg-gray">Manual Inputs</th>
                      </tr>
                      <tr className="text-[13px]">
                          <th className="border p-2 font-bold w-[7%] pdf-text-blue pdf-bg-light">{t.best}</th>
                          <th className="border p-2 font-bold w-[7%] pdf-text-yellow pdf-bg-light">{t.belowBest}</th>
                          <th className="border p-2 font-bold w-[7%] pdf-text-red pdf-bg-light">{t.poor}</th>
                          
                          <th className="border p-2 font-bold w-[15%] pdf-text-green pdf-bg-light">{t.currMonth}</th>
                          <th className="border p-2 font-bold w-[14%] pdf-text-dark pdf-bg-light">{t.prevMonth}</th>
                          <th className="border p-2 font-bold w-[14%]" style={{ color: '#1f2937' }}>{t.diff}</th>
                          
                          <th className="border p-2 font-bold w-[10%] ">{t.manual1}</th>
                          <th className="border p-2 font-bold w-[10%] ">{t.manual2}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {reportData && [...reportData.currentStats.items].sort((a,b) => a.rank - b.rank).map((it) => {
                          const prevStat = reportData.prevStats.items.find(p => p.routeKey === it.routeKey);
                          const prevKg = prevStat ? prevStat.totalKg : 0;
                          const diff = it.totalKg - prevKg;
                          const col1Val = manualInputs[`${it.routeKey}_col1`] || "00";
                          const col2Val = manualInputs[`${it.routeKey}_col2`] || "00";

                          return (
                              <tr key={`pdf-${it.routeKey}`}>
                                  <td className="border p-2 font-bold text-center pl-4">{it.displayName}</td>
                                  <td className="border p-2 font-bold pdf-text-blue">{it.bestPct}</td>
                                  <td className="border p-2 font-bold pdf-text-yellow">{it.bbPct}</td>
                                  <td className="border p-2 font-bold pdf-text-red">{it.poorPct}</td>
                                  
                                  <td className="border p-2 font-bold text-center pr-4">{formatNumber(it.totalKg)}</td>
                                  <td className="border p-2 pdf-text-gray text-center pr-4">{formatNumber(prevKg)}</td>
                                  <td className="border p-2 text-center pr-4" style={{ color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280' }}>{formatDiff(it.totalKg, prevKg)}</td>
                                  
                                  <td className="border p-2 font-semibold">{col1Val}</td>
                                  <td className="border p-2 font-semibold">{col2Val}</td>
                              </tr>
                          );
                      })}
                      
                      {reportData && (
                          <tr className="pdf-bg-yellow">
                              <td className="border p-3 font-extrabold text-center pl-4 italic">{t.avgThisMonth}</td>
                              <td className="border p-3 font-black pdf-text-blue text-lg">{reportData.currentStats.avgBest}</td>
                              <td className="border p-3 font-black pdf-text-yellow text-lg">{reportData.currentStats.avgBelow}</td>
                              <td className="border p-3 font-black pdf-text-red text-lg">{reportData.currentStats.avgPoor}</td>
                              
                              <td className="border p-3 font-black text-center pr-4 text-lg pdf-bg-green" style={{ color: '#14532d' }}>{formatNumber(reportData.currentStats.grandTotal)}</td>
                              <td className="border p-3 font-bold text-center pr-4 pdf-text-dark">{formatNumber(reportData.prevStats.grandTotal)}</td>
                              <td className="border p-3 font-bold text-center pr-4">{formatDiff(reportData.currentStats.grandTotal, reportData.prevStats.grandTotal)}</td>
                              
                              <td colSpan={2} className="border pdf-bg-gray"></td>
                          </tr>
                      )}
                  </tbody>
              </table>

              <div className="mt-auto pt-16 pb-12 w-full flex flex-row justify-between px-16 items-end text-[16px] font-bold font-sans text-[#374151]">                  
                  <div className="w-56 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign1Pre}</p>
                      <p className="pdf-text-dark">{t.sign1Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign1Name || "H.V.O.B. Senevirathna"}</p> */}
                  </div>
                  <div className="w-56 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign2Pre}</p>
                      <p className="pdf-text-dark">{t.sign2Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign2Name || "Mr. Alwis"}</p> */}
                  </div>
                  <div className="w-64 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign3Pre}</p>
                      <p className="pdf-text-dark">{t.sign3Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign3Name || "Athukorala Tea Factory"}</p> */}
                  </div>
              </div>
          </div>

          {/* 📄 PAGE 2: SUPPLIER TABLE */}
          <div id="pdf-page-2" ref={page2Ref} className="p-10 font-sans flex flex-col justify-between" style={{ backgroundColor: '#ffffff', color: '#000000', width: '1123px', minHeight: '794px' }}>
              
              <div className="flex justify-between items-start mb-6 border-b border-[#d1d5db] pb-4">
                  <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" onError={(e) => e.target.style.display = 'none'} />
                      <div>
                          <h1 className="text-3xl font-bold text-[#1B6A31] uppercase" style={{ fontFamily: 'sans-serif' }}>
                              Athukorala Group (Pvt) Ltd
                          </h1>
                          <h2 className="text-2xl font-bold mt-2" style={{ fontFamily: 'Iskoola Pota, sans-serif' }}>
                               {t.reportTitle1} - {t.reportTitle2}
                          </h2>                          
                          <h3 className="text-xl font-black mt-1" style={{ color: '#1f2937', fontFamily: 'Iskoola Pota, sans-serif' }}>
                              {lang === 'SI' ? `${reportData?.currMonthNameSI} මාසය` : reportData?.currMonthNameEN} {reportData?.year}
                          </h3>
                      </div>
                  </div>
                  <div className="text-right text-sm text-[#6b7280] flex flex-col gap-1.5" style={{ fontFamily: 'sans-serif' }}>
                      <p><strong className="text-[#4b5563]">{t.docRef}:</strong> {uniqueCode}</p>
                      <p><strong className="text-[#4b5563]">{t.genTime}:</strong> {generatedDateTime}</p>
                  </div>
              </div>

              <div className="flex-grow flex items-start justify-center mt-4">
                  <table className="w-full border-collapse text-center text-[15px]" style={{ border: '2px solid #000000' }}>
                      <thead>
                          <tr>
                              <th className="border p-3 font-bold text-center pl-6 w-[40%]">SUPPLIER</th>
                              <th className="border p-3 font-bold">B</th>
                              <th className="border p-3 font-bold">B/B</th>
                              <th className="border p-3 font-bold">P</th>
                          </tr>
                      </thead>
                      <tbody>
                          {reportData && routeOptions.map((r) => {
                              const stat = reportData.currentStats.items.find(it => it.routeKey === r.key);
                              return (
                                  <tr key={`page2-${r.key}`}>
                                      <td className="border p-2.5 font-bold text-center pl-6 pdf-text-gray">{r.display}</td>
                                      <td className="border p-2.5 font-bold" style={{ color: '#1f2937' }}>{stat ? stat.bestPct : "-"}</td>
                                      <td className="border p-2.5 font-bold" style={{ color: '#1f2937' }}>{stat ? stat.bbPct : "-"}</td>
                                      <td className="border p-2.5 font-bold" style={{ color: '#1f2937' }}>{stat ? stat.poorPct : "-"}</td>
                                  </tr>
                              );
                          })}
                          {reportData && (
                              <tr className="pdf-bg-yellow">
                                  <td className="border p-3 font-bold text-center pl-6 uppercase pdf-text-red">
                                      {lang === 'SI' ? `${reportData.currMonthNameSI} සාමාන්‍යය` : `${reportData.currMonthNameEN} AVERAGE`}
                                  </td>
                                  <td className="border p-3 font-bold pdf-text-red">{reportData.currentStats.avgBest}</td>
                                  <td className="border p-3 font-bold pdf-text-red">{reportData.currentStats.avgBelow}</td>
                                  <td className="border p-3 font-bold pdf-text-red">{reportData.currentStats.avgPoor}</td>
                              </tr>
                          )}
                          {reportData && (
                              <tr className="pdf-bg-light">
                                  <td className="border p-3 font-bold text-center pl-6 uppercase" style={{ color: '#be123c' }}>
                                      {lang === 'SI' ? `${reportData.prevMonthNameSI} සාමාන්‍යය` : `${reportData.prevMonthNameEN} AVERAGE`}
                                  </td>
                                  <td className="border p-3 font-bold" style={{ color: '#be123c' }}>{reportData.prevStats.avgBest}</td>
                                  <td className="border p-3 font-bold" style={{ color: '#be123c' }}>{reportData.prevStats.avgBelow}</td>
                                  <td className="border p-3 font-bold" style={{ color: '#be123c' }}>{reportData.prevStats.avgPoor}</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>

              <div className="mt-auto pt-16 pb-12 w-full flex flex-row justify-between px-16 items-end text-[16px] font-bold font-sans text-[#374151]">                  
                  <div className="w-56 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign1Pre}</p>
                      <p className="pdf-text-dark">{t.sign1Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign1Name || "H.V.O.B. Senevirathna"}</p> */}
                  </div>
                  <div className="w-56 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign2Pre}</p>
                      <p className="pdf-text-dark">{t.sign2Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign2Name || "Mr. Alwis"}</p> */}
                  </div>
                  <div className="w-64 flex flex-col items-center">
                      <p className="text-[#4b5563] mb-2">.............................................................</p>
                      <p className="pdf-text-dark">{t.sign3Pre}</p>
                      <p className="pdf-text-dark">{t.sign3Post}</p>
                      {/* <p className="pdf-text-dark">{t.sign3Name || "Athukorala Tea Factory"}</p> */}
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
}