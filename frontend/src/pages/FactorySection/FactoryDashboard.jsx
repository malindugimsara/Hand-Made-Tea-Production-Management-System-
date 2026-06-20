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
  Calendar,
  CheckCircle,
  Info,
  TrendingUp,
  Sparkles,
  Factory,
  Scale,
  Leaf,
  ArrowRightLeft,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// THEME  —  Deep Green → Teal (matches HandMade Tea / Packing Section banners)
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

export default function FactoryDashboard() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [isLoading, setIsLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [factoryRecords, setFactoryRecords] = useState([]);
  const [monthBF, setMonthBF] = useState(0);

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

  // API Data Fetching
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setFactoryRecords(data.records || []);
          setMonthBF(data.bfFromLastMonth || 0);
        } else {
          toast.error("Failed to load factory data.");
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

  // Data Processing for Charts & Cards
  const dashboardData = useMemo(() => {
    if (factoryRecords.length === 0) {
      return {
        currentFactoryBalance: monthBF,
        totalGreenLeafToDate: 0,
        totalMadeTeaToDate: 0,
        totalOutToDate: 0,
        mainChartData: [],
        balanceChartData: [],
        alerts: [
          {
            id: "no-data",
            type: "info",
            icon: <Info size={20} />,
            title: "No Data for Month",
            message: `There are no factory records recorded yet for ${selectedMonth}.`,
          },
        ],
      };
    }

    const lastRecord = factoryRecords[factoryRecords.length - 1];
    const currentFactoryBalance = lastRecord.factoryBalance || 0;
    const totalGreenLeafToDate = lastRecord.greenLeaf?.toDate || 0;
    const totalMadeTeaToDate = lastRecord.madeTea?.toDate || 0;

    // Calculate Total Out for the month
    const totalOutToDate = factoryRecords.reduce(
      (sum, rec) => sum + (rec.totalOut || 0),
      0,
    );

    // Chart 1: Daily Inputs vs Outputs
    const mainChartData = factoryRecords.map((rec) => ({
      name: rec.date.split("T")[0].substring(8, 10),
      GreenLeaf: rec.greenLeaf?.today || 0,
      MadeTea: rec.madeTea?.today || 0,
      TotalOut: rec.totalOut || 0,
    }));

    // Chart 2: Daily Factory Balance Trend
    const balanceChartData = factoryRecords.map((rec) => ({
      name: rec.date.split("T")[0].substring(8, 10),
      Balance: rec.factoryBalance || 0,
    }));

    // Alerts Generation
    const generatedAlerts = [];
    if (currentFactoryBalance < 0) {
      generatedAlerts.push({
        id: "neg-balance",
        type: "danger",
        icon: <AlertTriangle size={20} />,
        title: "Negative Stock Balance",
        message: `The factory balance has dropped to ${currentFactoryBalance.toFixed(2)} kg. Please check the Dispatch and Returns records.`,
      });
    }

    if (generatedAlerts.length === 0) {
      generatedAlerts.push({
        id: "optimal",
        type: "success",
        icon: <Sparkles size={20} />,
        title: "System Optimal",
        message:
          "No pending actions required. Factory operations are running smoothly.",
      });
    }

    return {
      currentFactoryBalance,
      totalGreenLeafToDate,
      totalMadeTeaToDate,
      totalOutToDate,
      mainChartData,
      balanceChartData,
      alerts: generatedAlerts,
    };
  }, [factoryRecords, monthBF, selectedMonth]);

  const {
    currentFactoryBalance,
    totalGreenLeafToDate,
    totalMadeTeaToDate,
    totalOutToDate,
    mainChartData,
    balanceChartData,
    alerts,
  } = dashboardData;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col space-y-8 transition-colors duration-300 min-h-screen relative overflow-x-hidden">
      <MorphingBlobs />

      {/* 1. HERO WELCOME BANNER */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden px-5 py-8 sm:px-8 sm:py-10 md:py-12 min-h-[180px] md:min-h-[200px] flex flex-col justify-center shadow-lg border border-teal-900/20 z-10"
        style={{ background: THEME.btnGradient }}
      >
        {/* Background Animations - Mobile Responsive Sizes & Positions */}
        <div className="absolute -top-10 -right-10 sm:top-0 sm:right-0 w-64 h-64 md:w-96 md:h-96 bg-teal-400 rounded-full mix-blend-overlay filter blur-[60px] md:blur-[100px] opacity-25 animate-pulse"></div>
        <div
          className="absolute -bottom-10 -left-10 sm:-bottom-20 sm:left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[50px] md:blur-[80px] opacity-25 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
          <div className="flex flex-col items-start text-left w-full">
            {/* Live Operations Badge */}
            <div className="flex items-center gap-2 w-fit mb-3 sm:mb-4 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 shadow-sm">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.8)] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-teal-50">
                Live Operations
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-2 text-white tracking-tight drop-shadow-sm">
              Welcome to{" "}
              <span className="text-teal-300 block sm:inline">
                Factory Dashboard
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base font-medium text-white/85 max-w-full sm:max-w-md md:max-w-xl drop-shadow-sm leading-relaxed">
              {getGreeting()}! Real-time overview of green leaf, made tea
              production, and factory balance.
            </p>
          </div>

          {/* Month Selector (Commented out) - Also made mobile responsive if you uncomment it later */}
          {/* <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 shadow-sm w-full md:w-auto mt-2 md:mt-0">
            <Calendar className="text-white ml-1 sm:ml-2 shrink-0" size={18} sm:size={20} />
            <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none font-bold text-white outline-none cursor-pointer text-sm sm:text-base md:text-lg placeholder-white/70 w-full"
                style={{ colorScheme: 'dark' }}
            />
        </div> */}
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md hover:border-teal-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-700 group-hover:scale-110 transition-transform">
              <Scale size={24} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg uppercase">
              Current Month
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Factory Balance
            </p>
            <h3
              className={`text-3xl font-black ${currentFactoryBalance < 0 ? "text-red-500" : "text-gray-800"}`}
            >
              {isLoading ? "..." : currentFactoryBalance.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 font-semibold lowercase">
                kg
              </span>
            </h3>
            <p className="text-[11px] font-bold text-gray-400 mt-2">
              B/F: {monthBF.toFixed(2)} kg
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
              <Leaf size={24} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg uppercase">
              To Date
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Green Leaf Total
            </p>
            <h3 className="text-3xl font-black text-emerald-700">
              {isLoading ? "..." : totalGreenLeafToDate.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 font-semibold lowercase">
                kg
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md hover:border-cyan-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-700 group-hover:scale-110 transition-transform">
              <Factory size={24} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-100 rounded-lg uppercase">
              To Date
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Made Tea Total
            </p>
            <h3 className="text-3xl font-black text-cyan-700">
              {isLoading ? "..." : totalMadeTeaToDate.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 font-semibold lowercase">
                kg
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md hover:border-amber-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Send size={24} />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg uppercase">
              To Date
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Total Out (Dispatch)
            </p>
            <h3 className="text-3xl font-black text-amber-600">
              {isLoading ? "..." : totalOutToDate.toFixed(2)}{" "}
              <span className="text-sm text-gray-400 font-semibold lowercase">
                kg
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* 3. CHARTS & ALERTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* --- Left Column: Charts --- */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart 1: Daily Production Overview */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <TrendingUp className="text-[#0d9488]" size={20} /> Production
                Overview (Daily)
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
                Green Leaf vs Made Tea vs Dispatches
              </p>
            </div>

            <div className="h-[320px] w-full">
              {isLoading || !showCharts ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mainChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barSize={10}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
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
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #f3f4f6",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "#ffffff",
                        color: "#1f2937",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
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
                    <Bar
                      dataKey="GreenLeaf"
                      name="Green Leaf (kg)"
                      fill="#2dd4bf"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="MadeTea"
                      name="Made Tea (kg)"
                      fill="#0d5e4d"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="TotalOut"
                      name="Total Out (kg)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Balance Trend */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <ArrowRightLeft className="text-[#0f766e]" size={20} /> Factory
                Balance Trend
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
                Daily ending balance monitoring
              </p>
            </div>

            <div className="h-[280px] w-full">
              {isLoading || !showCharts ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Loading trend data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={balanceChartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorBalance"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0d9488"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0d9488"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e5e7eb"
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
                      formatter={(value) => [`${value} kg`, "Factory Balance"]}
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #f3f4f6",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "#ffffff",
                        color: "#1f2937",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                    <Area
                      type="step"
                      dataKey="Balance"
                      stroke="#0f766e"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorBalance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* --- Right Column: System Alerts --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-xl">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    System Alerts
                  </h3>
                </div>
              </div>
              <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {isLoading ? (
                <div className="text-center text-sm text-gray-400 py-10">
                  Syncing live alerts...
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:-translate-y-0.5 ${
                      alert.type === "danger"
                        ? "border-red-100 bg-red-50"
                        : alert.type === "success"
                          ? "border-teal-100 bg-teal-50"
                          : "border-blue-100 bg-blue-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        alert.type === "danger"
                          ? "bg-red-100 text-red-600"
                          : alert.type === "success"
                            ? "bg-teal-100 text-teal-700"
                            : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {alert.icon}
                    </div>
                    <div>
                      <h4
                        className={`font-bold text-sm mb-1 ${
                          alert.type === "danger"
                            ? "text-red-800"
                            : alert.type === "success"
                              ? "text-teal-800"
                              : "text-blue-800"
                        }`}
                      >
                        {alert.title}
                      </h4>
                      <p className="text-xs opacity-90 leading-relaxed font-medium text-gray-600">
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
