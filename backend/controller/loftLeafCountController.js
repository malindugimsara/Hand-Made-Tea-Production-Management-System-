import LoftLeafCount from '../models/LoftLeafCount.js';

// ප්‍රතිශතයන් (Percentages) සහ එකතුව (Total) ගණනය කිරීම සඳහා කුඩා Helper Function එකක්
const calculateLeafStats = (best, belowBest, poor) => {
    const b = Number(best) || 0;
    const bb = Number(belowBest) || 0;
    const p = Number(poor) || 0;
    
    const totalQty = b + bb + p;

    if (totalQty === 0) {
        return { totalQty: 0, bestPercentage: 0, belowBestPercentage: 0, poorPercentage: 0 };
    }

    return {
        totalQty,
        bestPercentage: Number(((b / totalQty) * 100).toFixed(2)),
        belowBestPercentage: Number(((bb / totalQty) * 100).toFixed(2)),
        poorPercentage: Number(((p / totalQty) * 100).toFixed(2))
    };
};

// 1. GET ALL RECORDS (With Optional Month Filter)
export const getAllLoftLeafCounts = async (req, res) => {
    try {
        const { month } = req.query; // e.g., '2026-04'
        let filter = {};

        if (month) {
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr, 10);
            const monthInt = parseInt(monthStr, 10) - 1; 

            const startDate = new Date(year, monthInt, 1);
            const endDate = new Date(year, monthInt + 1, 0, 23, 59, 59, 999);

            filter.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const records = await LoftLeafCount.find(filter).sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        console.error("Fetch loft leaf count error:", error);
        res.status(500).json({ message: "Server error fetching loft leaf counts." });
    }
};

// 2. CREATE NEW RECORD
export const createLoftLeafCount = async (req, res) => {
    try {
        const { date, route, bestQty, belowBestQty, poorQty, updatedBy } = req.body;

        if (!date) {
            return res.status(400).json({ message: "Date is required." });
        }

        // Backend Calculation
        const stats = calculateLeafStats(bestQty, belowBestQty, poorQty);

        const newRecord = new LoftLeafCount({
            date,
            route,
            bestQty: Number(bestQty) || 0,
            belowBestQty: Number(belowBestQty) || 0,
            poorQty: Number(poorQty) || 0,
            totalQty: stats.totalQty,
            bestPercentage: stats.bestPercentage,
            belowBestPercentage: stats.belowBestPercentage,
            poorPercentage: stats.poorPercentage,
            updatedBy: updatedBy || ''
        });

        await newRecord.save();
        res.status(201).json({ message: "Loft Leaf Count saved successfully", record: newRecord });

    } catch (error) {
        console.error("Create loft leaf count error:", error);
        res.status(500).json({ message: "Server error while saving record." });
    }
};

// 3. UPDATE RECORD
export const updateLoftLeafCount = async (req, res) => {
    try {
        const { date, bestQty, belowBestQty, poorQty, updatedBy } = req.body;
        const record = await LoftLeafCount.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: "Record not found." });
        }

        // අලුත් දත්ත update කිරීම
        if (date) record.date = date;
        if (bestQty !== undefined) record.bestQty = Number(bestQty);
        if (belowBestQty !== undefined) record.belowBestQty = Number(belowBestQty);
        if (poorQty !== undefined) record.poorQty = Number(poorQty);
        if (updatedBy) record.updatedBy = updatedBy;

        // අලුත් දත්ත අනුව Total සහ Percentages නැවත Calculate කිරීම
        const stats = calculateLeafStats(record.bestQty, record.belowBestQty, record.poorQty);
        
        record.totalQty = stats.totalQty;
        record.bestPercentage = stats.bestPercentage;
        record.belowBestPercentage = stats.belowBestPercentage;
        record.poorPercentage = stats.poorPercentage;

        await record.save();
        res.status(200).json({ message: "Record updated successfully.", record });

    } catch (error) {
        console.error("Update loft leaf count error:", error);
        res.status(500).json({ message: "Error updating record." });
    }
};

// 4. DELETE RECORD
export const deleteLoftLeafCount = async (req, res) => {
    try {
        const deletedRecord = await LoftLeafCount.findByIdAndDelete(req.params.id);
        
        if (!deletedRecord) {
            return res.status(404).json({ message: "Record not found." });
        }

        res.status(200).json({ message: "Record deleted successfully." });
    } catch (error) {
        console.error("Delete loft leaf count error:", error);
        res.status(500).json({ message: "Error deleting record." });
    }
};