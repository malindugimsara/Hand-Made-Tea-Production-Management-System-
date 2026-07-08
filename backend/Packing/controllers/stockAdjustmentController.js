import PackingStock from '../models/PackingStock.js';
import RawMaterialStock from '../models/RawMaterialStock.js';
import StockAdjustmentLog from '../models/StockAdjustmentLog.js';


// GET All Stock Adjustment Logs
export const getStockAdjustmentLogs = async (req, res) => {
    try {
        // අලුත්ම logs මුලින්ම එන විදිහට (-1) sort කරලා තියෙන්නේ
        const logs = await StockAdjustmentLog.find().sort({ createdAt: -1 });
        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({ message: "Server error while fetching logs" });
    }
};

// GET Single Adjustment Log (For Edit Page)
export const getSingleStockAdjustment = async (req, res) => {
    try {
        const log = await StockAdjustmentLog.findById(req.params.id);
        if (!log) return res.status(404).json({ message: "Adjustment not found" });
        res.status(200).json(log);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// --- 1. ADJUST STOCK (POST) ---
export const adjustStock = async (req, res) => {
    try {
        const { date, itemType, itemName, action, amount, reason } = req.body;
        const adjustedBy = req.user?.name || 'System User';   

        if (!itemType || !itemName || !action || !amount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const adjustmentAmount = Number(amount);

        // Update Tea Stock
        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (!stock) return res.status(404).json({ message: "Tea product not found" });
            if (action === 'add') stock.totalBulkStockKg += adjustmentAmount;
            else {
                if (stock.totalBulkStockKg < adjustmentAmount) return res.status(400).json({ message: "Insufficient stock!" });
                stock.totalBulkStockKg -= adjustmentAmount;
            }
            await stock.save();

        // Update Raw Materials OR Spicy Stock (Both are in RawMaterialStock collection)
        } else if (itemType === 'raw' || itemType === 'spicy') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (!rawStock) return res.status(404).json({ message: "Material/Spice not found" });

            if (action === 'add') {
                rawStock.totalQuantity += adjustmentAmount;
                rawStock.transInAmount = (rawStock.transInAmount || 0) + adjustmentAmount;
            } else {
                if (rawStock.totalQuantity < adjustmentAmount) return res.status(400).json({ message: "Insufficient stock!" });
                rawStock.totalQuantity -= adjustmentAmount;
                rawStock.issueAmount = (rawStock.issueAmount || 0) + adjustmentAmount;
            }
            await rawStock.save();
            
        } else {
            return res.status(400).json({ message: "Invalid item type" });
        }

        // Save Log
        const log = new StockAdjustmentLog({ itemType, itemName, action, amount: adjustmentAmount, reason, adjustedBy, createdAt: date ? new Date(date) : new Date() });
        await log.save();

        res.status(200).json({ message: "Stock adjusted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// --- 2. DELETE ADJUSTMENT (Reverse Logic) ---
export const deleteStockAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await StockAdjustmentLog.findById(id);
        if (!log) return res.status(404).json({ message: 'Log not found' });

        const { itemType, itemName, action, amount } = log;

        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (stock) {
                action === 'add' ? stock.totalBulkStockKg -= amount : stock.totalBulkStockKg += amount;
                await stock.save();
            }
        } else if (itemType === 'raw' || itemType === 'spicy') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (rawStock) {
                if (action === 'add') {
                    rawStock.totalQuantity -= amount;
                    rawStock.transInAmount = Math.max(0, rawStock.transInAmount - amount);
                } else {
                    rawStock.totalQuantity += amount;
                    rawStock.issueAmount = Math.max(0, rawStock.issueAmount - amount);
                }
                await rawStock.save();
            }
        }
        await log.deleteOne();
        res.status(200).json({ message: 'Deleted and reversed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// --- 3. UPDATE ADJUSTMENT (PUT) ---
export const updateStockAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, itemType, itemName, action, amount, reason } = req.body;
        
        const log = await StockAdjustmentLog.findById(id);
        if (!log) return res.status(404).json({ message: "Log not found" });

        // Validation: Cannot change Item or Type
        if (log.itemName !== itemName || log.itemType !== itemType) {
            return res.status(400).json({ message: "Cannot change Item/Type during edit." });
        }

        const oldAction = log.action;
        const oldAmount = log.amount;
        const newAction = action;
        const newAmount = Number(amount);

        // Update Tea Stock
        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (!stock) return res.status(404).json({ message: "Tea product not found" });

            // 1. Reverse the old action
            if (oldAction === 'add') stock.totalBulkStockKg -= oldAmount;
            else stock.totalBulkStockKg += oldAmount;

            // 2. Apply the new action
            if (newAction === 'add') {
                stock.totalBulkStockKg += newAmount;
            } else {
                if (stock.totalBulkStockKg < newAmount) {
                    return res.status(400).json({ message: "Insufficient stock for this update!" });
                }
                stock.totalBulkStockKg -= newAmount;
            }
            await stock.save();

        // Update Raw Materials OR Spicy Stock
        } else if (itemType === 'raw' || itemType === 'spicy') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (!rawStock) return res.status(404).json({ message: "Material/Spice not found" });

            // 1. Reverse the old action
            if (oldAction === 'add') {
                rawStock.totalQuantity -= oldAmount;
                rawStock.transInAmount = Math.max(0, (rawStock.transInAmount || 0) - oldAmount);
            } else {
                rawStock.totalQuantity += oldAmount;
                rawStock.issueAmount = Math.max(0, (rawStock.issueAmount || 0) - oldAmount);
            }

            // 2. Apply the new action
            if (newAction === 'add') {
                rawStock.totalQuantity += newAmount;
                rawStock.transInAmount = (rawStock.transInAmount || 0) + newAmount;
            } else {
                if (rawStock.totalQuantity < newAmount) {
                    return res.status(400).json({ message: "Insufficient stock for this update!" });
                }
                rawStock.totalQuantity -= newAmount;
                rawStock.issueAmount = (rawStock.issueAmount || 0) + newAmount;
            }
            await rawStock.save();
        }

        // 3. Update and save the Log Entry itself
        log.action = newAction;
        log.amount = newAmount;
        log.reason = reason;
        if (date) {
            log.createdAt = new Date(date);
        }
        await log.save();

        res.status(200).json({ message: "Updated successfully", data: log });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};