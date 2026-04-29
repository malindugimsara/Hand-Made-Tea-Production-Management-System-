import TeaTransactionOther from '../models/TeaTransactionOther.js';
import PackingStock from '../models/PackingStock.js'; // <-- PackingStock model එක අනිවාර්යයෙන් import කරන්න

// 1. අලුත් Transaction එකක් ඇතුළත් කිරීම (Create)
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

    // නමින් පමණක් Stock එක සොයයි
    let stock = await PackingStock.findOne({ productName: productName });

    if (stock) {
        // කලින් මේ නමින් තේ එකක් Database එකේ තිබේ නම්:
        let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Other');
        if (sourceObj) {
            // 'Other' කියන source එක දැනටමත් තිබේ නම් එයට අලුත් ප්‍රමාණය එකතු කරයි
            sourceObj.quantityKg += incomingQty;
        } else {
            // 'Other' එකෙන් එන පළමු වතාව නම් අලුතින් Array එකට දමයි
            stock.stockBySource.push({ sourceName: 'Other', quantityKg: incomingQty });
        }
        // Grand Total එකටත් එකතු කරයි
        stock.totalBulkStockKg += incomingQty;
        await stock.save();

    } else {
        // මේ නමින් කිසිම තේ එකක් කලින් තිබිලා නැත්නම් අලුතින් සාදයි
        const newStock = new PackingStock({
            productName: productName,
            stockBySource: [{ sourceName: 'Other', quantityKg: incomingQty }],
            totalBulkStockKg: incomingQty,
            packedItems: []
        });
        await newStock.save();
    }
}
// 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        // Transaction record එක save කිරීම
        const savedTransaction = await newTransaction.save();
        res.status(201).json({ success: true, data: savedTransaction });

    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 2. සියලුම Transactions ලබා ගැනීම (Get All)
export const getAllTransactions = async (req, res) => {
    try {
        // අලුත්ම ඒවා මුලින්ම එන විදිහට sort කර ඇත
        const transactions = await TeaTransactionOther.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 3. නිශ්චිත Transaction එකක් ID එක මගින් ලබා ගැනීම (Get by ID)
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

// 4. Transaction එකක් Update කිරීම
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

// 5. Transaction එකක් Delete කිරීම
export const deleteTransaction = async (req, res) => {
    try {
        const deletedTransaction = await TeaTransactionOther.findByIdAndDelete(req.params.id);

        if (!deletedTransaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        res.status(200).json({ success: true, message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};