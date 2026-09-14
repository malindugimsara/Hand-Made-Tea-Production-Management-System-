import StockTransfer from "../../models/StockTransfer.js";
import PackingStock from "../models/PackingStock.js";
import TeaReceived from "../models/TeaReceivedModel.js";
import TeaTransactionOther from "../models/TeaTransactionOther.js";

// @desc    Restore Tea Stock from all Trans In records (Factory, Other & Handmade Transfers)
// @route   POST /api/packing-stock/restore
export const restoreTeaStock = async (req, res) => {
    try {
        const factoryRecords = await TeaReceived.find({});
        const otherRecords = await TeaTransactionOther.find({});
        const transferRecords = await StockTransfer.find({ status: 'COMPLETED' }); 

        const stockMap = {};

        const addToStockMap = (productName, sourceName, qty) => {
            if (!productName || qty <= 0) return;
            
            if (!stockMap[productName]) {
                stockMap[productName] = {};
            }
            if (!stockMap[productName][sourceName]) {
                stockMap[productName][sourceName] = 0;
            }
            stockMap[productName][sourceName] += qty;
        };

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

        transferRecords.forEach(record => {
            if (record.items && Array.isArray(record.items)) {
                let sourceName = record.source || "Handmade";
                if (sourceName.toLowerCase().includes('hand')) sourceName = 'Handmade';
                else if (sourceName.toLowerCase().includes('factory')) sourceName = 'Factory';
                else sourceName = 'Other';

                record.items.forEach(item => {
                    const productName = item.product; 
                    const qty = Number(item.receivedQtyKg) || 0; 
                    
                    addToStockMap(productName, sourceName, qty);
                });
            }
        });
        let restoredCount = 0;
        await PackingStock.deleteMany({});

        for (const [productName, sources] of Object.entries(stockMap)) {
            let stockBySourceArray = [];
            let totalBulkStockKg = 0;

            for (const [sourceName, transInAmount] of Object.entries(sources)) {
                stockBySourceArray.push({
                    sourceName: sourceName,
                    transInAmount: transInAmount,
                    issueAmount: 0,
                    quantityKg: transInAmount 
                });
                totalBulkStockKg += transInAmount;
            }

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