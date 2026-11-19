import mongoose from "mongoose";
import LocalSale from "../models/LocalSaleModel.js";
import PackingStock from "../models/PackingStock.js";
import RawMaterialStock from "../models/RawMaterialStock.js";
import { escapeRegex } from "../../utils/sanitize.js";
import { paginate } from "../../utils/paginate.js";

// --- UPDATED LOGIC: BASE TEA MAPPING ---
const getBaseTeaGrade = (productName) => {
  if (!productName) return "";
  const p = productName.toLowerCase().trim();

  const bopf = [
    "lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", 
    "masala tea - bopf", "pineapple tea", "mix fruit", "peach", 
    "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", 
    "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", 
    "guide issue-bopf",
  ];
  const bopfSp = [
    "english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", 
    "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", 
    "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", 
    "black t/b", "english afternoon", "awurudu special",
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
    "silver tips": "Silver Tips",
    "golden tips": "Golden Tips",
    flower: "Flower",
    chakra: "Chakra",
    dust: "Dust",           // Added DUST mapping
    "dust 1": "Dust 1"      // Added DUST 1 mapping
  };

  if (p === "pitigala tea bags") return "Black Tea T/B";
  if (p === "pitigala tea 400g") return "BOPF SP";
  if (p === "green tea bag (25)") return "Green Tea T/B";
  if (p.includes("labour")) return "BOPF";
  if (p.includes("awurudu special")) return "BOPF SP";
  if (p.includes("green tea")) return "Green Tea";

  if (bopf.includes(p)) return "BOPF";
  if (bopfSp.includes(p)) return "BOPF SP";
  if (pekoe.includes(p)) return "Pekoe";
  if (ff.includes(p)) return "FF";
  if (op.includes(p)) return "OP";
  if (fbop.includes(p)) return "FBOP";
  if (standaloneMap[p]) return standaloneMap[p];

  return productName;
};

