import StockTransfer from '../models/StockTransfer.js';
import ProductionSummary from '../models/ProductionSummary.js';

// @desc    Create a new stock transfer (Handmade -> Packing)
// @route   POST /api/handmade/transfers
export const createHandmadeTransfer = async (req, res) => {
    try {
        // We no longer need to rely on the frontend sending 'issuedBy'
        const { items, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'At least one item is required.' });
        }

        // --- NEW LOGIC: Get the user's name from the verified token ---
        // Depending on what you called it in your login controller, it might be .name or .username
        const currentUserName = req.user?.name || req.user?.username || 'Handmade Officer';

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
            // --- NEW LOGIC: Save the token's name to the database ---
            issuedBy: currentUserName,
            // 👇 THIS IS THE NEW LINE WE ADDED 👇
            source: 'Handmade', 
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

export const getTransOutRecords = async (req, res) => {
    try {
        // Use StockTransfer instead of HandmadeTransfer!
        // We sort by dateIssued to get the newest ones first.
        const transOutRecords = await StockTransfer.find({
            // If you only want records issued BY Handmade, you can filter here.
            // Based on your create function, 'issuedBy' seems to hold 'Handmade Officer'
            // or we can just fetch all if that's what you need.
        }).sort({ dateIssued: -1 }); 

        // Send the records back to the frontend
        res.status(200).json(transOutRecords);
    } catch (error) {
        console.error("Error fetching Trans Out records:", error);
        res.status(500).json({ message: "Failed to fetch transfer history" });
    }
};      

export const getHandmadeTransfersHistory = async (req, res) => {
    try {
        // Fetch all transfers, sorting by the newest ones first
        const transfers = await StockTransfer.find().sort({ dateIssued: -1 });
        
        res.status(200).json(transfers);
    } catch (error) {
        console.error('Error fetching handmade transfer history:', error);
        res.status(500).json({ message: 'Server error while fetching transfer history.' });
    }
};