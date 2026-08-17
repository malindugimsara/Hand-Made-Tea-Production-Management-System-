import MonthlyBalance from '../models/MonthlyBalance.js';
import DailySummary from '../models/DailySummary.js';

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
    { id: 'others_DUST 1', categoryId: 'others', size: 'DUST 1', name: 'DUST 1' }
];

// @route   GET /api/monthly-balance
export const getBalance = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) return res.status(400).json({ success: false, message: 'Month required' });

        let bmRecord = await MonthlyBalance.findOne({ month });
        const bmMap = {};

        if (!bmRecord && month === '2026-07') {
            const seed = { 'athukorala_400g': 95, 'athukorala_200g': 100, 'athukorala_100g': 64, 'bopfSp_400g': 53, 'bopfSp_200g': 31, 'bopfPremium_400g': 18, 'bopfPremium_200g': 17, 'pitigala_400g': 18, 'pitigala_200g': 22, 'tb_25': 14, 'tb_100': 9, 'gt_200g': 28, 'gt_T/B 25': 19, 'others_BOPF': 6, 'others_DUST': 2.5, 'others_DUST 1': 7.5 };
            Object.keys(seed).forEach(k => bmMap[k] = seed[k]);
        } else if (bmRecord) {
            bmRecord.items.forEach(item => bmMap[`${item.categoryId}_${item.size}`] = item.bmStock);
        }

        const summaries = await DailySummary.find({ date: { $regex: `^${month}` } });
        const dynamicMap = {};

        summaries.forEach(day => {
            day.items?.forEach(item => {
                const key = `${item.categoryId}_${item.size}`;
                if (!dynamicMap[key]) dynamicMap[key] = { in: 0, out: 0 };
                dynamicMap[key].in += (Number(item.in) || 0);
                dynamicMap[key].out += (Number(item.out) || 0);
            });
        });

        const items = productCategories.map(cat => {
            const key = `${cat.categoryId}_${cat.size}`;
            const bmStock = bmMap[key] || 0;
            const inQty = dynamicMap[key]?.in || 0;
            const outQty = dynamicMap[key]?.out || 0;
            
            return {
                ...cat,
                bmStock,
                inQty,
                outQty,
                total: bmStock + inQty,
                balance: (bmStock + inQty) - outQty
            };
        });

        res.status(200).json({ success: true, data: { month, items } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// CORE REUSABLE LOGIC: Calculates current month and saves it to the NEXT month
export const updateBMStockLogic = async (currentMonthStr) => {
    let bmRecord = await MonthlyBalance.findOne({ month: currentMonthStr });
    const bmMap = {};
    if (bmRecord) {
        bmRecord.items.forEach(item => bmMap[`${item.categoryId}_${item.size}`] = item.bmStock);
    } else if (currentMonthStr === '2026-07') {
        const seed = { 'athukorala_400g': 95, 'athukorala_200g': 100, 'athukorala_100g': 64, 'bopfSp_400g': 53, 'bopfSp_200g': 31, 'bopfPremium_400g': 18, 'bopfPremium_200g': 17, 'pitigala_400g': 18, 'pitigala_200g': 22, 'tb_25': 14, 'tb_100': 9, 'gt_200g': 28, 'gt_T/B 25': 19, 'others_BOPF': 6, 'others_DUST': 2.5, 'others_DUST 1': 7.5 };
        Object.keys(seed).forEach(k => bmMap[k] = seed[k]);
    }

    const summaries = await DailySummary.find({ date: { $regex: `^${currentMonthStr}` } });
    const dynamicMap = {};
    summaries.forEach(day => {
        day.items?.forEach(item => {
            const key = `${item.categoryId}_${item.size}`;
            if (!dynamicMap[key]) dynamicMap[key] = { in: 0, out: 0 };
            dynamicMap[key].in += (Number(item.in) || 0);
            dynamicMap[key].out += (Number(item.out) || 0);
        });
    });

    const nextMonthBMItems = productCategories.map(cat => {
        const key = `${cat.categoryId}_${cat.size}`;
        const currentBM = bmMap[key] || 0;
        const inQty = dynamicMap[key]?.in || 0;
        const outQty = dynamicMap[key]?.out || 0;
        
        return {
            categoryId: cat.categoryId,
            categoryTitle: cat.name,
            size: cat.size,
            bmStock: currentBM + inQty - outQty
        };
    });

    const [year, monthStr] = currentMonthStr.split('-');
    const nextDate = new Date(year, Number(monthStr));
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    await MonthlyBalance.findOneAndUpdate(
        { month: nextMonthStr },
        { $set: { items: nextMonthBMItems } },
        { upsert: true, new: true }
    );

    return nextMonthStr;
};

// @route   POST /api/monthly-balance/update-bm
export const manualUpdateBM = async (req, res) => {
    try {
        const { currentMonth } = req.body;
        if (!currentMonth) return res.status(400).json({ success: false, message: 'Current month required' });

        const nextMonthStr = await updateBMStockLogic(currentMonth);
        res.status(200).json({ success: true, message: `B/M Stock manually updated for ${nextMonthStr}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update BM Stock' });
    }
};