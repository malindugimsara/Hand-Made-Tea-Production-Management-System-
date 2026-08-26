import RollingRoomSheet from '../models/RollingRoomSheet.js';

// @desc    Create or update a Rolling Room Sheet (Upsert by cropDate/mfDate)
// @route   POST /api/rolling-room-sheet
// @access  Protected
export const saveRollingRoomSheet = async (req, res) => {
  try {
    const {
      cropDate,
      mfDate,
      cropKg,
      otherLeafKg,
      rollingStartTime,
      rollingEndTime,
      totalRollingHours,
      dayType,
      batches,
      factory
    } = req.body;

    if (!cropDate || !mfDate) {
      return res.status(400).json({
        success: false,
        message: 'Crop Date and M/F Date are required.'
      });
    }

    const username = req.user?.username || req.body.username || 'Admin';

    // Check if a sheet already exists for this cropDate
    let sheet = await RollingRoomSheet.findOne({ cropDate });

    if (sheet) {
      // Update existing record
      sheet.mfDate = mfDate;
      sheet.cropKg = Number(cropKg) || 0;
      sheet.otherLeafKg = Number(otherLeafKg) || 0;
      sheet.rollingStartTime = rollingStartTime || '';
      sheet.rollingEndTime = rollingEndTime || '';
      sheet.totalRollingHours = totalRollingHours || '';
      sheet.dayType = dayType || 'Same Day';
      sheet.batches = batches || [];
      sheet.factory = factory || sheet.factory;
      sheet.editedBy = username;

      const updatedSheet = await sheet.save();
      return res.status(200).json({
        success: true,
        message: 'Rolling Room Sheet updated successfully!',
        data: updatedSheet
      });
    }

    // Create new record
    const newSheet = new RollingRoomSheet({
      factory,
      cropDate,
      mfDate,
      cropKg: Number(cropKg) || 0,
      otherLeafKg: Number(otherLeafKg) || 0,
      rollingStartTime,
      rollingEndTime,
      totalRollingHours,
      dayType,
      batches: batches || [],
      createdBy: username
    });

    const savedSheet = await newSheet.save();

    return res.status(201).json({
      success: true,
      message: 'Rolling Room Sheet created successfully!',
      data: savedSheet
    });
  } catch (error) {
    console.error('Error in saveRollingRoomSheet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save Rolling Room Sheet.',
      error: error.message
    });
  }
};

// @desc    Get Rolling Room Sheet records (with optional ?date= or ?cropDate= filter)
// @route   GET /api/rolling-room-sheet
// @access  Protected
export const getRollingRoomSheets = async (req, res) => {
  try {
    const { date, cropDate, mfDate } = req.query;
    const query = {};

    if (date) {
      // Matches either cropDate or mfDate
      query.$or = [{ cropDate: date }, { mfDate: date }];
    } else {
      if (cropDate) query.cropDate = cropDate;
      if (mfDate) query.mfDate = mfDate;
    }

    const sheets = await RollingRoomSheet.find(query).sort({ cropDate: -1 });

    return res.status(200).json({
      success: true,
      count: sheets.length,
      data: sheets
    });
  } catch (error) {
    console.error('Error in getRollingRoomSheets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Rolling Room Sheets.',
      error: error.message
    });
  }
};

// @desc    Get single Rolling Room Sheet by ID
// @route   GET /api/rolling-room-sheet/:id
// @access  Protected
export const getRollingRoomSheetById = async (req, res) => {
  try {
    const sheet = await RollingRoomSheet.findById(req.params.id);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Rolling Room Sheet not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: sheet
    });
  } catch (error) {
    console.error('Error in getRollingRoomSheetById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch the record.',
      error: error.message
    });
  }
};

// @desc    Delete a Rolling Room Sheet by ID
// @route   DELETE /api/rolling-room-sheet/:id
// @access  Protected (Admin)
export const deleteRollingRoomSheet = async (req, res) => {
  try {
    const sheet = await RollingRoomSheet.findByIdAndDelete(req.params.id);

    if (!sheet) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rolling Room Sheet deleted successfully!'
    });
  } catch (error) {
    console.error('Error in deleteRollingRoomSheet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete record.',
      error: error.message
    });
  }
};