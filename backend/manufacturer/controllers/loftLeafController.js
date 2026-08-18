import LoftLeaf from '../models/LoftLeaf.js';

// Helper function to calculate percentages
const calculatePercentages = (best, belowBest, poor) => {
    const total = Number(best) + Number(belowBest) + Number(poor);
    if (total === 0) return { bestPct: 0, belowBestPct: 0, poorPct: 0 };

    return {
        bestPct: Math.round((Number(best) / total) * 100),
        belowBestPct: Math.round((Number(belowBest) / total) * 100),
        poorPct: Math.round((Number(poor) / total) * 100),
    };
};

// 1. Add or Update Factory Sample
export const saveFactorySample = async (req, res) => {
    try {
        const { date, route, arrivalTime, officerName, totalLeafQtyKg, bestG, belowBestG, poorG } = req.body;

        const { bestPct, belowBestPct, poorPct } = calculatePercentages(bestG, belowBestG, poorG);

        const totalKg = Number(totalLeafQtyKg) || 0;
        const bestKg = Number(((totalKg * bestPct) / 100).toFixed(2));
        const belowBestKg = Number(((totalKg * belowBestPct) / 100).toFixed(2));
        const poorKg = Number(((totalKg * poorPct) / 100).toFixed(2));

        const updateData = {
            arrivalTime,
            officerName,
            totalLeafQtyKg: totalKg,
            factorySample: {
                isEntered: true,
                bestG: Number(bestG),
                belowBestG: Number(belowBestG),
                poorG: Number(poorG),
                bestPct,
                belowBestPct,
                poorPct
            },
            calculatedKg: { bestKg, belowBestKg, poorKg }
        };

        const record = await LoftLeaf.findOneAndUpdate(
            { date, route },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Factory sample saved successfully', data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Add or Update Collector Sample
export const saveCollectorSample = async (req, res) => {
    try {
        const { date, route, bestG, belowBestG, poorG } = req.body;

        const { bestPct, belowBestPct, poorPct } = calculatePercentages(bestG, belowBestG, poorG);

        const updateData = {
            collectorSample: {
                isEntered: true,
                bestG: Number(bestG),
                belowBestG: Number(belowBestG),
                poorG: Number(poorG),
                bestPct,
                belowBestPct,
                poorPct
            }
        };

        const record = await LoftLeaf.findOneAndUpdate(
            { date, route },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: 'Collector sample saved successfully', data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Daily Report Data
export const getDailyReport = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: "Date is required" });

        let records = await LoftLeaf.find({ date }).lean();

        // Sort by Factory Best % descending to calculate the Rank
        records.sort((a, b) => (b.factorySample?.bestPct || 0) - (a.factorySample?.bestPct || 0));

        // Add Rank property
        records = records.map((record, index) => ({
            ...record,
            gradeRank: (record.factorySample && record.factorySample.bestPct > 0) ? index + 1 : '-'
        }));

        // Sort back by Route name
        records.sort((a, b) => a.route.localeCompare(b.route, undefined, { numeric: true }));

        res.status(200).json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Delete Record (Delete API)
export const deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedRecord = await LoftLeaf.findByIdAndDelete(id);
        
        if (!deletedRecord) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        res.status(200).json({ success: true, message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};