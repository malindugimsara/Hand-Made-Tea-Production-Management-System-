import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Calendar, RefreshCw, FileText, Download, Save } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const routeOptions = [
  { key: "c1", display: "C1" }, { key: "c2", display: "C2" }, { key: "c3", display: "C3" },
  { key: "c4", display: "C4" }, { key: "c5", display: "C5" }, { key: "c7", display: "C7" },
  { key: "c8", display: "C8" }, { key: "fa", display: "Direct" },
];

const PREDEFINED_GRADES = [
  'FBOP', 'FBOP1', 'FBOPF', 'FBOPF1', 'OP', 'OPA', 'OP1', 'PEKOE',
  'PEKOE1', 'BOP1', 'BOPSP', 'BOPA', 'BM', 'FNGS', 'BOPF', 'BOPIA'
];

const normalizeTeaType = (type) => {
  if (!type) return "";
  return type.toUpperCase().replace(/\s+/g, "");
};

export default function TC5Report() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingDb, setSavingDb] = useState(false);

  // Manual Inputs for Section 5
  const [refuseTea, setRefuseTea] = useState({ bf: "", manufactured: "", sold: "", manure: "", other: "" });

  const [reportData, setReportData] = useState({
    sec2: { bf: 0, ownLeaf: 0, boughtLeaf: 0, otherEstate: 0, otherFactory: 0, total: 0, disposals: 0, closing: 0 },
    sec3: { best: 0, below: 0, poor: 0 },
    sec8: []
  });

  useEffect(() => {
    fetchTC5Data();
  }, [selectedMonth]);

  const fetchTC5Data = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      const [logsRes, loftRes, pdfRes, tc5SavedRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/factory-logs?month=${selectedMonth}`, { headers }),
        fetch(`${BACKEND_URL}/api/factory-loft-leaf/report?month=${selectedMonth}`, { headers }),
        fetch(`${BACKEND_URL}/api/pdf-totals/get?month=${selectedMonth}`, { headers }),
        fetch(`${BACKEND_URL}/api/tc5-reports?month=${selectedMonth}`, { headers }) // Fetch saved TC5 report data including Refuse Tea
      ]);

      const logsData = logsRes.ok ? await logsRes.json() : { records: [] };
      const loftData = loftRes.ok ? await loftRes.json() : { data: [] };
      const pdfData = pdfRes.ok ? await pdfRes.json() : { data: [] };
      const savedReport = tc5SavedRes.ok ? await tc5SavedRes.json() : null;

      // IF SAVED REFUSE TEA DATA EXISTS, POPULATE IT. OTHERWISE DEFAULT TO BLANK/ZEROS.
      if (savedReport && savedReport.section5_refuseTea) {
        setRefuseTea({
          bf: savedReport.section5_refuseTea.bf || "",
          manufactured: savedReport.section5_refuseTea.manufactured || "",
          sold: savedReport.section5_refuseTea.sold || "",
          manure: savedReport.section5_refuseTea.manure || "",
          other: savedReport.section5_refuseTea.other || ""
        });
      } else {
        setRefuseTea({ bf: "", manufactured: "", sold: "", manure: "", other: "" });
      }

      const records = logsData.records || [];

      // SECTION 2 & 8 PROCESSING
      let bf = logsData.bfFromLastMonth || 0;
      let ownLeaf = 0, boughtLeaf = 0, totalDispatch = 0, totalLocalSale = 0;

      const dispMap = {};
      PREDEFINED_GRADES.forEach(g => {
        dispMap[g] = { invoiceNos: new Set(), auction: 0, private: 0, forward: 0, exFactory: 0, direct: 0, gifts: 0, other: 0, total: 0 };
      });

      records.forEach(r => {
        ownLeaf += (r.greenLeaf?.estateLeaf?.today || r.greenLeaf?.estate || 0);
        boughtLeaf += (r.greenLeaf?.broughtLeaf?.today || r.greenLeaf?.brought || 0);
        totalDispatch += (r.dispatch || 0);
        totalLocalSale += (r.localSaleAndGratis || 0);

        (r.dispatches || []).forEach(d => {
          const grade = normalizeTeaType(d.teaType);
          if (!dispMap[grade]) dispMap[grade] = { invoiceNos: new Set(), auction: 0, private: 0, forward: 0, exFactory: 0, direct: 0, gifts: 0, other: 0, total: 0 };
          if (d.invoiceNo) dispMap[grade].invoiceNos.add(d.invoiceNo);
          dispMap[grade].auction += (Number(d.weight) || 0);
        });

        (r.localSales || []).forEach(l => {
          const grade = normalizeTeaType(l.teaType);
          if (!dispMap[grade]) dispMap[grade] = { invoiceNos: new Set(), auction: 0, private: 0, forward: 0, exFactory: 0, direct: 0, gifts: 0, other: 0, total: 0 };
          if (grade === 'BOPF') dispMap[grade].gifts += (Number(l.weight) || 0);
          else dispMap[grade].exFactory += (Number(l.weight) || 0);
        });
      });

      const sec8Array = Object.keys(dispMap).map(grade => {
        const row = dispMap[grade];
        row.total = row.auction + row.private + row.forward + row.exFactory + row.direct + row.gifts + row.other;
        return { grade, ...row, invoiceNos: Array.from(row.invoiceNos).join(', ') };
      });

      const sec2 = { bf, ownLeaf, boughtLeaf, otherEstate: 0, otherFactory: 0, disposals: totalDispatch + totalLocalSale };
      sec2.total = sec2.bf + sec2.ownLeaf + sec2.boughtLeaf + sec2.otherEstate + sec2.otherFactory;
      sec2.closing = sec2.total - sec2.disposals;

      // SECTION 3 PROCESSING
      const [yearS, monthS] = selectedMonth.split("-");
      const daysInM = new Date(yearS, monthS, 0).getDate();
      const routeMap = {};
      routeOptions.forEach(r => routeMap[r.key] = { totalKg: 0, bKg: 0, bbKg: 0, pKg: 0 });

      const pMap = {};
      (pdfData.data || []).forEach(item => {
        if (!pMap[item.routeKey]) pMap[item.routeKey] = {};
        pMap[item.routeKey][item.day] = item.totalKg;
      });

      const loftRecords = loftData.data || [];

      for (let day = 1; day <= daysInM; day++) {
        const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
        routeOptions.forEach(r => {
          const matchedRecord = loftRecords.find(rec => {
            const recRouteKey = (rec.route || "").split(" - ")[0].toLowerCase();
            return rec.date === dateStr && recRouteKey === r.key && rec.factorySample?.isEntered;
          });

          let dailyTotal = 0;
          if (pMap[r.key] && pMap[r.key][day] !== undefined) dailyTotal = pMap[r.key][day];
          else if (matchedRecord) dailyTotal = (Number(matchedRecord.totalLeafQtyKg) || 0) * 0.97;

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

      let grandTotal = 0, grandB = 0, grandBB = 0, grandP = 0;
      routeOptions.forEach(r => {
        grandTotal += routeMap[r.key].totalKg;
        grandB += routeMap[r.key].bKg;
        grandBB += routeMap[r.key].bbKg;
        grandP += routeMap[r.key].pKg;
      });

      const sec3 = {
        best: grandTotal > 0 ? Math.round((grandB / grandTotal) * 100) : 0,
        below: grandTotal > 0 ? Math.round((grandBB / grandTotal) * 100) : 0,
        poor: grandTotal > 0 ? Math.round((grandP / grandTotal) * 100) : 0,
      };

      setReportData({ sec2, sec3, sec8: sec8Array });

    } catch (error) {
      console.error("TC5 Fetch Error:", error);
      toast.error("Failed to load TC5 Report data.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefuseChange = (e) => {
    setRefuseTea({ ...refuseTea, [e.target.name]: e.target.value });
  };

  const refBalance = (Number(refuseTea.bf) || 0) + (Number(refuseTea.manufactured) || 0) - ((Number(refuseTea.sold) || 0) + (Number(refuseTea.manure) || 0) + (Number(refuseTea.other) || 0));

  // ===============================================
  // SAVE TO DB LOGIC
  // ===============================================
  const saveToDB = async () => {
    setSavingDb(true);
    const toastId = toast.loading("Saving Report to Database...");
    try {
      const token = localStorage.getItem("token");

      const payload = {
        month: selectedMonth,
        section2_manufacture: reportData.sec2,
        section3_averageLeaf: reportData.sec3,
        section5_refuseTea: refuseTea,
        section8_disposals: reportData.sec8,
        refuseBalance: refBalance
      };

      // Adjust this endpoint URL to match your backend API
      const response = await fetch(`${BACKEND_URL}/api/tc5report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to save report to database");
      }

      toast.success("Report Saved Successfully!", { id: toastId });
    } catch (err) {
      console.error("Save Error: ", err);
      toast.error("Error saving to database.", { id: toastId });
    } finally {
      setSavingDb(false);
    }
  };

  // ===============================================
  // PDF DOWNLOAD LOGIC
  // ===============================================
  const generatePDF = async () => {
    setGeneratingPdf(true);
    const toastId = toast.loading("Downloading PDF...");
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const page1 = document.getElementById("tc5-page-1");
      const canvas1 = await html2canvas(page1, { scale: 4, useCORS: true, backgroundColor: "#ffffff", scrollY: -window.scrollY });
      pdf.addImage(canvas1.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight);

      pdf.addPage();

      const page2 = document.getElementById("tc5-page-2");
      const canvas2 = await html2canvas(page2, { scale: 4, useCORS: true, backgroundColor: "#ffffff", scrollY: -window.scrollY });
      pdf.addImage(canvas2.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight);

      pdf.save(`TC5_Report_${selectedMonth}.pdf`);
      toast.success("PDF Downloaded Successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Error generating PDF.", { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const paddedSec8 = [...reportData.sec8];
  while (paddedSec8.length < 24) {
    paddedSec8.push({ invoiceNos: '', grade: '', auction: 0, private: 0, forward: 0, exFactory: 0, direct: 0, gifts: 0, other: 0, total: 0 });
  }

  const reportMonthText = new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const reportYearText = selectedMonth.substring(2, 4);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <Toaster position="bottom-right" />

      {/* Control Header */}
      <div className="max-w-[794px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl shadow-md border border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <FileText className="text-emerald-600" size={24} /> T.C.5 Monthly Return
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Official Document Print Generation</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5">
            <Calendar size={16} className="text-slate-500 mr-2" />
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer" />
          </div>

          <button onClick={fetchTC5Data} disabled={loading || savingDb || generatingPdf} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all" title="Refresh Data">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button onClick={saveToDB} disabled={loading || savingDb || generatingPdf} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
            <Save size={16} /> {savingDb ? "Saving..." : "Save to DB"}
          </button>

          <button onClick={generatePDF} disabled={loading || savingDb || generatingPdf} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
            <Download size={16} /> {generatingPdf ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold">Compiling T.C.5 Document...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-10 items-center overflow-x-auto">

          <style>{`
            .tc5-paper * { box-sizing: border-box !important; }
            .tc5-paper { background-color: #ffffff !important; color: #000000 !important; font-family: serif; font-size: 11px; line-height: 1.2; width: 794px; padding: 40px; }
            
            /* Strict tables with margin-top -1px for perfect sequential borders */
            .tc5-table { width: 100%; border-collapse: collapse !important; border: 1px solid #000000 !important; margin-top: -1px !important; }
            .tc5-table-first { margin-top: 0 !important; }
            
            .tc5-td { border: 1px solid #000000 !important; padding: 4px; vertical-align: top; font-weight: normal; }
            .tc5-td-c { border: 1px solid #000000 !important; padding: 4px; vertical-align: middle; text-align: center; }
            .tc5-th { border: 1px solid #000000 !important; padding: 4px; vertical-align: top; font-weight: normal; }
            
            .tc5-input { width: 100%; text-align: center; border: none; outline: none; background: transparent; font-weight: bold; font-family: inherit; }
            .bg-shade { background-color: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          `}</style>

          {/* ============================== PAGE 1 ============================== */}
          <div className="bg-white shadow-2xl border border-gray-300 overflow-hidden" style={{ width: '794px', height: '1123px' }}>
            <div id="tc5-page-1" className="tc5-paper h-full flex flex-col relative">

              {/* TABLE 1: TOP HEADER */}
              <table className="tc5-table tc5-table-first">
                <tbody>
                  <tr>
                    <td className="tc5-td" style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                          <span>MONTHLY TEA PRODUCTION RETURN FOR THE MONTH OF</span>
                          <span style={{ borderBottom: '1px dashed #000', padding: '0 20px', margin: '0 8px', textAlign: 'center' }}>{reportMonthText}</span>
                          <span>20</span>
                          <span style={{ borderBottom: '1px dashed #000', padding: '0 16px', margin: '0 8px', textAlign: 'center' }}>{reportYearText}</span>
                        </div>
                        <div style={{ fontSize: '14px' }}>T.C.5/2008-1</div>
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                        UNDER THE TEA CONTROL ACT NO 51 OF 1957
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', width: '85%' }}>
                          <span>20........</span>
                          <span style={{ borderBottom: '1px dotted #000', padding: '0 40px', margin: '0 16px', flex: 1 }}></span>
                          <span>මස තේ නිෂ්පාදනය පිළිබඳ මාසික වාර්තාව</span>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 'normal', width: '15%', textAlign: 'right' }}>
                          ටීසී 5/2008-1
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '4px' }}>
                        1957 අංක 51 දරණ තේ පාලන පනත
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 2: FACTORY INFO & MANAGEMENT TYPE */}
              <table className="tc5-table">
                <tbody>
                  <tr>
                    <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold' }}>1</td>
                    <td className="tc5-td" style={{ width: '27%' }}>
                      1.1 Name of Factory :<br /><span style={{ fontSize: '9px' }}>කර්මාන්තශාලාවේ නම</span><br />
                      <strong style={{ display: 'block', marginTop: '4px' }}>ATHUKORALA GROUP (PVT) LTD</strong>
                    </td>
                    <td className="tc5-td" colSpan="4" style={{ width: '40%' }}>
                      1.2 Registered No<br /><span style={{ fontSize: '9px' }}>ලියාපදිංචි අංකය</span><br />
                      <strong style={{ display: 'block', marginTop: '4px', letterSpacing: '2px', fontSize: '12px' }}>MF1398 / HT0049</strong>
                    </td>
                    <td className="tc5-td" colSpan="3" style={{ width: '30%' }}>
                      1.3 Elevation<br /><span style={{ fontSize: '9px' }}>උන්නතාංශය</span><br />
                      <strong style={{ display: 'block', marginTop: '4px' }}>Low Grown</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="tc5-td-c" style={{ fontWeight: 'bold' }}>2</td>
                    <td className="tc5-td" colSpan="2" style={{ width: '40%' }}>
                      Production and stock position of orthodox made tea:<br />
                      <span style={{ fontSize: '9px' }}>පාරම්පරික සකස් කළ තේ නිෂ්පාදනය සහ තොග තත්වය</span>
                    </td>
                    <td className="tc5-td bg-shade" colSpan="2" style={{ width: '17%', verticalAlign: 'middle' }}>
                      Management Type<br /><span style={{ fontSize: '9px' }}>කළමනාකරණ කාණ්ඩය</span>
                    </td>
                    <td className="tc5-td-c" style={{ width: '8%', fontSize: '9px' }}>Plan<br />tation<br />☐</td>
                    <td className="tc5-td-c" style={{ width: '8%', fontSize: '9px' }}>Private<br /><strong>[X]</strong></td>
                    <td className="tc5-td-c" style={{ width: '8%', fontSize: '9px' }}>Co-op<br />☐</td>
                    <td className="tc5-td-c" style={{ width: '8%', fontSize: '9px' }}>Tea<br />Shakthi<br />☐</td>
                    <td className="tc5-td-c" style={{ width: '8%', fontSize: '9px' }}>Other<br />☐</td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 3: STOCK & MANUFACTURE */}
              <table className="tc5-table" style={{ borderTop: 'none', textAlign: 'center' }}>
                <tbody>
                  <tr>
                    <td className="tc5-td-c" rowSpan="4" style={{ width: '3%', padding: 0 }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.5em', fontWeight: 'bold', color: '#6b7280', margin: '0 auto', padding: '16px 0' }}>
                        O R T H O D O X
                      </div>
                    </td>
                    <td className="tc5-td" rowSpan="3" style={{ width: '14%', textAlign: 'left' }}>
                      <div style={{ marginBottom: '8px' }}>Stock of tea at the beginning of the month</div>
                      <div style={{ fontSize: '9px' }}>මාසය ආරම්භයේ දී තේ තොගය</div>
                    </td>
                    <td className="tc5-td" colSpan="2" style={{ width: '22%', verticalAlign: 'middle' }}>
                      Tel No / දුරකථන අංකය : <strong></strong>
                    </td>
                    <td className="tc5-td" colSpan="2" style={{ width: '22%', verticalAlign: 'middle' }}>
                      Miscellaneous receipt of made tea<br /><span style={{ fontSize: '8px' }}>වෙනත් සකස් කල තේ ලබා ගත් මාර්ග</span>
                    </td>
                    <td className="tc5-td" rowSpan="3" style={{ width: '11%', textAlign: 'left' }}>
                      <div style={{ marginBottom: '8px' }}>Total</div>
                      <div style={{ fontSize: '9px' }}>එකතුව</div>
                      <div style={{ marginTop: '12px', fontWeight: 'bold', textAlign: 'center' }}>5</div>
                    </td>
                    <td className="tc5-td" rowSpan="3" style={{ width: '13%', textAlign: 'left' }}>
                      <div style={{ marginBottom: '8px' }}>Disposals during the month</div>
                      <div style={{ fontSize: '9px' }}>මාසය තුල අපහරණය කළ ප්‍රමාණය</div>
                      <div style={{ marginTop: '12px', fontWeight: 'bold', textAlign: 'center' }}>6</div>
                    </td>
                    <td className="tc5-td" rowSpan="3" style={{ width: '15%', textAlign: 'left' }}>
                      <div style={{ marginBottom: '8px' }}>Stock of tea at the end of the month</div>
                      <div style={{ fontSize: '9px' }}>මාසය අවසානයේ ඉතිරි තේ තොගය</div>
                      <div style={{ marginTop: '12px', fontWeight: 'bold', textAlign: 'center' }}>7</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="tc5-td-c bg-shade" colSpan="4">
                      <strong>Manufacture / නිෂ්පාදනය කිරීම</strong>
                    </td>
                  </tr>
                  <tr style={{ fontSize: '9px', textAlign: 'left' }}>
                    <td className="tc5-td" style={{ width: '11%' }}>From own leaf<br />තම වත්තේ දළු වලින්<br /><br /><center><strong>1</strong></center></td>
                    <td className="tc5-td" style={{ width: '11%' }}>From leaf of other estates<br />වෙනත් වතුවල දළු වලින්<br /><center><strong>2</strong></center></td>
                    <td className="tc5-td" style={{ width: '11%' }}>From bought leaf<br />මිලට ගත් දළු වලින්<br /><br /><center><strong>3</strong></center></td>
                    <td className="tc5-td" style={{ width: '11%' }}>Manufactured by other factories<br />වෙනත් කම්හල් මගින් නිපදවන ලද<br /><center><strong>4</strong></center></td>
                  </tr>
                  {/* Data Row */}
                  <tr className="bg-shade" style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.bf.toFixed(1)}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.ownLeaf.toFixed(1)}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.otherEstate.toFixed(1) || '0.0'}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.boughtLeaf.toFixed(1)}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.otherFactory.toFixed(1) || '0.0'}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.total.toFixed(1)}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.disposals.toFixed(1)}</td>
                    <td className="tc5-td" style={{ padding: '8px' }}>{reportData.sec2.closing.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 4: AVERAGE GREEN LEAF */}
              <table className="tc5-table" style={{ borderTop: 'none' }}>
                <tbody>
                  <tr>
                    <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', borderTop: 'none' }}>3</td>
                    <td className="tc5-td" style={{ width: '55%', verticalAlign: 'middle', borderTop: 'none' }}>
                      Average Green Tea Leaf Standard<br /><span style={{ fontSize: '9px' }}>සාමාන්‍ය අමු තේ දළු ප්‍රමිතිය</span>
                    </td>
                    <td className="tc5-td-c" style={{ width: '14%', borderTop: 'none' }}>
                      Best<br /><span style={{ fontSize: '9px' }}>හොඳ</span><br />
                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '8px', fontSize: '14px' }}>{reportData.sec3.best}%</span>
                    </td>
                    <td className="tc5-td-c" style={{ width: '14%', borderTop: 'none' }}>
                      Below Best<br /><span style={{ fontSize: '9px' }}>සාමාන්‍ය</span><br />
                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '8px', fontSize: '14px' }}>{reportData.sec3.below}%</span>
                    </td>
                    <td className="tc5-td-c" style={{ width: '14%', borderTop: 'none' }}>
                      Poor<br /><span style={{ fontSize: '9px' }}>දුර්වල</span><br />
                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '8px', fontSize: '14px' }}>{reportData.sec3.poor}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 5: DETAILS OF PRIVATE SALES */}
              <table className="tc5-table" style={{ borderTop: 'none', textAlign: 'center' }}>
                <tbody>
                  <tr>
                    <td className="tc5-td-c" rowSpan="7" style={{ width: '3%', fontWeight: 'bold', borderTop: 'none' }}>4</td>
                    <td className="tc5-td" colSpan="8" style={{ textAlign: 'left', fontWeight: 'bold', borderTop: 'none' }}>
                      Details of Private Sales<br /><span style={{ fontSize: '9px', fontWeight: 'normal' }}>පෞද්ගලික විකිණීම් පිළිබඳ විස්තර</span>
                    </td>
                  </tr>
                  <tr className="bg-shade">
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '12%' }}>Garden marks<br />වෙළඳ ලකුණ</td>
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '12%' }}>Invoice No<br />ඉන්වොයිස් අංකය</td>
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '10%' }}>Grade<br />වර්ගය</td>
                    <td className="tc5-td" rowSpan="2" style={{ width: '22%', verticalAlign: 'middle', textAlign: 'left' }}>Name of buyers<br />ගැණුම්කරුවන්ගේ නම</td>
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '12%' }}>Date of sale<br />විකුණුම් දිනය</td>
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '12%' }}>Date of panel approved<br />මණ්ඩල අනුමත...</td>
                    <td className="tc5-td-c" colSpan="2" style={{ width: '12%' }}>Price per Kg<br />මිල කිලෝ එකකට</td>
                    <td className="tc5-td-c" rowSpan="2" style={{ width: '8%' }}>Weight<br />Kgs බර</td>
                  </tr>
                  <tr className="bg-shade">
                    <td className="tc5-td-c" style={{ width: '6%' }}>Rs. රු.</td>
                    <td className="tc5-td-c" style={{ width: '6%' }}>Cts ශත</td>
                  </tr>
                  {/* Empty rows */}
                  <tr>
                    <td className="tc5-td" style={{ height: '20px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td>
                  </tr>
                  <tr>
                    <td className="tc5-td" style={{ height: '20px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td>
                    <td className="tc5-td" style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', color: '#d1d5db', fontSize: '24px', letterSpacing: '0.5em' }}>NIL</span>
                    </td>
                    <td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td>
                  </tr>
                  <tr>
                    <td className="tc5-td" style={{ height: '20px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td>
                  </tr>
                  <tr>
                    <td className="tc5-td" colSpan="4" style={{ height: '20px' }}></td>
                    <td className="tc5-td-c" style={{ fontWeight: 'bold', textAlign: 'right' }}>Total<br />එකතුව</td>
                    <td className="tc5-td bg-shade" colSpan="2"></td>
                    <td className="tc5-td bg-shade"></td>
                    <td className="tc5-td bg-shade"></td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 6: REFUSE TEA */}
              <table className="tc5-table" style={{ borderTop: 'none', textAlign: 'center', marginBottom: '24px' }}>
                <tbody>
                  <tr>
                    <td className="tc5-td-c" rowSpan="3" style={{ width: '3%', fontWeight: 'bold', borderTop: 'none' }}>5</td>
                    <td className="tc5-td" colSpan="6" style={{ textAlign: 'left', borderTop: 'none' }}>
                      <strong>Refuse Tea</strong> <span style={{ fontSize: '10px' }}>කසල තේ</span>
                    </td>
                  </tr>
                  <tr className="bg-shade">
                    <td className="tc5-td" style={{ width: '16%', textAlign: 'left' }}>Stock brought<br />forward from previous month<br /><span style={{ fontSize: '9px' }}>ඉකුත් මාසයෙන් ඉදිරියට ගෙන ආ තොගය</span><br /><br /><center><strong>1</strong></center></td>
                    <td className="tc5-td" style={{ width: '16%', textAlign: 'left' }}>Manufactured<br />during the month<br /><span style={{ fontSize: '9px' }}>මාසය තුල නිපැයුම</span><br /><br /><br /><center><strong>2</strong></center></td>
                    <td className="tc5-td" style={{ width: '16%', textAlign: 'left' }}>Quantity<br />sold<br /><span style={{ fontSize: '9px' }}>විකුණු ප්‍රමාණය</span><br /><br /><br /><center><strong>3</strong></center></td>
                    <td className="tc5-td" style={{ width: '16%', textAlign: 'left' }}>Quantity used<br />as manure<br /><span style={{ fontSize: '9px' }}>පොහොර ලෙස යෙදූ ප්‍රමාණය</span><br /><br /><center><strong>4</strong></center></td>
                    <td className="tc5-td" style={{ width: '18%', textAlign: 'left' }}>Other disposals<br /><br /><span style={{ fontSize: '9px' }}>වෙනත් අපහරණයන්</span><br /><br /><br /><center><strong>5</strong></center></td>
                    <td className="tc5-td" style={{ width: '15%', textAlign: 'left' }}>Balance stock<br /><br /><span style={{ fontSize: '9px' }}>ඉතිරි තොගය</span><br /><br /><br /><center><strong>6</strong></center></td>
                  </tr>
                  <tr>
                    <td className="tc5-td-c" style={{ padding: '0' }}>
                      {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '6px 0' }}>{refuseTea.bf}</span> : <input type="number" name="bf" value={refuseTea.bf} onChange={handleRefuseChange} className="tc5-input py-2" placeholder="0" />}
                    </td>
                    <td className="tc5-td-c" style={{ padding: '0' }}>
                      {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '6px 0' }}>{refuseTea.manufactured}</span> : <input type="number" name="manufactured" value={refuseTea.manufactured} onChange={handleRefuseChange} className="tc5-input py-2" placeholder="0" />}
                    </td>
                    <td className="tc5-td-c" style={{ padding: '0' }}>
                      {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '6px 0' }}>{refuseTea.sold}</span> : <input type="number" name="sold" value={refuseTea.sold} onChange={handleRefuseChange} className="tc5-input py-2" placeholder="0" />}
                    </td>
                    <td className="tc5-td-c" style={{ padding: '0' }}>
                      {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '6px 0' }}>{refuseTea.manure}</span> : <input type="number" name="manure" value={refuseTea.manure} onChange={handleRefuseChange} className="tc5-input py-2" placeholder="0" />}
                    </td>
                    <td className="tc5-td-c" style={{ padding: '0' }}>
                      {generatingPdf ? <span style={{ fontWeight: 'bold', display: 'block', padding: '6px 0' }}>{refuseTea.other}</span> : <input type="number" name="other" value={refuseTea.other} onChange={handleRefuseChange} className="tc5-input py-2" placeholder="0" />}
                    </td>
                    <td className="tc5-td-c bg-shade" style={{ fontWeight: 'bold' }}>{refBalance > 0 ? refBalance.toFixed(2) : ''}</td>
                  </tr>
                </tbody>
              </table>

              {/* TABLE 7: DETAILS & BROKERS */}
              <table className="tc5-table" style={{ borderTop: 'none', marginBottom: '8px' }}>
                <tbody>
                  <tr>
                    <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold', borderTop: 'none' }}>6</td>
                    <td className="tc5-td" colSpan="2" style={{ borderTop: 'none' }}>
                      <strong>Details of Disposal of Refuse Tea:</strong><br />
                      කසල තේ අපහරණය පිළිබඳ වැඩිමනත් විස්තර:
                    </td>
                  </tr>
                  <tr>
                    <td className="tc5-td-c" style={{ width: '3%', fontWeight: 'bold' }}>7</td>
                    <td className="tc5-td" style={{ width: '48%', height: '85px', position: 'relative' }}>
                      <div style={{ fontWeight: 'bold' }}>Name of brokers</div>
                      <div style={{ fontSize: '10px' }}>තැරැව්කරුවන්ගේ නම</div>
                      <div style={{ marginTop: '8px', lineHeight: '1.8' }}>
                        1........................................................................<br />
                        2........................................................................<br />
                        3........................................................................<br />
                        4........................................................................
                      </div>
                    </td>
                    <td className="tc5-td" style={{ width: '49%', position: 'relative' }}>
                      <div style={{ fontWeight: 'bold' }}>Selling marks</div>
                      <div style={{ fontSize: '10px' }}>වෙළඳ සලකුණ</div>
                      <div style={{ marginTop: '8px', lineHeight: '1.8' }}>
                        1........................................................................<br />
                        2........................................................................<br />
                        3........................................................................<br />
                        4........................................................................
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* COLOR CODE FOOTER */}
              <div style={{ fontSize: '9px', marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: '48px', borderTop: '1px solid #000', paddingTop: '8px' }}>
                <div>
                  Color code<br />
                  <div style={{ marginLeft: '16px' }}>
                    &#10022; White paper = Orthodox tea Manufacture<br /><span style={{ marginLeft: '16px' }}>සුදු කඩදාසිය=පාරම්පරික තේ නිෂ්පාදනය</span><br />
                    &#10022; Green Paper = Green tea Manufacture<br /><span style={{ marginLeft: '16px' }}>කොළ කඩදාසිය=හරිත තේ</span>
                  </div>
                </div>
                <div>
                  <br />
                  <div style={{ marginLeft: '16px' }}>
                    &#10022; Blue paper = Orthodox + CT C or C. T. C Manufacture<br /><span style={{ marginLeft: '16px' }}>නිල් කඩදාසිය=පාරම්පරික සහ සී ටී සී නිෂ්පාදනය හෝ සී ටී සී නිෂ්පාදනය</span><br />
                    &#10022; Yellow Paper = Bio tea<br /><span style={{ marginLeft: '16px' }}>කහ කඩදාසිය=ජීව තේ</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ============================== PAGE 2 ============================== */}
          <div className="bg-white shadow-xl overflow-hidden mt-8 print:border-none print:shadow-none print:mt-0" style={{ width: '794px', height: '1223px' }}>
            <div id="tc5-page-2" className="tc5-paper h-full flex flex-col relative box-border">

              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '2px' }}>
                08. Details of disposals of made tea<br />
                <span style={{ fontSize: '10px', fontWeight: 'normal' }}>සකස් කළ තේ අපහරණය කිරීම පිළිබඳ විස්තරය</span>
              </div>

              {/* TABLE 8: DISPOSALS OF MADE TEA */}
              <table className="tc5-table tc5-table-first" style={{ textAlign: 'center', fontSize: '9px', height: '460px', marginBottom: '16px' }}>
                <thead className="bg-shade">
                  <tr>
                    <th className="tc5-th" style={{ width: '8%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Invoice<br />No</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>ඉන්වොයිස්<br />අංකය</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>1</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '6%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Grade</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>තේ<br />වර්ගය</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>2</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '12%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>For sale at colombo<br />auction</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>කොළඹ<br />වෙන්දේසියේ<br />විකිණීම සඳහා</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>3</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '9%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Private<br />sales<br />scheme</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>පුද්ගලික<br />විකිණීම<br />මත<br />විකිණීම<br />සඳහා</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>4</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '10%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Forward<br />contracts</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>මතු අදාල<br />ගිවිසුම් මත<br />විකිණීම සඳහා</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>5</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '8%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Ex<br />factory<br />sales</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>කර්මාන්ත<br />ශාලාවේදී<br />විකිණීම</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>6</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '10%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Exported<br />direct<br />in value<br />added form</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>එකතු කල<br />අගය සහිත<br />සෘජු<br />අපනයනය</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>7</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '10%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Gifts to<br />employee &<br />others</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>සේවකයන්ට<br />සහ වෙනත්<br />ප්‍රදානය<br />කිරීම්</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>8</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '14%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Tea<br />manufactured<br />for other estates<br />and returned</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>වෙනත් වතු වල<br />තේ දළු වලින්<br />නිපදවා ආපසු<br />භාරදුන් ප්‍රමාණය</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>9</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '7%', padding: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Direct<br />sales</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>සෘජු<br />විකිණීම්</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>10</strong></div>
                      </div>
                    </th>
                    <th className="tc5-th" style={{ width: '10%', padding: '4px', backgroundColor: '#f3f4f6' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '140px' }}>
                        <div style={{ textAlign: 'left', height: '55px' }}>Total</div>
                        <div style={{ textAlign: 'left', fontSize: '8px', flex: 1 }}>මුළු<br />එකතුව</div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}><strong>11</strong></div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paddedSec8.map((row, idx) => (
                    <tr key={idx} style={{ height: '20px' }}>
                      <td className="tc5-td" style={{ fontSize: '8px', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.invoiceNos}</td>
                      <td className="tc5-td-c" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{row.grade}</td>
                      <td className="tc5-td-c">{row.auction > 0 ? row.auction.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.private > 0 ? row.private.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.forward > 0 ? row.forward.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.exFactory > 0 ? row.exFactory.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.direct > 0 ? row.direct.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.gifts > 0 ? row.gifts.toFixed(1) : ''}</td>
                      <td className="tc5-td-c">{row.other > 0 ? row.other.toFixed(1) : ''}</td>
                      <td className="tc5-td-c"></td>
                      <td className="tc5-td-c bg-shade" style={{ fontWeight: 'bold' }}>{row.total > 0 ? row.total.toFixed(1) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* TABLE 9: DIRECT SALES */}
              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', marginTop: '-10px' }}>
                09. Direct sales - Sales made without the services of a broker<br />
                <span style={{ fontSize: '10px', fontWeight: 'normal' }}>සෘජු විකිණීම් - තැරැව්කරුවෙකුගේ සේවාවකින් තොරව විකිණෙන ලද සකස් කළ තේ</span>
              </div>

              <table className="tc5-table tc5-table-first" style={{ textAlign: 'left', fontSize: '10px', marginBottom: '0' }}>
                <thead>
                  <tr>
                    <th className="tc5-th" rowSpan="2" style={{ width: '13%', verticalAlign: 'top' }}>Garden marks<br /><br />වෙළඳ ලකුණ</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '11%', verticalAlign: 'top' }}>Invoice No<br /><br />ඉන්වොයිස්<br />අංකය</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '9%', verticalAlign: 'top' }}>Grade<br /><br />වර්ගය</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '21%', verticalAlign: 'top' }}>Name of buyers<br /><br />ගැණුම්කරුවන්ගේ<br />නම</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '10%', verticalAlign: 'top' }}>Date of sale<br /><br />විකුණුම්<br />දිනය</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '12%', verticalAlign: 'top' }}>Date of panel<br />approve<br />මණ්ඩල අනුමත<br />කළ දිනය</th>
                    <th className="tc5-th" colSpan="2" style={{ width: '12%', textAlign: 'center' }}>Price per Kg.<br />(Rs. Rs./Cts.)<br />මිල කිලෝ එකකට<br />(රු./ශත)</th>
                    <th className="tc5-th" rowSpan="2" style={{ width: '12%', verticalAlign: 'top' }}>Weight Kgs<br />බර කිලෝ</th>
                  </tr>
                  <tr>
                    <th className="tc5-th" style={{ width: '6%', textAlign: 'center', borderTop: 'none' }}>Rs. රු.</th>
                    <th className="tc5-th" style={{ width: '6%', textAlign: 'center', borderTop: 'none' }}>Cts. ශත</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="tc5-td" style={{ height: '24px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td></tr>
                  <tr><td className="tc5-td" style={{ height: '24px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td></tr>
                  <tr><td className="tc5-td" style={{ height: '24px' }}></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td><td className="tc5-td"></td></tr>
                  <tr>
                    <td className="tc5-td" colSpan="6" style={{ textAlign: 'right', paddingRight: '8px' }}>Total එකතුව</td>
                    <td className="tc5-td" colSpan="2"></td>
                    <td className="tc5-td"></td>
                  </tr>

                  {/* DECLARATIONS BOX (Embedded inside the table for perfect outer boundary) */}
                  <tr>
                    <td className="tc5-td" colSpan="9" style={{ padding: '12px 16px', borderBottom: '1px solid #000' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>I/We hereby declare that all the particulars furnished in this return are true and accurate.<br />මෙම වාර්තාවේ සපයා ඇති සියලු විස්තර සත්‍ය බවත් නිවැරදි බවත් මම / අපි මෙයින් ප්‍රකාශ කර සිටිමු / සිටිමි.</p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px', marginBottom: '8px', textAlign: 'center', fontSize: '11px' }}>
                        <div style={{ textAlign: 'left', width: '20%' }}>
                          Date :<br />දිනය
                        </div>
                        <div style={{ width: '50%' }}>
                          <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginBottom: '4px' }}></span><br />
                          Name of registered Manufacture / Superintendent<br />
                          ලි.ප නිෂ්පාදකයාගේ / අධිකාරීගේ නම
                        </div>
                        <div style={{ width: '25%' }}>
                          <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginBottom: '4px' }}></span><br />
                          Signature<br />
                          අත්සන
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="tc5-td" colSpan="9" style={{ padding: '12px 16px', borderBottom: '1px solid #000' }}>
                      <div style={{ fontSize: '11px' }}>
                        State if any special remarks<br />
                        විශේෂ විමර්ශන ඇත්නම් දක්වන්න
                        <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '100%', marginTop: '12px' }}></span>
                        <br /><br /><br />
                        Date :<br />
                        දිනය
                        <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '150px', marginLeft: '16px' }}></span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="tc5-td" colSpan="9" style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '10px' }}>
                        This return should be addressed to the assistant tea commissioner of your region on or before the fifth of the following month.<br />
                        මෙම වාර්තාව ඔබ ප්‍රදේශයේ සහකාර තේ කොමසාරිස් වෙත ඊළඟ මාසයේ 05 දිනට හෝ ඊට පෙර එවිය යුතුය.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}