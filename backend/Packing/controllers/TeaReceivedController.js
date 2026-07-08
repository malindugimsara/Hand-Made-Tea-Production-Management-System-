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
// 2. ACCEPT TRANSFER & AUTO STOCK UPDATE (Manual Create වෙනුවට)
// ==========================================
export const acceptTransfer = async (req, res) => {
    try {
        const { transferId, receivedQtyKg, username } = req.body;

        // 1. Pending Record එක හොයාගන්නවා
        const pendingRecord = await PendingTransfer.findById(transferId);
        
        if (!pendingRecord || pendingRecord.status !== "Pending") {
            return res.status(400).json({ message: "Transfer record not found or already processed." });
        }

        const finalQty = Number(receivedQtyKg);
        if (finalQty <= 0) {
            return res.status(400).json({ message: "Received quantity must be greater than 0" });
        }

        // 2. Tea Received (Trans In) Record එක Auto හදනවා
        const newTeaReceived = new TeaReceived({
            date: new Date(), 
            transactionNo: `PACK/TI/${pendingRecord.transferNo}`,
            totalQtyKg: finalQty,
            receivedItems: [{
                grade: pendingRecord.grade,
                qtyKg: finalQty,
            }]
        });

        // 3. 👇 AUTOMATED INVENTORY ADDITION LOGIC (Packing Stock Update) 👇
        const productName = pendingRecord.grade;
        let stock = await PackingStock.findOne({ productName: productName });

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
                productName: productName,
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
        // 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        await newTeaReceived.save();

        // 4. Pending Record එකේ Status එක Accepted කියලා වෙනස් කරනවා
        pendingRecord.status = "Accepted";
        pendingRecord.acceptedBy = username || "Packing Officer";
        pendingRecord.acceptedDate = new Date();
        // Packing officer කිරපු බර (අවශ්‍යනම් Pending table එකෙත් save කරගන්න පුළුවන් වෙනස බලාගන්න)
        pendingRecord.receivedQtyKg = finalQty; 
        await pendingRecord.save();

        res.status(200).json({ message: 'Transfer Accepted & Stock Updated Successfully!', data: newTeaReceived });

    } catch (error) {
        console.error('Error accepting transfer:', error);
        res.status(500).json({ message: 'Server error failed to accept transfer', error: error.message });
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

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // 👇 AUTOMATED STOCK UPDATE LOGIC 👇
        // 1. අලුත් Items වල Quantity වෙනස ගණනය කිරීම
        for (const newItem of receivedItems) {
            const productName = newItem.grade || newItem.product || newItem.productName;
            const newQty = Number(newItem.qtyKg || newItem.weight || newItem.receivedQtyKg || 0);

            const oldItem = record.receivedItems.find(i => (i.grade || i.product || i.productName) === productName);
            const oldQty = oldItem ? Number(oldItem.qtyKg || oldItem.weight || oldItem.receivedQtyKg || 0) : 0;

            const difference = newQty - oldQty; 

            if (difference !== 0) {
                let stock = await PackingStock.findOne({ productName: productName });

                if (stock) {
                    let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                    if (sourceObj) {
                        sourceObj.quantityKg += difference;
                        sourceObj.transInAmount += difference;
                        
                        if(sourceObj.quantityKg < 0) sourceObj.quantityKg = 0;
                        if(sourceObj.transInAmount < 0) sourceObj.transInAmount = 0;
                    } else {
                        stock.stockBySource.push({
                            sourceName: 'Factory',
                            quantityKg: difference > 0 ? difference : 0,
                            transInAmount: difference > 0 ? difference : 0,
                            issueAmount: 0
                        });
                    }
                    stock.totalBulkStockKg += difference;
                    if(stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
                    
                    await stock.save();
                } else if (difference > 0) {
                    const newStock = new PackingStock({
                        productName: productName,
                        stockBySource: [{
                            sourceName: 'Factory',
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

        // 2. Edit කරද්දී පරණ Item එකක් සම්පූර්ණයෙන්ම Delete කරලා නම් ඒක Stock එකෙන් අඩු කිරීම
        for (const oldItem of record.receivedItems) {
            const productName = oldItem.grade || oldItem.product || oldItem.productName;
            const isStillPresent = receivedItems.find(i => (i.grade || i.product || i.productName) === productName);
            
            if (!isStillPresent) {
                const oldQty = Number(oldItem.qtyKg || oldItem.weight || oldItem.receivedQtyKg || 0);
                
                let stock = await PackingStock.findOne({ productName: productName });
                if (stock) {
                    let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
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

        record.date = date;
        record.transactionNo = transactionNo;
        record.totalQtyKg = totalQtyKg;
        record.receivedItems = receivedItems;
        if (updatedBy) record.updatedBy = updatedBy;

        const updatedRecord = await record.save();
        res.status(200).json(updatedRecord);

    } catch (error) {
        console.error('Error updating tea received record:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};

// ==========================================
// 6. CREATE MANUAL TEA RECEIVED RECORD
// ==========================================
export const createTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems } = req.body;

        if (!receivedItems || receivedItems.length === 0) {
            return res.status(400).json({ message: 'No received items provided' });
        }

        // 1. New Record එක හදනවා
        const newTeaReceived = new TeaReceived({
            date,
            transactionNo,
            totalQtyKg,
            receivedItems,
            isManual: true // මෙය manual එකක් බව හඳුනාගැනීමට
        });

        // 2. 👇 AUTOMATED INVENTORY ADDITION LOGIC 👇
        for (const item of receivedItems) {
            const productName = item.grade || item.product || item.productName;
            const incomingQty = Number(item.qtyKg || item.weight || item.receivedQtyKg || 0);

            if (incomingQty <= 0) continue; 

            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                // Manual entry සඳහා වෙනම 'Manual' හෝ 'Other' කියලා source එකක් ගන්නවා
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Manual');
                
                if (sourceObj) {
                    sourceObj.quantityKg += incomingQty;
                    sourceObj.transInAmount = (sourceObj.transInAmount || 0) + incomingQty;
                } else {
                    stock.stockBySource.push({ 
                        sourceName: 'Factory', 
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
                        sourceName: 'Factory', 
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

        const savedRecord = await newTeaReceived.save();
        res.status(201).json(savedRecord);

    } catch (error) {
        console.error('Error saving manual tea received record:', error);
        res.status(500).json({ message: 'Server error failed to save manual record', error: error.message });
    }
};