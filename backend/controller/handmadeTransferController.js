import StockTransfer from '../models/StockTransfer.js';
import ProductionSummary from '../models/ProductionSummary.js';

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

export const getStockSummary = async (req, res) => {
    try {
        const { date } = req.query; // e.g., '2026-04-23'
        
        // 1. Get the YYYY-MM format to match your ProductionSummary schema
        const targetMonth = date.substring(0, 7); 
        
        // Target exact end of day for StockTransfers
        const targetDate = new Date(date);
        targetDate.setHours(23, 59, 59, 999);

        // 2. Fetch all Production Summaries up to and including the target month
        const productionData = await ProductionSummary.find({
            reportMonth: { $lte: targetMonth }
        });

        // Sum up all the totalMT (Made Tea) from every matching month
        const totalProduced = {};
        productionData.forEach(summary => {
            summary.teaSummaries.forEach(tea => {
                if (!totalProduced[tea.type]) totalProduced[tea.type] = 0;
                totalProduced[tea.type] += tea.totalMT;
            });
        });

        // 3. Calculate Total Stock already Transferred OUT up to the exact selected date
        const transferTotals = await StockTransfer.aggregate([
            {
                $match: {
                    dateIssued: { $lte: targetDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalTransferred: { $sum: "$items.issuedQtyKg" }
                }
            }
        ]);

        // 4. Calculate Available Stock = (Total Produced) - (Total Transferred)
        const availableStock = { ...totalProduced };

        transferTotals.forEach(trans => {
            if (availableStock[trans._id] !== undefined) {
                availableStock[trans._id] -= trans.totalTransferred;
            } else {
                // Edge case: if there is a transfer but no recorded production
                availableStock[trans._id] = -(trans.totalTransferred);
            }
        });

        // 5. Clean up the data (Only send back products that actually have > 0 stock)
        const finalStock = {};
        for (const [teaType, qty] of Object.entries(availableStock)) {
            if (qty > 0) {
                // Ensure floating point math doesn't leave weird decimals (e.g. 0.00000001)
                finalStock[teaType] = Math.round(qty * 1000) / 1000; 
            }
        }

        res.status(200).json(finalStock);

    } catch (error) {
        console.error('Error fetching stock summary:', error);
        res.status(500).json({ message: 'Server error while calculating stock.' });
    }
};