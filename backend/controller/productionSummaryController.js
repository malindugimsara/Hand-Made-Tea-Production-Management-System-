import ProductionSummary from '../models/ProductionSummary.js';

// @desc    Save or Update a monthly production summary
// @route   POST /api/production-summary
export const saveProductionSummary = async (req, res) => {
    try {
        const { reportMonth, labourRate, electricityRate, teaSummaries, grandTotals } = req.body;

        if (!reportMonth) {
            return res.status(400).json({ message: "Report Month is required." });
        }

        // findOneAndUpdate with 'upsert: true' means:
        // If 'reportMonth' exists, update it. If it doesn't exist, create a new one.
        const summary = await ProductionSummary.findOneAndUpdate(
            { reportMonth },
            { labourRate, electricityRate, teaSummaries, grandTotals },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Production Summary saved successfully", summary });
    } catch (error) {
        console.error("Error saving production summary:", error);
        res.status(500).json({ message: "Server error while saving summary." });
    }
};

// @desc    Get all production summaries
// @route   GET /api/production-summary
export const getAllProductionSummaries = async (req, res) => {
    try {
        // Sort by newest month first
        const summaries = await ProductionSummary.find().sort({ reportMonth: -1 });
        res.status(200).json(summaries);
    } catch (error) {
        console.error("Error fetching summaries:", error);
        res.status(500).json({ message: "Server error while fetching summaries." });
    }
};

// @desc    Delete a specific production summary
// @route   DELETE /api/production-summary/:id
export const deleteProductionSummary = async (req, res) => {
    try {
        await ProductionSummary.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Summary deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting summary." });
    }
};