import RawMaterialIn from '../models/RawMaterialIn.js';
import RawMaterialStock from '../models/RawMaterialStock.js';

// 1. අලුත් Raw Material තොගයක් ඇතුළත් කිරීම (Create & Update Stock)
export const createRawMaterialIn = async (req, res) => {
    try {
        const { date, invoiceNo, supplierName, items, receivedBy, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided' });
        }

        // Transaction වාර්තාව නිර්මාණය කිරීම
        const newRecord = new RawMaterialIn({
            date,
            invoiceNo,
            supplierName,
            items,
            receivedBy,
            remarks
        });

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC 👇
        for (const item of items) {
            const qty = Number(item.quantity || 0);
            if (qty <= 0) continue;

            // අමුද්‍රව්‍යයේ නමින් තොගය සොයයි
            let stock = await RawMaterialStock.findOne({ materialName: item.materialName });

            if (stock) {
                // දැනටමත් තිබේ නම් එයට අලුත් ප්‍රමාණය එකතු කරයි
                stock.totalQuantity += qty;
                await stock.save();
            } else {
                // අලුත්ම අමුද්‍රව්‍යයක් නම් අලුතින් Stock එකක් සාදයි
                const newStock = new RawMaterialStock({
                    materialName: item.materialName,
                    totalQuantity: qty,
                    unit: item.unit
                });
                await newStock.save();
            }
        }
        // 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        const savedRecord = await newRecord.save();
        res.status(201).json({ success: true, data: savedRecord });

    } catch (error) {
        console.error("Error creating raw material in record:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 5. දැනට තියෙන සම්පූර්ණ අමුද්‍රව්‍ය තොගය (Current Raw Material Stock) ලබා ගැනීම
export const getRawMaterialStock = async (req, res) => {
    try {
        // RawMaterialStock model එකෙන් මුළු තොගයම ගන්නවා
        const stock = await RawMaterialStock.find().sort({ materialName: 1 }); 
        
        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        console.error("Error fetching raw material stock:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 2. සියලුම වාර්තා ලබා ගැනීම (Get All History)
export const getAllRawMaterialInRecords = async (req, res) => {
    try {
        const records = await RawMaterialIn.find().sort({ date: -1, createdAt: -1 });
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error("Error fetching raw material in records:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 3. නිශ්චිත වාර්තාවක් ID එක මගින් ලබා ගැනීම
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

// 4. වාර්තාවක් මකා දැමීම (Delete)
export const deleteRawMaterialInRecord = async (req, res) => {
    try {
        const record = await RawMaterialIn.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }
        
        // සටහන: Delete කිරීමේදී Stock එකෙන් මේවා අඩු කළ යුතුද යන්න ඔබේ අවශ්‍යතාවය මත තීරණය කරන්න.
        // සාමාන්‍යයෙන් Delete කළොත් Manual විදිහට Stock එක Update කරගන්නවා.

        res.status(200).json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};