import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  Calculator,
} from "lucide-react";
import PDFDownloader from "@/components/PDFDownloader";

// Comprehensive Color Mapping (Cleaned up for light mode only)
const getTeaColor = (product) => {
  const p = product.toLowerCase();

  // 1. Grade/Type strict matching
  if (p.includes("ff ex sp")) return "bg-red-50 text-red-800";
  if (p.includes("ff sp")) return "bg-orange-50 text-orange-900";
  if (p.includes("bopf sp")) return "bg-[#bef264] text-lime-900";
  if (p.includes("bopf")) return "bg-yellow-50 text-yellow-800";
  if (p.includes("fbop")) return "bg-amber-50 text-amber-800";
  if (p.includes("bop")) return "bg-lime-50 text-lime-800";
  if (p.includes("op1") || p.includes("op 1")) return "bg-sky-50 text-sky-800";
  if (p.includes("pekoe")) return "bg-emerald-50 text-emerald-800";
  if (p.includes("dust")) return "bg-cyan-50 text-cyan-800";

  // 2. Specialty/Flavor/Color matching
  if (p.includes("pink")) return "bg-pink-50 text-pink-800";
  if (p.includes("purple")) return "bg-purple-50 text-purple-800";
  if (p.includes("silver")) return "bg-slate-100 text-slate-800";
  if (p.includes("white")) return "bg-gray-100 text-gray-800";
  if (p.includes("golden") || p.includes("turmeric"))
    return "bg-yellow-100 text-yellow-900";
  if (p.includes("orange") || p.includes("cinnamon"))
    return "bg-orange-50 text-orange-800";
  if (p.includes("black") || p.includes("pepar"))
    return "bg-zinc-100 text-zinc-800";
  if (p.includes("lemangrass") || p.includes("green"))
    return "bg-green-50 text-green-800";
  if (p.includes("premium")) return "bg-rose-50 text-rose-800";
  if (p.includes("awrudu") || p.includes("awuru"))
    return "bg-fuchsia-50 text-fuchsia-800";
  if (p.includes("slim beauty")) return "bg-fuchsia-100 text-fuchsia-900";
  if (p.includes("masala")) return "bg-amber-100 text-amber-900";
  if (p.includes("chakra")) return "bg-indigo-50 text-indigo-800";
  if (p.includes("flower")) return "bg-violet-50 text-violet-800";
  if (p.includes("labour")) return "bg-stone-100 text-stone-800";
  if (p.includes("other purchasing")) return "bg-teal-50 text-teal-800";

  // Default fallback
  return "bg-white text-gray-800";
};

// PDF එක සඳහා RGB වර්ණ ලබා දෙන Function එක
const getPDFTeaStyles = (product) => {
  if (!product) return { fillColor: [255, 255, 255], textColor: [50, 50, 50] };
  const p = product.toLowerCase();

  // { fillColor: [Background RGB], textColor: [Text RGB] }
  if (p.includes("ff ex sp"))
    return { fillColor: [254, 226, 226], textColor: [153, 27, 27] }; // Red
  if (p.includes("ff sp"))
    return { fillColor: [255, 237, 213], textColor: [154, 52, 18] }; // Orange
  if (p.includes("bopf sp"))
    return { fillColor: [190, 242, 100], textColor: [54, 83, 20] }; // Lime Green
  if (p.includes("bopf"))
    return { fillColor: [254, 252, 232], textColor: [133, 77, 14] }; // Light Yellow
  if (p.includes("fbop"))
    return { fillColor: [254, 243, 199], textColor: [146, 64, 14] }; // Amber
  if (p.includes("bop"))
    return { fillColor: [236, 252, 203], textColor: [63, 98, 18] }; // Lime-100
  if (p.includes("op 1") || p.includes("op1"))
    return { fillColor: [240, 249, 255], textColor: [3, 105, 161] }; // Sky Blue
  if (p.includes("pekoe"))
    return { fillColor: [209, 250, 229], textColor: [6, 95, 70] }; // Emerald
  if (p.includes("dust"))
    return { fillColor: [236, 254, 255], textColor: [21, 94, 117] }; // Cyan/Light Blue
  if (p.includes("premium"))
    return { fillColor: [255, 241, 242], textColor: [159, 18, 57] }; // Light Pink
  if (p.includes("awrudu") || p.includes("awuru"))
    return { fillColor: [253, 244, 255], textColor: [134, 25, 143] }; // Light Purple
  if (p.includes("green tea") || p.includes("green"))
    return { fillColor: [240, 253, 244], textColor: [22, 101, 52] }; // Light Green
  if (p.includes("purple"))
    return { fillColor: [250, 232, 255], textColor: [107, 33, 168] }; // Purple
  if (p.includes("silver"))
    return { fillColor: [241, 245, 249], textColor: [30, 41, 59] }; // Silver/Gray

  // Default (පාටක් නැති ඒවට සුදු පසුබිම සහ කළු අකුරු)
  return { fillColor: [255, 255, 255], textColor: [50, 50, 50] };
};

