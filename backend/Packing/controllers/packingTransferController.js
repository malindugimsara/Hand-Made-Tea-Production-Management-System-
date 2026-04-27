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

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC 👇
        for (const item of transfer.items) {
            // Skip items where receivedQtyKg is missing or 0
            if (!item.receivedQtyKg || item.receivedQtyKg <= 0) continue; 

            // Find the master stock record for this product 
            const productName = item.grade || item.productName || item.product;
            
            // dynamically grab the source from the transfer record (default to Factory)
            const incomingSource = transfer.source || 'Factory'; 
            
            // 👇 THIS IS THE FIX: SEARCH BY BOTH PRODUCT AND SOURCE 👇
            let stock = await PackingStock.findOne({ 
                productName: productName, 
                source: incomingSource 
            });

            if (stock) {
                // If it exists from this specific source, add to it
                stock.bulkStockKg += Number(item.receivedQtyKg);
                await stock.save();
            } else {
                // If this is the very first time receiving this grade from this specific source, create it
                const newStock = new PackingStock({
                    productName: productName,
                    source: incomingSource, 
                    bulkStockKg: Number(item.receivedQtyKg),
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