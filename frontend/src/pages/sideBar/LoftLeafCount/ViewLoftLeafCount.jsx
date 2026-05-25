import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, AlertCircle } from "lucide-react";
import { MdOutlineDeleteOutline, MdOutlineEdit } from "react-icons/md";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PDFDownloader from "@/components/PDFDownloader";
import { useNavigate } from "react-router-dom";

export default function ViewLoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // --- ROLE BASED ACCESS ---
  const userRole = localStorage.getItem("userRole") || "";
  const isViewer = userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";

  // --- STATES ---
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterMonth, setFilterMonth] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [filterDate, setFilterDate] = useState(""); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [recordToDelete, setRecordToDelete] = useState(null); // Now stores an array of records

  useEffect(() => {
    fetchRecords();
  }, [filterMonth]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = filterMonth
        ? `${BACKEND_URL}/api/loft-leaf?month=${filterMonth}`
        : `${BACKEND_URL}/api/loft-leaf`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch records.");

      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Could not load records.");
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE LOGIC (Bulk Delete for the entire Date group) ---
  const handleDelete = async () => {
    if (!recordToDelete || recordToDelete.length === 0) return;
    const toastId = toast.loading("Deleting records for the selected date...");

    try {
      const token = localStorage.getItem("token");
      
      // Delete all records in the selected date group
      const deletePromises = recordToDelete.map(record => 
        fetch(`${BACKEND_URL}/api/loft-leaf/${record._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(deletePromises);

      toast.success("Records deleted successfully.", { id: toastId });
      fetchRecords();
    } catch (error) {
      toast.error("Failed to delete records.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  // --- FILTER LOGIC ---
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;
    const recordDate = r.date.split("T")[0];
    
    const rRoute = (r.route || "").toLowerCase().trim();
    const fRoute = filterRoute.toLowerCase().trim();
    const matchesRoute = filterRoute ? rRoute.startsWith(fRoute) : true;

    const matchesStartDate = startDate ? recordDate >= startDate : true;
    const matchesEndDate = endDate ? recordDate <= endDate : true;
    const matchesExactDate = filterDate ? recordDate === filterDate : true; 
    
    return matchesRoute && matchesStartDate && matchesEndDate && matchesExactDate;
  });

  // records එක render කිරීමට පෙර දත්ත group කරන්න
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const date = record.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  const routeOrder = ["c1", "c2", "c3", "c4", "c5", "c7", "c8", "f", "e"];
  const uniqueCode = `HT/LL/${new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}.${new Date().getFullYear()}`;


  // Filter කරන ලද දත්ත PDF එකට ගැළපෙන ලෙස සකසන ශ්‍රිතය
  const getPdfData = () => {
    return filteredRecords.map((r) => [
      r.date.split("T")[0], 
      r.route.toUpperCase(), 
      r.bestQty, 
      r.belowBestQty, 
      r.poorQty, 
      r.totalQty, 
    ]);
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto font-sans relative min-h-screen transition-colors duration-300">
      <div className="mb-5 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B6A31] dark:text-green-500 flex items-center gap-2">
            <Leaf size={24} /> Loft Leaf Records
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage daily leaf quantities.
          </p>
        </div>

        <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex-1 sm:flex-none min-w-[140px]">
            <PDFDownloader
              title="Loft Leaf Production Report"
              subtitle={`Filters -> From: ${startDate || "All"} To: ${endDate || "All"} | Route: ${filterRoute || "All"}`}
              headers={[
                "Date",
                "Route",
                "Best (g)",
                "Below Best (g)",
                "Poor (g)",
                "Total (g)",
              ]}
              data={getPdfData()}
              uniqueCode={uniqueCode}
              fileName={`Loft_Leaf_Report_${new Date().toISOString().split("T")[0]}.pdf`}
              orientation="portrait" 
              disabled={loading || filteredRecords.length === 0}
            />
          </div>

          <button
            onClick={fetchRecords} 
            disabled={loading}
            className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-zinc-800 text-[#1B6A31] dark:text-[#8CC63F] border border-[#8CC63F] rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all duration-300 ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#F8FAF8] dark:hover:bg-zinc-700"}`}
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${loading ? "animate-spin" : ""}`}
            />
            Sync Data
          </button>
        </div>
      </div>

      {/* --- FILTER SECTION --- */}
      <div className="mb-5 md:mb-6 grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-gray-300 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
            MONTH
          </label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
            FROM DATE
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
            TO DATE
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
            Filter by Route
          </label>
          <select
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="border border-gray-300 dark:border-zinc-700 rounded p-2 sm:p-2.5 text-xs sm:text-sm outline-none focus:border-[#8CC63F] bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors w-full"
          >
            <option value="">All Routes</option>
            {["c1", "c2", "c3", "c4", "c5", "c7", "c8", "f", "e"].map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center h-[50vh]">
            <div className="w-8 h-8 border-4 border-[#8CC63F] border-t-[#1B6A31] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider border-b border-gray-200 dark:border-zinc-700">
                  <th rowSpan="2" className="px-4 py-3 font-bold border-r dark:border-zinc-700 align-middle text-center">
                    Date
                  </th>
                  <th rowSpan="2" className="px-4 py-3 font-bold border-r dark:border-zinc-700 align-middle text-center">
                    Route
                  </th>
                  <th colSpan="2" className="px-4 py-2 font-bold text-center text-green-700 dark:text-green-500 border-r dark:border-zinc-700 bg-green-50 dark:bg-green-900/20">
                    Best
                  </th>
                  <th colSpan="2" className="px-4 py-2 font-bold text-center text-yellow-700 dark:text-yellow-500 border-r dark:border-zinc-700 bg-yellow-50 dark:bg-yellow-900/20">
                    Below Best
                  </th>
                  <th colSpan="2" className="px-4 py-2 font-bold text-center text-red-700 dark:text-red-500 border-r dark:border-zinc-700 bg-red-50 dark:bg-red-900/20">
                    Poor
                  </th>
                  <th rowSpan="2" className="px-4 py-3 font-bold text-center border-r dark:border-zinc-700 align-middle">
                    Total <span className="lowercase">(g)</span>
                  </th>
                  {!isViewer && (
                    <th rowSpan="2" className="px-4 py-3 font-bold text-center align-middle">
                      Action
                    </th>
                  )}
                </tr>
                <tr className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 text-[11px] border-b border-gray-200 dark:border-zinc-700">
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-green-50/50 dark:bg-green-900/10">Qty (g)</th>
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-green-50/50 dark:bg-green-900/10">%</th>
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-yellow-50/50 dark:bg-yellow-900/10">Qty (g)</th>
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-yellow-50/50 dark:bg-yellow-900/10">%</th>
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-red-50/50 dark:bg-red-900/10">Qty (g)</th>
                  <th className="px-3 py-2 text-center border-r dark:border-zinc-700 bg-red-50/50 dark:bg-red-900/10">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {Object.keys(groupedRecords).length > 0 ? (
                  Object.keys(groupedRecords)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map((date) => {
                      const dayRecords = groupedRecords[date].sort((a, b) => {
                        const routeA = (a.route || "").toLowerCase().split(" ")[0];
                        const routeB = (b.route || "").toLowerCase().split(" ")[0];
                        const indexA = routeOrder.indexOf(routeA);
                        const indexB = routeOrder.indexOf(routeB);
                        const posA = indexA !== -1 ? indexA : 999;
                        const posB = indexB !== -1 ? indexB : 999;
                        return posA - posB;
                      });

                      return dayRecords.map((record, index) => (
                        <tr
                          key={record._id}
                          className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          {/* Date Column Grouped */}
                          {index === 0 && (
                            <td
                              rowSpan={dayRecords.length}
                              className="px-4 py-3 border-r border-gray-100 dark:border-zinc-800 font-bold text-gray-800 dark:text-gray-200 align-middle text-center bg-gray-50/30 dark:bg-zinc-900/30"
                            >
                              {date}
                            </td>
                          )}

                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-bold text-teal-700">
                            {record.route.toUpperCase()}
                          </td>

                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-medium">
                            {record.bestQty}
                          </td>
                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-green-600 font-bold">
                            {record.bestPercentage}%
                          </td>

                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-medium">
                            {record.belowBestQty}
                          </td>
                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-yellow-600 font-bold">
                            {record.belowBestPercentage}%
                          </td>

                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-medium">
                            {record.poorQty}
                          </td>
                          <td className="px-3 py-3 text-center border-r border-gray-100 dark:border-zinc-800 text-red-600 font-bold">
                            {record.poorPercentage}%
                          </td>

                          <td className="px-4 py-3 text-center border-r border-gray-100 dark:border-zinc-800 font-black text-[#1B6A31]">
                            {record.totalQty}
                          </td>

                          {/* Action Column Grouped by Date */}
                          {!isViewer && index === 0 && (
                            <td 
                              rowSpan={dayRecords.length} 
                              className="px-4 py-3 text-center align-middle border-l border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/30"
                            >
                              <div className="flex flex-col items-center justify-center gap-3">
                                {/* Navigates to Edit Page passing ALL records for this date */}
                                <button
                                  onClick={() => navigate('/edit-loft-leaf', { state: { date: date, recordsData: dayRecords } })}
                                  className="p-2 bg-[#1B6A31] text-white hover:bg-green-800 rounded-lg shadow-sm transition-colors"
                                  title="Edit Date Group"
                                >
                                  <MdOutlineEdit size={18} />
                                </button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      onClick={() => setRecordToDelete(dayRecords)} // Pass entire array for bulk delete
                                      className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg shadow-sm transition-colors"
                                      title="Delete Date Group"
                                    >
                                      <MdOutlineDeleteOutline size={18} />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Entire Date Record</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure you want to delete ALL records for {date}?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          )}
                        </tr>
                      ));
                    })
                ) : (
                  <tr>
                    <td colSpan="10" className="p-10 text-center text-gray-500">
                      <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}