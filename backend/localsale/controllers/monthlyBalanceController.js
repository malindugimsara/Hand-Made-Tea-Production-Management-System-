import MonthlyBalance from '../models/MonthlyBalance.js';
import DailySummary from '../models/DailySummary.js';

// Helper to calculate previous month string (e.g., "2026-08" -> "2026-07")
const getPreviousMonth = (currentMonth) => {
    const [year, month] = currentMonth.split('-');
    const prevDate = new Date(year, Number(month) - 2);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
};

// @desc    Get saved balance OR calculate on-the-fly if not closed
// @route   GET /api/monthly-balance?month=YYYY-MM
export const getOrCalculateBalance = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) return res.status(400).json({ success: false, message: 'Month is required' });

        // 1. Check if a closed snapshot already exists
        const existingBalance = await MonthlyBalance.findOne({ month });
        if (existingBalance && existingBalance.status === 'Closed') {
            return res.status(200).json({ success: true, data: existingBalance, isCalculated: false });
        }

        // 2. If no closed snapshot exists, calculate it dynamically
        const prevMonth = getPreviousMonth(month);
        const prevBalance = await MonthlyBalance.findOne({ month: prevMonth });

        // Build a map of B/M stock from previous month's closing balances
        const bmStockMap = {};
        if (prevBalance) {
            prevBalance.items.forEach(item => {
                bmStockMap[`${item.categoryId}_${item.size}`] = item.closingBalance;
            });
        }

        // Fetch all daily summaries for the requested month
        const dailySummaries = await DailySummary.find({ date: { $regex: `^${month}` } });
        const currentActivityMap = {};

        dailySummaries.forEach(day => {
            day.items.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                if (!currentActivityMap[key]) {
                    currentActivityMap[key] = { ...item._doc, in: 0, out: 0 };
                }
                currentActivityMap[key].in += (Number(item.in) || 0);
                currentActivityMap[key].out += (Number(item.out) || 0);
            });
        });

        // Merge B/M Stock with Current Activity
        const allKeys = new Set([...Object.keys(bmStockMap), ...Object.keys(currentActivityMap)]);
        const calculatedItems = Array.from(allKeys).map(key => {
            const bmStock = bmStockMap[key] || 0;
            const currentIn = currentActivityMap[key]?.in || 0;
            const currentOut = currentActivityMap[key]?.out || 0;
            
            // Check if existing draft has adjustments
            const draftItem = existingBalance?.items.find(i => `${i.categoryId}_${i.size}` === key);
            const adjustment = draftItem?.adjustment || 0;

            const closingBalance = bmStock + currentIn - currentOut + adjustment;

            return {
                categoryId: currentActivityMap[key]?.categoryId || draftItem?.categoryId || key.split('_')[0],
                categoryTitle: currentActivityMap[key]?.categoryTitle || draftItem?.categoryTitle || 'Unknown',
                size: currentActivityMap[key]?.size || draftItem?.size || key.split('_')[1],
                bmStock,
                in: currentIn,
                out: currentOut,
                adjustment,
                closingBalance
            };
        });

        res.status(200).json({
            success: true,
            isCalculated: true, // Tells the frontend this is live data, not a locked snapshot
            data: { month, status: existingBalance?.status || 'Draft', items: calculatedItems }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error calculating balance.' });
    }
};

// @desc    Lock and save the month-end snapshot
// @route   POST /api/monthly-balance/close
export const closeMonth = async (req, res) => {
    try {
        const { month, items, closedBy } = req.body;

        if (!month || !items) {
            return res.status(400).json({ success: false, message: 'Month and items are required.' });
        }

        // Recalculate closing balances to ensure data integrity before saving
        const sanitizedItems = items.map(item => ({
            ...item,
            closingBalance: (Number(item.bmStock) || 0) + (Number(item.in) || 0) - (Number(item.out) || 0) + (Number(item.adjustment) || 0)
        }));

        const savedSnapshot = await MonthlyBalance.findOneAndUpdate(
            { month },
            { 
                $set: { 
                    items: sanitizedItems, 
                    status: 'Closed',
                    closedBy: closedBy || 'Admin' 
                } 
            },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: `${month} has been successfully closed and locked.`, data: savedSnapshot });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to close month.' });
    }
};