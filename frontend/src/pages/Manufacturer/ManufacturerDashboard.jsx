import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Bell,
  AlertTriangle,
  Info,
  TrendingUp,
  Sparkles,
  Scale,
  Leaf,
  Clock,
  CheckCircle,
  MinusCircle,
  XCircle,
  ArrowRightLeft
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// THEME  —  Deep Green → Teal
// ─────────────────────────────────────────────
const THEME = {
  pageBg: "#f3faf7",
  orb1: "rgba(13,94,77,0.18)",
  orb2: "rgba(13,148,136,0.16)",
  orb3: "rgba(45,140,109,0.14)",
  gridStroke: "#0d5e4d",
  textPrimary: "#0d5e4d",
  textSecondary: "#0f766e",
  accent: "#0d9488",
  btnGradient: "linear-gradient(135deg,#163d2e 0%,#0d5e4d 45%,#0f766e 100%)",
  wipeGradient: "linear-gradient(135deg,#11362a 0%,#0d5e4d 40%,#14b8a6 100%)",
  shimmer: "rgba(13,148,136,0.12)",
  ringFocus: "focus:ring-teal-500/25",
  badgeBorder: "#99f6e4",
  badgeBg: "#f0fdfa",
  badgeText: "#0d5e4d",
  particleColor: "#5eead4",
  particleType: "leaf",
};

