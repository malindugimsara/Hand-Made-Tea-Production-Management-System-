import PackingStock from "../models/PackingStock.js"; 

// 👇 Historical Stock එක Calculate කරන්න මේ Models ඔක්කොම ඕනේ 👇
import TeaReceived from "../models/TeaReceivedModel.js";
import TeaTransactionOther from "../models/TeaTransactionOther.js";
import StockTransfer from "../../models/StockTransfer.js"; // Handmade/Other Trans Ins
import LocalSale from "../models/LocalSaleModel.js"; // Issues
import TeaCenterIssue from "../models/TeaCenterIssueModel.js"; // Issues
import RawMaterialStock from "../models/RawMaterialStock.js"; 
import RawMaterialIn from "../models/RawMaterialIn.js";

// @desc    Get all packing stock records
// @route   GET /api/packing-stock
export const getAllPackingStocks = async (req, res) => {
    try {
        const stocks = await PackingStock.find().sort({ updatedAt: -1 });
        res.status(200).json(stocks);
    } catch (error) {
        res.status(500).json({ message: "Error fetching packing stock", error: error.message });
    }
};

// @desc    Get a single packing stock record
// @route   GET /api/packing-stock/:id
export const getPackingStockById = async (req, res) => {
    try {
        const stock = await PackingStock.findById(req.params.id);
        if (!stock) return res.status(404).json({ message: "Stock record not found" });
        
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ message: "Error fetching record", error: error.message });
    }
};

// @desc    Create a new packing stock record
// @route   POST /api/packing-stock
export const createPackingStock = async (req, res) => {
    try {
        const existingStock = await PackingStock.findOne({ productName: req.body.productName });
        if (existingStock) {
            return res.status(400).json({ message: `Inventory record for ${req.body.productName} already exists.` });
        }

        // 👇 AUTOMATED GRAND TOTAL CALCULATION 👇
        if (req.body.stockBySource && Array.isArray(req.body.stockBySource)) {
            req.body.totalBulkStockKg = req.body.stockBySource.reduce((sum, src) => sum + (Number(src.quantityKg) || 0), 0);
        }

        const newStock = new PackingStock(req.body);
        const savedStock = await newStock.save();
        res.status(201).json(savedStock);
    } catch (error) {
        res.status(400).json({ message: "Error creating stock record", error: error.message });
    }
};

// @desc    Update a packing stock record
// @route   PUT /api/packing-stock/:id
export const updatePackingStock = async (req, res) => {
    try {
        const stock = await PackingStock.findById(req.params.id);
        
        if (!stock) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        // 👇 AUTOMATED GRAND TOTAL RE-CALCULATION 👇
        if (req.body.stockBySource && Array.isArray(req.body.stockBySource)) {
            req.body.totalBulkStockKg = req.body.stockBySource.reduce((sum, src) => sum + (Number(src.quantityKg) || 0), 0);
        }

        Object.assign(stock, req.body);
        const updatedStock = await stock.save();
        
        res.status(200).json(updatedStock);
    } catch (error) {
        res.status(400).json({ message: "Error updating stock record", error: error.message });
    }
};

// @desc    Delete a packing stock record
// @route   DELETE /api/packing-stock/:id
export const deletePackingStock = async (req, res) => {
    try {
        const deletedStock = await PackingStock.findByIdAndDelete(req.params.id);
        
        if (!deletedStock) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        res.status(200).json({ message: "Stock record deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting stock record", error: error.message });
    }
};

