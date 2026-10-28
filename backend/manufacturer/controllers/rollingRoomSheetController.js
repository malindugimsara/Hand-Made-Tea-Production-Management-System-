import RollingRoomSheet from '../models/RollingRoomSheet.js';

// Helper to sanitize batch data matching the manual log sheet structure
const sanitizeBatches = (batches = [], standardBatchKg = 560) => {
  const stdKg = Number(standardBatchKg) > 0 ? Number(standardBatchKg) : 560;

  return batches.map((batch, index) => {
    const d1Kg = Number(batch.dhool1?.wetDhoolKg) || 0;
    const d2Kg = Number(batch.dhool2?.wetDhoolKg) || 0;

    return {
      batchNo: batch.batchNo || index + 1,
      dhool1: {
        roll01Start: batch.dhool1?.roll01Start || '',
        roll01End: batch.dhool1?.roll01End || '',
        roll02Start: batch.dhool1?.roll02Start || '',
        roll02End: batch.dhool1?.roll02End || '',
        wetDhoolKg: d1Kg,
        percentage: d1Kg > 0 ? Number(((d1Kg / stdKg) * 100).toFixed(2)) : 0
      },
      dhool2: {
        roll03Start: batch.dhool2?.roll03Start || '',
        roll03End: batch.dhool2?.roll03End || '',
        roll04Start: batch.dhool2?.roll04Start || '',
        roll04End: batch.dhool2?.roll04End || '',
        wetDhoolKg: d2Kg,
        percentage: d2Kg > 0 ? Number(((d2Kg / stdKg) * 100).toFixed(2)) : 0
      }
    };
  });
};

// 💡 Helper to sanitize Hydro Meter readings
const sanitizeHydroReadings = (readings = []) => {
  if (!Array.isArray(readings)) return [];
  return readings.map(r => ({
    time: r.time || '',
    dryBulb: r.dryBulb || '',
    wetBulb: r.wetBulb || '',
    difference: r.difference || ''
  }));
};

// @desc    Save or Update Rolling Room Sheet (Upsert by cropDate)
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
      standardBatchKg,
      batches,
      hydroReadings, // 💡 Extract hydroReadings from req.body
      factory
    } = req.body;

    if (!cropDate || !mfDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Crop Date and M/F Date are required.' 
      });
    }

    const enteredBy = req.user ? (req.user.username || req.user.name) : (req.body.username || 'Admin');
    const stdBatchKg = Number(standardBatchKg) > 0 ? Number(standardBatchKg) : 560;
    const cleanBatches = sanitizeBatches(batches, stdBatchKg);
    const cleanHydroReadings = sanitizeHydroReadings(hydroReadings); // 💡 Sanitize hydroReadings

    const updateData = {
      mfDate,
      cropKg: Number(cropKg) || 0,
      otherLeafKg: Number(otherLeafKg) || 0,
      rollingStartTime: rollingStartTime || '',
      rollingEndTime: rollingEndTime || '',
      totalRollingHours: totalRollingHours || '',
      dayType: dayType || 'Same Day',
      standardBatchKg: stdBatchKg,
      noOfBatches: cleanBatches.length,
      batches: cleanBatches,
      hydroReadings: cleanHydroReadings, // 💡 Add to update data
      enteredBy: enteredBy,
      createdBy: enteredBy,
      editedBy: enteredBy,
      ...(factory && { factory })
    };

    const savedSheet = await RollingRoomSheet.findOneAndUpdate(
      { cropDate: cropDate },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Rolling Room Sheet saved successfully!',
      data: savedSheet
    });
  } catch (error) {
    console.error('Save Rolling Room Sheet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save Rolling Room Sheet.',
      error: error.message
    });
  }
};

// @desc    Update single Rolling Room Sheet by ID (In-place edit)
// @route   PUT /api/rolling-room-sheet/:id
// @access  Protected
export const updateRollingRoomSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const editor = req.user ? (req.user.username || req.user.name) : (req.body.username || 'Admin');

    const updatePayload = { ...req.body };
    delete updatePayload._id;
    delete updatePayload.__v;
    delete updatePayload.createdAt;
    delete updatePayload.updatedAt;

    const stdBatchKg = Number(updatePayload.standardBatchKg) > 0 ? Number(updatePayload.standardBatchKg) : 560;

    // Sanitize batches and recompute percentages if batches are passed
    if (Array.isArray(updatePayload.batches)) {
      updatePayload.batches = sanitizeBatches(updatePayload.batches, stdBatchKg);
      updatePayload.noOfBatches = updatePayload.batches.length;
    }

    // 💡 Sanitize hydroReadings if they are updated
    if (Array.isArray(updatePayload.hydroReadings)) {
      updatePayload.hydroReadings = sanitizeHydroReadings(updatePayload.hydroReadings);
    }

    if (updatePayload.cropKg !== undefined) {
      updatePayload.cropKg = Number(updatePayload.cropKg) || 0;
    }
    if (updatePayload.otherLeafKg !== undefined) {
      updatePayload.otherLeafKg = Number(updatePayload.otherLeafKg) || 0;
    }

    updatePayload.editedBy = editor;

    const updatedSheet = await RollingRoomSheet.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedSheet) {
      return res.status(404).json({
        success: false,
        message: 'Rolling Room Sheet not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rolling Room Sheet updated successfully!',
      data: updatedSheet
    });
  } catch (error) {
    console.error('Update Rolling Room Sheet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Rolling Room Sheet.',
      error: error.message
    });
  }
};

// @desc    Get Rolling Room Sheet records (by ?cropDate=, ?mfDate=, or all)
// @route   GET /api/rolling-room-sheet
// @access  Protected
export const getRollingRoomSheets = async (req, res) => {
  try {
    const { date, cropDate, mfDate } = req.query;
    const query = {};

    if (date) {
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
    console.error('Get Rolling Room Sheets Error:', error);
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
    console.error('Get Rolling Room Sheet By Id Error:', error);
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
    console.error('Delete Rolling Room Sheet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete record.',
      error: error.message
    });
  }
};