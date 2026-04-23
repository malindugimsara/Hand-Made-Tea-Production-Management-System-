import StockTransfer from '../models/StockTransfer.js';

// @desc    Create a new stock transfer (Handmade -> Packing)
// @route   POST /api/handmade/transfers
export const createHandmadeTransfer = async (req, res) => {
    try {
        const { items, issuedBy, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'At least one item is required.' });
        }

        // Generate Transfer ID (e.g., TR-20260423-XXXX)
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const transferId = `TR-${dateStr}-${randomNum}`;

        const newTransfer = new StockTransfer({
            transferId,
            items: items.map(item => ({
                product: item.product,
                issuedQtyKg: Number(item.issuedQtyKg)
            })),
            issuedBy: issuedBy || 'Handmade Officer',
            remarks,
            status: 'PENDING'
        });

        const savedTransfer = await newTransfer.save();
        res.status(201).json(savedTransfer);

    } catch (error) {
        console.error('Error creating handmade transfer:', error);
        res.status(500).json({ message: 'Server error while sending stock.' });
    }
};