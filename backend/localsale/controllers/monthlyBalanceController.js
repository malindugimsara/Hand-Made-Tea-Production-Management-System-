import DailySummary from '../models/DailySummary.js';

// Hardcoded product categories configuration to ensure consistent ordering
const productCategories = [
    { id: 'athukorala_400g', categoryId: 'athukorala', size: '400g', name: 'Athukorala BOPF 400g' },
    { id: 'athukorala_200g', categoryId: 'athukorala', size: '200g', name: 'Athukorala BOPF 200g' },
    { id: 'athukorala_100g', categoryId: 'athukorala', size: '100g', name: 'Athukorala BOPF 100g' },
    { id: 'bopfSp_400g', categoryId: 'bopfSp', size: '400g', name: 'Athukorala BOPF SP 400g' },
    { id: 'bopfSp_200g', categoryId: 'bopfSp', size: '200g', name: 'Athukorala BOPF SP 200g' },
    { id: 'bopfPremium_400g', categoryId: 'bopfPremium', size: '400g', name: 'Athukorala BOPF PREMIUM 400g' },
    { id: 'bopfPremium_200g', categoryId: 'bopfPremium', size: '200g', name: 'Athukorala BOPF PREMIUM 200g' },
    { id: 'pitigala_400g', categoryId: 'pitigala', size: '400g', name: 'Pitigala tea 400g' },
    { id: 'pitigala_200g', categoryId: 'pitigala', size: '200g', name: 'Pitigala tea 200g' },
    { id: 'tb_25', categoryId: 'tb', size: '25', name: 'Pitigala tea 25 bag' },
    { id: 'tb_100', categoryId: 'tb', size: '100', name: 'Pitigala tea 100 bag' },
    { id: 'gt_200g', categoryId: 'gt', size: '200g', name: 'Green tea 200g' },
    { id: 'gt_T/B 25', categoryId: 'gt', size: 'T/B 25', name: 'Green tea 25 bag' },
    { id: 'others_BOPF', categoryId: 'others', size: 'BOPF', name: 'BOPF' },
    { id: 'others_DUST', categoryId: 'others', size: 'DUST', name: 'DUST' },
    { id: 'others_DUST 1', categoryId: 'others', size: 'DUST 1', name: 'DUST 1' },
];

// Helper to get previous month string
const getPreviousMonth = (currentMonth) => {
    const [year, month] = currentMonth.split('-');
    const prevDate = new Date(year, Number(month) - 2);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
};

// @desc    Dynamically calculate balance report in real-time for any month
// @route   GET /api/monthly-balance?month=YYYY-MM
export const getOrCalculateBalance = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) return res.status(400).json({ success: false, message: 'Month is required' });

        // Helper function to calculate cumulative IN and OUT up to a specific month (exclusive)
        // This calculates true historical B/M Stock dynamically without needing manual snapshots!
        const getCumulativeActivityUpTo = async (targetMonth) => {
            // Fetch all daily summaries where date string is less than the target month's start
            const summaries = await DailySummary.find({ date: { $lt: `${targetMonth}-01` } });
            const totals = {};

            summaries.forEach(day => {
                day.items?.forEach(item => {
                    const key = `${item.categoryId}_${item.size}`;
                    if (!totals[key]) totals[key] = { in: 0, out: 0 };
                    totals[key].in += (Number(item.in) || 0);
                    totals[key].out += (Number(item.out) || 0);
                });
            });
            return totals;
        };

        // 1. Get all past movement up to the start of this month
        const pastActivity = await getCumulativeActivityUpTo(month);

        // 2. Fetch current month's daily summaries
        const currentSummaries = await DailySummary.find({ date: { $regex: `^${month}` } });
        const currentMap = {};

        currentSummaries.forEach(day => {
            day.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                if (!currentMap[key]) currentMap[key] = { in: 0, out: 0 };
                currentMap[key].in += (Number(item.in) || 0);
                currentMap[key].out += (Number(item.out) || 0);
            });
        });

        // 3. Map everything to the structured product categories
        // Initial base seed stock (you can adjust these base seed values if your system started with a fixed inventory before day one)
        const baseSeedStock = {
            'athukorala_400g': 95, 'athukorala_200g': 100, 'athukorala_100g': 64,
            'bopfSp_400g': 53, 'bopfSp_200g': 31,
            'bopfPremium_400g': 18, 'bopfPremium_200g': 17,
            'pitigala_400g': 18, 'pitigala_200g': 22,
            'tb_25': 14, 'tb_100': 9,
            'gt_200g': 28, 'gt_T/B 25': 19,
            'others_BOPF': 6, 'others_DUST': 2.5, 'others_DUST 1': 7.5
        };

        const items = productCategories.map(cat => {
            const key = cat.id;
            
            // B/M Stock = Base Seed + (All Past INs) - (All Past OUTs up to this month)
            const seed = baseSeedStock[key] || 0;
            const priorIn = pastActivity[key]?.in || 0;
            const priorOut = pastActivity[key]?.out || 0;
            
            let bmStock = seed + priorIn - priorOut;
            if (bmStock < 0) bmStock = 0;

            const currentIn = currentMap[key]?.in || 0;
            const currentOut = currentMap[key]?.out || 0;
            const total = bmStock + currentIn;
            const closingBalance = total - currentOut;

            return {
                categoryId: cat.categoryId,
                categoryTitle: cat.name,
                size: cat.size,
                bmStock,
                in: currentIn,
                out: currentOut,
                adjustment: 0,
                closingBalance
            };
        });

        res.status(200).json({
            success: true,
            data: { month, status: 'Realtime', items }
        });

    } catch (error) {
        console.error('Error calculating real-time balance:', error);
        res.status(500).json({ success: false, message: 'Server Error calculating balance.' });
    }
};

// Dummy placeholder to prevent route crashes if close route is still hit
export const closeMonth = async (req, res) => {
    res.status(200).json({ success: true, message: 'Real-time mode is active. Locking is disabled.' });
};