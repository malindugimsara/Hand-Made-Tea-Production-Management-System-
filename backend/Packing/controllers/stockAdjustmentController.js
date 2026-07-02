import PackingStock from '../models/PackingStock.js';
import RawMaterialStock from '../models/RawMaterialStock.js';
import StockAdjustmentLog from '../models/StockAdjustmentLog.js';

export const adjustStock = async (req, res) => {
    try {
        const { date, itemType, itemName, action, amount, reason } = req.body;
        const adjustedBy = req.user?.name || 'System User';   

        if (!itemType || !itemName || !action || !amount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const adjustmentAmount = Number(amount);

        // ----------------------------------------------------
        // 1. TEA MAIN STOCK UPDATE (PackingStock Collection)
        // ----------------------------------------------------
        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (!stock) return res.status(404).json({ message: "Tea product not found" });

            if (action === 'add') {
                // Main Stock එකට එකතු කිරීම
                stock.totalBulkStockKg += adjustmentAmount; 
            } 
            else if (action === 'remove') {
                // Main Stock එකෙන් අඩු කිරීම
                if (stock.totalBulkStockKg < adjustmentAmount) {
                    return res.status(400).json({ message: "Insufficient overall stock to remove!" });
                }
                stock.totalBulkStockKg -= adjustmentAmount;
            }

            // 🔥 අනිවාර්යයි: වෙනස් කරපු අගය Database එකේ Save කිරීම
            await stock.save();

        // ----------------------------------------------------
        // 2. RAW MATERIAL MAIN STOCK UPDATE 
        // ----------------------------------------------------
        } else if (itemType === 'raw') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (!rawStock) return res.status(404).json({ message: "Raw material not found" });

            if (action === 'add') {
                // Main Stock එකට එකතු කිරීම
                rawStock.totalQuantity += adjustmentAmount;
                rawStock.transInAmount = (rawStock.transInAmount || 0) + adjustmentAmount;
            } 
            else if (action === 'remove') {
                // Main Stock එකෙන් අඩු කිරීම
                if (rawStock.totalQuantity < adjustmentAmount) {
                    return res.status(400).json({ message: "Insufficient stock to remove!" });
                }
                rawStock.totalQuantity -= adjustmentAmount;
                rawStock.issueAmount = (rawStock.issueAmount || 0) + adjustmentAmount;
            }

            // 🔥 අනිවාර්යයි: වෙනස් කරපු අගය Database එකේ Save කිරීම
            await rawStock.save();
            
        } else {
            return res.status(400).json({ message: "Invalid item type" });
        }

        // ----------------------------------------------------
        // 3. HISTORY LOG එක SAVE කිරීම
        // ----------------------------------------------------
        const log = new StockAdjustmentLog({
            itemType,
            itemName,
            action,
            amount: adjustmentAmount,
            reason,
            adjustedBy,
            createdAt: date ? new Date(date) : new Date() 
        });
        await log.save();

        res.status(200).json({ message: "Stock adjusted and Main Balance updated successfully" });

    } catch (error) {
        console.error("Stock adjustment error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

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

export const deleteStockAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await StockAdjustmentLog.findById(id);

        if (!log) {
            return res.status(404).json({ message: 'Adjustment log record not found.' });
        }

        const { itemType, itemName, action, amount } = log;

        // 1. REVERSE TEA STOCK
        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (stock) {
                if (action === 'add') {
                    // කලින් Add කරලා තිබුණා නම් දැන් අඩු කරන්න
                    stock.totalBulkStockKg -= amount;
                } else {
                    // කලින් Remove කරලා තිබුණා නම් දැන් එකතු කරන්න
                    stock.totalBulkStockKg += amount;
                }
                await stock.save();
            }
        } 
        // 2. REVERSE RAW MATERIAL STOCK
        else if (itemType === 'raw') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (rawStock) {
                if (action === 'add') {
                    rawStock.totalQuantity -= amount;
                    rawStock.transInAmount -= amount;
                } else {
                    rawStock.totalQuantity += amount;
                    rawStock.issueAmount -= amount;
                    if (rawStock.issueAmount < 0) rawStock.issueAmount = 0;
                }
                await rawStock.save();
            }
        }

        // 3. Delete the log record
        await log.deleteOne();
        res.status(200).json({ message: 'Adjustment log deleted and stock reversed successfully.' });

    } catch (error) {
        console.error('Error deleting adjustment log:', error);
        res.status(500).json({ message: 'Server error while deleting log.' });
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

// PUT - Update Stock Adjustment
export const updateStockAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, itemType, itemName, action, amount, reason } = req.body;
        const adjustedBy = req.user?.name || 'System User';

        const log = await StockAdjustmentLog.findById(id);
        if (!log) return res.status(404).json({ message: "Adjustment log not found" });

        const newAmount = Number(amount);
        const oldAmount = log.amount;
        const oldAction = log.action;

        // ආරක්ෂාව සඳහා Item එක මාරු කරන්න දෙන්නේ නෑ. (වැරදිලා නම් Delete කරලා අලුතින් දාන්න ඕනේ)
        if (log.itemName !== itemName || log.itemType !== itemType) {
            return res.status(400).json({ message: "Cannot change the Item Name/Type during edit. Please delete and recreate." });
        }

        // 1. REVERSE OLD STOCK & APPLY NEW STOCK IN ONE GO
        if (itemType === 'tea') {
            const stock = await PackingStock.findOne({ productName: itemName });
            if (!stock) return res.status(404).json({ message: "Tea product not found" });

            // මුලින්ම පරණ එක Reverse කරනවා
            if (oldAction === 'add') stock.totalBulkStockKg -= oldAmount;
            else stock.totalBulkStockKg += oldAmount;

            // ඊටපස්සේ අලුත් එක Apply කරනවා
            if (action === 'add') {
                stock.totalBulkStockKg += newAmount;
            } else {
                if (stock.totalBulkStockKg < newAmount) return res.status(400).json({ message: "Insufficient stock for this update!" });
                stock.totalBulkStockKg -= newAmount;
            }
            await stock.save();
            
        } else if (itemType === 'raw') {
            const rawStock = await RawMaterialStock.findOne({ materialName: itemName });
            if (!rawStock) return res.status(404).json({ message: "Raw material not found" });

            // Reverse Old
            if (oldAction === 'add') {
                rawStock.totalQuantity -= oldAmount;
                rawStock.transInAmount -= oldAmount;
            } else {
                rawStock.totalQuantity += oldAmount;
                rawStock.issueAmount -= oldAmount;
            }

            // Apply New
            if (action === 'add') {
                rawStock.totalQuantity += newAmount;
                rawStock.transInAmount = (rawStock.transInAmount || 0) + newAmount;
            } else {
                if (rawStock.totalQuantity < newAmount) return res.status(400).json({ message: "Insufficient stock for this update!" });
                rawStock.totalQuantity -= newAmount;
                rawStock.issueAmount = (rawStock.issueAmount || 0) + newAmount;
            }
            if(rawStock.issueAmount < 0) rawStock.issueAmount = 0;
            if(rawStock.transInAmount < 0) rawStock.transInAmount = 0;

            await rawStock.save();
        }

        // 2. UPDATE LOG RECORD
        log.action = action;
        log.amount = newAmount;
        log.reason = reason;
        log.adjustedBy = adjustedBy;
        if (date) log.createdAt = new Date(date);

        await log.save();

        res.status(200).json({ message: "Stock adjustment updated successfully" });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};