// @desc    Create a new local sale record
// @route   POST /api/local-sales
export const createLocalSale = async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    const sessionOptions = session ? { session } : {};
    const { date, totalBoxes, totalQtyKg, salesItems } = req.body;

    if (!date || !salesItems || salesItems.length === 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ message: "Date and at least one sale item are required." });
    }

    // ====================================================================
    // 1. AGGREGATE QUANTITIES 
    // ====================================================================
    const requiredTea = {};
    const requiredRM = {};

    for (const item of salesItems) {
      const baseGrade = getBaseTeaGrade(item.product);
      const teaQty = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg) || 0;
      requiredTea[baseGrade] = (requiredTea[baseGrade] || 0) + teaQty;

      if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
        const rmName = item.rawMaterialName.toLowerCase().trim();
        requiredRM[rmName] = (requiredRM[rmName] || 0) + Number(item.rawMaterialQtyKg);
      }
      if (item.packingMaterials && item.packingMaterials.length > 0) {
        for (const pm of item.packingMaterials) {
          if (pm.name && Number(pm.qty) > 0) {
            const pmName = pm.name.toLowerCase().trim();
            requiredRM[pmName] = (requiredRM[pmName] || 0) + Number(pm.qty);
          }
        }
      }
    }

    // ====================================================================
    // 2. PRE-VALIDATION: CHECK IF ENOUGH STOCK IS AVAILABLE 
    // ====================================================================
    for (const [grade, requestedQty] of Object.entries(requiredTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      const available = stock ? stock.totalBulkStockKg || 0 : 0;
      if (requestedQty > available) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for Tea Grade: ${grade}. Available: ${available.toFixed(2)} kg, Requested: ${requestedQty.toFixed(2)} kg` });
      }
    }

    for (const [name, requestedQty] of Object.entries(requiredRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const stock = await rmQuery;
      const available = stock ? stock.totalQuantity || 0 : 0;
      if (requestedQty > available) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for Material: ${name}. Available: ${available.toFixed(2)}, Requested: ${requestedQty.toFixed(2)}` });
      }
    }

    const newSale = new LocalSale({ date, totalBoxes, totalQtyKg, salesItems });

    // ====================================================================
    // 3. DEDUCT STOCK USING AGGREGATED AMOUNTS (ACID Transaction protected)
    // ====================================================================
    
    // Deduct Tea Stock
    for (const [grade, totalRequestedQty] of Object.entries(requiredTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      if (stock) {
        let remainingToDeduct = totalRequestedQty;
        const originalDeductAmount = remainingToDeduct;

        if (stock.stockBySource && stock.stockBySource.length > 0) {
          for (let source of stock.stockBySource) {
            if (remainingToDeduct <= 0) break;
            let deducted = 0;
            if (source.quantityKg >= remainingToDeduct) {
              deducted = remainingToDeduct;
              source.quantityKg -= remainingToDeduct;
              remainingToDeduct = 0;
            } else {
              deducted = source.quantityKg;
              remainingToDeduct -= source.quantityKg;
              source.quantityKg = 0;
            }
            source.issueAmount = (source.issueAmount || 0) + deducted;
          }
        }
        stock.totalBulkStockKg -= (originalDeductAmount - remainingToDeduct);
        if (stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
        await stock.save(sessionOptions);
      }
    }

    // Deduct Raw/Packing Materials
    for (const [name, totalRequestedQty] of Object.entries(requiredRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const rmStock = await rmQuery;
      if (rmStock) {
        rmStock.totalQuantity -= totalRequestedQty;
        rmStock.issueAmount = (rmStock.issueAmount || 0) + totalRequestedQty;
        if (rmStock.totalQuantity < 0) rmStock.totalQuantity = 0;
        await rmStock.save(sessionOptions);
      }
    }

    const savedSale = await newSale.save(sessionOptions);

    if (session) {
      await session.commitTransaction();
    }

    res.status(201).json(savedSale);
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Error creating local sale:", error);
    res.status(500).json({ message: "Server error while saving local sale record." });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// @desc    Get all local sale records (supports ?page=&limit= or bounded list)
// @route   GET /api/local-sales
export const getLocalSales = async (req, res) => {
  try {
    await paginate(LocalSale, req, res, { 
      dateField: 'date',
      sort: { date: -1, createdAt: -1 }
    });
  } catch (error) {
    console.error("Error fetching local sales:", error);
    res.status(500).json({ message: "Server error while fetching local sales." });
  }
};

// @desc    Update a local sale record
// @route   PUT /api/local-sales/:id
export const updateLocalSale = async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    const sessionOptions = session ? { session } : {};
    const { date, totalBoxes, totalQtyKg, salesItems, updatedBy, editorName } = req.body;
    const saleQuery = LocalSale.findById(req.params.id);
    if (session) saleQuery.session(session);
    const saleRecord = await saleQuery;

    if (!saleRecord) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ message: "Record not found." });
    }

    // 1. Calculate previous quantities from existing record
    const oldTea = {};
    const oldRM = {};

    for (const item of saleRecord.salesItems) {
      const baseGrade = getBaseTeaGrade(item.product);
      const teaQty = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg) || 0;
      oldTea[baseGrade] = (oldTea[baseGrade] || 0) + teaQty;

      if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
        const rmName = item.rawMaterialName.toLowerCase().trim();
        oldRM[rmName] = (oldRM[rmName] || 0) + Number(item.rawMaterialQtyKg);
      }
      if (item.packingMaterials && item.packingMaterials.length > 0) {
        for (const pm of item.packingMaterials) {
          if (pm.name && Number(pm.qty) > 0) {
            const pmName = pm.name.toLowerCase().trim();
            oldRM[pmName] = (oldRM[pmName] || 0) + Number(pm.qty);
          }
        }
      }
    }

    // 2. Calculate newly requested quantities
    const requiredTea = {};
    const requiredRM = {};

    if (salesItems) {
      for (const item of salesItems) {
        const baseGrade = getBaseTeaGrade(item.product);
        const teaQty = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg) || 0;
        requiredTea[baseGrade] = (requiredTea[baseGrade] || 0) + teaQty;

        if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
          const rmName = item.rawMaterialName.toLowerCase().trim();
          requiredRM[rmName] = (requiredRM[rmName] || 0) + Number(item.rawMaterialQtyKg);
        }
        if (item.packingMaterials && item.packingMaterials.length > 0) {
          for (const pm of item.packingMaterials) {
            if (pm.name && Number(pm.qty) > 0) {
              const pmName = pm.name.toLowerCase().trim();
              requiredRM[pmName] = (requiredRM[pmName] || 0) + Number(pm.qty);
            }
          }
        }
      }
    }

    // 3. Pre-Validation
    for (const [grade, requestedQty] of Object.entries(requiredTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      const currentAvailable = stock ? stock.totalBulkStockKg || 0 : 0;
      const willBeReturned = oldTea[grade] || 0;
      const totalAvailableForUpdate = currentAvailable + willBeReturned;

      if (requestedQty > totalAvailableForUpdate) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for Tea Grade: ${grade}. Available to use: ${totalAvailableForUpdate.toFixed(2)} kg, Requested: ${requestedQty.toFixed(2)} kg` });
      }
    }

    for (const [name, requestedQty] of Object.entries(requiredRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const stock = await rmQuery;
      const currentAvailable = stock ? stock.totalQuantity || 0 : 0;
      const willBeReturned = oldRM[name] || 0;
      const totalAvailableForUpdate = currentAvailable + willBeReturned;

      if (requestedQty > totalAvailableForUpdate) {
        if (session) await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for Material: ${name}. Available to use: ${totalAvailableForUpdate.toFixed(2)}, Requested: ${requestedQty.toFixed(2)}` });
      }
    }

    // 4. REVERSE OLD STOCK 
    for (const [grade, amountToReturn] of Object.entries(oldTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      if (stock) {
        if (stock.stockBySource && stock.stockBySource.length > 0) {
          let targetSource = stock.stockBySource.find((s) => s.sourceName === "Factory") || stock.stockBySource[0];
          targetSource.quantityKg += amountToReturn;
          targetSource.issueAmount -= amountToReturn;
          if (targetSource.issueAmount < 0) targetSource.issueAmount = 0;
        }
        stock.totalBulkStockKg += amountToReturn;
        await stock.save(sessionOptions);
      }
    }

    for (const [name, amountToReturn] of Object.entries(oldRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const rmStock = await rmQuery;
      if (rmStock) {
        rmStock.totalQuantity += amountToReturn;
        rmStock.issueAmount -= amountToReturn;
        if (rmStock.issueAmount < 0) rmStock.issueAmount = 0;
        await rmStock.save(sessionOptions);
      }
    }

    // 5. DEDUCT NEW STOCK
    for (const [grade, totalRequestedQty] of Object.entries(requiredTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      if (stock) {
        let remainingToDeduct = totalRequestedQty;
        const originalDeductAmount = remainingToDeduct;

        if (stock.stockBySource && stock.stockBySource.length > 0) {
          for (let source of stock.stockBySource) {
            if (remainingToDeduct <= 0) break;
            let deducted = 0;
            if (source.quantityKg >= remainingToDeduct) {
              deducted = remainingToDeduct;
              source.quantityKg -= remainingToDeduct;
              remainingToDeduct = 0;
            } else {
              deducted = source.quantityKg;
              remainingToDeduct -= source.quantityKg;
              source.quantityKg = 0;
            }
            source.issueAmount = (source.issueAmount || 0) + deducted;
          }
        }
        stock.totalBulkStockKg -= (originalDeductAmount - remainingToDeduct);
        if (stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
        await stock.save(sessionOptions);
      }
    }

    for (const [name, totalRequestedQty] of Object.entries(requiredRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const rmStock = await rmQuery;
      if (rmStock) {
        rmStock.totalQuantity -= totalRequestedQty;
        rmStock.issueAmount = (rmStock.issueAmount || 0) + totalRequestedQty;
        if (rmStock.totalQuantity < 0) rmStock.totalQuantity = 0;
        await rmStock.save(sessionOptions);
      }
    }

    // 6. FINALLY UPDATE THE RECORD DETAILS
    if (date) saleRecord.date = date;
    if (totalBoxes !== undefined) saleRecord.totalBoxes = totalBoxes;
    if (totalQtyKg !== undefined) saleRecord.totalQtyKg = totalQtyKg;
    if (salesItems) saleRecord.salesItems = salesItems;
    if (updatedBy) saleRecord.updatedBy = updatedBy;
    else if (editorName) saleRecord.updatedBy = editorName;

    await saleRecord.save(sessionOptions);

    if (session) {
      await session.commitTransaction();
    }

    res.status(200).json({ message: "Record updated successfully.", record: saleRecord });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Update local sale error:", error);
    res.status(500).json({ message: "Error updating local sale record." });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// @desc    Delete a local sale record
export const deleteLocalSale = async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    const sessionOptions = session ? { session } : {};
    const { id } = req.params;
    const saleQuery = LocalSale.findById(id);
    if (session) saleQuery.session(session);
    const saleRecord = await saleQuery;

    if (!saleRecord) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ message: "Local sale record not found." });
    }

    // Aggregate what needs to be returned first
    const oldTea = {};
    const oldRM = {};

    for (const item of saleRecord.salesItems) {
      const baseGrade = getBaseTeaGrade(item.product);
      const teaQty = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg) || 0;
      oldTea[baseGrade] = (oldTea[baseGrade] || 0) + teaQty;

      if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
        const rmName = item.rawMaterialName.toLowerCase().trim();
        oldRM[rmName] = (oldRM[rmName] || 0) + Number(item.rawMaterialQtyKg);
      }
      if (item.packingMaterials && item.packingMaterials.length > 0) {
        for (const pm of item.packingMaterials) {
          if (pm.name && Number(pm.qty) > 0) {
            const pmName = pm.name.toLowerCase().trim();
            oldRM[pmName] = (oldRM[pmName] || 0) + Number(pm.qty);
          }
        }
      }
    }

    // 1. REVERSE TEA STOCK
    for (const [grade, amountToReturn] of Object.entries(oldTea)) {
      const stockQuery = PackingStock.findOne({ productName: { $regex: new RegExp(`^${escapeRegex(grade)}$`, "i") } });
      if (session) stockQuery.session(session);
      const stock = await stockQuery;
      if (stock) {
        if (stock.stockBySource && stock.stockBySource.length > 0) {
          let targetSource = stock.stockBySource.find((s) => s.sourceName === "Factory") || stock.stockBySource[0];
          targetSource.quantityKg += amountToReturn;
          targetSource.issueAmount -= amountToReturn;
          if (targetSource.issueAmount < 0) targetSource.issueAmount = 0;
        }
        stock.totalBulkStockKg += amountToReturn;
        await stock.save(sessionOptions);
      }
    }

    // 2. REVERSE RAW/PACKING MATERIAL STOCK
    for (const [name, amountToReturn] of Object.entries(oldRM)) {
      const rmQuery = RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
      if (session) rmQuery.session(session);
      const rmStock = await rmQuery;
      if (rmStock) {
        rmStock.totalQuantity += amountToReturn;
        rmStock.issueAmount -= amountToReturn;
        if (rmStock.issueAmount < 0) rmStock.issueAmount = 0;
        await rmStock.save(sessionOptions);
      }
    }

    await saleRecord.deleteOne(sessionOptions);

    if (session) {
      await session.commitTransaction();
    }

    res.status(200).json({ message: "Local sale record deleted and stock reversed successfully." });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Error aborting transaction:", abortErr);
      }
    }
    console.error("Error deleting local sale:", error);
    res.status(500).json({ message: "Server error while deleting local sale record." });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};