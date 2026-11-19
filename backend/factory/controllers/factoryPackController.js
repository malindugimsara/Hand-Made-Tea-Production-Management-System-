import FactoryPack from '../models/FactoryPack.js';

// Helper: Recalculates running balances across all days chronologically
const recalculateLedgerBalances = async () => {
  const rows = await FactoryPack.find().sort({ date: 1 });
  const categories = ['agSuper', 'aGroup', 'sampleBags', 'unmarked'];

  const runningBalance = {
    agSuper: 0,
    aGroup: 0,
    sampleBags: 0,
    unmarked: 0
  };

  const bulkOps = [];

  for (const row of rows) {
    const updateFields = {};

    categories.forEach((cat) => {
      const rec = Number(row[cat]?.received) || 0;
      const used = Number(row[cat]?.used) || 0;
      const dmg = Number(row[cat]?.damaged) || 0;

      // Reduce both used and damaged from stock
      runningBalance[cat] = runningBalance[cat] + rec - (used + dmg);
      updateFields[`${cat}.balance`] = runningBalance[cat];
    });

    bulkOps.push({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: updateFields }
      }
    });
  }

  if (bulkOps.length > 0) {
    await FactoryPack.bulkWrite(bulkOps);
  }
};

// @desc    Save or Update a full day's ledger row (Upsert)
// @route   POST /api/factory-packs
export const saveDailyLedger = async (req, res) => {
  try {
    const { date, agSuper, aGroup, sampleBags, unmarked, isDispatchUpdate } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    let updateQuery = {};

    if (isDispatchUpdate) {
      updateQuery = {
        $inc: {
          "agSuper.used": agSuper?.received || 0,
          "aGroup.used": aGroup?.received || 0,
          "sampleBags.used": sampleBags?.received || 0,
          "unmarked.used": unmarked?.received || 0
        }
      };
    } else {
      // Replace daily inputs when submitted from Factory Packing page
      const formatCategory = (cat) => ({
        received: Number(cat?.received) || 0,
        used: Number(cat?.used) || 0,
        damaged: Number(cat?.damaged) || 0
      });

      updateQuery = {
        $set: {
          agSuper: formatCategory(agSuper),
          aGroup: formatCategory(aGroup),
          sampleBags: formatCategory(sampleBags),
          unmarked: formatCategory(unmarked)
        }
      };
    }

    await FactoryPack.findOneAndUpdate(
      { date },
      updateQuery,
      { new: true, upsert: true, runValidators: true }
    );

    // Recalculate running balances so damaged & used quantities reduce stock accurately
    await recalculateLedgerBalances();

    const updatedRow = await FactoryPack.findOne({ date });

    res.status(200).json({
      success: true,
      message: 'Ledger row saved and stock balances updated successfully',
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
    await recalculateLedgerBalances();

    res.status(200).json({ success: true, message: 'Ledger row deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message 
    });
  }
};