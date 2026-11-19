import mongoose from "mongoose";
import StockTransfer from "../../models/StockTransfer.js";
import PackingStock from "../models/PackingStock.js";
import TeaReceived from "../models/TeaReceivedModel.js";
import TeaTransactionOther from "../models/TeaTransactionOther.js";

// @desc    Restore Tea Stock from all Trans In records (Factory, Other & Handmade Transfers)
// @route   POST /api/packing-stock/restore
export const restoreTeaStock = async (req, res) => {
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch {
        // Fallback for standalone MongoDB environments without replica sets
        session = null;
    }

    try {
        const sessionOption = session ? { session } : {};

        // 1. Fetch records
        const factoryRecords = await TeaReceived.find({}, null, sessionOption);
        const otherRecords = await TeaTransactionOther.find({}, null, sessionOption);
        const transferRecords = await StockTransfer.find({ status: 'COMPLETED' }, null, sessionOption); 

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

        // 2. Prepare all new stock documents in memory BEFORE touching the database
        const newStockDocs = [];
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

            newStockDocs.push({
                productName: productName,
                stockBySource: stockBySourceArray,
                totalBulkStockKg: totalBulkStockKg,
                packedItems: []
            });
        }

        // 3. Atomically wipe old stock and insert new batch inside transaction
        await PackingStock.deleteMany({}, sessionOption);

        if (newStockDocs.length > 0) {
            await PackingStock.insertMany(newStockDocs, sessionOption);
        }

        // 4. Commit transaction
        if (session) {
            await session.commitTransaction();
        }

        res.status(200).json({ 
            message: "Tea Stock successfully restored from Factory, Other, and Handmade Transfer sources!", 
            restoredProductsCount: newStockDocs.length 
        });

    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch (abortErr) {
                console.error("Error aborting transaction:", abortErr);
            }
        }
        console.error("Error restoring tea stock:", error);
        res.status(500).json({ error: "Server Error", details: error.message });
    } finally {
        if (session) {
            session.endSession();
        }
    }
};