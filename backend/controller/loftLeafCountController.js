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

// 1. GET ALL RECORDS (With Optional Month & SampleType Filter)
export const getAllLoftLeafCounts = async (req, res) => {
    try {
        const { month, sampleType } = req.query; // e.g., month='2026-04', sampleType='Factory'
        let filter = {};

        // මාසය අනුව filter කිරීම
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

        // sampleType එක අනුව filter කිරීම (Factory හෝ LeafCollector)
        if (sampleType) {
            filter.sampleType = sampleType;
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
        // අලුතින් totalLeafQty මෙතනට extract කරගෙන ඇත
        const { date, route, sampleType, officerName, totalLeafQty, bestQty, belowBestQty, poorQty, updatedBy } = req.body;

        // Validation
        if (!date) {
            return res.status(400).json({ message: "Date is required." });
        }
        if (!route) {
            return res.status(400).json({ message: "Route is required." });
        }
        if (!sampleType) {
            return res.status(400).json({ message: "Sample Type (Factory / LeafCollector) is required." });
        }

        // Backend Calculation
        const stats = calculateLeafStats(bestQty, belowBestQty, poorQty);

        const newRecord = new LoftLeafCount({
            date,
            route,
            sampleType,
            officerName: officerName || "",
            // Factory එකක් නම් පමණක් අගය ගන්නවා, නැතිනම් null කරනවා
            totalLeafQty: sampleType === 'Factory' && totalLeafQty !== undefined ? Number(totalLeafQty) : null, 
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
        // අලුතින් totalLeafQty මෙතනට extract කරගෙන ඇත
        const { date, route, sampleType, officerName, totalLeafQty, bestQty, belowBestQty, poorQty, updatedBy } = req.body;
        const record = await LoftLeafCount.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: "Record not found." });
        }

        // අලුත් දත්ත update කිරීම
        if (date) record.date = date;
        if (route) record.route = route;
        if (sampleType) record.sampleType = sampleType;
        if (officerName !== undefined) record.officerName = officerName; 
        
        // totalLeafQty එක update කිරීම
        if (totalLeafQty !== undefined) {
            const currentSampleType = sampleType || record.sampleType;
            record.totalLeafQty = currentSampleType === 'Factory' && totalLeafQty !== "" ? Number(totalLeafQty) : null;
        }
        
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

// 5. GET MONTHLY SUMMARY BY ROUTE (WEIGHTED AVERAGES)
export const getMonthlyRouteSummary = async (req, res) => {
    try {
        const { month } = req.query; // Expects format 'YYYY-MM'
        
        if (!month) {
            return res.status(400).json({ message: "Month parameter is required (e.g., 2026-04)." });
        }

        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthInt = parseInt(monthStr, 10) - 1; 

        const startDate = new Date(year, monthInt, 1);
        const endDate = new Date(year, monthInt + 1, 0, 23, 59, 59, 999);

        const summary = await LoftLeafCount.aggregate([
            {
                // Step 1: Filter records for the requested month
                $match: {
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                // Step 2: Group by Route and calculate sums
                $group: {
                    _id: { $toLower: { $arrayElemAt: [{ $split: ["$route", " - "] }, 0] } },
                    originalRoute: { $first: "$route" },
                    monthlyTotalQty: { $sum: "$totalQty" },
                    monthlyBestQty: { $sum: "$bestQty" },
                    monthlyBelowBestQty: { $sum: "$belowBestQty" },
                    monthlyPoorQty: { $sum: "$poorQty" }
                }
            },
            {
                // Step 3: Calculate the exact Weighted Average Percentages
                $project: {
                    _id: 0,
                    route: "$originalRoute",
                    monthlyTotalQty: 1,
                    monthlyBestQty: 1,
                    
                    // Final Average Best % = (Sum of Best Qty / Sum of Total Qty) * 100
                    finalBestPercentage: {
                        $cond: [
                            { $gt: ["$monthlyTotalQty", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$monthlyBestQty", "$monthlyTotalQty"] }, 100] }, 2] },
                            0
                        ]
                    },
                    finalBelowBestPercentage: {
                        $cond: [
                            { $gt: ["$monthlyTotalQty", 0] },
                            { $round: [{ $multiply: [{ $divide: ["$monthlyBelowBestQty", "$monthlyTotalQty"] }, 100] }, 2] },
                            0
                        ]
                    }
                }
            },
            {
                // Step 4: Sort alphabetically by route
                $sort: { route: 1 }
            }
        ]);

        res.status(200).json(summary);
    } catch (error) {
        console.error("Aggregation summary error:", error);
        res.status(500).json({ message: "Server error calculating weighted average summary." });
    }
};