const getBaseTeaGrade = (productName) => {
    if (!productName) return "";
    const p = productName.toLowerCase().trim();

    const bopf = ["lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "mix fruit", "peach", "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", "guide issue-bopf","pomegranate tea", "labour drinking tea"];
    const bopfSp = ["english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", "english afternoon", "awurudu special", "pitigala tea 400g"];
    const greenTea = ["lemongrass - green tea", "g/t lemangrass", "mint - green tea", "soursop - green tea", "moringa - green tea", "curry leaves - green tea", "heen bovitiya - green tea", "gotukola - green tea", "jasmin - green tea"];
    const pekoe = ["pekoe", "rose tea"];
    const pekoe1 = ["mix flower"];
    const ff = ["ceylon premium - ff"];
    const op = ["op", "hibiscus"];
    const fbop = ["ceylon supreme"];
    const purpletea = ["arabic tea"];

    const standaloneMap = {
        "opa": "OPA", "bop": "BOP", "bop pack": "BOP", "pink tea": "Pink Tea", "pink tea can": "Pink Tea", "pink tea pack": "Pink Tea",
        "op 1": "OP 1", "op1 pack": "OP 1", "ff ex sp": "FF EX SP", "ff ex sp pack": "FF EX SP", "ff ex sp box": "FF EX SP",
        "white tea": "White Tea", "white tea can": "White Tea", "purple tea": "Purple Tea", "purple tea can": "Purple Tea",
        "purple pack": "Purple Tea", "slim beauty": "Slim Beauty", "slim beauty can": "Slim Beauty", "vita glow": "Vita Glow",
        "silver green": "Silver Green", "premium": "Premium", "ceylon premium": "FF", "black pepper": "Black Pepper",
        "black pepar": "Black Pepper", "cinnamon stick": "Cinnamon Stick", "turmeric": "Turmeric", "silver tips": "Silver Tips",
        "golden tips": "Golden Tips", "flower": "Flower", "chakra": "Chakra", "green tea": "Green Tea",
        "pitigala tea bags": "Black Tea T/B", "green tea bag (25)": "Green Tea T/B"
    };

    if (bopf.includes(p)) return "BOPF";
    if (bopfSp.includes(p)) return "BOPF SP";
    if (greenTea.includes(p)) return "Green Tea";
    if (pekoe.includes(p)) return "Pekoe";
    if (pekoe1.includes(p)) return "Pekoe 1";
    if (ff.includes(p)) return "FF";
    if (op.includes(p)) return "OP";
    if (fbop.includes(p)) return "FBOP";
    if (purpletea.includes(p)) return "Purple Tea";
    if (standaloneMap[p]) return standaloneMap[p];

    return productName; 
};

// @desc    Get historical packing & raw material stock by date
// @route   GET /api/packing-stock/history
export const getHistoricalPackingStock = async (req, res) => {
    try {
        const { date } = req.query; // e.g., "2024-05-15"
        if (!date) return res.status(400).json({ message: "Date is required." });

        const targetDate = new Date(`${date}T23:59:59.999Z`);
        const targetDateString = date; // RawMaterialIn එකේ Date එක String එකක් නිසා කෙලින්ම ගැලපීමට

        // 1. Live Stocks ලබාගැනීම
        const liveTeaStocks = await PackingStock.find().lean();
        const liveRmStocks = await RawMaterialStock.find().lean();

        // 2. අදාළ දිනයට "පසුව (Future)" සිදු වූ ගනුදෙනු ලබාගැනීම
        const futureTeaReceived = await TeaReceived.find({ date: { $gt: targetDate } }).lean();
        const futureOtherTrans = await TeaTransactionOther.find({ date: { $gt: targetDate } }).lean();
        const futureStockTrans = await StockTransfer.find({ dateReceived: { $gt: targetDate }, status: 'COMPLETED' }).lean();
        
        const futureLocalSales = await LocalSale.find({ date: { $gt: targetDate } }).lean();
        const futureTeaCenter = await TeaCenterIssue.find({ date: { $gt: targetDate } }).lean();

        // Raw Material Incoming (Date String Comparison)
        const futureRmInDocs = await RawMaterialIn.find({ date: { $gt: targetDateString } }).lean();

        // 3. Maps for Calculations
        const futureTeaIn = {};
        const futureTeaOut = {};
        const futureRmIn = {};
        const futureRmOut = {};

        const addValue = (map, key, qty) => {
            if (!key) return;
            const k = key.toLowerCase().trim();
            map[k] = (map[k] || 0) + (Number(qty) || 0);
        };

        // --- Calculate Future Incoming ---
        futureTeaReceived.forEach(doc => (doc.receivedItems || []).forEach(item => addValue(futureTeaIn, getBaseTeaGrade(item.teaType || item.grade), item.qtyKg)));
        futureOtherTrans.forEach(doc => (doc.items || []).forEach(item => addValue(futureTeaIn, getBaseTeaGrade(item.grade), item.qtyKg)));
        futureStockTrans.forEach(doc => (doc.items || []).forEach(item => addValue(futureTeaIn, getBaseTeaGrade(item.product), item.receivedQtyKg || item.issuedQtyKg)));
        
        futureRmInDocs.forEach(doc => {
            (doc.items || []).forEach(item => addValue(futureRmIn, item.materialName, item.quantity));
        });

        // --- Calculate Future Outgoing (Issues) ---
        const processOutgoings = (docs, itemsArrayName) => {
            docs.forEach(doc => {
                (doc[itemsArrayName] || []).forEach(item => {
                    // Tea Outgoing
                    const teaQty = item.baseTeaQtyKg !== undefined ? item.baseTeaQtyKg : (item.packSizeKg * item.numberOfBoxes);
                    addValue(futureTeaOut, getBaseTeaGrade(item.product), teaQty);

                    // RM Outgoing (Flavor)
                    if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
                        addValue(futureRmOut, item.rawMaterialName, item.rawMaterialQtyKg);
                    }

                    // RM Outgoing (Packing Materials)
                    if (item.packingMaterials && item.packingMaterials.length > 0) {
                        item.packingMaterials.forEach(pm => {
                            if (pm.name && Number(pm.qty) > 0) {
                                addValue(futureRmOut, pm.name, pm.qty);
                            }
                        });
                    }
                });
            });
        };

        processOutgoings(futureLocalSales, "salesItems");
        processOutgoings(futureTeaCenter, "issueItems");

        // 4. Reverse Calculation (Live Stock - Future Incoming + Future Outgoing)
        
        // A) Historical Tea Stock
        const teaStocks = liveTeaStocks.map(stock => {
            const key = (stock.productName || "").toLowerCase().trim();
            const liveTotal = Number(stock.totalBulkStockKg) || Number(stock.bulkStockKg) || 0;
            
            let liveTransIn = 0; let liveIssue = 0;
            if (stock.stockBySource && stock.stockBySource.length > 0) {
                stock.stockBySource.forEach(src => {
                    liveTransIn += Number(src.transInAmount) || 0;
                    liveIssue += Number(src.issueAmount) || 0;
                });
            } else {
                liveTransIn = Number(stock.transInAmount) || 0;
                liveIssue = Number(stock.issueAmount) || 0;
            }

            const histCurrent = liveTotal - (futureTeaIn[key] || 0) + (futureTeaOut[key] || 0);

            return {
                id: stock._id,
                productName: stock.productName,
                transInAmount: Math.max(0, liveTransIn - (futureTeaIn[key] || 0)),
                issueAmount: Math.max(0, liveIssue - (futureTeaOut[key] || 0)),
                currentStock: histCurrent > 0 ? histCurrent : 0,
            };
        }).filter(s => s.currentStock > 0);

        // B) Historical Raw Material Stock (Flavors & Packing Separately)
        const flavorStocks = [];
        const packingStocks = [];

        liveRmStocks.forEach(rm => {
            const key = (rm.materialName || "").toLowerCase().trim();
            const liveTotal = Number(rm.totalQuantity) || 0;
            const liveTransIn = Number(rm.transInAmount) || 0;
            const liveIssue = Number(rm.issueAmount) || 0;

            const histCurrent = liveTotal - (futureRmIn[key] || 0) + (futureRmOut[key] || 0);
            
            const rmData = {
                id: rm._id,
                materialName: rm.materialName,
                unit: rm.unit,
                transInAmount: Math.max(0, liveTransIn - (futureRmIn[key] || 0)),
                issueAmount: Math.max(0, liveIssue - (futureRmOut[key] || 0)),
                currentStock: histCurrent > 0 ? histCurrent : 0,
            };

            if (rmData.currentStock > 0) {
                if (rm.category === 'flavor') {
                    flavorStocks.push(rmData);
                } else {
                    packingStocks.push(rmData);
                }
            }
        });

        // 5. Sort alphabetically
        teaStocks.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        flavorStocks.sort((a, b) => (a.materialName || '').localeCompare(b.materialName || ''));
        packingStocks.sort((a, b) => (a.materialName || '').localeCompare(b.materialName || ''));

        // 6. Return response to Frontend
        return res.status(200).json({
            teaStocks,
            flavorStocks,
            packingStocks
        });

    } catch (error) {
        console.error("Historical Stock Fetch Error:", error);
        res.status(500).json({ message: "Error fetching historical stock", error: error.message });
    }
};