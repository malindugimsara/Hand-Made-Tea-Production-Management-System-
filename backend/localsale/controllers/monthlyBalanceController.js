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

const seed = { 'athukorala_400g': 95, 'athukorala_200g': 100, 'athukorala_100g': 64, 'bopfSp_400g': 53, 'bopfSp_200g': 31, 'bopfPremium_400g': 18, 'bopfPremium_200g': 17, 'pitigala_400g': 18, 'pitigala_200g': 22, 'tb_25': 14, 'tb_100': 9, 'gt_200g': 28, 'gt_T/B 25': 19, 'others_BOPF': 6, 'others_DUST': 2.5, 'others_DUST 1': 7.5 };

const generateNormalizedKey = (catId, catTitle, size) => {
    let cleanId = String(catId || '').toLowerCase().trim();
    let cleanTitle = String(catTitle || '').toLowerCase().trim();
    let cleanSize = String(size || '').toLowerCase().trim();

    if (!cleanId && cleanTitle) {
        cleanId = cleanTitle; 
    }

    let finalId = catId;
    let finalSize = size;

    if (cleanId === 'g/t' || cleanTitle === 'g/t') finalId = 'gt';
    if (cleanId === 'other grades' || cleanTitle === 'other grades' || cleanId === 'others') finalId = 'others';
    
    if (cleanSize === 'bopf (kg)' || cleanSize === 'kg' || cleanSize === 'bopf') finalSize = 'BOPF';
    if (cleanSize === 'dust (kg)' || cleanSize === 'dust') finalSize = 'DUST';
    if (cleanSize === 'dust 1 (kg)' || cleanSize === 'dust 1') finalSize = 'DUST 1';

    return `${finalId}_${finalSize}`;
};

