import TeaCenterIssue from '../models/TeaCenterIssueModel.js';
import PackingStock from '../models/PackingStock.js'; 
import RawMaterialStock from '../models/RawMaterialStock.js'; 

// --- UPDATED LOGIC: BASE TEA MAPPING (Consistent with LocalSale) ---
const getBaseTeaGrade = (productName) => {
    if (!productName) return "";
    const p = productName.toLowerCase().trim();

    const bopf = ["lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "mix fruit", "peach", "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", "guide issue-bopf"];
    const bopfSp = ["english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", "black t/b", "english afternoon", "awurudu special"];
    const greenTea = ["lemongrass - green tea", "g/t lemangrass", "mint - green tea", "soursop - green tea", "moringa - green tea", "curry leaves - green tea", "heen bovitiya - green tea", "gotukola - green tea", "jasmin - green tea", "green tea t/b", "green tea"];
    const pekoe = ["pekoe", "rose tea"];
    const ff = ["ceylon premium - ff"];
    const op = ["op", "hibiscus"];
    const fbop = ["ceylon supreme"];

    const standaloneMap = {
        "opa": "OPA", "bop": "BOP", "bop pack": "BOP", "pink tea": "Pink Tea", "pink tea can": "Pink Tea", "pink tea pack": "Pink Tea",
        "op 1": "OP 1", "op1 pack": "OP 1", "ff ex sp": "FF EX SP", "ff ex sp pack": "FF EX SP", "ff ex sp box": "FF EX SP",
        "white tea": "White Tea", "white tea can": "White Tea", "purple tea": "Purple Tea", "purple tea can": "Purple Tea",
        "purple pack": "Purple Tea", "slim beauty": "Slim Beauty", "slim beauty can": "Slim Beauty", "vita glow": "Vita Glow",
        "silver green": "Silver Green", "premium": "Premium", "ceylon premium": "FF", "black pepper": "Black Pepper",
        "black pepar": "Black Pepper", "cinnamon stick": "Cinnamon Stick", "turmeric": "Turmeric", "silver tips": "Silver Tips",
        "golden tips": "Golden Tips", "flower": "Flower", "chakra": "Chakra", 
        "dust": "Dust", "dust 1": "Dust 1"
    };

    if (p === "pitigala tea bags") return "Black Tea T/B";
    if (p === "green tea bag (25)") return "Green Tea T/B";
    if (p.includes("labour")) return "BOPF";
    if (p.includes("awurudu special")) return "BOPF SP";

    if (bopf.includes(p)) return "BOPF";
    if (bopfSp.includes(p)) return "BOPF SP";
    if (greenTea.includes(p)) return "Green Tea";
    if (pekoe.includes(p)) return "Pekoe";
    if (ff.includes(p)) return "FF";
    if (op.includes(p)) return "OP";
    if (fbop.includes(p)) return "FBOP";
    if (standaloneMap[p]) return standaloneMap[p];
    
    return productName; 
};

// @desc    Create new tea center issue records
// @route   POST /api/tea-center-issues
// @access  Private
export const createTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems } = req.body;

        if (!date || !issueItems || issueItems.length === 0) {
            return res.status(400).json({ message: 'Date and at least one issue item are required.' });
        }

        // ====================================================================
        // 1. AGGREGATE QUANTITIES (එකම ජාතියේ ඒවා එකට එකතු කිරීම)
        // ====================================================================
        const requiredTea = {};
        const requiredRM = {};

        for (const item of issueItems) {
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
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
            const available = stock ? stock.totalBulkStockKg || 0 : 0;
            if (requestedQty > available) {
                return res.status(400).json({ message: `Insufficient stock for Tea Grade: ${grade}. Available: ${available.toFixed(2)} kg, Requested: ${requestedQty.toFixed(2)} kg` });
            }
        }

        for (const [name, requestedQty] of Object.entries(requiredRM)) {
            const stock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            const available = stock ? stock.totalQuantity || 0 : 0;
            if (requestedQty > available) {
                return res.status(400).json({ message: `Insufficient stock for Material: ${name}. Available: ${available.toFixed(2)}, Requested: ${requestedQty.toFixed(2)}` });
            }
        }

        const newIssue = new TeaCenterIssue({ date, totalBoxes, totalQtyKg, issueItems });

        // ====================================================================
        // 3. DEDUCT STOCK USING AGGREGATED AMOUNTS
        // ====================================================================
        
        // Deduct Tea Stock
        for (const [grade, totalRequestedQty] of Object.entries(requiredTea)) {
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
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
                await stock.save();
            }
        }

        // Deduct Raw/Packing Materials
        for (const [name, totalRequestedQty] of Object.entries(requiredRM)) {
            const rmStock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            if (rmStock) {
                rmStock.totalQuantity -= totalRequestedQty;
                rmStock.issueAmount = (rmStock.issueAmount || 0) + totalRequestedQty;
                if (rmStock.totalQuantity < 0) rmStock.totalQuantity = 0;
                await rmStock.save();
            }
        }

        const savedIssue = await newIssue.save();
        res.status(201).json(savedIssue);

    } catch (error) {
        console.error('Error saving tea center issue:', error); 
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
}

