import GuideIssue from '../models/GuideIssueModel.js';

// @desc    Create new guide issue record
// @route   POST /api/guide-issues
// @access  Private
export const createGuideIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems } = req.body;

        if (!issueItems || issueItems.length === 0) {
            return res.status(400).json({ message: 'No issue items provided' });
        }

        const newGuideIssue = new GuideIssue({
            date,
            totalBoxes,
            totalQtyKg,
            issueItems,
        });

        const savedIssue = await newGuideIssue.save();
        res.status(201).json(savedIssue);

    } catch (error) {
        console.error('Error saving guide issue:', error);
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
};

// @desc    Get all guide issues
// @route   GET /api/guide-issues
// @access  Private
export const getGuideIssues = async (req, res) => {
    try {
        const issues = await GuideIssue.find().sort({ date: -1 });
        res.status(200).json(issues);
    } catch (error) {
        console.error('Error fetching guide issues:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Delete a guide issue
// @route   DELETE /api/guide-issues/:id
// @access  Private
export const deleteGuideIssue = async (req, res) => {
    try {
        const issue = await GuideIssue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await issue.deleteOne();
        res.status(200).json({ message: 'Record removed successfully' });
    } catch (error) {
        console.error('Error deleting guide issue:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};

// @desc    Update a guide issue record
// @route   PUT /api/guide-issues/:id
// @access  Private
export const updateGuideIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems, updatedBy, editorName } = req.body;

        const issue = await GuideIssue.findById(req.params.id);

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
        console.error('Error updating guide issue:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};