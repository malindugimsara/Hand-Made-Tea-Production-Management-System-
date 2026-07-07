import FactoryLog from "../models/FactoryLog.js";
import PendingTransfer from "../../Packing/models/PendingTransfer.js";
import TeaReceived from "../../Packing/models/TeaReceivedModel.js"; // <-- Add this line

// 1. GET FACTORY LOGS
export const getFactoryLogsByMonth = async (req, res) => {
  try {
    const { month, startDate, endDate } = req.query;
    let query = {};
    let beforeDateQuery = null;

    if (month) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
      beforeDateQuery = { date: { $lt: startOfMonth } };
    } else if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      query.date = { $gte: start, $lte: end };
      beforeDateQuery = { date: { $lt: start } };
    } else {
      return res.status(400).json({ message: "Please provide a 'month' or 'startDate' and 'endDate'." });
    }

    let bfFromLastMonth = 0;
    if (beforeDateQuery) {
      const aggrResult = await FactoryLog.aggregate([
        { $match: beforeDateQuery },
        {
          $group: {
            _id: null,
            totalMadeTea: { $sum: { $ifNull: ["$madeTea.today", 0] } },
            totalDispatch: { $sum: { $ifNull: ["$dispatch", 0] } },
            totalLocal: { $sum: { $ifNull: ["$localSaleAndGratis", 0] } },
            totalReturn: { $sum: { $ifNull: ["$returnAmount", 0] } },
          },
        },
      ]);
      if (aggrResult.length > 0) {
        const { totalMadeTea, totalDispatch, totalLocal, totalReturn } = aggrResult[0];
        bfFromLastMonth = totalMadeTea - (totalDispatch + totalLocal) + totalReturn;
      }
    }

    const records = await FactoryLog.find(query).sort({ date: 1 });
    res.status(200).json({ bfFromLastMonth, records });
  } catch (error) {
    console.error("Error fetching factory logs:", error);
    res.status(500).json({ message: "Server error fetching factory logs." });
  }
};

// 2. SAVE OR UPDATE DAILY FACTORY LOG
export const saveDailyFactoryLog = async (req, res) => {
  try {
    const { date, greenLeafToday, dispatch, localSaleAndGratis, returnAmount, username, isExplicitEdit } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const glToday = Number(greenLeafToday) || 0;

    // 🌟 FIXED: Dynamic Made Tea Calculation based on month
    const selectedMonthNumber = targetDate.getMonth() + 1; // getMonth is 0-indexed (0-11)
    const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
    const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
    const madeTeaToday = glToday * conversionRate;
    // ---------------------------------------------------

    const totalOut =
      (Number(dispatch) || 0) + (Number(localSaleAndGratis) || 0);
    const retAmount = Number(returnAmount) || 0;

    // 🌟 Backend Validation
    const aggrResult = await FactoryLog.aggregate([
      { $match: { date: { $lt: targetDate } } },
      {
        $group: {
          _id: null,
          totalMadeTea: { $sum: { $ifNull: ["$madeTea.today", 0] } },
          totalDispatch: { $sum: { $ifNull: ["$dispatch", 0] } },
          totalLocal: { $sum: { $ifNull: ["$localSaleAndGratis", 0] } },
          totalReturn: { $sum: { $ifNull: ["$returnAmount", 0] } },
        },
      },
    ]);

    let previousBalance = 0;
    if (aggrResult.length > 0) {
      const r = aggrResult[0];
      previousBalance = r.totalMadeTea - (r.totalDispatch + r.totalLocal) + r.totalReturn;
    }

    const currentBalance = previousBalance + madeTeaToday - totalOut + retAmount;

    if (currentBalance < 0) {
      return res.status(400).json({
        message: `Cannot save record for ${date}. Total Out exceeds the available Factory Balance.`,
      });
    }

    const existingRecord = await FactoryLog.findOne({ date: targetDate });
    let updateFields = {
      greenLeaf: { today: glToday },
      
      // madeTea එක දශම 2 කට සීමා කිරීම
      madeTea: { today: Number(madeTeaToday.toFixed(2)) }, 
      
      dispatch: Number(dispatch) || 0,
      localSaleAndGratis: Number(localSaleAndGratis) || 0,
      totalOut: totalOut,
      returnAmount: retAmount,
      
      // Balances දශම 2 කට සීමා කිරීම
      bfBalance: Number(previousBalance.toFixed(2)),
      factoryBalance: Number(currentBalance.toFixed(2)),
    };

    if (existingRecord) {
      // Edit Page එකෙන් එවනවා නම් විතරක් isEdited: true වෙනවා
      if (isExplicitEdit) {
        updateFields.isEdited = true;
        updateFields.lastUpdatedDate = new Date();
        updateFields.editedBy = username || req.user?.username || "Unknown User";
      }
      // isExplicitEdit නැත්නම් (ඒ කියන්නේ Dispatch add කරනවා වගේ නම්),
      // isEdited status එකට මුකුත් කරන්නේ නෑ. ඒක තිබ්බ විදියටම තියෙනවා.
    } else {
      // අලුත්ම රෙකෝඩ් එකක් නම්
      updateFields.isEdited = false;
      updateFields.editedBy = username || req.user?.username || "System User";
    }

    const updatedLog = await FactoryLog.findOneAndUpdate(
      { date: targetDate },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // ==========================================
    // 🌟 PACKING AUTOMATION (Trans Out to Pending)
    // ==========================================
    if (updateFields.localSaleAndGratis > 0) {
      const existingPending = await PendingTransfer.findOne({
        date: targetDate,
        grade: "Local Sale (Auto)",
        status: "Pending" // තාම Accept කරපු නැති ඒවා විතරක් Update වෙන්න
      });

      if (existingPending) {
        existingPending.sentQtyKg = updateFields.localSaleAndGratis;
        await existingPending.save();
      } else {
        const autoTransNo = `FACT/TO/${Date.now().toString().slice(-6)}`;
        
        const newPendingTransfer = new PendingTransfer({
          date: targetDate,
          transferNo: autoTransNo,
          grade: "Local Sale (Auto)",
          sentQtyKg: updateFields.localSaleAndGratis,
          factoryUsername: updateFields.editedBy
        });
        await newPendingTransfer.save();
      }
    } else {
      // Local sale එක 0 කරොත් Pending තියෙන එක අයින් වෙන්න ඕනේ
      await PendingTransfer.findOneAndDelete({
        date: targetDate,
        grade: "Local Sale (Auto)",
        status: "Pending"
      });
    }
    // ==========================================

    res.status(200).json({
      message: "Daily factory log saved successfully.",
      data: updatedLog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error saving daily factory log." });
  }
};

// 3. DELETE FACTORY LOG
export const deleteFactoryLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await FactoryLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Record not found." });
    }

    // 🌟 Factory Log එක මකද්දි ඒකට අදාල Auto Packing Record එකත් මකන්න
    await TeaReceived.findOneAndDelete({
        date: new Date(log.date).toISOString().split('T')[0], 
        "receivedItems.grade": "Local Sale (Auto)"
    });

    await FactoryLog.findByIdAndDelete(id);
    res.status(200).json({ message: "Record deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting factory log." });
  }
};