// ── Morphing Blobs Background ──
function MorphingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        animate={{ scale: [1, 1.14, 1], x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full"
        style={{
          background: `radial-gradient(circle,${THEME.orb1} 0%,transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full"
        style={{
          background: `radial-gradient(circle,${THEME.orb2} 0%,transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, 20, 0], y: [0, 20, 0] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        className="absolute -bottom-20 left-1/4 w-[360px] h-[360px] rounded-full"
        style={{
          background: `radial-gradient(circle,${THEME.orb3} 0%,transparent 70%)`,
        }}
      />
    </div>
  );
}

export default function ManufacturerDashboard() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [isLoading, setIsLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [loftRecords, setLoftRecords] = useState([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // API Data Fetching (Updated to new Loft Leaf Endpoint)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BACKEND_URL}/api/factory-loft-leaf/report?month=${selectedMonth}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const result = await res.json();
          setLoftRecords(result.data || []);
        } else {
          toast.error("Failed to load loft leaf data.");
        }
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        toast.error("Network error while loading data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [BACKEND_URL, selectedMonth]);

  // Data Processing for Charts & Cards (Based on Loft Leaf Quality Data)
  const dashboardData = useMemo(() => {
    if (loftRecords.length === 0) {
      return {
        totalLeaf: 0, totalBest: 0, totalBelow: 0, totalPoor: 0,
        mainChartData: [], trendChartData: [], alerts: [
          {
            id: "no-data",
            type: "info",
            icon: <Info size={20} />,
            title: "No Data for Month",
            message: `There are no loft leaf quality records recorded yet for ${selectedMonth}.`,
          },
        ],
      };
    }

    let totalLeaf = 0;
    let totalBest = 0;
    let totalBelow = 0;
    let totalPoor = 0;
    let lateArrivalsCount = 0;

    const dailyData = {};

    loftRecords.forEach(rec => {
      const date = rec.date;
      if (!date) return;
      const day = date.split('-')[2];

      if (!dailyData[day]) {
        dailyData[day] = { name: day, TotalLeaf: 0, BestKg: 0, BelowBestKg: 0, PoorKg: 0 };
      }

      // We use the totalLeafQtyKg and the calculated Factory KGs
      const qty = Number(rec.totalLeafQtyKg) || 0;
      const best = Number(rec.calculatedKg?.bestKg) || 0;
      const below = Number(rec.calculatedKg?.belowBestKg) || 0;
      const poor = Number(rec.calculatedKg?.poorKg) || 0;

      totalLeaf += qty;
      totalBest += best;
      totalBelow += below;
      totalPoor += poor;

      dailyData[day].TotalLeaf += qty;
      dailyData[day].BestKg += best;
      dailyData[day].BelowBestKg += below;
      dailyData[day].PoorKg += poor;

      // Check late arrivals (> 20:30)
      if (rec.arrivalTime && rec.arrivalTime !== "-") {
          const [h, m] = rec.arrivalTime.split(':').map(Number);
          if (h > 20 || (h === 20 && m > 30)) {
              lateArrivalsCount++;
          }
      }
    });

    const mainChartData = Object.values(dailyData).sort((a,b) => parseInt(a.name) - parseInt(b.name));
    
    // Trend chart (Total Leaf Arrival Trend)
    const trendChartData = mainChartData.map(d => ({
      name: d.name,
      TotalLeaf: Number(d.TotalLeaf.toFixed(2))
    }));

    // Alerts Generation
    const generatedAlerts = [];
    
    const poorPct = totalLeaf > 0 ? (totalPoor / totalLeaf) * 100 : 0;
    if (poorPct > 15) {
        generatedAlerts.push({
          id: "high-poor",
          type: "danger",
          icon: <AlertTriangle size={20} />,
          title: "High Poor Leaf Percentage",
          message: `Poor leaf quality is at ${poorPct.toFixed(1)}% this month. Please monitor factory quality controls.`,
        });
    }

    if (lateArrivalsCount > 0) {
        generatedAlerts.push({
          id: "late-arrivals",
          type: "danger",
          icon: <Clock size={20} />,
          title: "Late Leaf Arrivals",
          message: `${lateArrivalsCount} deliveries arrived after 20:30 this month. This may affect production times.`,
        });
    }

    if (generatedAlerts.length === 0) {
      generatedAlerts.push({
        id: "optimal",
        type: "success",
        icon: <Sparkles size={20} />,
        title: "Quality Optimal",
        message: "Leaf quality percentages and arrival times are well within acceptable limits.",
      });
    }

    return { 
      totalLeaf, 
      totalBest, 
      totalBelow, 
      totalPoor, 
      mainChartData, 
      trendChartData, 
      alerts: generatedAlerts 
    };
  }, [loftRecords, selectedMonth]);

  const {
    totalLeaf,
    totalBest,
    totalBelow,
    totalPoor,
    mainChartData,
    trendChartData,
    alerts,
  } = dashboardData;

  const customTooltipStyle = {
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.5)",
    backgroundColor: "#18181b",
    color: "#f9fafb",
    fontSize: "12px",
    fontWeight: "bold",
    padding: "10px 14px"
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col space-y-8 transition-colors duration-300 min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-zinc-950">
      <MorphingBlobs />

      {/* 1. HERO WELCOME BANNER */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden px-5 py-8 sm:px-8 sm:py-10 md:py-12 min-h-[180px] md:min-h-[200px] flex flex-col justify-center shadow-lg border border-teal-900/20 z-10"
        style={{ background: THEME.btnGradient }}
      >
        <div className="absolute -top-10 -right-10 sm:top-0 sm:right-0 w-64 h-64 md:w-96 md:h-96 bg-teal-400 rounded-full mix-blend-overlay filter blur-[60px] md:blur-[100px] opacity-25 animate-pulse"></div>
        <div
          className="absolute -bottom-10 -left-10 sm:-bottom-20 sm:left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[50px] md:blur-[80px] opacity-25 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
          <div className="flex flex-col items-start text-left w-full">
            <div className="flex items-center gap-2 w-fit mb-3 sm:mb-4 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 shadow-sm">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.8)] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-teal-50">
                Live Leaf Quality
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-2 text-white tracking-tight drop-shadow-sm">
              Welcome to{" "}
              <span className="text-teal-300 block sm:inline">
                Manufacturing Dashboard
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base font-medium text-white/85 max-w-full sm:max-w-md md:max-w-3xl drop-shadow-sm leading-relaxed">
              {getGreeting()}! Monitor the daily green leaf arrivals, track quality percentages (Best, Below Best, Poor), and stay updated with real-time operational alerts.
            </p>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (UPDATED FOR LOFT LEAF) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* Total Leaf Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Leaf size={24} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-lg uppercase">
              Current Month
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Green Leaf Arrivals
            </p>
            <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {isLoading ? "..." : totalLeaf.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold lowercase">
                kg
              </span>
            </h3>
          </div>
        </div>

        {/* Best Leaf Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-teal-400 dark:hover:border-teal-700 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-700 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <CheckCircle size={24} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Best Quality Leaf
            </p>
            <h3 className="text-3xl font-black text-teal-700 dark:text-teal-400">
              {isLoading ? "..." : totalBest.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold lowercase">
                kg
              </span>
            </h3>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-2">
              {totalLeaf > 0 ? ((totalBest / totalLeaf) * 100).toFixed(1) : 0}% of Total
            </p>
          </div>
        </div>

        {/* Below Best Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <MinusCircle size={24} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Below Best Quality Leaf
            </p>
            <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {isLoading ? "..." : totalBelow.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold lowercase">
                kg
              </span>
            </h3>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-2">
              {totalLeaf > 0 ? ((totalBelow / totalLeaf) * 100).toFixed(1) : 0}% of Total
            </p>
          </div>
        </div>

        {/* Poor Leaf Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-all hover:shadow-md hover:border-red-300 dark:hover:border-red-700 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <XCircle size={24} />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Poor Quality Leaf
            </p>
            <h3 className="text-3xl font-black text-red-600 dark:text-red-400">
              {isLoading ? "..." : totalPoor.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold lowercase">
                kg
              </span>
            </h3>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-2">
              {totalLeaf > 0 ? ((totalPoor / totalLeaf) * 100).toFixed(1) : 0}% of Total
            </p>
          </div>
        </div>
      </div>

      {/* 3. CHARTS & ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* --- Left Column: Charts --- */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Chart 1: Daily Quality Breakdown */}
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <TrendingUp className="text-[#0d9488]" size={20} /> Daily Quality Breakdown
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">
                Composition of Best, Below Best, and Poor leaf (Kg)
              </p>
            </div>

            <div className="h-[320px] w-full">
              {isLoading || !showCharts ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mainChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barSize={12}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(156, 163, 175, 0.2)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={customTooltipStyle}
                      cursor={{ fill: "rgba(156,163,175,0.1)" }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                      iconType="circle"
                    />
                    {/* Stacked Bars for Composition */}
                    <Bar dataKey="PoorKg" stackId="a" name="Poor (kg)" fill="#ef4444" />
                    <Bar dataKey="BelowBestKg" stackId="a" name="Below Best (kg)" fill="#f59e0b" />
                    <Bar dataKey="BestKg" stackId="a" name="Best (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Daily Total Arrivals Trend */}
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <ArrowRightLeft className="text-[#0f766e]" size={20} /> Daily Arrival Volume Trend
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium uppercase tracking-wider">
                Total Green Leaf Quantity (Kg) per day
              </p>
            </div>

            <div className="h-[280px] w-full">
              {isLoading || !showCharts ? (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  Loading trend data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorLeaf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(156, 163, 175, 0.2)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} kg`, "Total Arrivals"]}
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={customTooltipStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="TotalLeaf"
                      stroke="#059669"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorLeaf)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* --- Right Column: System Alerts --- */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 rounded-xl">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    System Alerts
                  </h3>
                </div>
              </div>
              <span className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-[10px] font-black px-2.5 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {isLoading ? (
                <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
                  Syncing live alerts...
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:-translate-y-0.5 ${
                      alert.type === "danger"
                        ? "border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
                        : alert.type === "success"
                          ? "border-teal-100 bg-teal-50 dark:border-teal-900/30 dark:bg-teal-900/10"
                          : "border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10"
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        alert.type === "danger"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                          : alert.type === "success"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}
                    >
                      {alert.icon}
                    </div>
                    <div>
                      <h4
                        className={`font-bold text-sm mb-1 ${
                          alert.type === "danger"
                            ? "text-red-800 dark:text-red-400"
                            : alert.type === "success"
                              ? "text-teal-800 dark:text-teal-400"
                              : "text-blue-800 dark:text-blue-400"
                        }`}
                      >
                        {alert.title}
                      </h4>
                      <p className="text-xs opacity-90 leading-relaxed font-medium text-gray-600 dark:text-gray-400">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}