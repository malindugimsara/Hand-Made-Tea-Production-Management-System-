import RawMaterialIn from '../models/RawMaterialIn.js';
import RawMaterialStock from '../models/RawMaterialStock.js';

// අමුද්‍රව්‍ය Flavor එකක්ද කියලා අඳුරගන්න පාවිච්චි කරන නම් ලිස්ට් එක
const FLAVOR_NAMES = [
    "Cinnamon", "Chakra", "Ginger", "Masala", "Vanilla", "Mint", 
    "Moringa", "Curry Leaves", "Gotukola", "Heen Bovitiya", "Cardamom", 
    "Rose", "Strawberry", "Peach", "Mix Fruit", "Pineapple", "Mango", 
    "Honey", "Earl Grey", "Lime", "Soursop", "Jasmine", "Flower", "Turmeric", "Black Pepper"
];

// 1. අලුත් Raw Material තොගයක් ඇතුළත් කිරීම (Create & Update Stock)
export const createRawMaterialIn = async (req, res) => {
    try {
        const { date, invoiceNo, supplierName, items, receivedBy, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items provided' });
        }

        // Transaction වාර්තාව නිර්මාණය කිරීම 
        // (Frontend එකෙන් එවන items ඇතුළේ දැන් category එකත් තියෙනවා)
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
                
                // කෝකටත් Frontend එකෙන් එන අලුත් Category එකෙන් Stock එක Update කරනවා
                if(item.category) stock.category = item.category; 
                
                await stock.save();
            } else {
                // අලුතින් Stock එකක් සාදයි (Frontend එකෙන් ආපු Category එක කෙළින්ම පාවිච්චි කරයි)
                const newStock = new RawMaterialStock({
                    materialName: item.materialName,
                    totalQuantity: qty,
                    unit: item.unit,
                    category: item.category || 'other' // 👈 Frontend එකේ Select කරපු එක
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

// 4. වාර්තාවක් මකා දැමීම (Delete & Auto Stock Reversal)
export const deleteRawMaterialInRecord = async (req, res) => {
    try {
        // 1. මුලින්ම මකන්න ඕනේ Record එක මොකක්ද කියලා DB එකෙන් හොයාගන්නවා (මකන්න කලින්)
        const record = await RawMaterialIn.findById(req.params.id);
        
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        // 👇 AUTOMATED STOCK REVERSAL LOGIC 👇
        // Record එකේ තිබුණ Items ටික එකින් එක අරගෙන Stock එකෙන් අඩු කරනවා
        for (const item of record.items) {
            const qtyToRemove = Number(item.quantity || 0);
            if (qtyToRemove <= 0) continue;

            let stock = await RawMaterialStock.findOne({ materialName: item.materialName });

            if (stock) {
                // Stock එකට එකතු වෙලා තිබුණු ප්‍රමාණය ආපහු අඩු කරනවා
                stock.totalQuantity -= qtyToRemove;
                
                // සෘණ (Negative) වීම වැළැක්වීම
                if (stock.totalQuantity < 0) {
                    stock.totalQuantity = 0;
                }
                
                await stock.save();
            }
        }
        // 👆 END OF AUTOMATED STOCK REVERSAL 👆

        // 2. Stock එක අඩු කළාට පස්සේ අදාළ Record එක සම්පූර්ණයෙන්ම මකා දමනවා
        await record.deleteOne();

        res.status(200).json({ success: true, message: "Record deleted and stock reversed successfully" });
    } catch (error) {
        console.error("Error deleting record:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};