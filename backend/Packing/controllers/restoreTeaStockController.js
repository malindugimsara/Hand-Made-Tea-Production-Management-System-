import StockTransfer from "../../models/StockTransfer.js";
import PackingStock from "../models/PackingStock.js";
import TeaReceived from "../models/TeaReceivedModel.js";
import TeaTransactionOther from "../models/TeaTransactionOther.js";

// @desc    Restore Tea Stock from all Trans In records (Factory, Other & Handmade Transfers)
// @route   POST /api/packing-stock/restore
export const restoreTeaStock = async (req, res) => {
    try {
        // 1. Collections තුනෙන්ම දත්ත ලබා ගැනීම
        const factoryRecords = await TeaReceived.find({});
        const otherRecords = await TeaTransactionOther.find({});
        // Handmade transfers වලින් Packing අංශයට ලැබුණු (COMPLETED) ඒවා පමණක් ගනිමු
        const transferRecords = await StockTransfer.find({ status: 'COMPLETED' }); 

        // 2. Product Name සහ Source Name අනුව දත්ත එකතු කිරීම සඳහා Map එකක් සෑදීම
        const stockMap = {};

        // Helper function: Map එකට දත්ත එකතු කිරීම
        const addToStockMap = (productName, sourceName, qty) => {
            if (!productName || qty <= 0) return;
            
            // Product එක Map එකේ නැත්නම් අලුතින් හදන්න
            if (!stockMap[productName]) {
                stockMap[productName] = {};
            }
            // ඒ Product එක ඇතුළේ Source එක නැත්නම් ඒකත් හදන්න
            if (!stockMap[productName][sourceName]) {
                stockMap[productName][sourceName] = 0;
            }
            // අදාළ Source එක යටතේ Quantity එකතු කිරීම
            stockMap[productName][sourceName] += qty;
        };

        // --- 1. Factory (TeaReceived) Records Process කිරීම ---
        factoryRecords.forEach(record => {
            if (record.receivedItems && Array.isArray(record.receivedItems)) {
                record.receivedItems.forEach(item => {
                    const productName = item.grade;
                    const sourceName = "Factory"; 
                    const qty = Number(item.qtyKg) || 0;
                    
                    addToStockMap(productName, sourceName, qty);
                });
            }
        });

        // --- 2. Other (TeaTransactionOther) Records Process කිරීම ---
        otherRecords.forEach(record => {
            if (record.items && Array.isArray(record.items)) {
                const partyStr = (record.partyName || "").toLowerCase();
                let sourceName = "Other";
                if (partyStr.includes('hand') || partyStr.includes('handmade')) {
                    sourceName = "Handmade";
                } else if (partyStr.includes('factory')) {
                    sourceName = "Factory";
                }

                record.items.forEach(item => {
                    const productName = item.grade;
                    const qty = Number(item.qtyKg) || 0;
                    
                    addToStockMap(productName, sourceName, qty);
                });
            }
        });

        // --- 3. Handmade Transfers (StockTransfer) Records Process කිරීම (අලුත් කොටස) ---
        transferRecords.forEach(record => {
            if (record.items && Array.isArray(record.items)) {
                // Source එක තීරණය කිරීම
                let sourceName = record.source || "Handmade";
                if (sourceName.toLowerCase().includes('hand')) sourceName = 'Handmade';
                else if (sourceName.toLowerCase().includes('factory')) sourceName = 'Factory';
                else sourceName = 'Other';

                record.items.forEach(item => {
                    const productName = item.product; // Schema එකේ තියෙන්නේ 'product' විදිහටයි
                    const qty = Number(item.receivedQtyKg) || 0; // Packing officer භාරගත්ත Quantity එක
                    
                    addToStockMap(productName, sourceName, qty);
                });
            }
        });

        // 3. එකතු කරගත්ත දත්ත PackingStock Database එකට දැමීම
        let restoredCount = 0;

        // දැනට තියෙන පරණ (වැරදි/හිස්) PackingStock දත්ත ඔක්කොම මකන්න (Fresh start එකක් සඳහා)
        await PackingStock.deleteMany({});

        for (const [productName, sources] of Object.entries(stockMap)) {
            let stockBySourceArray = [];
            let totalBulkStockKg = 0;

            for (const [sourceName, transInAmount] of Object.entries(sources)) {
                stockBySourceArray.push({
                    sourceName: sourceName,
                    transInAmount: transInAmount,
                    issueAmount: 0,
                    quantityKg: transInAmount // Issue amount එක 0 නිසා දැනට තියෙන Quantity එකත් TransIn ගානමයි
                });
                totalBulkStockKg += transInAmount;
            }

            // අලුත් Product Record එකක් සැදීම
            const newStock = new PackingStock({
                productName: productName,
                stockBySource: stockBySourceArray,
                totalBulkStockKg: totalBulkStockKg,
                packedItems: []
            });
            await newStock.save();
            
            restoredCount++;
        }

        res.status(200).json({ 
            message: "Tea Stock successfully restored from Factory, Other, and Handmade Transfer sources!", 
            restoredProductsCount: restoredCount 
        });

    } catch (error) {
        console.error("Error restoring tea stock:", error);
        res.status(500).json({ error: "Server Error", details: error.message });
    }
};