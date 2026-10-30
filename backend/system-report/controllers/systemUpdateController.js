import SystemUpdate from '../models/SystemUpdate.js';

// @desc    Create a new System Update record
// @route   POST /api/system-updates
// @access  Protected
export const createSystemUpdate = async (req, res) => {
  try {
    const newUpdate = new SystemUpdate(req.body);
    const savedUpdate = await newUpdate.save();

    return res.status(201).json({
      success: true,
      message: 'System update record created successfully.',
      data: savedUpdate
    });
  } catch (error) {
    console.error('Create System Update Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create system update record.',
      error: error.message
    });
  }
};

// @desc    Get all System Update records (with optional month filter)
// @route   GET /api/system-updates
// @access  Protected
export const getSystemUpdates = async (req, res) => {
  try {
    const { month } = req.query; // Expecting format 'YYYY-MM'
    let query = {};

    if (month) {
      // Filter records where completeDate or assignDate starts with the given month
      query = {
        $or: [
          { completeDate: { $regex: `^${month}` } },
          { assignDate: { $regex: `^${month}` } }
        ]
      };
    }

    // Sort by assignDate descending (newest first)
    const updates = await SystemUpdate.find(query).sort({ assignDate: -1 });

    return res.status(200).json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (error) {
    console.error('Get System Updates Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch system update records.',
      error: error.message
    });
  }
};

// @desc    Update a System Update record by ID
// @route   PUT /api/system-updates/:id
// @access  Protected
export const updateSystemUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord = await SystemUpdate.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'System update record modified successfully.',
      data: updatedRecord
    });
  } catch (error) {
    console.error('Update System Update Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update record.',
      error: error.message
    });
  }
};

// @desc    Delete a System Update record by ID
// @route   DELETE /api/system-updates/:id
// @access  Protected
export const deleteSystemUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await SystemUpdate.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'System update record deleted successfully.'
    });
  } catch (error) {
    console.error('Delete System Update Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete record.',
      error: error.message
    });
  }
};