// @desc    Get all tea center issues
// @route   GET /api/tea-center-issues
// @access  Private
export const getTeaCenterIssues = async (req, res) => {
    try {
        const issues = await TeaCenterIssue.find().sort({ date: -1 });
        res.status(200).json(issues);
    } catch (error) {
        console.error('Error fetching tea center issues:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Update a tea center issue record
// @route   PUT /api/tea-center-issues/:id
// @access  Private
export const updateTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems, updatedBy, editorName } = req.body;
        const issueRecord = await TeaCenterIssue.findById(req.params.id);

        if (!issueRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // ====================================================================
        // 1. Calculate Old Quantities (පරණ රෙකෝඩ් එකේ ගණන්)
        // ====================================================================
        const oldTea = {};
        const oldRM = {};

        for (const item of issueRecord.issueItems) {
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

        // ====================================================================
        // 2. Calculate New Requested Quantities (අලුතින් යවන ගණන්)
        // ====================================================================
        const requiredTea = {};
        const requiredRM = {};

        if (issueItems) {
            for (const item of issueItems) {
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

        // ====================================================================
        // 3. Pre-Validation
        // ====================================================================
        for (const [grade, requestedQty] of Object.entries(requiredTea)) {
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
            const currentAvailable = stock ? stock.totalBulkStockKg || 0 : 0;
            const willBeReturned = oldTea[grade] || 0;
            const totalAvailableForUpdate = currentAvailable + willBeReturned;

            if (requestedQty > totalAvailableForUpdate) {
                return res.status(400).json({ message: `Insufficient stock for Tea Grade: ${grade}. Available to use: ${totalAvailableForUpdate.toFixed(2)} kg, Requested: ${requestedQty.toFixed(2)} kg` });
            }
        }

        for (const [name, requestedQty] of Object.entries(requiredRM)) {
            const stock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            const currentAvailable = stock ? stock.totalQuantity || 0 : 0;
            const willBeReturned = oldRM[name] || 0;
            const totalAvailableForUpdate = currentAvailable + willBeReturned;

            if (requestedQty > totalAvailableForUpdate) {
                return res.status(400).json({ message: `Insufficient stock for Material: ${name}. Available to use: ${totalAvailableForUpdate.toFixed(2)}, Requested: ${requestedQty.toFixed(2)}` });
            }
        }

        // ====================================================================
        // 4. REVERSE OLD STOCK 
        // ====================================================================
        for (const [grade, amountToReturn] of Object.entries(oldTea)) {
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
            if (stock) {
                if (stock.stockBySource && stock.stockBySource.length > 0) {
                    let targetSource = stock.stockBySource.find((s) => s.sourceName === "Factory") || stock.stockBySource[0];
                    targetSource.quantityKg += amountToReturn;
                    targetSource.issueAmount -= amountToReturn;
                    if (targetSource.issueAmount < 0) targetSource.issueAmount = 0;
                }
                stock.totalBulkStockKg += amountToReturn;
                await stock.save();
            }
        }

        for (const [name, amountToReturn] of Object.entries(oldRM)) {
            const rmStock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            if (rmStock) {
                rmStock.totalQuantity += amountToReturn;
                rmStock.issueAmount -= amountToReturn;
                if (rmStock.issueAmount < 0) rmStock.issueAmount = 0;
                await rmStock.save();
            }
        }

        // ====================================================================
        // 5. DEDUCT NEW STOCK
        // ====================================================================
        for (const [grade, totalRequestedQty] of Object.entries(requiredTea)) {
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
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
                await stock.save();
            }
        }

        for (const [name, totalRequestedQty] of Object.entries(requiredRM)) {
            const rmStock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            if (rmStock) {
                rmStock.totalQuantity -= totalRequestedQty;
                rmStock.issueAmount = (rmStock.issueAmount || 0) + totalRequestedQty;
                if (rmStock.totalQuantity < 0) rmStock.totalQuantity = 0;
                await rmStock.save();
            }
        }

        // ====================================================================
        // 6. FINALLY UPDATE THE RECORD DETAILS
        // ====================================================================
        if (date) issueRecord.date = date;
        if (totalBoxes !== undefined) issueRecord.totalBoxes = totalBoxes;
        if (totalQtyKg !== undefined) issueRecord.totalQtyKg = totalQtyKg;
        if (issueItems) issueRecord.issueItems = issueItems;
        if (updatedBy) issueRecord.updatedBy = updatedBy;
        else if (editorName) issueRecord.updatedBy = editorName;

        await issueRecord.save();
        res.status(200).json({ message: "Record updated successfully.", record: issueRecord });

    } catch (error) {
        console.error('Error updating tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};

// @desc    Delete a tea center issue record
// @route   DELETE /api/tea-center-issues/:id
// @access  Private
export const deleteTeaCenterIssue = async (req, res) => {
    try {
        const issueRecord = await TeaCenterIssue.findById(req.params.id);

        if (!issueRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // 1. Aggregate what needs to be returned first
        const oldTea = {};
        const oldRM = {};

        for (const item of issueRecord.issueItems) {
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

        // 2. REVERSE TEA STOCK
        for (const [grade, amountToReturn] of Object.entries(oldTea)) {
            const stock = await PackingStock.findOne({ productName: { $regex: new RegExp(`^${grade}$`, "i") } });
            if (stock) {
                if (stock.stockBySource && stock.stockBySource.length > 0) {
                    let targetSource = stock.stockBySource.find((s) => s.sourceName === "Factory") || stock.stockBySource[0];
                    targetSource.quantityKg += amountToReturn;
                    targetSource.issueAmount -= amountToReturn;
                    if (targetSource.issueAmount < 0) targetSource.issueAmount = 0;
                }
                stock.totalBulkStockKg += amountToReturn;
                await stock.save();
            }
        }

        // 3. REVERSE RAW/PACKING MATERIAL STOCK
        for (const [name, amountToReturn] of Object.entries(oldRM)) {
            const rmStock = await RawMaterialStock.findOne({ materialName: { $regex: new RegExp(`^${name}$`, "i") } });
            if (rmStock) {
                rmStock.totalQuantity += amountToReturn;
                rmStock.issueAmount -= amountToReturn;
                if (rmStock.issueAmount < 0) rmStock.issueAmount = 0;
                await rmStock.save();
            }
        }

        await issueRecord.deleteOne();
        res.status(200).json({ message: 'Record deleted and stock reversed successfully' });

    } catch (error) {
        console.error('Error deleting tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};