import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  PlusCircle,
  Trash2,
  ListChecks,
  Save,
  Package,
  ShoppingCart,
  Calendar,
  Weight,
  Tag,
  X,
  Calculator,
  AlertTriangle,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


// Exact Colors
const getTeaColor = (product) => {
  const p = product.toLowerCase();
  if (p === "bopf") return "bg-[#fde047] text-yellow-900 border-yellow-500";
  if (p.includes("bopf sp"))
    return "bg-[#bef264] text-lime-900 border-lime-500";
  if (p === "dust") return "bg-[#3b82f6] text-white border-blue-600";
  if (p === "dust 1") return "bg-[#06b6d4] text-white border-cyan-500";
  if (p.includes("premium")) return "bg-[#f472b6] text-white border-pink-500";
  if (p.includes("awuru")) return "bg-[#c084fc] text-white border-purple-500";
  if (p === "t/b 25") return "bg-[#ef4444] text-white border-red-600";
  if (p === "t/b 100") return "bg-[#78350f] text-white border-amber-900";
  if (p.includes("green"))
    return "bg-[#4ade80] text-green-900 border-green-600";
  if (p.includes("labour")) return "bg-gray-200 text-gray-800 border-gray-400";
  return "bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700";
};

// Material Color
const getMaterialColor = (material) => {
  const m = material?.toLowerCase() || "";
  if (m.includes("pouch"))
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/50";
  if (m.includes("box") || m.includes("carton"))
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/50";
  if (m.includes("label") || m.includes("tape"))
    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50";
  if (m.includes("paper") || m.includes("polybag"))
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/50";
  if (m.includes("thread") || m.includes("glue"))
    return "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50";
  return "bg-gray-100 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700";
};

const getPdfTeaColor = (product) => {
  const p = product.toLowerCase();
  if (p === "bopf")
    return { fillColor: [253, 224, 71], textColor: [113, 63, 18] };
  if (p.includes("bopf sp"))
    return { fillColor: [190, 242, 100], textColor: [77, 124, 15] };
  if (p === "dust")
    return { fillColor: [59, 130, 246], textColor: [255, 255, 255] };
  if (p === "dust 1")
    return { fillColor: [6, 182, 212], textColor: [255, 255, 255] };
  if (p.includes("premium"))
    return { fillColor: [244, 114, 182], textColor: [255, 255, 255] };
  if (p.includes("awuru"))
    return { fillColor: [192, 132, 252], textColor: [255, 255, 255] };
  if (p === "t/b 25")
    return { fillColor: [239, 68, 68], textColor: [255, 255, 255] };
  if (p === "t/b 100")
    return { fillColor: [120, 53, 15], textColor: [255, 255, 255] };
  if (p.includes("green"))
    return { fillColor: [74, 222, 128], textColor: [20, 83, 45] };
  if (p.includes("labour"))
    return { fillColor: [229, 231, 235], textColor: [31, 41, 55] };
  return { fillColor: [244, 244, 245], textColor: [31, 41, 55] };
};

const TEA_TYPES = [
  "BOPF",
  "BOPF SP",
  "OPA",
  "OP 1",
  "OP",
  "Pekoe",
  "BOP",
  "FBOP",
  "FF SP",
  "FF EX SP",
  "Dust",
  "Dust 1",
  "Premium",
  "Green tea",
  "Green tea bag (25)",
  "Pitigala tea bags",
  "Pitigala tea 400g",
  "Awurudu Special",
  "Labour drinking tea",
];

const getPackSizes = (product) => {
  if (!product) return null;
  const p = product.toLowerCase();
  if (p === "bopf") return ["0.4", "0.2", "0.1"];
  if (p.includes("bopf sp")) return ["0.4", "0.2"];
  if (p.includes("premium")) return ["0.4", "0.2"];
  if (p.includes("awuru")) return ["0.3"];
  if (p.includes("pitigala tea bags")) return ["0.025", "0.05", "0.1"];
  if (p.includes("green tea bag (25)") || p.includes("green tea bags"))
    return ["0.025"];
  if (p.includes("green tea")) return ["0.2"];
  return null;
};

// 👇 ADDED: Map specific products to their base tea grades for stock deduction
export const getBaseTeaGrade = (productName) => {
  if (!productName) return "";
  const p = productName.toLowerCase().trim();
  
  if (p === "awurudu special") return "BOPF SP";
  if (p === "labour drinking tea") return "BOPF";
  if (p === "pitigala tea bags") return "Black Tea T/B";
  if (p === "green tea bag (25)") return "Green Tea T/B";
  
  return productName;
};