// @route   GET /api/monthly-balance
// @route   GET /api/monthly-balance
export const getBalance = async (req, res) => {
    try {
        const { month } = req.query; // e.g., '2026-10'
        if (!month) return res.status(400).json({ success: false, message: 'Month required' });

        const allCategoriesMap = {};

        // 1. Base categories load කිරීම
        productCategories.forEach(cat => {
            const key = generateNormalizedKey(cat.categoryId, cat.name, cat.size);
            allCategoriesMap[key] = { categoryId: cat.categoryId, categoryTitle: cat.name, size: cat.size };
        });

        const bmMap = {};

        // 💡 FIX: මෙතැනින් තමයි Database එකේ සේව් වෙලා තියෙන සැබෑ Opening Balance එක (7 අගය) කෙලින්ම ගන්නේ
        const bmRecord = await MonthlyBalance.findOne({ month: month });
        
        if (bmRecord && bmRecord.items) {
            bmRecord.items.forEach(item => {
                const key = generateNormalizedKey(item.categoryId, item.categoryTitle, item.size);
                bmMap[key] = Number(item.bmStock) || 0; // 👈 Database එකේ 7 තිබ්බොත් 7 ම ගනී
                
                if (!allCategoriesMap[key]) {
                    allCategoriesMap[key] = { categoryId: item.categoryId, categoryTitle: item.categoryTitle || item.categoryId, size: item.size };
                }
            });
        } else if (month === '2026-07') {
            // පළමු මාසය නම් seed එක භාවිතා කිරීම
            Object.keys(seed).forEach(k => { bmMap[k] = seed[k]; });
        }

        // 2. Current month summaries (In/Out) load කිරීම (මේ මාසයේ ගනුදෙනු)
        const currentSummaries = await DailySummary.find({ date: { $regex: `^${month}` } });
        const dynamicMap = {};

        currentSummaries.forEach(day => {
            day.items?.forEach(item => {
                const key = generateNormalizedKey(item.categoryId, item.categoryTitle, item.size);
                if (!allCategoriesMap[key]) {
                    allCategoriesMap[key] = { categoryId: item.categoryId, categoryTitle: item.categoryTitle || item.categoryId, size: item.size };
                }
                if (!dynamicMap[key]) dynamicMap[key] = { in: 0, out: 0 };
                dynamicMap[key].in += (Number(item.in) || 0);
                dynamicMap[key].out += (Number(item.out) || 0);
            });
        });

        // 3. අවසාන දත්ත සකස් කිරීම
        const items = Object.keys(allCategoriesMap).map(key => {
            const catInfo = allCategoriesMap[key];
            const bmStock = bmMap[key] || 0; // 👈 දැන් මෙතනට එන්නේ Database එකේ තියෙන සැබෑ අගයයි!
            const inQty = dynamicMap[key]?.in || 0;
            const outQty = dynamicMap[key]?.out || 0;
            
            return {
                categoryId: catInfo.categoryId,
                categoryTitle: catInfo.categoryTitle,
                size: catInfo.size,
                bmStock,
                inQty,
                outQty,
                total: bmStock + inQty,
                balance: (bmStock + inQty) - outQty
            };
        });

        res.status(200).json({ success: true, data: { month, items } });
    } catch (error) {
        console.error("Error in getBalance:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// CORE REUSABLE LOGIC 
export const updateBMStockLogic = async (currentMonthStr) => {
    let bmRecord = await MonthlyBalance.findOne({ month: currentMonthStr });

    // 1. Create a master map to hold ALL categories (base + dynamic)
    const allItemsMap = {};

    // 2. Initialize with your base productCategories
    productCategories.forEach(cat => {
        const key = generateNormalizedKey(cat.categoryId, cat.name, cat.size);
        allItemsMap[key] = {
            categoryId: cat.categoryId,
            categoryTitle: cat.name,
            size: cat.size,
            bmStock: 0,
            inQty: 0,
            outQty: 0
        };
    });

    // 3. Add existing BM Stock from the database (catching leftover custom items)
    if (bmRecord) {
        bmRecord.items.forEach(item => {
            const key = generateNormalizedKey(item.categoryId, item.categoryTitle, item.size);
            if (!allItemsMap[key]) {
                allItemsMap[key] = {
                    categoryId: item.categoryId,
                    categoryTitle: item.categoryTitle || item.categoryId,
                    size: item.size,
                    bmStock: 0,
                    inQty: 0,
                    outQty: 0
                };
            }
            allItemsMap[key].bmStock += (Number(item.bmStock) || 0);
        });
    } else if (currentMonthStr === '2026-07') {
        Object.keys(seed).forEach(k => {
            if (allItemsMap[k]) allItemsMap[k].bmStock += seed[k];
        });
    }

    // 4. Add movement from Daily Summaries (This catches dynamic items & newly sold items)
    const summaries = await DailySummary.find({ date: { $regex: `^${currentMonthStr}` } });
    summaries.forEach(day => {
        day.items?.forEach(item => {
            const key = generateNormalizedKey(item.categoryId, item.categoryTitle, item.size);
            if (!allItemsMap[key]) {
                allItemsMap[key] = {
                    categoryId: item.categoryId,
                    categoryTitle: item.categoryTitle || item.categoryId,
                    size: item.size,
                    bmStock: 0,
                    inQty: 0,
                    outQty: 0
                };
            }
            allItemsMap[key].inQty += (Number(item.in) || 0);
            allItemsMap[key].outQty += (Number(item.out) || 0);
        });
    });

    // 5. Calculate Final Next Month BM Items by mapping over ALL collected items
    const nextMonthBMItems = Object.values(allItemsMap).map(item => ({
        categoryId: item.categoryId,
        categoryTitle: item.categoryTitle,
        size: item.size,
        bmStock: item.bmStock + item.inQty - item.outQty
    }));

    // 6. Determine next month string
    const [year, monthStr] = currentMonthStr.split('-');
    const nextDate = new Date(year, Number(monthStr));
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // 7. Save to Database
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