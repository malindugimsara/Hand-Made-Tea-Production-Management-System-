import TeaReceived from '../models/TeaReceivedModel.js'; 
import PackingStock from '../models/PackingStock.js'; 

// ==========================================
// 1. GET ALL TEA RECEIVED RECORDS
// ==========================================
export const getTeaReceivedRecords = async (req, res) => {
    try {
        const records = await TeaReceived.find().sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        console.error('Error fetching tea received records:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// ==========================================
// 2. CREATE TEA RECEIVED RECORD
// ==========================================
export const createTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems, username } = req.body;
        
        const newTeaReceived = new TeaReceived({
            date,
            transactionNo,
            totalQtyKg,
            receivedItems, 
            acceptedBy: username || "Packing Staff" 
        });

        // Stock Update Logic
        for (const item of receivedItems) {
            const productName = item.grade;
            const incomingQty = Number(item.qtyKg || 0);

            let stock = await PackingStock.findOne({ productName: productName });
            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                if (sourceObj) {
                    sourceObj.quantityKg += incomingQty;
                    sourceObj.transInAmount += incomingQty;
                } else {
                    stock.stockBySource.push({ sourceName: 'Factory', quantityKg: incomingQty, transInAmount: incomingQty, issueAmount: 0 });
                }
                stock.totalBulkStockKg += incomingQty;
                await stock.save();
            } else {
                const newStock = new PackingStock({
                    productName: productName,
                    stockBySource: [{ sourceName: 'Factory', quantityKg: incomingQty, transInAmount: incomingQty, issueAmount: 0 }],
                    totalBulkStockKg: incomingQty,
                    packedItems: []
                });
                await newStock.save();
            }
        }

        await newTeaReceived.save();
        res.status(201).json(newTeaReceived);

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================================
// 3. UPDATE TEA RECEIVED RECORD (Auto Stock Update එක්ක)
// ==========================================
export const updateTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems, updatedBy } = req.body;
        const record = await TeaReceived.findById(req.params.id);

        if (!record) return res.status(404).json({ message: 'Record not found' });

        // Stock Reversal Logic (Old items)
        for (const oldItem of record.receivedItems) {
            const productName = oldItem.grade;
            const oldQty = Number(oldItem.qtyKg || 0);
            let stock = await PackingStock.findOne({ productName: productName });
            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                if (sourceObj) {
                    sourceObj.quantityKg -= oldQty;
                    sourceObj.transInAmount -= oldQty;
                }
                stock.totalBulkStockKg -= oldQty;
                await stock.save();
            }
        }

        // Add New items and update Stock
        for (const newItem of receivedItems) {
            const productName = newItem.grade;
            const newQty = Number(newItem.qtyKg || 0);
            
            let stock = await PackingStock.findOne({ productName: productName });
            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                if (sourceObj) {
                    sourceObj.quantityKg += newQty;
                    sourceObj.transInAmount += newQty;
                } else {
                    stock.stockBySource.push({ sourceName: 'Factory', quantityKg: newQty, transInAmount: newQty, issueAmount: 0 });
                }
                stock.totalBulkStockKg += newQty;
                await stock.save();
            }
        }

        record.date = date;
        record.transactionNo = transactionNo;
        record.totalQtyKg = totalQtyKg;
        record.receivedItems = receivedItems; 
        if (updatedBy) record.updatedBy = updatedBy;

        await record.save();
        res.status(200).json(record);

    } catch (error) {
        res.status(500).json({ message: 'Error updating record', error: error.message });
    }
};

// ==========================================
// 4. DELETE TEA RECEIVED RECORD (Auto Reversal එක්ක)
// ==========================================
export const deleteTeaReceivedRecord = async (req, res) => {
    try {
        const record = await TeaReceived.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // 👇 AUTOMATED STOCK REVERSAL LOGIC 👇
        for (const item of record.receivedItems) {
            const productName = item.product || item.grade || item.productName;
            const qtyToRemove = Number(item.qtyKg || item.weight || item.receivedQtyKg || 0);

            if (qtyToRemove <= 0) continue;

            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                
                if (sourceObj) {
                    sourceObj.quantityKg -= qtyToRemove;
                    sourceObj.transInAmount -= qtyToRemove; 
                    
                    if(sourceObj.quantityKg < 0) sourceObj.quantityKg = 0;
                    if(sourceObj.transInAmount < 0) sourceObj.transInAmount = 0;
                }
                
                stock.totalBulkStockKg -= qtyToRemove;
                if(stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
                
                await stock.save();
            }
        }
        // 👆 END OF AUTOMATED STOCK REVERSAL 👆

        await record.deleteOne();
        res.status(200).json({ message: 'Record removed successfully' });
    } catch (error) {
        console.error('Error deleting tea received record:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};