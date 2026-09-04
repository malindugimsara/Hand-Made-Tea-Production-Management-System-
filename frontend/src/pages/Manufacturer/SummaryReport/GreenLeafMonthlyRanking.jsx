import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, RefreshCw, Award } from "lucide-react";
import PDFDownloader from "@/components/PDFDownloader";

export default function GreenLeafMonthlyRanking() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const currentUsername = localStorage.getItem("username") || "System User";
  const userRole = localStorage.getItem("userRole") || "Authorized User";

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  const routeOptions = [
    { key: "c1", display: "C1" },
    { key: "c2", display: "C2" },
    { key: "c3", display: "C3" },
    { key: "c4", display: "C4" },
    { key: "c5", display: "C5" },
    { key: "c7", display: "C7" },
    { key: "c8", display: "C8" },
    { key: "fa", display: "Direct" },
  ];

  useEffect(() => {
    fetchAndCalculateMonthlyData();
  }, [selectedMonth]);

  const fetchAndCalculateMonthlyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Calculate Previous Month String
      const [y, m] = selectedMonth.split("-");
      let prevM = parseInt(m, 10) - 1;
      let prevY = parseInt(y, 10);
      if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
      }
      const prevMonthStr = `${prevY}-${String(prevM).padStart(2, "0")}`;

      // Fetch Current & Previous Month Data simultaneously
      const [currRes, currPdfRes, prevRes, prevPdfRes] = await Promise.all([
        fetch(
          `${BACKEND_URL}/api/factory-loft-leaf/report?month=${selectedMonth}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${BACKEND_URL}/api/factory-loft-leaf/report?month=${prevMonthStr}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${prevMonthStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const currRecords = currRes.ok ? (await currRes.json()).data || [] : [];
      const currPdfTotals = currPdfRes.ok
        ? (await currPdfRes.json()).data || []
        : [];
      const prevRecords = prevRes.ok ? (await prevRes.json()).data || [] : [];
      const prevPdfTotals = prevPdfRes.ok
        ? (await prevPdfRes.json()).data || []
        : [];

      // Calculate Stats Helper
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

        // Loop daily entries
        for (let day = 1; day <= daysInM; day++) {
          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;

          routeOptions.forEach((r) => {
            const matchedRecord = recordsList.find((rec) => {
              const recRouteKey = (rec.route || "")
                .split(" - ")[0]
                .toLowerCase();
              return (
                rec.date === dateStr &&
                recRouteKey === r.key &&
                rec.factorySample?.isEntered
              );
            });

            // Priority: PDF Total -> Record Total (with 3% deduction)
            let dailyTotal = 0;
            if (pdfMap[r.key] && pdfMap[r.key][day] !== undefined) {
              dailyTotal = pdfMap[r.key][day];
            } else if (matchedRecord) {
              dailyTotal = (Number(matchedRecord.totalLeafQtyKg) || 0) * 0.97;
            }

            if (dailyTotal > 0 && matchedRecord) {
              const bPct = Number(matchedRecord.factorySample.bestPct) || 0;
              const bbPct =
                Number(matchedRecord.factorySample.belowBestPct) || 0;
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
          const bestPct =
            d.totalKg > 0 ? Math.round((d.bKg / d.totalKg) * 100) : 0;
          const bbPct =
            d.totalKg > 0 ? Math.round((d.bbKg / d.totalKg) * 100) : 0;
          const poorPct =
            d.totalKg > 0 ? Math.round((d.pKg / d.totalKg) * 100) : 0;

          return {
            routeKey: r.key,
            displayName: r.display,
            totalKg: d.totalKg,
            bestPct,
            bbPct,
            poorPct,
            bKg: d.bKg,
            bbKg: d.bbKg,
            pKg: d.pKg,
          };
        });

        // Compute Ranks (Best % descending -> Poor % ascending)
        const sorted = [...items].sort((a, b) => {
          if (b.bestPct !== a.bestPct) return b.bestPct - a.bestPct;
          return a.poorPct - b.poorPct;
        });

        let rank = 1;
        sorted.forEach((item, idx) => {
          if (idx > 0) {
            const prev = sorted[idx - 1];
            if (
              item.bestPct === prev.bestPct &&
              item.poorPct === prev.poorPct
            ) {
              item.rank = prev.rank;
            } else {
              item.rank = rank;
            }
          } else {
            item.rank = rank;
          }
          rank++;
        });

        items.forEach((it) => {
          it.rank = sorted.find((s) => s.routeKey === it.routeKey).rank;
        });

        // Factory totals and averages
        const grandTotal = items.reduce((acc, curr) => acc + curr.totalKg, 0);
        const grandB = items.reduce((acc, curr) => acc + curr.bKg, 0);
        const grandBB = items.reduce((acc, curr) => acc + curr.bbKg, 0);
        const grandP = items.reduce((acc, curr) => acc + curr.pKg, 0);

        const avgBest =
          grandTotal > 0 ? Math.round((grandB / grandTotal) * 100) : 0;
        const avgBelow =
          grandTotal > 0 ? Math.round((grandBB / grandTotal) * 100) : 0;
        const avgPoor =
          grandTotal > 0 ? Math.round((grandP / grandTotal) * 100) : 0;

        return { items, grandTotal, avgBest, avgBelow, avgPoor };
      };

      const currentStats = processStats(
        currRecords,
        currPdfTotals,
        selectedMonth,
      );
      const prevStats = processStats(prevRecords, prevPdfTotals, prevMonthStr);

      // Merge previous rank into current items
      currentStats.items.forEach((it) => {
        const pMatch = prevStats.items.find((p) => p.routeKey === it.routeKey);
        it.prevRank = pMatch ? pMatch.rank : "-";
      });

      const monthName = new Date(`${y}-${m}-01`)
        .toLocaleString("en-US", { month: "long" })
        .toUpperCase();
      const prevMonthName = new Date(`${prevY}-${prevM}-01`)
        .toLocaleString("en-US", { month: "long" })
        .toUpperCase();

      setReportData({
        currentStats,
        prevStats,
        currentMonthName: monthName,
        prevMonthName: prevMonthName,
      });
    } catch (error) {
      console.error("Calculation Error:", error);
      toast.error("Failed to calculate monthly rankings.");
    } finally {
      setLoading(false);
    }
  };

  const getPdfHeaders = () => {
  if (!reportData) return [];

  return [
    [
      {
        content: "ROUTE",
        rowSpan: 2,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [220, 252, 231],
          textColor: [20, 83, 45],
          fontStyle: "bold",
          fontSize: 10,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },
      {
        content: "TOTAL GREEN LEAF\n(KG)",
        rowSpan: 2,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [220, 252, 231],
          textColor: [20, 83, 45],
          fontStyle: "bold",
          fontSize: 10,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },

      // Quality Group
      {
        content: "LEAF QUALITY DISTRIBUTION",
        colSpan: 3,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },

      // Ranking Group
      {
        content: "ROUTE RANKING",
        colSpan: 2,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [241, 245, 249],
          textColor: [20, 83, 45],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },
    ],

    [
      {
        content: "BEST\n%",
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [219, 234, 254],
          textColor: [30, 64, 175],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],

        },
      },
      {
        content: "B.BEST\n%",
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [254, 249, 195],
          textColor: [0, 0, 14],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],

        },
      },
      {
        content: "POOR\n%",
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [254, 226, 226],
          textColor: [153, 27, 27],
          fontStyle: "bold",
          fontSize: 9,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],

        },
      },
      {
        content: `CURRENT\n${reportData.currentMonthName}`,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [220, 252, 231],
          textColor: [20, 83, 45],
          fontStyle: "bold",
          fontSize: 8.5,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },
      {
        content: `PREVIOUS\n${reportData.prevMonthName}`,
        styles: {
          valign: "middle",
          halign: "center",
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: "bold",
          fontSize: 8.5,
          lineWidth: 0.5,
          lineColor: [187, 247, 208],
        },
      },
    ],
  ];
};

const getPdfData = () => {
  if (!reportData) return [];

  const rows = reportData.currentStats.items.map((it, index) => {
    const isTopThree = it.rank <= 3;

    return [
      // Route
      {
        content: it.displayName.toUpperCase(),
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [31, 41, 55],
          fillColor: index % 2 === 0 ? [255, 255, 255] : [248, 250, 252],
          fontSize: 9.5,
        },
      },

      // Total Green Leaf
      {
        content: it.totalKg.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [17, 24, 39],
          fillColor: index % 2 === 0 ? [255, 255, 255] : [248, 250, 252],
          fontSize: 9.5,
        },
      },

      // Best
      {
        content: `${it.bestPct}`,
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [30, 64, 175],
          fillColor: [239, 246, 255],
          fontSize: 9.5,
        },
      },

      // Below Best
      {
        content: `${it.bbPct}`,
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [161, 98, 7],
          fillColor: [254, 252, 232],
          fontSize: 9.5,
        },
      },

      // Poor
      {
        content: `${it.poorPct}`,
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [185, 28, 28],
          fillColor: [254, 242, 242],
          fontSize: 9.5,
        },
      },

      // Current Rank
      {
        content: isTopThree
          ? `${it.rank}`
          : `${it.rank}`,
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: isTopThree
            ? [185, 28, 28]
            : [22, 101, 52],
          fillColor: isTopThree
            ? [236, 252, 203]
            : [248, 250, 252],
          fontSize: 12,
        },
      },

      // Previous Rank
      {
        content: `${it.prevRank}`,
        styles: {
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
          textColor: [55, 65, 81],
          fillColor: [248, 250, 252],
          fontSize: 10,
        },
      },
    ];
  });

  // ==========================================
  // THIS MONTH AVERAGE
  // ==========================================
  rows.push([
    {
      content: "THIS MONTH AVERAGE",
      colSpan: 2,
      styles: {
        halign: "left",
        valign: "middle",
        fontStyle: "bold",
        textColor: [20, 83, 45],
        fillColor: [220, 252, 231],
        fontSize: 9.5,
      },
    },

    {
      content: reportData.currentStats.avgBest.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [30, 64, 175],
        fillColor: [220, 252, 231],
        fontSize: 10,
      },
    },

    {
      content: reportData.currentStats.avgBelow.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [161, 98, 7],
        fillColor: [220, 252, 231],
        fontSize: 10,
      },
    },

    {
      content: reportData.currentStats.avgPoor.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [185, 28, 28],
        fillColor: [220, 252, 231],
        fontSize: 10,
      },
    },

    {
      content: "",
      colSpan: 2,
      styles: {
        fillColor: [220, 252, 231],
      },
    },
  ]);

  // ==========================================
  // PREVIOUS MONTH
  // ==========================================
  rows.push([
    {
      content: "PREVIOUS MONTH",
      colSpan: 2,
      styles: {
        halign: "left",
        valign: "middle",
        fontStyle: "bold",
        textColor: [71, 85, 105],
        fillColor: [241, 245, 249],
        fontSize: 9.5,
      },
    },

    {
      content: reportData.prevStats.avgBest.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [30, 64, 175],
        fillColor: [241, 245, 249],
        fontSize: 10,
      },
    },

    {
      content: reportData.prevStats.avgBelow.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [161, 98, 7],
        fillColor: [241, 245, 249],
        fontSize: 10,
      },
    },

    {
      content: reportData.prevStats.avgPoor.toString(),
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        textColor: [185, 28, 28],
        fillColor: [241, 245, 249],
        fontSize: 10,
      },
    },

    {
      content: "",
      colSpan: 2,
      styles: {
        fillColor: [241, 245, 249],
      },
    },
  ]);

  return rows;
};
  const uniqueCode = `MAR/${selectedMonth.replace(/-/g, "")}`;

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans transition-colors">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-500 flex items-center gap-2">
            <Award className="text-yellow-500" size={28} /> Green Leaf Monthly
            Average Ranking
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Official monthly quality averages and route performance ranking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2">
            <Calendar size={18} className="text-gray-400 mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
            />
          </div>

          {/* 💡 PDF Downloader Component භාවිතා කර ඇත */}
          <PDFDownloader
            title={`Monthly Average Ranking`}
            subtitle={`Reporting Month: ${selectedMonth}`}
            headers={getPdfHeaders()}
            uniqueCode={uniqueCode}
            data={getPdfData()}
            fileName={`Green_Leaf_Ranking_${selectedMonth}.pdf`}
            orientation="portrait"
            userName={currentUsername}
            userRole={userRole}
            disabled={loading || !reportData}
            autoTableOptions={{
              theme: "grid",
              styles: {
                fontSize: 14,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.5,
              },
            }}
          />
          <button
            onClick={fetchAndCalculateMonthlyData}
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin text-green-600" : ""}
            />
          </button>
        </div>
      </div>

      {/* Main Ranking Table Card */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-lime-400 border-t-green-700 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-500 font-bold">
            Calculating monthly rankings...
          </p>
        </div>
      ) : reportData ? (
        <div className="flex justify-center overflow-x-auto pb-6">
          <div className="min-w-[850px] max-w-[1000px] w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Table Header / Title */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-green-50 to-white px-6 py-4 dark:border-zinc-800 dark:from-green-950/30 dark:to-zinc-950">
                

                <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  {reportData.currentMonthName}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-center font-sans text-sm">
                  {/* ================= HEADER ================= */}
                  <thead>
                    {/* Main Header */}
                    <tr className="bg-gray-50 text-[11px] font-extrabold uppercase tracking-wider text-gray-600 dark:bg-zinc-900 dark:text-gray-400">
                      <th
                        rowSpan={2}
                        className="border-b border-r border-gray-200 px-5 py-3.5 text-left dark:border-zinc-800"
                      >
                        Route
                      </th>

                      <th
                        rowSpan={2}
                        className="border-b border-r border-gray-200 px-5 py-3.5 text-right dark:border-zinc-800"
                      >
                        Total Green Leaf
                        <span className="ml-1 text-[10px] font-medium text-gray-400">
                          (KG)
                        </span>
                      </th>

                      {/* Quality Group */}
                      <th
                        colSpan={3}
                        className="border-b border-gray-200 bg-gray-100 px-4 py-2.5 text-center text-gray-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-gray-200"
                      >
                        Leaf Quality Distribution
                      </th>

                      {/* Rank */}
                      <th
                        colSpan={2}
                        className="border-b border-gray-200 bg-green-50 px-4 py-2.5 text-center text-green-800 dark:border-zinc-800 dark:bg-green-950/30 dark:text-green-400"
                      >
                        Route Ranking
                      </th>
                    </tr>

                    {/* Sub Header */}
                    <tr className="text-[11px] font-bold uppercase tracking-wide">
                      <th className="border-b border-r border-gray-300 bg-blue-100 px-4 py-2.5 text-blue-800 dark:border-zinc-800 dark:bg-blue-950/50 dark:text-blue-300">
                        Best
                        <span className="ml-1 opacity-60">(%)</span>
                      </th>

                      <th className="border-b border-r border-gray-200 bg-yellow-100 px-4 py-2.5 text-yellow-800 dark:border-zinc-800 dark:bg-yellow-950/40 dark:text-yellow-300">
                        Below Best
                        <span className="ml-1 opacity-60">(%)</span>
                      </th>

                      <th className="border-b border-r border-gray-200 bg-red-100 px-4 py-2.5 text-red-800 dark:border-zinc-800 dark:bg-red-950/40 dark:text-red-300">
                        Poor
                        <span className="ml-1 opacity-60">(%)</span>
                      </th>

                      <th className="border-b border-r border-gray-200 bg-green-100 px-4 py-2.5 text-green-800 dark:border-zinc-800 dark:bg-green-950/40 dark:text-green-700 dark:text-green-300">
                        Current
                        <span className="ml-1 opacity-60">
                          ({reportData.currentMonthName})
                        </span>
                      </th>

                      <th className="border-b border-gray-200 bg-gray-100 px-4 py-2.5 text-gray-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-gray-300">
                        Previous
                        <span className="ml-1 opacity-60">
                          ({reportData.prevMonthName})
                        </span>
                      </th>
                    </tr>
                  </thead>

                  {/* ================= BODY ================= */}
                  <tbody className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {reportData.currentStats.items.map((stat, index) => (
                      <tr
                        key={stat.routeKey}
                        className="
                    group
                    border-b border-gray-200
                    transition-all duration-150
                    hover:bg-green-50/60
                    dark:border-zinc-800
                    dark:hover:bg-green-950/20
                    "
                      >
                        {/* Route */}
                        <td className="px-5 py-3.5 text-center">                        
                              {stat.displayName}
                        </td>

                        {/* Total KG */}
                        <td className="border-l border-gray-200 px-5 py-3.5 dark:border-zinc-800">
                          <span className="font-bold tracking-tight text-gray-900 dark:text-white">
                            {stat.totalKg.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>

                          <span className="ml-1 text-[10px] font-medium text-gray-400">
                            kg
                          </span>
                        </td>

                        {/* Best */}
                        <td className="border-l border-gray-200 bg-blue-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-blue-950/10">
                          <span className="px-2.5 py-1 text-sm font-extrabold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {stat.bestPct}
                          </span>
                        </td>

                        {/* Below Best */}
                        <td className="border-l border-gray-200 bg-yellow-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-yellow-950/10">
                          <span className="px-2.5 py-1 text-sm font-extrabold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            {stat.bbPct}
                          </span>
                        </td>

                        {/* Poor */}
                        <td className="border-l border-gray-200 bg-red-50/50 px-4 py-3.5 dark:border-zinc-800 dark:bg-red-950/10">
                          <span className="px-2.5 py-1 text-sm font-extrabold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            {stat.poorPct}
                          </span>
                        </td>

                        {/* Current Rank */}
                        <td className="relative border-l border-gray-200 bg-green-50 px-4 py-3.5 dark:border-zinc-800 dark:bg-green-950/30">
                            {/* gap-2 ඉවත් කර w-full යොදා ඇත */}
                            <div className="flex items-center justify-center w-full">
                                
                                {/* අංකය හරියටම මැද (Center) පිහිටයි */}
                                <span
                                className={`
                                    flex h-9 min-w-9 items-center justify-center rounded-xl
                                    text-base font-black shadow-sm 
                                    ${
                                    stat.rank === 1
                                        ? "bg-yellow-400 text-white "
                                        : stat.rank === 2
                                        ? "bg-gray-300 text-gray-800"
                                        : stat.rank === 3
                                            ? "bg-orange-400 text-white"
                                            : "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-300"
                                    }
                                `}
                                >
                                {stat.rank}
                                </span>

                                {/* පදක්කම් අභ්‍යන්තර ලෙස දකුණු පසට (absolute right-4) යොමු කර ඇත */}
                                {stat.rank === 1 && (
                                <span className="absolute right-4 text-base" title="1st Place">
                                    🥇
                                </span>
                                )}

                                {stat.rank === 2 && (
                                <span className="absolute right-4 text-base" title="2nd Place">
                                    🥈
                                </span>
                                )}

                                {stat.rank === 3 && (
                                <span className="absolute right-4 text-base" title="3rd Place">
                                    🥉
                                </span>
                                )}

                            </div>
                            </td>

                        {/* Previous Rank */}
                        <td className="border-l border-gray-200 px-4 py-3.5 dark:border-zinc-800">
                          <span
                            className={`
                        inline-flex h-8 min-w-8 items-center justify-center
                        rounded-lg px-2 text-sm font-bold
                        ${
                          stat.prevRank < stat.rank
                            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                            : stat.prevRank > stat.rank
                              ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400"
                        }
                        `}
                          >
                            {stat.prevRank}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* ================= THIS MONTH AVERAGE ================= */}
                    <tr className="border-t-2 border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/20">
                      <td colSpan={2} className="px-5 py-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm text-white shadow-sm">
                            Σ
                          </span>

                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white">
                              This Month Average
                            </p>

                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                              Overall route performance
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="bg-blue-50/60 px-4 py-4 dark:bg-blue-950/10">
                        <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                          {reportData.currentStats.avgBest}
                        </span>
                      </td>

                      <td className="bg-yellow-50/60 px-4 py-4 dark:bg-yellow-950/10">
                        <span className="text-lg font-black text-yellow-700 dark:text-yellow-400">
                          {reportData.currentStats.avgBelow}
                        </span>
                      </td>

                      <td className="bg-red-50/60 px-4 py-4 dark:bg-red-950/10">
                        <span className="text-lg font-black text-red-700 dark:text-red-400">
                          {reportData.currentStats.avgPoor}
                        </span>
                      </td>

                      <td
                        colSpan={2}
                        className="bg-green-50/50 dark:bg-green-950/10"
                      ></td>
                    </tr>

                    {/* ================= PREVIOUS MONTH ================= */}
                    <tr className="bg-gray-50 dark:bg-zinc-900/70">
                      <td colSpan={2} className="px-5 py-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-sm font-bold text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
                            ←
                          </span>

                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-200">
                              Previous Month
                            </p>

                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500">
                              Comparison reference
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {reportData.prevStats.avgBest}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {reportData.prevStats.avgBelow}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          {reportData.prevStats.avgPoor}
                        </span>
                      </td>

                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
