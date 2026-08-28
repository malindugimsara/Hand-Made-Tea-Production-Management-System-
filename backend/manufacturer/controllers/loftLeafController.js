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
        // 💡 අලුතින් එකතු කළ factorySupervisorName ලබා ගැනීම
        const { date, route, arrivalTime, totalLeafQtyKg, bestG, belowBestG, poorG, factorySupervisorName } = req.body;

        const { bestPct, belowBestPct, poorPct } = calculatePercentages(bestG, belowBestG, poorG);

        const totalKg = Number(totalLeafQtyKg) || 0;
        const bestKg = Number(((totalKg * bestPct) / 100).toFixed(2));
        const belowBestKg = Number(((totalKg * belowBestPct) / 100).toFixed(2));
        const poorKg = Number(((totalKg * poorPct) / 100).toFixed(2));

        const updateData = {
            arrivalTime,
            factorySupervisorName, // 💡 Update ඩේටා එකට ඇතුළත් කිරීම
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
        // 💡 අලුතින් එකතු කළ leafCollectorName ලබා ගැනීම
        const { date, route, bestG, belowBestG, poorG, leafCollectorName } = req.body;

        const { bestPct, belowBestPct, poorPct } = calculatePercentages(bestG, belowBestG, poorG);

        const updateData = {
            leafCollectorName, // 💡 Update ඩේටා එකට ඇතුළත් කිරීම
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

// 3. Get Daily or Monthly Report Data
export const getDailyReport = async (req, res) => {
    try {
        const { date, month } = req.query;
        let query = {};

        // Date එකක් හෝ Month එකක් එව්වොත් ඒ අනුව Query එක හැදේ
        if (date) {
            query.date = date;
        } else if (month) {
            // මාසයක් නම් (උදා: 2026-08), ඒ මාසයෙන් පටන් ගන්නා සියලුම දින ගනී
            query.date = { $regex: `^${month}` }; 
        } else {
            return res.status(400).json({ success: false, message: "Date or Month is required" });
        }

        let records = await LoftLeaf.find(query).lean();

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

// 4. Edit / Update Existing Record 
export const updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 💡 අලුත් නම් දෙක ලබා ගැනීම
        const { route, arrivalTime, totalLeafQtyKg, factorySample, collectorSample, editedBy, factorySupervisorName, leafCollectorName } = req.body;

        let updateData = { 
            route, 
            arrivalTime,
            totalLeafQtyKg: Number(totalLeafQtyKg) || 0,
            factorySupervisorName, // 💡 අලුතින් එක් කළා
            leafCollectorName,     // 💡 අලුතින් එක් කළා
            editedBy 
        };

        // Recalculate Factory Sample if provided
        if (factorySample) {
            const { bestPct, belowBestPct, poorPct } = calculatePercentages(factorySample.bestG, factorySample.belowBestG, factorySample.poorG);
            const totalKg = updateData.totalLeafQtyKg;
            
            updateData.factorySample = {
                isEntered: true,
                bestG: Number(factorySample.bestG),
                belowBestG: Number(factorySample.belowBestG),
                poorG: Number(factorySample.poorG),
                bestPct, belowBestPct, poorPct
            };

            updateData.calculatedKg = {
                bestKg: Number(((totalKg * bestPct) / 100).toFixed(2)),
                belowBestKg: Number(((totalKg * belowBestPct) / 100).toFixed(2)),
                poorKg: Number(((totalKg * poorPct) / 100).toFixed(2))
            };
        }

        // Recalculate Collector Sample if provided
        if (collectorSample) {
            const { bestPct, belowBestPct, poorPct } = calculatePercentages(collectorSample.bestG, collectorSample.belowBestG, collectorSample.poorG);
            
            updateData.collectorSample = {
                isEntered: true,
                bestG: Number(collectorSample.bestG),
                belowBestG: Number(collectorSample.belowBestG),
                poorG: Number(collectorSample.poorG),
                bestPct, belowBestPct, poorPct
            };
        }

        const updatedRecord = await LoftLeaf.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true } // Return the updated document
        );

        if (!updatedRecord) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        res.status(200).json({ success: true, message: "Record updated successfully", data: updatedRecord });
    } catch (error) {
        console.error("Update Error:", error); 
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Delete Record
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