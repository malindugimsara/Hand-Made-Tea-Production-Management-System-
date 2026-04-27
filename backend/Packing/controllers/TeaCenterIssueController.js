import TeaCenterIssue from '../models/TeaCenterIssueModel.js';
import PackingStock from '../models/PackingStock.js'; // <-- Added the PackingStock model

// @desc    Create new tea center issue records
// @route   POST /api/tea-center-issues
// @access  Private
export const createTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems } = req.body;

        if (!issueItems || issueItems.length === 0) {
            return res.status(400).json({ message: 'No issue items provided' });
        }

        // Must be "new TeaCenterIssue", NOT "new ProductIssue"
        const newIssue = new TeaCenterIssue({
            date,
            totalBoxes,
            totalQtyKg,
            issueItems,
        });

        // 👇 AUTOMATED INVENTORY DEDUCTION LOGIC 👇
        for (const item of issueItems) {
            // Find the master stock record for this product
            const stock = await PackingStock.findOne({ productName: item.product });

            if (stock) {
                // Find the specific pack size inside the packedItems array
                const packIndex = stock.packedItems.findIndex(p => p.packSizeKg === item.packSizeKg);

                if (packIndex > -1) {
                    // Deduct the number of boxes issued from the inventory
                    stock.packedItems[packIndex].numberOfBoxes -= item.numberOfBoxes;
                    
                    // Safety check: prevent negative inventory
                    if (stock.packedItems[packIndex].numberOfBoxes < 0) {
                        stock.packedItems[packIndex].numberOfBoxes = 0; 
                    }
                } else {
                    console.warn(`Warning: Pack size ${item.packSizeKg}kg not found in inventory for ${item.product}`);
                }

                // Save the stock to trigger the .pre('save') hook and recalculate totals
                await stock.save();
            } else {
                console.warn(`Warning: Product ${item.product} not found in inventory master list.`);
            }
        }
        // 👆 END OF AUTOMATED INVENTORY DEDUCTION 👆

        const savedIssue = await newIssue.save();
        res.status(201).json(savedIssue);

    } catch (error) {
        // THIS is what is printing in your backend terminal right now
        console.error('Error saving tea center issue:', error); 
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
}

// @desc    Get all tea center issues
// @route   GET /api/tea-center-issues
// @access  Private
export const getTeaCenterIssues = async (req, res) => {
    try {
        const issues = await TeaCenterIssue.find().sort({ date: -1 });
        res.status(200).json(issues);
    } catch (error) {
        console.error('Error fetching tea center issues:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Update a tea center issue record
// @route   PUT /api/tea-center-issues/:id
// @access  Private
export const updateTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems, updatedBy, editorName } = req.body;

        const issue = await TeaCenterIssue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Update the fields with new data from the frontend
        issue.date = date;
        issue.totalBoxes = totalBoxes;
        issue.totalQtyKg = totalQtyKg;
        issue.issueItems = issueItems;

        // If you added updatedBy/editorName to your Mongoose Schema, update them here:
        if (updatedBy) issue.updatedBy = updatedBy;
        if (editorName) issue.editorName = editorName;

        const updatedIssue = await issue.save();
        res.status(200).json(updatedIssue);

    } catch (error) {
        console.error('Error updating tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};

export const deleteTeaCenterIssue = async (req, res) => {
    try {
        const issue = await TeaCenterIssue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await issue.deleteOne();
        res.status(200).json({ message: 'Record deleted successfully' });

    } catch (error) {
        console.error('Error deleting tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};