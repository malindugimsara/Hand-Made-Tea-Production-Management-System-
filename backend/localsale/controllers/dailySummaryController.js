import DailySummary from '../models/DailySummary.js';

// 1. Bulk Save
export const saveBulkSummaries = async (req, res) => {
    try {
        const { records } = req.body;
        
        if (!records || records.length === 0) {
            return res.status(400).json({ success: false, message: "No records found to save!" });
        }

        // සෑම record (දිනයක්ම) එකින් එක පරීක්ෂා කිරීම
        for (const record of records) {
            // අදාළ දිනයට කලින් Save කරපු දත්ත තියෙනවදැයි සෙවීම
            let existingSummary = await DailySummary.findOne({ date: record.date });

            if (!existingSummary) {
                // එම දිනයට කිසිදු දත්තයක් නැත්නම් අලුතින්ම Document එකක් සාදයි
                const newSummary = new DailySummary({
                    date: record.date,
                    items: record.items
                });
                await newSummary.save();
            } else {
                // එම දිනයට දත්ත තිබේ නම් අලුත් Items ටික ඊට එකතු කරයි (Merge)
                record.items.forEach(newItem => {
                    // මේ එවන Item එක (Category එක සහ Size එක) දැනටමත් තියෙනවද කියලා බලනවා
                    const existingItemIndex = existingSummary.items.findIndex(
                        item => item.categoryId === newItem.categoryId && item.size === newItem.size
                    );

                    if (existingItemIndex > -1) {
                        // එකම Item එක තිබුණොත්, පරණ ගාණට අලුත් ගාණ එකතු කරනවා (+)
                        existingSummary.items[existingItemIndex].out += Number(newItem.out || 0);
                        existingSummary.items[existingItemIndex].in += Number(newItem.in || 0);
                    } else {
                        // වෙනත් අලුත් Item එකක් (Tea type එකක්) නම්, ඒක අලුතින්ම list එකට දානවා
                        existingSummary.items.push(newItem);
                    }
                });
                
                // යාවත්කාලීන කළ දත්ත Save කිරීම
                await existingSummary.save();
            }
        }

        res.status(200).json({ success: true, message: "All daily records saved successfully!" });
    } catch (error) {
        console.error("Error saving summaries:", error);
        res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
};

// 2. Get All Summaries
export const getAllSummaries = async (req, res) => {
    try {
        const summaries = await DailySummary.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: summaries });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching data." });
    }
};

// 3. Edit Item (යාවත්කාලීන කළ කොටස 👇)
export const updateSummaryItem = async (req, res) => {
    try {
        const { recordId, itemId } = req.params;
        // Frontend එකෙන් එවන in, out සහ editedBy (Username) ලබාගැනීම
        const { in: inValue, out: outValue, editedBy } = req.body; 

        const updatedSummary = await DailySummary.findOneAndUpdate(
            { _id: recordId, "items._id": itemId },
            { 
                $set: { 
                    "items.$.in": inValue, 
                    "items.$.out": outValue,
                    "items.$.lastEditedBy": editedBy || 'Unknown User', // Edit කළ කෙනාගේ නම
                    "items.$.lastEditedAt": new Date()                  // Edit කළ වෙලාව
                } 
            },
            { new: true } 
        );

        if (!updatedSummary) {
            return res.status(404).json({ success: false, message: "Record or Item not found!" });
        }

        res.status(200).json({ success: true, message: "Item updated successfully!", data: updatedSummary });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ success: false, message: "Error updating item.", error: error.message });
    }
};

// 4. Delete a specific Item from a Record
export const deleteSummaryItem = async (req, res) => {
    try {
        const { recordId, itemId } = req.params;

        const summary = await DailySummary.findById(recordId);
        if (!summary) {
            return res.status(404).json({ success: false, message: "Record not found!" });
        }

        // අදාල Item එක array එකෙන් අයින් කිරීම
        summary.items = summary.items.filter(item => item._id.toString() !== itemId);

        // ඉවත් කළ පසු items මුකුත්ම නැත්නම් මුළු Record එකම (දවසම) delete කිරීම
        if (summary.items.length === 0) {
            await DailySummary.findByIdAndDelete(recordId);
            return res.status(200).json({ 
                success: true, 
                message: "Record deleted completely as it became empty." 
            });
        }

        // එසේ නැත්නම් ඉතිරි items ටික save කිරීම
        await summary.save();
        res.status(200).json({ 
            success: true, 
            message: "Item deleted successfully!" 
        });

    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ success: false, message: "Error deleting item.", error: error.message });
    }
};