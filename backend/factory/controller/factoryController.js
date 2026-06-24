import FactoryLog from "../models/FactoryLog.js";

// 1. GET FACTORY LOGS (මාසය අනුව හෝ දින පරාසය අනුව පෙර මාසයේ B/F එකද සමඟ ලබා ගැනීම)
export const getFactoryLogsByMonth = async (req, res) => {
  try {
    const { month, startDate, endDate } = req.query;

    let query = {};
    let beforeDateQuery = null; // B/F ගණනය කිරීම සඳහා පෙර දින සෙවීම

    // 1. මාසය පමණක් (Month) තෝරා ඇත්නම්
    if (month) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(
        startOfMonth.getFullYear(),
        startOfMonth.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      query.date = { $gte: startOfMonth, $lte: endOfMonth };
      beforeDateQuery = { date: { $lt: startOfMonth } }; // තෝරාගත් මාසයට පෙර සියලු දත්ත
    }
    // 2. දින පරාසයක් (Date Range) තෝරා ඇත්නම්
    else if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      query.date = { $gte: start, $lte: end };
      beforeDateQuery = { date: { $lt: start } }; // තෝරාගත් දිනට පෙර සියලු දත්ත
    } else {
      return res.status(400).json({
        message: "Please provide a 'month' or 'startDate' and 'endDate'.",
      });
    }

    // ==========================================
    // 🌟 B/F Balance එක ගණනය කිරීම (Aggregations මගින්)
    // ==========================================
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
        const { totalMadeTea, totalDispatch, totalLocal, totalReturn } =
          aggrResult[0];

        // B/F Balance Formula = (Total Made Tea) - (Dispatch + Local Sales) + Returns
        bfFromLastMonth =
          totalMadeTea - (totalDispatch + totalLocal) + totalReturn;
      }
    }

    // ==========================================
    // 🌟 අදාල මාසයේ/දින පරාසයේ Records ලබා ගැනීම
    // ==========================================
    const records = await FactoryLog.find(query).sort({ date: 1 });

    // ගණනය කළ B/F අගය හා අදාළ දත්ත ටික Frontend එකට යැවීම
    res.status(200).json({ bfFromLastMonth, records });
  } catch (error) {
    console.error("Error fetching factory logs:", error);
    res.status(500).json({ message: "Server error fetching factory logs." });
  }
};

// 2. SAVE OR UPDATE DAILY FACTORY LOG (Edit karaddi Username eka show wenne methanadi)
// 2. SAVE OR UPDATE DAILY FACTORY LOG
export const saveDailyFactoryLog = async (req, res) => {
  try {
    const {
      date,
      greenLeafToday,
      dispatch,
      localSaleAndGratis,
      returnAmount,
      username,
    } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const glToday = Number(greenLeafToday) || 0;
    const madeTeaToday = glToday * 0.215;
    const totalOut =
      (Number(dispatch) || 0) + (Number(localSaleAndGratis) || 0);
    const retAmount = Number(returnAmount) || 0;

    // 🌟 Backend Validation එක මෙතනින් පටන් ගන්නවා
    // 1. මේ දවසට කලින් තිබුණු ඔක්කොම Record වල අගයන් එකතු කරලා Previous Balance එක හොයනවා
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
      previousBalance =
        r.totalMadeTea - (r.totalDispatch + r.totalLocal) + r.totalReturn;
    }

    // 2. මේ දවසේ අගයන් ටිකත් එක්ක අලුත් Balance එක හදනවා
    const currentBalance =
      previousBalance + madeTeaToday - totalOut + retAmount;

    // 3. Balance එක ඍණ වෙනවනම් Save වෙන්න දෙන්නේ නෑ
    if (currentBalance < 0) {
      return res.status(400).json({
        message: `Cannot save record for ${date}. Total Out exceeds the available Factory Balance.`,
      });
    }
    // 🌟 Validation එක ඉවරයි

    const existingRecord = await FactoryLog.findOne({ date: targetDate });

    let updateFields = {
      greenLeaf: { today: glToday },
      madeTea: { today: madeTeaToday },
      dispatch: Number(dispatch) || 0,
      localSaleAndGratis: Number(localSaleAndGratis) || 0,
      totalOut: totalOut,
      returnAmount: retAmount,
    };

    // factoryLogController.js එක ඇතුළේ saveDailyFactoryLog function එකේ updateFields වලට පස්සේ කොටස:

    if (existingRecord) {
      updateFields.isEdited = true;
      updateFields.lastUpdatedDate = new Date();
      updateFields.editedBy = username || req.user?.username || "Unknown User";
    } else {
      updateFields.isEdited = false;
      // 🌟 මුල් වතාවට record එකක් හදද්දිත් දාන කෙනාගේ නම save කරගන්න (පසුව Edit කරද්දී බලාගන්න ලේසියි)
      updateFields.editedBy = username || req.user?.username || "System User";
    }

    const updatedLog = await FactoryLog.findOneAndUpdate(
      { date: targetDate },
      { $set: updateFields },
      { new: true, upsert: true },
    );

    res.status(200).json({
      message: "Daily factory log saved successfully.",
      data: updatedLog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error saving daily factory log." });
  }
};

// 3. DELETE FACTORY LOG (මකා දැමීමේ පහසුකම)
export const deleteFactoryLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await FactoryLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Record not found." });
    }

    await FactoryLog.findByIdAndDelete(id);
    res.status(200).json({ message: "Record deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting factory log." });
  }
};
