import TeaReceived from '../models/TeaReceivedModel.js'; 
import PackingStock from '../models/PackingStock.js'; 
import PendingTransfer from '../models/PendingTransfer.js'; // 🌟 අලුත් Pending Model එක Import කරන්න

// ==========================================
// 1. GET PENDING TRANSFERS (Factory එකෙන් එන ඒවා බලාගන්න)
// ==========================================
export const getPendingTransfers = async (req, res) => {
    try {
        const pendingTransfers = await PendingTransfer.find({ status: "Pending" }).sort({ date: -1 });
        res.status(200).json(pendingTransfers);
    } catch (error) {
        console.error('Error fetching pending transfers:', error);
        res.status(500).json({ message: "Server error fetching pending transfers" });
    }
};


// ==========================================
// 2. ACCEPT TRANSFER (With Cleaned Name Fix)
// ==========================================
export const acceptTransfer = async (req, res) => {
    try {
        // Frontend එකෙන් එවන cleanProductName එක ලබා ගැනීම
        const { transferId, receivedQtyKg, username, cleanProductName } = req.body;

        const pendingRecord = await PendingTransfer.findById(transferId);
        
        if (!pendingRecord || pendingRecord.status !== "Pending") {
            return res.status(400).json({ message: "Transfer record not found or already processed." });
        }

        const finalQty = Number(receivedQtyKg);
        if (finalQty <= 0) {
            return res.status(400).json({ message: "Received quantity must be greater than 0" });
        }

        // පිරිසිදු කළ නම (Frontend එකෙන් එව්වේ නැත්නම් Backend එකෙන්ම සුද්ද කරගනී)
        let rawName = pendingRecord.teaType && pendingRecord.teaType.trim() !== "" 
                      ? pendingRecord.teaType 
                      : pendingRecord.grade;
        
        const finalCleanName = cleanProductName || rawName.replace(/Local Sale/gi, '').replace(/\(Auto\)/gi, '').replace(/-/g, '').trim() || rawName;

        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const newTransactionNo = `PACK/TI/${year}${month}${day}-${randomNum}`;

        // 1. Tea Received Record එක හැදීම (පිරිසිදු කළ නමත් සමඟ)
        const newTeaReceived = new TeaReceived({
            date: d, 
            transactionNo: newTransactionNo,
            totalQtyKg: finalQty,
            receivedItems: [{
                grade: finalCleanName, 
                teaType: finalCleanName, // 🌟 මෙතනට පිරිසිදු කරපු නම කෙලින්ම save වේ 🌟
                qtyKg: finalQty,
            }]
        });

        // 2. STOCK UPDATE LOGIC
        let stock = await PackingStock.findOne({ productName: finalCleanName });

        if (stock) {
            let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
            if (sourceObj) {
                sourceObj.quantityKg += finalQty;
                sourceObj.transInAmount = (sourceObj.transInAmount || 0) + finalQty;
            } else {
                stock.stockBySource.push({ 
                    sourceName: 'Factory', 
                    quantityKg: finalQty,
                    transInAmount: finalQty, 
                    issueAmount: 0 
                });
            }
            stock.totalBulkStockKg += finalQty;
            await stock.save();
        } else {
            const newStock = new PackingStock({
                productName: finalCleanName, 
                stockBySource: [{ 
                    sourceName: 'Factory', 
                    quantityKg: finalQty,
                    transInAmount: finalQty, 
                    issueAmount: 0
                }],
                totalBulkStockKg: finalQty,
                packedItems: []
            });
            await newStock.save();
        }

        await newTeaReceived.save();

        // 3. Pending Record එක Update කිරීම
        pendingRecord.status = "Accepted";
        pendingRecord.acceptedBy = username || "Packing Officer";
        pendingRecord.acceptedDate = d;
        pendingRecord.receivedQtyKg = finalQty; 
        await pendingRecord.save();

        res.status(200).json({ message: 'Transfer Accepted & Stock Updated Successfully!', data: newTeaReceived });

    } catch (error) {
        console.error('Error accepting transfer:', error);
        res.status(500).json({ message: 'Server error failed to accept transfer', error: error.message });
    }
};

// ==========================================
// 🌟 අලුත්: REJECT TRANSFER FUNCTION 🌟
// ==========================================
export const rejectTransfer = async (req, res) => {
    try {
        const { transferId, username } = req.body;
        
        const pendingRecord = await PendingTransfer.findById(transferId);
        
        if (!pendingRecord) {
            return res.status(404).json({ message: "Transfer record not found." });
        }

        // Record එක Rejected විදිහට Mark කරනවා. (Delete කරන්නේ නැහැ history එක තියාගන්න)
        pendingRecord.status = "Rejected";
        pendingRecord.acceptedBy = username || "Packing Officer";
        pendingRecord.acceptedDate = new Date();
        
        await pendingRecord.save();

        res.status(200).json({ message: "Transfer rejected successfully" });
    } catch (error) {
        console.error('Error rejecting transfer:', error);
        res.status(500).json({ message: 'Server error failed to reject transfer', error: error.message });
    }
};

// ==========================================
// 3. GET ALL TEA RECEIVED RECORDS
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

// ==========================================
// 5. UPDATE TEA RECEIVED RECORD (Auto Stock Update එක්ක)
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
        record.receivedItems = receivedItems; // මෙහිදී Frontend එකෙන් teaType එකත් සමගම එවන නිසා එය නිරායාසයෙන්ම save වේ
        if (updatedBy) record.updatedBy = updatedBy;

        await record.save();
        res.status(200).json(record);

    } catch (error) {
        res.status(500).json({ message: 'Error updating record', error: error.message });
    }
};

// ==========================================
// 6. CREATE MANUAL TEA RECEIVED RECORD (Updated)
// ==========================================
export const createTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems } = req.body;
        
        // receivedItems වල teaType ඇතුලත් කර එවන බැවින් එය එලෙසම DB එකට යයි
        const newTeaReceived = new TeaReceived({
            date,
            transactionNo,
            totalQtyKg,
            receivedItems, 
            isManual: true
        });

        // Stock Update Logic
        for (const item of receivedItems) {
            const productName = item.grade;
            const incomingQty = Number(item.qtyKg || 0);

            let stock = await PackingStock.findOne({ productName: productName });
            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Manual');
                if (sourceObj) {
                    sourceObj.quantityKg += incomingQty;
                    sourceObj.transInAmount += incomingQty;
                } else {
                    stock.stockBySource.push({ sourceName: 'Manual', quantityKg: incomingQty, transInAmount: incomingQty, issueAmount: 0 });
                }
                stock.totalBulkStockKg += incomingQty;
                await stock.save();
            } else {
                const newStock = new PackingStock({
                    productName: productName,
                    stockBySource: [{ sourceName: 'Manual', quantityKg: incomingQty, transInAmount: incomingQty, issueAmount: 0 }],
                    totalBulkStockKg: incomingQty
                });
                await newStock.save();
            }
        }

        await newTeaReceived.save();
        res.status(201).json(newTeaReceived);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};