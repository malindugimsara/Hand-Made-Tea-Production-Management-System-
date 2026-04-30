import TeaReceived from '../models/TeaReceivedModel.js'; 
import PackingStock from '../models/PackingStock.js'; 

// @desc    Create new tea received record
// @route   POST /api/tea-received
// @access  Private
export const createTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems } = req.body;

        if (!receivedItems || receivedItems.length === 0) {
            return res.status(400).json({ message: 'No received items provided' });
        }

        const newTeaReceived = new TeaReceived({
            date,
            transactionNo,
            totalQtyKg,
            receivedItems,
        });

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC (FACTORY) 👇
        for (const item of receivedItems) {
            const productName = item.product || item.grade || item.productName;
            const incomingQty = Number(item.qtyKg || item.weight || item.receivedQtyKg || 0);

            if (incomingQty <= 0) continue; 

            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                
                if (sourceObj) {
                    sourceObj.quantityKg += incomingQty;
                    // අලුතින් Trans-In Amount එකට එකතු කරයි
                    sourceObj.transInAmount = (sourceObj.transInAmount || 0) + incomingQty;
                } else {
                    stock.stockBySource.push({ 
                        sourceName: 'Factory', 
                        quantityKg: incomingQty,
                        transInAmount: incomingQty, // පළමු වතාවට එද්දිත් Trans-In එක සටහන් කරයි
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
                        transInAmount: incomingQty, // පළමු වතාවට එද්දිත් Trans-In එක සටහන් කරයි
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
        console.error('Error saving tea received record:', error);
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
};

// @desc    Get all tea received records
// @route   GET /api/tea-received
// @access  Private
export const getTeaReceivedRecords = async (req, res) => {
    try {
        const records = await TeaReceived.find().sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        console.error('Error fetching tea received records:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Delete a tea received record
// @route   DELETE /api/tea-received/:id
// @access  Private
export const deleteTeaReceivedRecord = async (req, res) => {
    try {
        // මකන්න කලින් Record එක හොයාගන්නවා
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
                    // ගාණ ආපහු අඩු කරනවා
                    sourceObj.quantityKg -= qtyToRemove;
                    sourceObj.transInAmount -= qtyToRemove; 
                    
                    // සෘණ වීම වැළැක්වීම
                    if(sourceObj.quantityKg < 0) sourceObj.quantityKg = 0;
                    if(sourceObj.transInAmount < 0) sourceObj.transInAmount = 0;
                }
                
                stock.totalBulkStockKg -= qtyToRemove;
                if(stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;
                
                await stock.save();
            }
        }
        // 👆 END OF AUTOMATED STOCK REVERSAL 👆

        // Stock එක Reverse කළාට පස්සේ අදාළ Record එක මකා දමනවා
        await record.deleteOne();
        res.status(200).json({ message: 'Record removed successfully' });
    } catch (error) {
        console.error('Error deleting tea received record:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};

// @desc    Update a tea received record
// @route   PUT /api/tea-received/:id
// @access  Private
export const updateTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems, updatedBy } = req.body;

        const record = await TeaReceived.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Note: Update කරද්දීත් Stock එක Reverse කරලා අලුත් ගාණ දාන්න ඕනේ නම් ඒක ලියන්න වෙනවා.
        // දැනට පරණ විදියටම Update වෙනවා. (මෙය සංකීර්ණ නිසා සාමාන්‍යයෙන් Update කරන්නේ නැතුව Delete කරලා ආයේ දාන්න කියනවා.)

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