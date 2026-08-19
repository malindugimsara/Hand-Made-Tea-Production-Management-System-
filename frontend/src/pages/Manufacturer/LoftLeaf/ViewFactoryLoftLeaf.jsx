import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Leaf, RefreshCw, AlertCircle, FileDown, Calendar, Factory, FileSpreadsheet } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

// JS PDF Imports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SinhalaBase64 } from "@/SinhalaFont";


export default function ViewLoftLeafCount() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const navigate = useNavigate();

  const userRole = localStorage.getItem("userRole") || "";
  const isViewer = userRole.toLowerCase() === "viewer" || userRole.toLowerCase() === "view";
  const isAdmin = userRole === "Admin"; 
  const currentUsername = localStorage.getItem("username") || "System Admin";

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null); 

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const fetchRecords = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?date=${selectedDate}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch records.");

      const result = await response.json();
      setRecords(result.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Could not load records.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    const toastId = toast.loading("Deleting record...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/factory-loft-leaf/${recordToDelete}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (response.ok) {
        toast.success("Record deleted successfully.", { id: toastId });
        fetchRecords();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete record.", { id: toastId });
    } finally {
      setRecordToDelete(null);
    }
  };

  const totals = useMemo(() => {
    let tQty = 0, bestKg = 0, belowBestKg = 0, poorKg = 0;
    
    records.forEach(r => {
        tQty += Number(r.totalLeafQtyKg) || 0;
        bestKg += Number(r.calculatedKg?.bestKg) || 0;
        belowBestKg += Number(r.calculatedKg?.belowBestKg) || 0;
        poorKg += Number(r.calculatedKg?.poorKg) || 0;
    });

    const avgFacBest = tQty > 0 ? ((bestKg / tQty) * 100).toFixed(2) : "0.00";
    const avgFacBelow = tQty > 0 ? ((belowBestKg / tQty) * 100).toFixed(2) : "0.00";
    const avgFacPoor = tQty > 0 ? ((poorKg / tQty) * 100).toFixed(2) : "0.00";

    return {
        tQty: tQty, 
        bestKg: bestKg.toFixed(2),
        belowBestKg: belowBestKg.toFixed(2),
        poorKg: poorKg.toFixed(2),
        avgFacBest,
        avgFacBelow,
        avgFacPoor,
    };
  }, [records]);

  // =======================================================================
  // --- ADVANCED PDF GENERATOR (SINHALA FORMAT) ---
  // =======================================================================
  const generatePDFForDate = async () => {
    if (records.length === 0) {
        toast.error("No records available to generate PDF.");
        return;
    }

    const toastId = toast.loading("Generating PDF Report...");

    try {
        const doc = new jsPDF('landscape', 'pt', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // 💡 1. Font එක PDF එකට Load කිරීම
        doc.addFileToVFS("SinhalaFont.ttf", SinhalaBase64);
        doc.addFont("SinhalaFont.ttf", "Sinhala", "normal");
        // 💡 2. මේක අනිවාර්යයි! (Call addFont to register it)
        doc.setFont("Sinhala");

        // --- 1. HEADER SECTION ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold"); 
        doc.setTextColor(0, 0, 0); 
        
        doc.text(`TRANSACTION DATE : ${selectedDate.replace(/-/g, '.')}`, pageWidth / 2, 40, { align: 'center' });
        doc.text("ATHUKORALA GROUP (PVT) LTD", pageWidth / 2, 60, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont("Sinhala", "normal"); // 💡 3. Title එකට සිංහල Font එක දානවා
        doc.text("අමු තේ දළු ගුණාත්මක", 40, 90); 

        // --- 2. TABLE BODY DATA ---
        const body = records.map(r => [
            (r.route || "-").toUpperCase(),
            r.arrivalTime || "-",
            Number(r.totalLeafQtyKg || 0).toString(), 
            r.factorySample?.isEntered ? r.factorySample.bestPct : "-",
            r.factorySample?.isEntered ? r.factorySample.belowBestPct : "-",
            r.factorySample?.isEntered ? r.factorySample.poorPct : "-",
            r.collectorSample?.isEntered ? r.collectorSample.bestPct : "-",
            r.collectorSample?.isEntered ? r.collectorSample.belowBestPct : "-",
            r.collectorSample?.isEntered ? r.collectorSample.poorPct : "-",
            Number(r.calculatedKg?.bestKg || 0).toFixed(2),
            Number(r.calculatedKg?.belowBestKg || 0).toFixed(2),
            Number(r.calculatedKg?.poorKg || 0).toFixed(2),
            r.gradeRank || "-"
        ]);

        // --- 3. AUTO TABLE GENERATION ---
        autoTable(doc, {
            startY: 100,
            theme: 'plain', 
            styles: {
                font: 'Sinhala', // 💡 4. Table එක ඇතුළේ අකුරු සිංහල Font එකෙන් පෙන්වීම
                fontSize: 10,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 4,
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'normal', // 💡 5. සිංහල Font වල Bold නැති නිසා 'normal' දැමීම අත්‍යවශ්‍යයි
                lineWidth: 1
            },
            head: [
                [
                    { content: 'කැපුම්\nමාර්ගය', rowSpan: 3 },
                    { content: 'පැමිණි\nවේලාව', rowSpan: 3 },
                    { content: 'මුළු අමු\nදළු\nප්‍රමාණය\n(Kg)', rowSpan: 3 },
                    { content: 'අමු තේ දළු ගුණාත්මක', colSpan: 6 },
                    { content: 'කිලෝ ප්‍රමාණය (කර්මාන්තශාලාව)', colSpan: 3 },
                    { content: 'ශ්‍රේණිගත\nකිරීම', rowSpan: 3 }
                ],
                [
                    { content: 'කර්මාන්තශාලා නියැදිය\n(Factory Sample)', colSpan: 3 },
                    { content: 'එකතුකරන්නාගේ නියැදිය\n(Leaf Collector Sample)', colSpan: 3 },
                    { content: 'ගුණාත්මයෙන්\nඉහළ\n(Kg)', rowSpan: 2 },
                    { content: 'ගුණාත්මයෙන්\nමධ්‍යස්ථ\n(Kg)', rowSpan: 2 },
                    { content: 'ගුණාත්මයෙන්\nපහළ\n(Kg)', rowSpan: 2 }
                ],
                [
                    { content: 'ගුණාත්මයෙන්\nඉහළ\n(%)' },
                    { content: 'ගුණාත්මයෙන්\nමධ්‍යස්ථ\n(%)' },
                    { content: 'ගුණාත්මයෙන්\nපහළ\n(%)' },
                    { content: 'ගුණාත්මයෙන්\nඉහළ\n(%)' },
                    { content: 'ගුණාත්මයෙන්\nමධ්‍යස්ථ\n(%)' },
                    { content: 'ගුණාත්මයෙන්\nපහළ\n(%)' }
                ]
            ],
            body: body,
            foot: [
                [
                    { content: 'Total', colSpan: 2, styles: { halign: 'left', fontStyle: 'normal' } },
                    { content: totals.tQty.toString(), styles: { fontStyle: 'normal' } },
                    { content: `${totals.avgFacBest} %`, styles: { fontStyle: 'normal' } },
                    { content: `${totals.avgFacBelow} %`, styles: { fontStyle: 'normal' } },
                    { content: `${totals.avgFacPoor} %`, styles: { fontStyle: 'normal' } },
                    { content: "", colSpan: 3 },
                    { content: totals.bestKg, styles: { fontStyle: 'normal' } },
                    { content: totals.belowBestKg, styles: { fontStyle: 'normal' } },
                    { content: totals.poorKg, styles: { fontStyle: 'normal' } },
                    { content: "" }
                ]
            ],
            footStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'normal',
                lineWidth: 1
            }
        });

        doc.save(`Loft_Leaf_Report_${selectedDate}.pdf`);
        toast.success("Report downloaded successfully!", { id: toastId });

    } catch (error) {
        console.error("PDF Generation Error: ", error);
        toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 max-w-[1600px] mx-auto font-sans relative min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">

      {/* --- HEADER SECTION --- */}
      <div className="mb-5 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3f6212] dark:text-lime-500 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-[#65a30d]" /> Loft Leaf Records Summary
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review detailed daily loft leaf count, sample percentages, and calculated weights.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Date Selector */}
          <div className="relative flex-1 md:w-auto">
            <Calendar size={18} className="absolute left-3 top-2.5 text-[#65a30d]" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-lime-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#84cc16] outline-none bg-lime-50/30 dark:bg-zinc-800 text-[#3f6212] dark:text-lime-400 cursor-pointer transition-all shadow-inner"
            />
          </div>

          <button
            onClick={fetchRecords} 
            disabled={loading}
            className={`p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={generatePDFForDate}
            disabled={loading || records.length === 0}
            className="p-2.5 bg-[#3f6212] hover:bg-[#4d7c0f] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            title="Download PDF"
          >
            <FileDown size={18} /> <span className="hidden sm:inline font-bold text-sm">Export PDF</span>
          </button>
        </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-48 sm:h-64">
            <div className="w-6 sm:w-8 h-6 sm:h-8 border-4 border-[#84cc16] dark:border-lime-700 border-t-[#3f6212] dark:border-t-lime-400 rounded-full animate-spin mb-4"></div>
            <p className="text-xs sm:text-sm font-medium">Loading summary records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-center border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                  <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-20">Route</th>
                  <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase">Arrival<br/>Time</th>
                  <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-lime-50 dark:bg-lime-900/20 text-lime-800 dark:text-lime-400">Total Leaf Qty<br/>(Kg)</th>
                  
                  <th colSpan={3} className="p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-gray-200/50 dark:bg-zinc-700/50">Factory Sample (%)</th>
                  <th colSpan={3} className="p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-teal-50/50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400">Collector Sample (%)</th>
                  <th colSpan={3} className="p-2 border border-gray-300 dark:border-zinc-700 font-bold uppercase bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400">Calculated KGs (Factory)</th>
                  
                  <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase text-blue-600 dark:text-blue-400 w-16">Rank</th>
                  {!isViewer && <th rowSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 font-bold uppercase w-24">Actions</th>}
                </tr>
                <tr className="bg-gray-50 dark:bg-zinc-800/80 text-[11px] uppercase text-gray-600 dark:text-gray-400 font-bold">
                  {/* Factory % */}
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-green-600">Best</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600">Below Best</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-red-500">Poor</th>
                  {/* Collector % */}
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-green-600">Best</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600">Below Best</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-red-500">Poor</th>
                  {/* Calculated KGs */}
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-green-600">Best (Kg)</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-yellow-600">Below Best (Kg)</th>
                  <th className="p-2 border border-gray-300 dark:border-zinc-700 text-red-500">Poor (Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700 bg-white dark:bg-zinc-950">
                {records.length > 0 ? records.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-800 dark:text-gray-200">{(row.route || "-").toUpperCase()}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400">{row.arrivalTime || '-'}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-black text-[#65a30d] dark:text-lime-400 bg-lime-50/30 dark:bg-lime-900/10">
                      {row.totalLeafQtyKg || '-'}
                    </td>
                    
                    {/* Factory % */}
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.factorySample?.isEntered ? `${row.factorySample.bestPct}%` : '-'}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.factorySample?.isEntered ? `${row.factorySample.belowBestPct}%` : '-'}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.factorySample?.isEntered ? `${row.factorySample.poorPct}%` : '-'}</td>

                    {/* Collector % */}
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.collectorSample?.isEntered ? `${row.collectorSample.bestPct}%` : '-'}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.collectorSample?.isEntered ? `${row.collectorSample.belowBestPct}%` : '-'}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-medium">{row.collectorSample?.isEntered ? `${row.collectorSample.poorPct}%` : '-'}</td>

                    {/* Calculated KGs */}
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.bestKg || 0).toFixed(2)}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.belowBestKg || 0).toFixed(2)}</td>
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-bold text-gray-700 dark:text-gray-300">{Number(row.calculatedKg?.poorKg || 0).toFixed(2)}</td>

                    {/* Rank */}
                    <td className="p-3 border border-gray-200 dark:border-zinc-800 font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 text-lg">
                      {row.gradeRank}
                    </td>

                    {/* ACTIONS */}
                    {!isViewer && (
                      <td className="p-3 border border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => navigate('/manufacturer/edit-factory-loft-leaf', { state: { record: row } })}
                            className="p-1.5 text-gray-500 hover:text-[#3f6212] dark:hover:text-lime-400 hover:bg-lime-50 dark:hover:bg-zinc-800 rounded transition-all"
                            title="Edit Record"
                          >
                            <MdOutlineEdit size={18} />
                          </button>

                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  onClick={() => setRecordToDelete(row._id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete Record"
                                >
                                  <MdOutlineDeleteOutline size={18} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-sm">
                                <AlertDialogHeader>
                                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800">
                                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                  </div>
                                  <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Record</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
                                    Are you sure you want to delete the record for route <strong>{(row.route || '').toUpperCase()}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6">
                                  <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-gray-400 dark:text-zinc-600">
                      <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-lg font-medium text-gray-500 dark:text-zinc-500">No records found for the selected date.</p>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* FOOTER TOTALS */}
              {records.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-zinc-800 font-bold text-gray-800 dark:text-gray-200">
                  <tr>
                    <td colSpan={2} className="p-3 border border-gray-300 dark:border-zinc-700 text-left pl-6">TOTAL / AVERAGE</td>
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-[#3f6212] dark:text-lime-400">{totals.tQty}</td>
                    
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-green-700 dark:text-green-500">{totals.avgFacBest}%</td>
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-yellow-700 dark:text-yellow-500">{totals.avgFacBelow}%</td>
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-red-600 dark:text-red-400">{totals.avgFacPoor}%</td>
                    
                    <td colSpan={3} className="p-3 border border-gray-300 dark:border-zinc-700 bg-gray-200 dark:bg-zinc-700/50 text-gray-400 font-normal">N/A</td>
                    
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-green-700 dark:text-green-500">{totals.bestKg}</td>
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-yellow-700 dark:text-yellow-500">{totals.belowBestKg}</td>
                    <td className="p-3 border border-gray-300 dark:border-zinc-700 text-red-600 dark:text-red-400">{totals.poorKg}</td>
                    
                    <td className="p-3 border border-gray-300 dark:border-zinc-700"></td>
                    {!isViewer && <td className="p-3 border border-gray-300 dark:border-zinc-700"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}