// Map individual products to their summary categories
const getBaseCategory = (product) => {
  if (!product) return "Unknown";
  const p = product.trim().toLowerCase().replace(/\s+/g, " ");

  const bopf = [
    "lemongrass - bopf",
    "cinnamon tea - bopf",
    "ginger tea - bopf",
    "masala tea - bopf",
    "pineapple tea",
    "mix fruit",
    "peach",
    "strawberry",
    "jasmin - bopf",
    "mango tea",
    "carmel",
    "honey",
    "earl grey",
    "lime",
    "soursop - bopf",
    "cardamom",
    "gift pack",
    "guide issue-bopf",
  ];
  const bopfSp = [
    "english breakfast",
    "cinnamon tea - bopf sp",
    "ginger tea - bopf sp",
    "masala tea - bopf sp",
    "vanilla",
    "mint - bopf sp",
    "moringa - bopf sp",
    "curry leaves - bopf sp",
    "gotukola - bopf sp",
    "heen bovitiya - bopf sp",
    "black t/b",
    "english afternoon",
  ];
  const greenTea = [
    "lemongrass - green tea",
    "g/t lemangrass",
    "mint - green tea",
    "soursop - green tea",
    "moringa - green tea",
    "curry leaves - green tea",
    "heen bovitiya - green tea",
    "gotukola - green tea",
    "jasmin - green tea",
    "green tea t/b",
  ];
  const otherPurchasing = [
    "silver tips",
    "golden tips",
    "flower",
    "chakra",
    "green tea",
  ];
  const pekoe = ["pekoe", "rose tea"];
  const ff = ["ceylon premium - ff"];
  const op = ["op", "hibiscus"];
  const fbop = ["ceylon supreme"];

  const standaloneMap = {
    opa: "OPA",
    bop: "BOP",
    "bop pack": "BOP",
    "pink tea": "Pink Tea",
    "pink tea can": "Pink Tea",
    "pink tea pack": "Pink Tea",
    "op 1": "OP 1",
    "op1 pack": "OP 1",
    "ff ex sp": "FF EX SP",
    "ff ex sp pack": "FF EX SP",
    "ff ex sp box": "FF EX SP",
    "white tea": "White Tea",
    "white tea can": "White Tea",
    "purple tea": "Purple Tea",
    "purple tea can": "Purple Tea",
    "purple pack": "Purple Tea",
    "slim beauty": "Slim Beauty",
    "slim beauty can": "Slim Beauty",
    "vita glow": "Vita Glow",
    "silver green": "Silver Green",
    premium: "Premium",
    "ceylon premium": "FF",
    "black pepper": "Black Pepper",
    "black pepar": "Black Pepper",
    "cinnamon stick": "Cinnamon Stick",
    turmeric: "Turmeric",
  };

  if (bopf.includes(p)) return "BOPF";
  if (bopfSp.includes(p)) return "BOPF SP";
  if (greenTea.includes(p)) return "Green Tea";
  if (otherPurchasing.includes(p)) return "Other Purchasing";
  if (pekoe.includes(p)) return "Pekoe";
  if (ff.includes(p)) return "FF";
  if (op.includes(p)) return "OP";
  if (fbop.includes(p)) return "FBOP";
  if (standaloneMap[p]) return standaloneMap[p];

  return product.trim();
};

