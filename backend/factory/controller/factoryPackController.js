import FactoryPack from '../models/FactoryPack.js';

// @desc    Save or Update a full day's ledger row (Upsert)
// @route   POST /api/factory-packs
export const saveDailyLedger = async (req, res) => {
  try {
    // Destructure the request body to get the necessary fields
    const { date, agSuper, aGroup, sampleBags, isDispatchUpdate } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    let updateQuery = {};

    if (isDispatchUpdate) {
        updateQuery = {
            $inc: {
                "agSuper.used": agSuper?.received || 0,
                "aGroup.used": aGroup?.received || 0,
                "sampleBags.used": sampleBags?.received || 0
            }
        };
    } else {
        // 💡 Factory Packing Page එකෙන් එනවා නම්, සාමාන්‍ය විදිහට Replace කරනවා (Manual Edit)
        updateQuery = {
            $set: { agSuper, aGroup, sampleBags }
        };
    }

    const updatedRow = await FactoryPack.findOneAndUpdate(
      { date },
      updateQuery,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Ledger row saved successfully',
      data: updatedRow
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error saving ledger data', 
      error: error.message 
    });
  }
};

// @desc    Get all ledger rows
// @route   GET /api/factory-packs
export const getLedgerData = async (req, res) => {
  try {
    // Sort by date ascending so it reads chronologically like your physical book
    const ledger = await FactoryPack.find().sort({ date: 1 });
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving ledger data', 
      error: error.message 
    });
  }
};

// @desc    Delete a specific ledger row
// @route   DELETE /api/factory-packs/:id
export const deleteLedgerRow = async (req, res) => {
  try {
    const row = await FactoryPack.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await row.deleteOne();
    res.status(200).json({ success: true, message: 'Ledger row deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message 
    });
  }
};