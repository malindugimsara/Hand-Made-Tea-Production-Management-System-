import IssueTypeSummary from '../models/IssueTypeSummary.js';

// Bulk Save හෝ Update කිරීම සඳහා
export const saveIssueTypeSummaries = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || records.length === 0) {
            return res.status(400).json({ success: false, message: "No records found to save!" });
        }

        const operations = records.map(async (record) => {
            return await IssueTypeSummary.findOneAndUpdate(
                { date: record.date, issueType: record.issueType }, // දිනය සහ Issue type එක අනුව පරීක්ෂා කරයි
                { $set: { items: record.items } },
                { new: true, upsert: true }
            );
        });

        await Promise.all(operations);

        res.status(200).json({ 
            success: true, 
            message: "Issue records saved successfully to dedicated model!" 
        });

    } catch (error) {
        console.error("Error saving issue summaries:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error while saving records.", 
            error: error.message 
        });
    }
};

// දත්ත ලබාගැනීමට (View Page එක සඳහා)
export const getIssueTypeSummaries = async (req, res) => {
    try {
        const summaries = await IssueTypeSummary.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: summaries });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, message: "Error fetching issue records." });
    }
};