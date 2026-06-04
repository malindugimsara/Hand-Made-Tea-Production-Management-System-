import TeaTransactionOther from '../models/TeaTransactionOther.js';
import PackingStock from '../models/PackingStock.js'; // <-- PackingStock model එක අනිවාර්යයෙන් import කරන්න

export const createTransaction = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, items, partyName, createdBy } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No received items provided' });
        }

        const newTransaction = new TeaTransactionOther({
            date,
            transactionNo,
            totalQtyKg,
            items,
            partyName,
            createdBy
        });

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC (OTHER PARTY) 👇
        for (const item of items) {
            const productName = item.grade;
            const incomingQty = Number(item.qtyKg || 0);

            if (incomingQty <= 0) continue; 

            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Other');
                if (sourceObj) {
                    sourceObj.quantityKg += incomingQty;
                    sourceObj.transInAmount = (sourceObj.transInAmount || 0) + incomingQty;
                } else {
                    stock.stockBySource.push({ 
                        sourceName: 'Other', 
                        quantityKg: incomingQty,
                        transInAmount: incomingQty,
                        issueAmount: 0 
                    });
                }
               
                stock.totalBulkStockKg += incomingQty;
                await stock.save();

            } else {
             
                const newStock = new PackingStock({
                    productName: productName,
                    stockBySource: [{ 
                        sourceName: 'Other', 
                        quantityKg: incomingQty,
                        transInAmount: incomingQty, 
                        issueAmount: 0 
                    }],
                    totalBulkStockKg: incomingQty,
                    packedItems: []
                });
                await newStock.save();
            }
        }
        // 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        const savedTransaction = await newTransaction.save();
        res.status(201).json({ success: true, data: savedTransaction });

    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


export const getAllTransactions = async (req, res) => {
    try {
        const transactions = await TeaTransactionOther.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getTransactionById = async (req, res) => {
    try {
        const transaction = await TeaTransactionOther.findById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        res.status(200).json({ success: true, data: transaction });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


export const updateTransaction = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, items, partyName, updatedBy } = req.body;

        // 1. පරණ Record එක Database එකෙන් ලබා ගැනීම
        const oldRecord = await TeaTransactionOther.findById(req.params.id);

        if (!oldRecord) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        // 👇 AUTOMATED STOCK UPDATE LOGIC 👇
        
        // 2. අලුත් Items වල Quantity වෙනස ගණනය කිරීම
        for (const newItem of items) {
            const productName = newItem.grade;
            const newQty = Number(newItem.qtyKg || 0);

            // පරණ record එකෙන් මේ item එක හොයාගන්නවා
            const oldItem = oldRecord.items.find(i => i.grade === productName);
            const oldQty = oldItem ? Number(oldItem.qtyKg || 0) : 0;

            const difference = newQty - oldQty; // කොච්චර වෙනස් වෙලාද (අලුත් ගාණ - පරණ ගාණ)

            if (difference !== 0) {
                let stock = await PackingStock.findOne({ productName: productName });

                if (stock) {
                    let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Other');
                    if (sourceObj) {
                        sourceObj.quantityKg += difference;
                        sourceObj.transInAmount += difference;
                        
                        if(sourceObj.quantityKg < 0) sourceObj.quantityKg = 0;
                        if(sourceObj.transInAmount < 0) sourceObj.transInAmount = 0;
                    } else {
                        stock.stockBySource.push({
                            sourceName: 'Other',
                            quantityKg: difference > 0 ? difference : 0,
                            transInAmount: difference > 0 ? difference : 0,
                            issueAmount: 0
                        });
                    }
                    stock.totalBulkStockKg += difference;
                    if(stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
                    
                    await stock.save();
                } else if (difference > 0) {
                    // Stock එකක් කලින් තිබිලම නැත්නම් අලුතින් හදනවා
                    const newStock = new PackingStock({
                        productName: productName,
                        stockBySource: [{
                            sourceName: 'Other',
                            quantityKg: difference,
                            transInAmount: difference,
                            issueAmount: 0
                        }],
                        totalBulkStockKg: difference,
                        packedItems: []
                    });
                    await newStock.save();
                }
            }
        }

        // 3. Edit කරද්දී පරණ Item එකක් සම්පූර්ණයෙන්ම Delete කරලා නම් ඒක Stock එකෙන් අඩු කිරීම
        for (const oldItem of oldRecord.items) {
            const isStillPresent = items.find(i => i.grade === oldItem.grade);
            
            if (!isStillPresent) {
                const oldQty = Number(oldItem.qtyKg || 0);
                
                let stock = await PackingStock.findOne({ productName: oldItem.grade });
                if (stock) {
                    let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Other');
                    if (sourceObj) {
                        sourceObj.quantityKg -= oldQty;
                        sourceObj.transInAmount -= oldQty;
                        
                        if(sourceObj.quantityKg < 0) sourceObj.quantityKg = 0;
                        if(sourceObj.transInAmount < 0) sourceObj.transInAmount = 0;
                    }
                    stock.totalBulkStockKg -= oldQty;
                    if(stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
                    
                    await stock.save();
                }
            }
        }
        // 👆 END OF AUTOMATED STOCK UPDATE LOGIC 👆

        // 4. අලුත් දත්ත සමඟ Record එක Update කිරීම
        oldRecord.date = date;
        oldRecord.transactionNo = transactionNo;
        oldRecord.totalQtyKg = totalQtyKg;
        oldRecord.items = items;
        oldRecord.partyName = partyName;
        if (updatedBy) oldRecord.updatedBy = updatedBy;

        const updatedTransaction = await oldRecord.save();

        res.status(200).json({ success: true, data: updatedTransaction });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const deleteTransaction = async (req, res) => {
    try {
        // 1. Find the transaction BEFORE deleting it
        const transaction = await TeaTransactionOther.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        // 2. Reverse the stock logic
        if (transaction.items && transaction.items.length > 0) {
            for (const item of transaction.items) {
                // Determine the quantity to remove (check your schema for the exact field name)
                const qtyToRemove = Number(item.qtyKg || item.totalQtyKg || item.quantityKg || 0);
                
                if (qtyToRemove <= 0) continue;

                // Find the corresponding stock document
                const stock = await PackingStock.findOne({ productName: item.grade || item.productName || item.product });

                if (stock) {
                    // Reduce the quantity from the 'Other' source
                    const otherSource = stock.stockBySource?.find(s => s.sourceName === 'Other');
                    if (otherSource) {
                        otherSource.quantityKg -= qtyToRemove;
                        
                        otherSource.transInAmount -= qtyToRemove; 

                        
                        if (otherSource.quantityKg < 0) otherSource.quantityKg = 0;
                        if (otherSource.transInAmount < 0) otherSource.transInAmount = 0;
                    }

                    // Reduce the grand total bulk stock
                    stock.totalBulkStockKg -= qtyToRemove;
                    if (stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;

                    await stock.save();
                } else {
                    console.warn(`Could not find stock for product: ${item.grade} to reverse deletion.`);
                }
            }
        }

        // 3. Delete the transaction record
        await transaction.deleteOne();

        res.status(200).json({ success: true, message: "Transaction deleted and stock reversed successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};