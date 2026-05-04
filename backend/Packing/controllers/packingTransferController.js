import StockTransfer from "../../models/StockTransfer.js";
import PackingStock from "../models/PackingStock.js"; // <-- Import the Packing Stock model

// @route   GET /api/packing/transfers/pending
export const getPendingTransfersForPacking = async (req, res) => {
    try {
        const pendingTransfers = await StockTransfer.find({ status: 'PENDING' }).sort({ dateIssued: 1 });
        res.status(200).json(pendingTransfers);
    } catch (error) {
        console.error('Error fetching pending transfers:', error);
        res.status(500).json({ message: 'Server error while fetching pending stock.' });
    }
};

// @desc    Receive a transfer (Packing officer updates with actual Kg)
// @route   PUT /api/packing/transfers/:id/receive
export const receiveTransferInPacking = async (req, res) => {
    try {
        const { id } = req.params;
        const { receivedItems, remarks } = req.body; 

        // --- NEW LOGIC: Grab the logged-in user's name from the token ---
        const currentUserName = req.user?.name || req.user?.username || 'Packing Officer';

        const transfer = await StockTransfer.findById(id);

        if (!transfer) return res.status(404).json({ message: 'Transfer not found.' });
        if (transfer.status === 'COMPLETED') return res.status(400).json({ message: 'Already received.' });

        // Update items with actual received quantities
        transfer.items.forEach(item => {
            const receivedItem = receivedItems.find(r => r._id === item._id.toString());
            if (receivedItem) {
                item.receivedQtyKg = Number(receivedItem.receivedQtyKg);
            }
        });

        transfer.status = 'COMPLETED';
        transfer.dateReceived = new Date();
        
        // --- NEW LOGIC: Stamp the real name into the database ---
        transfer.receivedBy = currentUserName; 
        
        if (remarks) transfer.remarks = remarks;

        const updatedTransfer = await transfer.save();

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC (UPDATED FOR NEW SCHEMA) 👇
        for (const item of transfer.items) {
            // Skip items where receivedQtyKg is missing or 0
            if (!item.receivedQtyKg || item.receivedQtyKg <= 0) continue; 

            // Find the master stock record for this product 
            const productName = item.grade || item.productName || item.product;
            
            // dynamically grab the source from the transfer record (e.g., 'Handmade')
            const incomingSource = transfer.source || 'Handmade'; // Default fallback added
            
            const incomingQty = Number(item.receivedQtyKg);

            // Search BY PRODUCT NAME ONLY (since product name is unique now)
            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                // Product එක කලින් තියෙනවා නම්, අදාළ Source එක Array එකේ තියෙනවද බලනවා
                let sourceObj = stock.stockBySource.find(s => s.sourceName === incomingSource);
                
                if (sourceObj) {
                    // Source එකත් තියෙනවා නම් quantity එකතු කරනවා
                    sourceObj.quantityKg += incomingQty;
                    // 👇 අලුතින්: Trans-In Amount එකට එකතු කිරීම 👇
                    sourceObj.transInAmount = (sourceObj.transInAmount || 0) + incomingQty;
                } else {
                    // අලුත් Source එකක් නම් අලුතින් Array එකට දානවා (Trans-In එකත් එක්කම)
                    stock.stockBySource.push({ 
                        sourceName: incomingSource, 
                        quantityKg: incomingQty,
                        transInAmount: incomingQty,
                        issueAmount: 0
                    });
                }
                
                // මුළු ප්‍රමාණයටත් එකතු කරනවා
                stock.totalBulkStockKg += incomingQty;
                await stock.save();
                
            } else {
                // සම්පූර්ණයෙන්ම අලුත් Product එකක් නම්
                const newStock = new PackingStock({
                    productName: productName,
                    stockBySource: [{ 
                        sourceName: incomingSource, 
                        quantityKg: incomingQty,
                        transInAmount: incomingQty, // අලුතින් එකතු විය
                        issueAmount: 0
                    }],
                    totalBulkStockKg: incomingQty,
                    packedItems: []
                });
                await newStock.save();
            }
        }
        // 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        res.status(200).json(updatedTransfer);

    } catch (error) {
        console.error('Error receiving transfer:', error);
        res.status(500).json({ message: 'Server error while receiving transfer.' });
    }
};

// @desc    Get all COMPLETED transfers (Trans In History)
// @route   GET /api/packing/transfers/completed
export const getCompletedTransfers = async (req, res) => {
    try {
        const completedTransfers = await StockTransfer.find({ status: 'COMPLETED' }).sort({ dateReceived: -1 });
        res.status(200).json(completedTransfers);
    } catch (error) {
        console.error('Error fetching transfer history:', error);
        res.status(500).json({ message: 'Server error while fetching history.' });
    }
};