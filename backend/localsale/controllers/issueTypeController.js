import IssueTypeSummary from '../models/IssueTypeSummary.js';

// 1. Bulk Save or Update
export const saveIssueTypeSummaries = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || records.length === 0) {
            return res.status(400).json({ success: false, message: "No records found to save!" });
        }

        const operations = records.map(async (record) => {
            return await IssueTypeSummary.findOneAndUpdate(
                { date: record.date, issueType: record.issueType },
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

// 2. Get All Records
export const getIssueTypeSummaries = async (req, res) => {
    try {
        const { date } = req.query; 
        const query = date ? { date: date } : {}; 

        const summaries = await IssueTypeSummary.find(query).sort({ date: -1 });
        
        res.status(200).json({ success: true, data: summaries });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, message: "Error fetching issue records." });
    }
};

// 3. Edit (Update) Item
export const updateIssueTypeItem = async (req, res) => {
    try {
        const { recordId, itemId } = req.params;
        // Frontend එකෙන් එවන out අගය සහ edit කරන කෙනාගේ නම ලබාගැනීම
        const { out, editedBy } = req.body; 

        const updatedSummary = await IssueTypeSummary.findOneAndUpdate(
            { _id: recordId, "items._id": itemId },
            { 
                $set: { 
                    "items.$.out": out,
                    "items.$.lastEditedBy": editedBy || 'Unknown User', // අදාළ Item එකටම සෙට් කිරීම
                    "items.$.lastEditedAt": new Date() 
                } 
            },
            { new: true }
        );

        if (!updatedSummary) {
            return res.status(404).json({ success: false, message: "Record or Item not found!" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Item updated successfully!", 
            data: updatedSummary 
        });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Error updating item.", error: error.message });
    }
};

// 4. Delete Item
export const deleteIssueTypeItem = async (req, res) => {
    try {
        const { recordId, itemId } = req.params;

        const summary = await IssueTypeSummary.findById(recordId);
        if (!summary) {
            return res.status(404).json({ success: false, message: "Record not found!" });
        }

        summary.items = summary.items.filter(item => item._id.toString() !== itemId);

        if (summary.items.length === 0) {
            await IssueTypeSummary.findByIdAndDelete(recordId);
            return res.status(200).json({ 
                success: true, 
                message: "Record deleted completely as it became empty." 
            });
        }

        await summary.save();
        res.status(200).json({ 
            success: true, 
            message: "Item deleted successfully!" 
        });

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Error deleting item.", error: error.message });
    }
};