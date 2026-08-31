import FiringSection from '../models/FiringSection.js';

/**
 * @desc    Create or Update Firing Section entry by Date of Manufacture
 * @route   POST /api/firing-section
 * @access  Private
 */
export const saveFiringSection = async (req, res) => {
  try {
    const { dateOfManufacture } = req.body;

    if (!dateOfManufacture) {
      return res.status(400).json({
        success: false,
        message: 'Date of Manufacture is required'
      });
    }

    const currentUserName = req.user?.name || req.user?.username || 'Admin';

    // Upsert pattern: update if record exists for this date, otherwise create
    let record = await FiringSection.findOne({ dateOfManufacture });

    if (record) {
      // Update existing record
      Object.assign(record, req.body);
      record.editedBy = currentUserName;
      await record.save();

      return res.status(200).json({
        success: true,
        message: 'Firing section record updated successfully',
        data: record
      });
    }

    // Create new record
    record = new FiringSection({
      ...req.body,
      createdBy: currentUserName
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: 'Firing section record created successfully',
      data: record
    });
  } catch (error) {
    console.error('Error saving firing section record:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while saving firing record'
    });
  }
};

/**
 * @desc    Get all Firing Section records (or filter by date)
 * @route   GET /api/firing-section
 * @access  Private
 */
export const getFiringSections = async (req, res) => {
  try {
    const { date } = req.query;
    const query = date ? { dateOfManufacture: date } : {};

    const records = await FiringSection.find(query).sort({ dateOfManufacture: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching firing records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching firing records'
    });
  }
};

/**
 * @desc    Get single Firing Section record by ID
 * @route   GET /api/firing-section/:id
 * @access  Private
 */
export const getFiringSectionById = async (req, res) => {
  try {
    const record = await FiringSection.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Firing section record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error fetching record by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching firing record'
    });
  }
};

/**
 * @desc    Delete Firing Section record
 * @route   DELETE /api/firing-section/:id
 * @access  Private (Admin)
 */
export const deleteFiringSection = async (req, res) => {
  try {
    const record = await FiringSection.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Firing section record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Firing section record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting firing record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting firing record'
    });
  }
};