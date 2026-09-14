import RawMaterialIn from '../models/RawMaterialIn.js';
import RawMaterialStock from '../models/RawMaterialStock.js';

// CREATE NEW RAW MATERIAL IN RECORD
export const createRawMaterialIn = async (req, res) => {
    try {
        const { date, invoiceNo, supplierName, items, receivedBy, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided' });
        }

        const newRecord = new RawMaterialIn({
            date,
            invoiceNo,
            supplierName,
            items,
            receivedBy,
            remarks
        });

        // AUTOMATED INVENTORY ADDITION LOGIC
        for (const item of items) {
            const qty = Number(item.quantity || 0);
            if (qty <= 0) continue;

            let stock = await RawMaterialStock.findOne({ materialName: item.materialName });

            if (stock) {
                stock.totalQuantity += qty;
                stock.transInAmount = (stock.transInAmount || 0) + qty;
                if(item.category) stock.category = item.category; 
                await stock.save();
            } else {
                const newStock = new RawMaterialStock({
                    materialName: item.materialName,
                    totalQuantity: qty,
                    transInAmount: qty,  
                    issueAmount: 0,      
                    unit: item.unit,
                    category: item.category || 'other' 
                });
                await newStock.save();
            }
        }

        const savedRecord = await newRecord.save();
        res.status(201).json({ success: true, data: savedRecord });

    } catch (error) {
        console.error("Error creating raw material in record:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 2. UPDATE RAW MATERIAL IN RECORD
export const updateRawMaterialInRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, invoiceNo, supplierName, remarks, editorName, items } = req.body;

        // 1. Check if the record exists
        const existingRecord = await RawMaterialIn.findById(id);
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        for (const oldItem of existingRecord.items) {
            const oldQty = Number(oldItem.quantity || 0);
            if (oldQty <= 0) continue;

            let stock = await RawMaterialStock.findOne({ materialName: oldItem.materialName });
            if (stock) {
                stock.totalQuantity -= oldQty;
                stock.transInAmount -= oldQty;
                if (stock.totalQuantity < 0) stock.totalQuantity = 0;
                if (stock.transInAmount < 0) stock.transInAmount = 0;
                await stock.save();
            }
        }

        for (const newItem of items) {
            const newQty = Number(newItem.quantity || 0);
            if (newQty <= 0) continue;

            let stock = await RawMaterialStock.findOne({ materialName: newItem.materialName });
            if (stock) {
                stock.totalQuantity += newQty;
                stock.transInAmount += newQty;
                if (newItem.category) stock.category = newItem.category;
                await stock.save();
            } else {
                const newStock = new RawMaterialStock({
                    materialName: newItem.materialName,
                    totalQuantity: newQty,
                    transInAmount: newQty,
                    issueAmount: 0,
                    unit: newItem.unit,
                    category: newItem.category || 'other'
                });
                await newStock.save();
            }
        }

        // 3. Record එක Update කිරීම
        existingRecord.date = date;
        existingRecord.invoiceNo = invoiceNo;
        existingRecord.supplierName = supplierName;
        existingRecord.remarks = remarks;
        existingRecord.items = items;

        if (req.body.updatedBy) existingRecord.updatedBy = req.body.updatedBy;
        
        if (req.body.editorName) existingRecord.editorName = req.body.editorName;
        
        const updatedRecord = await existingRecord.save();
        res.status(200).json({ success: true, data: updatedRecord });

    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getRawMaterialStock = async (req, res) => {
    try {
        const stock = await RawMaterialStock.find().sort({ materialName: 1 }); 
        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getAllRawMaterialInRecords = async (req, res) => {
    try {
        const records = await RawMaterialIn.find().sort({ date: -1, createdAt: -1 });
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getRawMaterialInById = async (req, res) => {
    try {
        const record = await RawMaterialIn.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        res.status(200).json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const deleteRawMaterialInRecord = async (req, res) => {
    try {
        const record = await RawMaterialIn.findById(req.params.id);
        
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        // AUTOMATED STOCK REVERSAL LOGIC
        for (const item of record.items) {
            const qtyToRemove = Number(item.quantity || 0);
            if (qtyToRemove <= 0) continue;

            let stock = await RawMaterialStock.findOne({ materialName: item.materialName });

            if (stock) {
                stock.totalQuantity -= qtyToRemove;
                stock.transInAmount -= qtyToRemove;
                
                if (stock.totalQuantity < 0) stock.totalQuantity = 0;
                if (stock.transInAmount < 0) stock.transInAmount = 0;
                
                await stock.save();
            }
        }

        await record.deleteOne();

        res.status(200).json({ success: true, message: "Record deleted and stock reversed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};