export default function LocalRecordEntry() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingRecords, setPendingRecords] = useState([]);

  const [availableStock, setAvailableStock] = useState([]); // Tea Stock
  const [availablePackingStock, setAvailablePackingStock] = useState([]); // Raw Material (Packing) Stock

  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningMessages, setWarningMessages] = useState([]);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
  });

  const [itemsList, setItemsList] = useState([
    {
      id: Date.now(),
      product: "",
      packSizeKg: "",
      numberOfBoxes: "",
      packingMaterials: [],
    },
  ]);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);
  const dropdownRefs = useRef({});

  const activeOptionRef = useRef(null);

  useEffect(() => {
      if (activeOptionRef.current) {
          activeOptionRef.current.scrollIntoView({
              behavior: 'auto',
              block: 'nearest', 
          });
      }
  }, [focusedOptionIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      let isOutside = true;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target)) isOutside = false;
      });
      if (isOutside) setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const token = localStorage.getItem("token");

        const [teaRes, rmRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/packing-stock`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BACKEND_URL}/api/raw-materials-in/stock`, { // මෙතන URL එක /api/raw-materials නම් එය වෙනස් කරගන්න
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ ok: false })),
        ]);

        // 1. Fetch Tea Stock (UPDATED TO MATCH SUMMARY PAGE)
        if (teaRes.ok) {
          const teaData = await teaRes.json();
          const allTeas = Array.isArray(teaData.data || teaData) ? (teaData.data || teaData) : [];
          
          const overallTeaStock = [];
          
          allTeas.forEach((product) => {
            // Source එකෙන් නොබලා, කෙලින්ම Main Stock එක (totalBulkStockKg) ලබාගැනීම
            const validStock = Number(product.totalBulkStockKg) || Number(product.bulkStockKg) || 0;
            
            if (validStock > 0) {
              overallTeaStock.push({
                productName: product.productName || product.name,
                bulkStockKg: validStock,
              });
            }
          });

          // (විකල්ප) නම් අනුව පිළිවෙලට හැදීම
          overallTeaStock.sort((a, b) => a.productName.localeCompare(b.productName));
          
          setAvailableStock(overallTeaStock);
        }

        // 2. Fetch Packing Material Stock
        if (rmRes.ok) {
          const rmData = await rmRes.json();
          const allRawMaterials = Array.isArray(rmData.data || rmData)
            ? rmData.data || rmData
            : [];

          // Exclude flavors, keep only packing/other materials
          const packingOnly = allRawMaterials.filter(
            (rm) => (rm.category || "").toLowerCase() !== "flavor",
          );
          setAvailablePackingStock(packingOnly);
        }
      } catch (error) {
        console.error("Error fetching stock:", error);
      }
    };
    fetchStock();
  }, [BACKEND_URL]);

  const productSummaryMap = {};
  pendingRecords.forEach((record) => {
    record.items.forEach((item) => {
      if (!productSummaryMap[item.product]) productSummaryMap[item.product] = 0;
      productSummaryMap[item.product] += Number(item.calculatedQtyKg) || 0;
    });
  });
  const summaryArray = Object.entries(productSummaryMap).sort(
    (a, b) => b[1] - a[1],
  );
  const grandPendingQty = summaryArray.reduce((sum, [_, qty]) => sum + qty, 0);

  const totalAvailableStock = availableStock.reduce(
    (sum, item) => sum + (item.bulkStockKg || 0),
    0,
  );
  const totalAvailablePackingCapacity = availablePackingStock.reduce(
    (sum, item) => sum + (item.totalQuantity || 0),
    0,
  );

  // --- ITEM ROW HANDLERS ---
  const handleAddItemRow = () => {
    setItemsList([
      ...itemsList,
      {
        id: Date.now(),
        product: "",
        packSizeKg: "",
        numberOfBoxes: "",
        packingMaterials: [],
      },
    ]);
  };

  const handleRemoveItemRow = (idToRemove) => {
    if (itemsList.length === 1) return;
    setItemsList(itemsList.filter((row) => row.id !== idToRemove));
  };

  const handleItemChange = (id, field, value) => {
    if (
      field !== "product" &&
      value !== "" &&
      (Number(value) < 0 || value.includes("-"))
    )
      return;

    setItemsList(
      itemsList.map((row) => {
        if (row.id === id) {
          if (field === "product") {
            const availableSizes = getPackSizes(value);
            if (availableSizes && !availableSizes.includes(row.packSizeKg)) {
              return { ...row, [field]: value, packSizeKg: "" };
            }
          }
          return { ...row, [field]: value };
        }
        return row;
      }),
    );
  };

  // --- PACKING MATERIAL HANDLERS ---
  const handleAddPackingMaterial = (rowId) => {
    setItemsList(
      itemsList.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            packingMaterials: [
              ...(row.packingMaterials || []),
              { name: "", qty: "" },
            ],
          };
        }
        return row;
      }),
    );
  };

  const handleRemovePackingMaterial = (rowId, pmIndex) => {
    setItemsList(
      itemsList.map((row) => {
        if (row.id === rowId) {
          const updatedMats = [...row.packingMaterials];
          updatedMats.splice(pmIndex, 1);
          return { ...row, packingMaterials: updatedMats };
        }
        return row;
      }),
    );
  };

  const handlePackingMaterialChange = (rowId, pmIndex, field, value) => {
    if (
      field === "qty" &&
      value !== "" &&
      (Number(value) < 0 || value.includes("-"))
    )
      return;
    setItemsList(
      itemsList.map((row) => {
        if (row.id === rowId) {
          const updatedMats = [...row.packingMaterials];
          updatedMats[pmIndex] = { ...updatedMats[pmIndex], [field]: value };
          return { ...row, packingMaterials: updatedMats };
        }
        return row;
      }),
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const totalBoxes = itemsList.reduce(
    (sum, row) => sum + (Number(row.numberOfBoxes) || 0),
    0,
  );
  const totalQtyKg = itemsList.reduce((sum, row) => {
    const pack = Number(row.packSizeKg) || 0;
    const boxes = Number(row.numberOfBoxes) || 0;
    return sum + pack * boxes;
  }, 0);

  const handleAddToList = (e) => {
    e.preventDefault();
    const hasEmptyItem = itemsList.some(
      (row) =>
        !row.product || row.packSizeKg === "" || row.numberOfBoxes === "",
    );
    if (hasEmptyItem) {
      toast.error(
        "Please fill out all Product, Pack Size, and Box details completely!",
      );
      return;
    }

    const newRecord = {
      date: formData.date,
      items: itemsList.map((item) => ({
        ...item,
        calculatedQtyKg: (
          Number(item.packSizeKg) * Number(item.numberOfBoxes)
        ).toFixed(2),
        packingMaterials: item.packingMaterials
          ? item.packingMaterials.filter((pm) => pm.name && Number(pm.qty) > 0)
          : [],
      })),
      totalBoxes,
      totalQtyKg,
    };
    setPendingRecords([...pendingRecords, newRecord]);
    toast.success(`Record added to list!`);
    setItemsList([
      {
        id: Date.now(),
        product: "",
        packSizeKg: "",
        numberOfBoxes: "",
        packingMaterials: [],
      },
    ]);
  };

  const handleRemoveFromList = (indexToRemove) => {
    const updatedList = pendingRecords.filter(
      (_, index) => index !== indexToRemove,
    );
    setPendingRecords(updatedList);
  };

  const handleSaveAll = async () => {
    if (pendingRecords.length === 0) {
      toast.error("No records in the list to save!");
      return;
    }

    // WARNING LOGIC
    let stockWarning = false;
    let packingStockWarning = false;
    const requestedPacking = {};
    const requestedByBaseGrade = {}; 

    pendingRecords.forEach((record) => {
      record.items.forEach((item) => {
        // Group tea usage by base grade
        const baseGrade = getBaseTeaGrade(item.product);
        if (!requestedByBaseGrade[baseGrade]) {
            requestedByBaseGrade[baseGrade] = 0;
        }
        requestedByBaseGrade[baseGrade] += Number(item.calculatedQtyKg);

        // Sum requested packing materials
        if (item.packingMaterials && item.packingMaterials.length > 0) {
          item.packingMaterials.forEach((pm) => {
            if (pm.name && Number(pm.qty) > 0) {
              if (!requestedPacking[pm.name]) requestedPacking[pm.name] = 0;
              requestedPacking[pm.name] += Number(pm.qty);
            }
          });
        }
      });
    });

    // Check tea capacity against available stock using baseGrade
    for (const [baseGrade, requestedQty] of Object.entries(requestedByBaseGrade)) {
        const stockData = availableStock.find(
          (s) => s.productName?.toLowerCase() === baseGrade.toLowerCase()
        );
        const available = stockData ? stockData.bulkStockKg : 0;
        if (requestedQty > available) stockWarning = true;
    }

    // Check packing materials capacity
    for (const [pmName, requestedQty] of Object.entries(requestedPacking)) {
      const pmStockData = availablePackingStock.find(
        (s) => s.materialName === pmName,
      );
      const available = pmStockData ? pmStockData.totalQuantity : 0;
      if (requestedQty > available) packingStockWarning = true;
    }

    // 👇 මෙතනින් තමයි bypass කරන එක block කරලා තියෙන්නේ 👇
    if (stockWarning) {
        toast.error("Cannot save! You are issuing MORE tea stock than what is available.");
        return; 
    }
    if (packingStockWarning) {
        toast.error("Cannot save! You are issuing MORE packing materials than available.");
        return; 
    }

    setShowSpinner(true);
    const toastId = toast.loading(`Saving ${pendingRecords.length} records...`);

    try {
      const token = localStorage.getItem("token");
      const promises = pendingRecords.map((record) => {
        const payload = {
          date: record.date,
          totalBoxes: record.totalBoxes,
          totalQtyKg: record.totalQtyKg,
          salesItems: record.items.map((item) => ({
              product: item.product,
              baseTeaGrade: getBaseTeaGrade(item.product),
              packSizeKg: Number(item.packSizeKg),
              numberOfBoxes: Number(item.numberOfBoxes),
              totalQtyKg: Number(item.calculatedQtyKg),
              baseTeaQtyKg: Number(item.calculatedQtyKg), // Fix for NaN issue
              rawMaterialName: item.rawMaterialName || "",
              rawMaterialQtyKg: Number(item.rawMaterialQtyKg || 0),
              packingMaterials: item.packingMaterials || [],
          })),
        };

        return fetch(`${BACKEND_URL}/api/local-sales`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            if (res.status === 403) throw new Error("Access Denied");
            // Backend එකෙන් එවන error message එක අල්ලගැනීම
            throw new Error(errorData.message || "Failed"); 
          }
          return res.json();
        });
      });

      await Promise.all(promises);
      toast.success("All local sales saved successfully!", { id: toastId });
      setPendingRecords([]);

      setTimeout(() => {
        navigate("/packing/local-record-view");
      }, 1000);
    } catch (error) {
      console.error(error);
      if (error.message === "Access Denied") {
        toast.error("Access Denied. You do not have permission to add records.", { id: toastId });
      } else {
        // Backend එකෙන් එන නිවැරදි හේතුව පෙන්වීම
        toast.error(error.message !== "Failed" ? error.message : "Error saving records. Please check stock.", { id: toastId });
      }
    } finally {
      setShowSpinner(false);
    }
  };

  const handleKeyDown = (e, rowId, filteredOptions) => {
    if (!openDropdownId || filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedOptionIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedOptionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && focusedOptionIndex >= 0) {
      e.preventDefault();
      handleItemChange(rowId, "product", filteredOptions[focusedOptionIndex]);
      setOpenDropdownId(null);
      setFocusedOptionIndex(-1);
    } else if (e.key === "Escape") {
      setOpenDropdownId(null);
      setFocusedOptionIndex(-1);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto font-sans bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 min-h-screen">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#0f766e] dark:text-teal-400">
            Local Sale Record Entry
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Issue record for daily local product sales
          </p>
        </div>
      </div>

      {/* --- AVAILABLE STOCKS (2 COLUMN GRID) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 1. TEA STOCK CONTAINER */}
        <div className="rounded-2xl shadow-sm border border-teal-200 dark:border-teal-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
          <div className="bg-[#2f7466] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Calculator size={20} /> Current Tea Stock
              </h3>
              <p className="text-white/80 text-xs mt-1">
                Factory & Other bulk stock
              </p>
            </div>
            <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
              Total: {totalAvailableStock.toFixed(2)} KG
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
            {availableStock.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">
                No tea stock available.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {availableStock.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 min-w-[120px] shadow-sm bg-gray-50 dark:bg-zinc-800"
                  >
                    <h4
                      className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate max-w-[120px]"
                      title={item.productName}
                    >
                      {item.productName}
                    </h4>
                    <div className="text-lg font-black text-[#0d9488] dark:text-teal-400">
                      {Number(item.bulkStockKg).toFixed(2)}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. PACKING MATERIALS STOCK CONTAINER */}
        <div className="rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
          <div className="bg-amber-600 dark:bg-amber-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Package size={20} /> Packing Materials Stock
              </h3>
              <p className="text-white/80 text-xs mt-1">
                Available packaging inventory
              </p>
            </div>
            <div className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 whitespace-nowrap">
              Total: {totalAvailablePackingCapacity.toFixed(2)} Items
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
            {availablePackingStock.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">
                No packing material stock available.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {availablePackingStock.map((rm, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 min-w-[120px] shadow-sm bg-white dark:bg-zinc-950 ${getMaterialColor(rm.materialName).replace("bg-", "border-").split(" ")[2]}`}
                  >
                    <h4
                      className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate max-w-[130px]"
                      title={rm.materialName}
                    >
                      {rm.materialName}
                    </h4>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-500">
                      {Number(rm.totalQuantity).toFixed(2)}{" "}
                      <span className="text-xs font-semibold text-gray-500">
                        {rm.unit || ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* --- LEFT SIDE: DATA ENTRY FORM --- */}
        <div className="lg:col-span-3">
          <form
            onSubmit={handleAddToList}
            className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-lg border border-teal-100 dark:border-zinc-800 transition-colors duration-300"
          >
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-[#0d9488]" /> Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full md:w-1/2 p-3 border border-gray-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
              />
            </div>

            <div className="mb-8 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 transition-colors duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#0f766e] dark:text-teal-500 flex items-center gap-2">
                  <ShoppingCart size={20} /> Products Issued
                </h3>
              </div>

              <div className="space-y-6">
                {itemsList.map((row) => {
                  const availableSizes = getPackSizes(row.product);

                  // 👇 Find stock based on base grade mapping
                  const baseGrade = getBaseTeaGrade(row.product);
                  const stockData = availableStock.find(
                    (s) => s.productName?.toLowerCase() === baseGrade.toLowerCase(),
                  );
                  const availableForProduct = stockData
                    ? stockData.bulkStockKg
                    : 0;

                  // 👇 Calculate accumulated usage per base grade
                  const totalIssuedForProductSoFar = itemsList.reduce(
                    (sum, currentItem) => {
                      if (getBaseTeaGrade(currentItem.product).toLowerCase() === baseGrade.toLowerCase()) {
                        return (
                          sum +
                          (Number(currentItem.packSizeKg) *
                            Number(currentItem.numberOfBoxes) || 0)
                        );
                      }
                      return sum;
                    },
                    0,
                  );

                  const issuedNum =
                    Number(row.packSizeKg) * Number(row.numberOfBoxes) || 0;
                  const isOverCapacity =
                    row.product &&
                    totalIssuedForProductSoFar > availableForProduct;
                  const remaining = Math.max(
                    0,
                    availableForProduct - totalIssuedForProductSoFar,
                  );

                  return (
                    <div
                      key={row.id}
                      className={`relative bg-white dark:bg-zinc-950 p-4 rounded-xl border transition-colors shadow-sm ${isOverCapacity ? "border-amber-400 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10" : "border-teal-100 dark:border-teal-900/40"}`}
                    >
                      {itemsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(row.id)}
                          className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full p-1.5 transition-colors shadow-sm z-10"
                        >
                          <X size={14} />
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Custom Product Autocomplete Input */}
                        <div
                          className="lg:col-span-1 relative"
                          ref={(el) =>
                            (dropdownRefs.current[`product-${row.id}`] = el)
                          }
                        >
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase flex items-center gap-1">
                            <Tag
                              size={12}
                              className={
                                isOverCapacity
                                  ? "text-amber-500"
                                  : "text-[#0d9488] dark:text-teal-400"
                              }
                            />{" "}
                            Product
                          </label>

                          <input
                            type="text"
                            placeholder="Select..."
                            value={row.product}
                            onChange={(e) => {
                              handleItemChange(
                                row.id,
                                "product",
                                e.target.value,
                              );
                              setFocusedOptionIndex(-1); // Type කරන විට focus එක reset කිරීම
                            }}
                            onFocus={() => {
                              setOpenDropdownId(`product-${row.id}`);
                              setFocusedOptionIndex(-1);
                            }}
                            onKeyDown={(e) => {
                              const filteredOptions = TEA_TYPES.filter((tea) =>
                                tea
                                  .toLowerCase()
                                  .includes(row.product.toLowerCase()),
                              );
                              handleKeyDown(e, row.id, filteredOptions);
                            }}
                            required
                            className={`w-full p-2.5 h-[42px] border rounded-md text-sm focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none transition-colors ${row.product ? getTeaColor(row.product) : "bg-white dark:bg-zinc-950 dark:text-gray-100"} ${isOverCapacity ? "border-amber-300" : "border-teal-200 dark:border-teal-800/50"}`}
                          />

                          {/* Dropdown Menu */}
                          {openDropdownId === `product-${row.id}` && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[220px] custom-scrollbar z-20">
                              {TEA_TYPES.filter((tea) =>
                                tea
                                  .toLowerCase()
                                  .includes(row.product.toLowerCase()),
                              ).map((tea, idx) => {
                                const isFocused = focusedOptionIndex === idx;

                                return (
                                  <li
                                    key={idx}
                                    ref={isFocused ? activeOptionRef : null}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      handleItemChange(row.id, "product", tea);
                                      setOpenDropdownId(null);
                                      setFocusedOptionIndex(-1);
                                    }}
                                    onMouseEnter={() =>
                                      setFocusedOptionIndex(idx)
                                    } // Mouse එක ගෙනගිය විට focus වීම
                                    className={`px-4 py-2 text-sm cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex items-center gap-2 transition-colors
                                ${
                                  isFocused
                                    ? "bg-[#ccfbf1] dark:bg-teal-900/60 text-[#0f766e] dark:text-teal-300 font-bold"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30"
                                }`}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded-full ${getTeaColor(tea).split(" ")[0]} border border-white/20`}
                                    ></div>
                                    {tea}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        {/* Dynamic Pack Size Input */}
                        <div
                          className="lg:col-span-1 relative"
                          ref={(el) =>
                            (dropdownRefs.current[`size-${row.id}`] = el)
                          }
                        >
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                            Pack Size (Kg)
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.packSizeKg}
                            onChange={(e) =>
                              handleItemChange(
                                row.id,
                                "packSizeKg",
                                e.target.value,
                              )
                            }
                            onFocus={() => {
                              if (availableSizes)
                                setOpenDropdownId(`size-${row.id}`);
                            }}
                            onWheel={(e) => e.target.blur()}
                            required
                            placeholder="e.g. 0.4"
                            className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 rounded-md text-sm focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                          />

                          {openDropdownId === `size-${row.id}` &&
                            availableSizes && (
                              <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden">
                                {availableSizes.map((size, idx) => (
                                  <li
                                    key={idx}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      handleItemChange(
                                        row.id,
                                        "packSizeKg",
                                        size,
                                      );
                                      setOpenDropdownId(null);
                                    }}
                                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0"
                                  >
                                    {size} kg
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>

                        {/* Number of Boxes Input */}
                        <div className="lg:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                            No. of Box/Packs
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={row.numberOfBoxes}
                            onChange={(e) =>
                              handleItemChange(
                                row.id,
                                "numberOfBoxes",
                                e.target.value,
                              )
                            }
                            onWheel={(e) => e.target.blur()}
                            required
                            placeholder="e.g. 50"
                            className="w-full p-2.5 h-[42px] border border-teal-200 dark:border-teal-800/50 text-sm rounded-md focus:ring-2 focus:ring-[#2dd4bf]/50 outline-none bg-white dark:bg-zinc-950 dark:text-gray-100 transition-colors"
                          />
                        </div>

                        {/* Auto-Calculated Total Qty */}
                        <div className="lg:col-span-1">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase flex items-center justify-between gap-1">
                            <span>
                              Qty (Kg){" "}
                              <Weight
                                size={12}
                                className={
                                  isOverCapacity
                                    ? "text-amber-500 inline"
                                    : "text-[#0d9488] dark:text-teal-400 inline"
                                }
                              />
                            </span>
                          </label>
                          <div
                            className={`w-full p-2.5 border font-bold text-sm rounded-md text-center transition-colors ${isOverCapacity ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "border-teal-300 dark:border-teal-700/50 bg-[#f0fdfa] dark:bg-teal-900/30 text-[#0f766e] dark:text-teal-400"}`}
                          >
                            {Number(row.packSizeKg) *
                              Number(row.numberOfBoxes) >
                            0
                              ? (
                                  Number(row.packSizeKg) *
                                  Number(row.numberOfBoxes)
                                ).toFixed(2)
                              : "0.00"}
                          </div>
                          {row.product && (
                              <span className="text-[10px] font-bold text-gray-400">
                                Avail {baseGrade}:{" "}
                                <span className="text-gray-700 dark:text-gray-300">
                                  {availableForProduct.toFixed(2)}
                                </span>
                              </span>
                            )}
                        </div>
                      </div>

                      {/* Stock Warning Messages */}
                      {isOverCapacity && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 justify-end">
                          <AlertTriangle size={12} /> Exceeds total tea stock by{" "}
                          {(
                            totalIssuedForProductSoFar - availableForProduct
                          ).toFixed(2)}{" "}
                          kg!
                        </div>
                      )}

                      {/* --- PACKING MATERIALS SUB-SECTION --- */}
                      <div className="pt-4 mt-3 border-t border-gray-100 dark:border-zinc-800/50">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase flex items-center gap-1">
                            <Layers size={12} /> Packing Materials (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddPackingMaterial(row.id)}
                            className="text-[10px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded flex items-center gap-1 transition-colors font-bold shadow-sm"
                          >
                            <PlusCircle size={12} /> Add Material
                          </button>
                        </div>

                        {row.packingMaterials &&
                          row.packingMaterials.map((pm, pmIdx) => {
                            const pmStockData = availablePackingStock.find(
                              (s) => s.materialName === pm.name,
                            );
                            const availablePM = pmStockData
                              ? pmStockData.totalQuantity
                              : 0;
                            const isPMOverCapacity =
                              pm.name && Number(pm.qty) > availablePM;

                            return (
                              <div
                                key={pmIdx}
                                className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3 items-end bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 relative"
                              >
                                <div
                                  className="md:col-span-7 relative"
                                  ref={(el) =>
                                    (dropdownRefs.current[
                                      `packingName-${row.id}-${pmIdx}`
                                    ] = el)
                                  }
                                >
                                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                                    Material Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Select from available stock..."
                                    value={pm.name}
                                    onChange={(e) =>
                                      handlePackingMaterialChange(
                                        row.id,
                                        pmIdx,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                    onFocus={() =>
                                      setOpenDropdownId(
                                        `packingName-${row.id}-${pmIdx}`,
                                      )
                                    }
                                    className={`w-full p-2 h-[38px] border rounded-md text-sm outline-none transition-colors ${isPMOverCapacity ? "border-amber-400 focus:ring-2 focus:ring-amber-500/50 bg-white dark:bg-zinc-950" : "bg-white dark:bg-zinc-950 dark:text-gray-100 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#2dd4bf]/50"}`}
                                  />

                                  {openDropdownId ===
                                    `packingName-${row.id}-${pmIdx}` && (
                                    <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-xl z-50 overflow-y-auto max-h-[200px] custom-scrollbar z-20">
                                      {availablePackingStock
                                        .filter(
                                          (rm) =>
                                            rm.totalQuantity > 0 &&
                                            rm.materialName
                                              .toLowerCase()
                                              .includes(
                                                (pm.name || "").toLowerCase(),
                                              ),
                                        )
                                        .map((rm, idx) => (
                                          <li
                                            key={idx}
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={() => {
                                              handlePackingMaterialChange(
                                                row.id,
                                                pmIdx,
                                                "name",
                                                rm.materialName,
                                              );
                                              setOpenDropdownId(null);
                                            }}
                                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f0fdfa] dark:hover:bg-teal-900/30 cursor-pointer border-b border-gray-100 dark:border-zinc-700/50 last:border-0 flex justify-between items-center"
                                          >
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMaterialColor(rm.materialName).replace("bg-", "border-")}`}
                                            >
                                              {rm.materialName}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-semibold">
                                              {rm.totalQuantity} avail
                                            </span>
                                          </li>
                                        ))}
                                      {availablePackingStock.filter(
                                        (rm) =>
                                          rm.totalQuantity > 0 &&
                                          rm.materialName
                                            .toLowerCase()
                                            .includes(
                                              (pm.name || "").toLowerCase(),
                                            ),
                                      ).length === 0 && (
                                        <li className="px-4 py-2 text-xs text-red-500 italic">
                                          No available stock matches.
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                </div>

                                <div className="md:col-span-4">
                                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">
                                    Qty
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={pm.qty}
                                    onChange={(e) =>
                                      handlePackingMaterialChange(
                                        row.id,
                                        pmIdx,
                                        "qty",
                                        e.target.value,
                                      )
                                    }
                                    onWheel={(e) => e.target.blur()}
                                    placeholder="Qty..."
                                    className={`w-full p-2 h-[38px] border text-sm rounded-md outline-none transition-colors ${isPMOverCapacity ? "border-amber-400 focus:ring-2 focus:ring-amber-500/50 bg-white dark:bg-zinc-950" : "bg-white dark:bg-zinc-950 dark:text-gray-100 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-[#2dd4bf]/50"}`}
                                  />
                                </div>

                                <div className="md:col-span-1 flex justify-center mb-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemovePackingMaterial(row.id, pmIdx)
                                    }
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Remove Material"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end w-full">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="mt-4 text-sm font-bold bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-800/60 text-[#0f766e] dark:text-teal-400 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto"
                >
                  <PlusCircle size={16} /> Add Product
                </button>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 border-t border-teal-200/50 dark:border-teal-800/30 pt-4">
                <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300">
                  Total Items: <span className="font-bold">{totalBoxes}</span>
                </div>
                <div className="text-sm font-medium text-[#0f766e] dark:text-teal-300 flex items-center gap-1">
                  <Package size={16} /> Total Weight:{" "}
                  <span className="font-bold text-lg">
                    {totalQtyKg.toFixed(2)} Kg
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl text-[#0f766e] dark:text-teal-400 bg-[#f0fdfa] dark:bg-teal-900/30 border border-[#0d9488] dark:border-teal-700 font-bold flex justify-center items-center gap-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all"
            >
              <PlusCircle size={20} /> Add Daily Record to List
            </button>
          </form>
        </div>

        {/* --- RIGHT SIDE: PENDING LIST & SUMMARY --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-teal-100 dark:border-teal-900/50 flex flex-col max-h-[60vh] transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg text-[#0f766e] dark:text-teal-400">
                  <ListChecks size={20} />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                  Pending Records
                </h3>
              </div>
              <span className="bg-teal-100 dark:bg-teal-900/40 text-[#0f766e] dark:text-teal-400 text-xs font-bold px-3 py-1 rounded-full">
                {pendingRecords.length} Items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[150px]">
              {pendingRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8">
                  <ListChecks size={32} className="mb-2 opacity-20" />
                  <p className="text-sm font-medium">List is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRecords.map((record, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative group hover:border-[#2dd4bf] dark:hover:border-teal-800 transition-colors"
                    >
                      <button
                        onClick={() => handleRemoveFromList(index)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 bg-white dark:bg-zinc-900 p-1.5 rounded-md shadow-sm border border-gray-100 dark:border-zinc-700 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="flex flex-col gap-2 pr-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-gray-800 dark:text-gray-200 text-lg">
                            {record.date}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-gray-100 dark:border-zinc-700/50 text-xs mt-1">
                          <div className="space-y-2 mb-2 pb-2 border-b border-gray-100 dark:border-zinc-800">
                            {record.items.map((item, i) => (
                              <div
                                key={i}
                                className="flex flex-col gap-1 pb-1 border-b border-gray-50 dark:border-zinc-800/50 last:border-0 last:pb-0"
                              >
                                <div className="flex justify-between items-center text-[11px]">
                                  <span
                                    className={`font-bold border px-2 py-0.5 rounded shadow-sm text-[10px] w-fit ${getTeaColor(item.product)}`}
                                  >
                                    {item.product}
                                  </span>
                                  <div className="flex items-center gap-3 text-gray-500">
                                    <span>
                                      {item.numberOfBoxes} x {item.packSizeKg}kg
                                    </span>
                                    <span className="font-bold text-[#0d9488] w-12 text-right">
                                      {item.calculatedQtyKg} kg
                                    </span>
                                  </div>
                                </div>
                                {item.packingMaterials &&
                                  item.packingMaterials.length > 0 && (
                                    <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                      {item.packingMaterials.map(
                                        (pm, pmIdx) => (
                                          <span
                                            key={pmIdx}
                                            className="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-500 font-medium"
                                          >
                                            {pm.name}: {pm.qty}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center font-bold mt-2">
                            <span className="text-gray-500 uppercase text-[10px]">
                              Daily Totals:
                            </span>
                            <div className="flex gap-4">
                              <span className="text-gray-600 dark:text-gray-300">
                                {record.totalBoxes} Items
                              </span>
                              <span className="text-[#0f766e] dark:text-teal-400">
                                {record.totalQtyKg.toFixed(2)} Kg
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
              <button
                onClick={handleSaveAll}
                disabled={showSpinner || pendingRecords.length === 0}
                className={`w-full py-4 rounded-xl text-white text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${showSpinner || pendingRecords.length === 0 ? "bg-gray-400 dark:bg-zinc-700 cursor-not-allowed" : "bg-gradient-to-r from-[#0f766e] to-[#34d399] hover:shadow-[#0d9488]/40 hover:-translate-y-1"}`}
              >
                <Save size={20} /> {showSpinner ? "Saving..." : `Save All`}
              </button>
            </div>
          </div>

          {pendingRecords.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col">
              <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Weight size={18} className="text-[#0d9488]" /> Pending
                  Summary By Product
                </h3>
              </div>
              <div className="p-4 overflow-y-auto max-h-[30vh] custom-scrollbar">
                <table className="w-full text-sm border border-gray-300 dark:border-zinc-700 border-collapse">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-zinc-800 border-b border-gray-300 dark:border-zinc-700">
                      <th className="px-3 py-2 text-left font-bold border-r border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-gray-200">
                        Product
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200">
                        Qty (KG)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryArray.map(([prodName, qty], idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-300 dark:border-zinc-700"
                      >
                        <td
                          className={`px-3 py-2 font-semibold border-r border-gray-300 dark:border-zinc-700 ${getTeaColor(prodName)}`}
                        >
                          {prodName}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                          {qty % 1 !== 0 ? qty.toFixed(2) : qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 dark:bg-zinc-800 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-400 dark:border-zinc-600">
                      <td className="px-3 py-2 uppercase border-r border-gray-300 dark:border-zinc-700">
                        PENDING TOTAL
                      </td>
                      <td className="px-3 py-2 text-right text-[#0f766e] dark:text-teal-400">
                        {grandPendingQty % 1 !== 0
                          ? grandPendingQty.toFixed(2)
                          : grandPendingQty}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- STOCK WARNING DIALOG --- */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 rounded-2xl border-gray-100 dark:border-zinc-800 shadow-xl max-w-sm sm:max-w-md w-[90vw]">
          <AlertDialogHeader>
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 sm:mb-4 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Stock Limit Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              You are issuing MORE stock than what is currently available for:
              <ul className="list-disc pl-5 mt-3 mb-4 space-y-1 font-semibold text-gray-700 dark:text-gray-300">
                {warningMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
              Please adjust the quantities before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:mt-6 flex justify-end w-full">
            <AlertDialogCancel onClick={() => setShowWarningDialog(false)} className="bg-red-600 hover:bg-red-700 text-white border-none px-6 w-full">
              Close & Fix
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}