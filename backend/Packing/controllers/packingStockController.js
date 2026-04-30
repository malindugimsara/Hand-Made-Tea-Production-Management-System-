import PackingStock from "../models/PackingStock.js"; 

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
        // අලුතින් Stock එකක් හදද්දී, ඒකෙ Source වල තියෙන ගණන් ඔක්කොම එකතු කරලා Grand Total එක හදනවා
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
        // Stock එක Update කරද්දීත් Grand Total එක අලුත් වෙනවා
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