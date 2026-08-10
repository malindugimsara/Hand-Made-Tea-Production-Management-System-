import DailySummary from '../models/DailySummary.js';

export const saveBulkSummaries = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || records.length === 0) {
            return res.status(400).json({ success: false, message: "No records found to save!" });
        }

        // List එකේ ඇති සියලුම records database එකට save/update කිරීම
        const operations = records.map(async (record) => {
            return await DailySummary.findOneAndUpdate(
                { date: record.date }, // මේ දවස දැනටමත් database එකේ තියෙනවද බලනවා
                { $set: { items: record.items } }, // තියෙනවා නම් අලුත් දත්ත වලින් යාවත්කාලීන කරනවා
                { new: true, upsert: true } // නැත්නම් අලුතින්ම හදනවා (upsert)
            );
        });

        // සියලුම promises අවසන් වනතුරු සිටීම
        await Promise.all(operations);

        res.status(200).json({ 
            success: true, 
            message: "All daily records saved successfully!" 
        });

    } catch (error) {
        console.error("Error saving summaries:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error while saving records.", 
            error: error.message 
        });
    }
};

// අමතරව: මාසයකට හෝ අදාලව දත්ත ලබාගැනීමට අවශ්‍ය නම්
export const getAllSummaries = async (req, res) => {
    try {
        const summaries = await DailySummary.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: summaries });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching data." });
    }
};