export default function ProductIssueSummary() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [tableData, setTableData] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    fetchAndCalculateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth]);

  const fetchAndCalculateData = async (isManualSync = false) => {
    setLoading(true);
    const toastId = isManualSync
      ? toast.loading("Syncing latest data...")
      : null;

    try {
      const token = localStorage.getItem("token");
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Guide Free removed as per request
      const [localRes, teaRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/local-sales`, { headers: authHeaders }),
        fetch(`${BACKEND_URL}/api/tea-center-issues`, { headers: authHeaders }),
      ]);

      const parseRes = async (res) => {
        if (res.status === "fulfilled" && res.value.ok)
          return await res.value.json();
        return [];
      };

      const localData = await parseRes(localRes);
      const teaData = await parseRes(teaRes);

      processDataForTable(localData, teaData, filterMonth);

      if (isManualSync)
        toast.success("Data synced successfully!", { id: toastId });
    } catch (error) {
      console.error("Aggregation Error:", error);
      if (isManualSync) toast.error("Could not sync data.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const processDataForTable = (localData, teaData, monthFilter) => {
    const inMonth = (dateString) =>
      dateString && dateString.startsWith(monthFilter);

    const extractItems = (records, sectionName, itemKey) => {
      let sectionMap = {};

      records.forEach((rec) => {
        const recDate = rec.date || rec.createdAt;
        if (inMonth(recDate)) {
          const items = rec[itemKey] || [];

          items.forEach((item) => {
            let finalProductName = item.product
              ? item.product.trim().toUpperCase()
              : "UNKNOWN";

            if (sectionName === "TEA CENTER") {
              finalProductName = getBaseCategory(item.product);
            } else if (sectionName === "LOCAL SALE") {
              // Local Sale එක සඳහා අලුත් Logic එක
              const pLower = item.product.trim().toLowerCase();
              if (pLower.includes("labour drinking tea")) {
                finalProductName = "BOPF"; // Labour Drinking Tea BOPF එකට යවයි
              } else if (pLower.includes("t/b")) {
                finalProductName = "BOPF SP"; // සියලුම T/B වර්ග BOPF SP එකට යවයි
              }
            }

            const qty = Number(item.totalQtyKg || item.qty || 0);
            if (qty > 0) {
              sectionMap[finalProductName] =
                (sectionMap[finalProductName] || 0) + qty;
            }
          });
        }
      });

      const products = Object.keys(sectionMap)
        .map((k) => ({
          product: k,
          qty: sectionMap[k],
        }))
        .sort((a, b) => b.qty - a.qty);

      const sectionTotal = products.reduce((sum, p) => sum + p.qty, 0);

      return { section: sectionName, products, sectionTotal };
    };

    const grouped = [
      extractItems(localData, "LOCAL SALE", "salesItems"),
      extractItems(teaData, "TEA CENTER", "issueItems"),
    ];

    setTableData(grouped);
    setGrandTotal(grouped.reduce((sum, sec) => sum + sec.sectionTotal, 0));
  };

  const getPdfData = () => {
    const rows = [];

    tableData.forEach((sec) => {
      if (sec.products.length > 0) {
        sec.products.forEach((prod, idx) => {
          const row = [];

          // ඒ ඒ product එකට අදාළ පාට ලබා ගැනීම
          const pdfStyles = getPDFTeaStyles(prod.product);

          // 1. Section Column
          if (idx === 0) {
            row.push({
              content: sec.section,
              styles: { valign: "top", fontStyle: "bold" },
            });
          } else {
            row.push(""); // පසුව එන පේළි සඳහා හිස් ඉඩක්
          }

          // 2. Product Column (පාට සහ අකුරු විලාසය මෙතනින් එකතු වේ)
          row.push({
            content: prod.product,
            styles: {
              fillColor: pdfStyles.fillColor,
              textColor: pdfStyles.textColor,
              fontStyle: "bold",
            },
          });

          // 3. QTY Column (එම පාටම මෙතැනටත් එකතු වේ)
          row.push({
            content: prod.qty % 1 !== 0 ? prod.qty.toFixed(2) : prod.qty,
            styles: {
              halign: "right",
              fillColor: pdfStyles.fillColor,
              textColor: pdfStyles.textColor,
              fontStyle: "bold",
            },
          });

          // 4. Total Column
          row.push("");

          rows.push(row);
        });
      } else {
        rows.push([
          { content: sec.section, styles: { fontStyle: "bold" } },
          "",
          "",
          "",
        ]);
      }

      // Sub Total Row
      rows.push([
        {
          content: "SUB TOTAL",
          colSpan: 2,
          styles: {
            fontStyle: "italic",
            halign: "left",
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
          },
        },
        {
          content:
            sec.sectionTotal % 1 !== 0
              ? sec.sectionTotal.toFixed(2)
              : sec.sectionTotal,
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
          },
        },
        {
          content:
            sec.sectionTotal % 1 !== 0
              ? sec.sectionTotal.toFixed(2)
              : sec.sectionTotal,
          styles: {
            fontStyle: "bold",
            halign: "right",
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
          },
        },
      ]);
    });

    // Grand Total Row
    rows.push([
      {
        content: "GRAND TOTAL",
        colSpan: 3,
        styles: {
          fontStyle: "bold",
          fontSize: 12,
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
        },
      },
      {
        content: grandTotal % 1 !== 0 ? grandTotal.toFixed(2) : grandTotal,
        styles: {
          fontStyle: "bold",
          fontSize: 12,
          halign: "right",
          fillColor: [230, 230, 230],
          textColor: [220, 38, 38],
        },
      }, 
    ]);

    return rows;
  };

  const pdfHeaders = ["SECTION", "PRODUCT", "QUT(KG)", "TOTAL"];

  const getMonthName = (yyyymm) => {
    const date = new Date(`${yyyymm}-01`);
    return date
      .toLocaleString("default", { month: "long", year: "numeric" })
      .toUpperCase();
  };

  const uniqueCode = `PIS/${getMonthName(filterMonth)}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto font-sans relative">
        {/* STICKY HEADER */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Calculator className="text-[#0f766e] w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold text-[#0f766e]">
                Product Issue Summary
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Monthly analysis and issuing calculations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-end items-center">
            <button
              onClick={() => fetchAndCalculateData(true)}
              disabled={loading}
              className="px-4 py-2 border border-green-500 text-green-700 bg-white rounded flex items-center gap-2 text-sm font-bold shadow-sm transition-colors hover:bg-green-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
              Sync Data
            </button>

            <PDFDownloader
              title={`PRODUCT ISSUE SUMMARY MONTH OF ${getMonthName(filterMonth)}`}
              headers={pdfHeaders}
              data={getPdfData()}
              uniqueCode={uniqueCode}
              fileName={`Product_Issue_Summary_${filterMonth}.pdf`}
              orientation="portrait"
              disabled={tableData.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2 transition-colors"
            />
          </div>
        </div>

        {/* FILTERS & CONTROLS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* SELECT REPORT MONTH CARD */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-[6px] border-l-blue-600 flex flex-col p-5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Select Report Month
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="flex-1 border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-gray-700"
              />
              <button
                onClick={() => fetchAndCalculateData(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Filter size={16} /> Load
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY BOARD TABLE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-12">
          {/* TABLE HEADER (DARK GREEN) */}
          <div className="bg-[#0f766e] px-6 py-4 flex items-center gap-2 text-white">
            <FileText size={20} />
            <h3 className="font-semibold text-lg tracking-wide">
              Product Issue Summary Board
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64 bg-white">
              <RefreshCw className="animate-spin text-[#0f766e] w-10 h-10" />
            </div>
          ) : (
            <div className="overflow-x-auto bg-white p-4">
              <table className="w-full text-sm text-left ">
                <thead>
                  <tr className="border-b-2 border-gray-500 uppercase">
                    <th className="p-3 text-gray-600 font-bold border-r border-gray-100 w-[20%] text-center">
                      Section
                    </th>
                    <th className="p-3 text-gray-600 font-bold border-r border-gray-100 w-[40%] text-center">
                      Product
                    </th>
                    <th className="p-3 text-blue-600 font-bold border-r border-gray-100 w-[20%] text-center">
                      Qut(KG)
                    </th>
                    <th className="p-3 text-red-600 font-bold w-[20%] text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? (
                    tableData.map((sectionData, sIdx) => {
                      const rowCount =
                        sectionData.products.length > 0
                          ? sectionData.products.length
                          : 1;
                      return (
                        <React.Fragment key={sIdx}>
                          {sectionData.products.length > 0 ? (
                            sectionData.products.map((prod, pIdx) => (
                              <tr
                                key={pIdx}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                {pIdx === 0 && (
                                  <td
                                    className="p-3 border-r border-gray-900 font-bold text-gray-700 uppercase align-top bg-gray-50/50"
                                    rowSpan={rowCount}
                                  >
                                    {sectionData.section}
                                  </td>
                                )}

                                <td
                                  className={`p-3 border-r border-gray-900 font-medium uppercase ${getTeaColor(prod.product)}`}
                                >
                                  {prod.product}
                                </td>
                                <td className="p-3 border-r border-gray-900 font-semibold text-center text-gray-700">
                                  {prod.qty % 1 !== 0
                                    ? prod.qty.toFixed(2)
                                    : prod.qty}
                                </td>

                                {pIdx === 0 && (
                                  <td
                                    className="p-3 align-top text-center font-medium"
                                    rowSpan={rowCount}
                                  >
                                    {/* Empty column matching design */}
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr className="border-b border-gray-100">
                              <td className="p-3 border-r border-gray-100 font-bold uppercase align-top bg-gray-50/50 text-gray-700">
                                {sectionData.section}
                              </td>
                              <td className="p-3 border-r border-gray-100"></td>
                              <td className="p-3 border-r border-gray-100"></td>
                              <td className="p-3"></td>
                            </tr>
                          )}

                          {/* SUB TOTAL ROW */}
                          <tr className="border-b-2 border-gray-900 bg-gray-50 font-bold text-gray-800">
                            <td
                              colSpan={2}
                              className="p-3 border-r border-gray-900 italic uppercase text-right"
                            >
                              SUB TOTAL
                            </td>
                            <td className="p-3 border-r border-gray-900 text-center text-blue-700">
                              {sectionData.sectionTotal % 1 !== 0
                                ? sectionData.sectionTotal.toFixed(2)
                                : sectionData.sectionTotal}
                            </td>
                            <td className="p-3 text-center text-red-700">
                              {sectionData.sectionTotal % 1 !== 0
                                ? sectionData.sectionTotal.toFixed(2)
                                : sectionData.sectionTotal}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-10 text-center text-gray-500 italic bg-gray-50"
                      >
                        No records found for the selected month.
                      </td>
                    </tr>
                  )}

                  {/* GRAND TOTAL ROW */}
                  {tableData.length > 0 && (
                    <tr className="bg-gray-200 font-bold text-lg text-gray-800">
                      <td
                        colSpan={3}
                        className="p-4 border-r border-gray-300 uppercase text-right tracking-wide"
                      >
                        GRAND TOTAL
                      </td>
                      <td className="p-4 text-center text-red-700">
                        {grandTotal % 1 !== 0
                          ? grandTotal.toFixed(2)
                          : grandTotal}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}