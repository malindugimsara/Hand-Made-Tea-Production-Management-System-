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

        const updatedTransaction = await TeaTransactionOther.findByIdAndUpdate(
            req.params.id,
            { date, transactionNo, totalQtyKg, items, partyName, updatedBy },
            { new: true, runValidators: true } // අලුත් data එක return කරන්න සහ schema validation run කරන්න
        );

        if (!updatedTransaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

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