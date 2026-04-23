import StockTransfer from "../../models/StockTransfer.js";

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
        const { receivedItems, remarks, receivedBy } = req.body;

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
        transfer.receivedBy = receivedBy || 'Packing Officer';
        if (remarks) transfer.remarks = remarks;

        const updatedTransfer = await transfer.save();
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