import FactoryLog from "../models/FactoryLog.js";
import PendingTransfer from "../../Packing/models/PendingTransfer.js";
import TeaReceived from "../../Packing/models/TeaReceivedModel.js"; 

// 1. GET FACTORY LOGS (UPDATED WITH AGE OF STOCK LOGIC)
export const getFactoryLogsByMonth = async (req, res) => {
  try {
    const { month, startDate, endDate } = req.query;
    let query = {};
    let beforeDateQuery = null;
    let maxRequestedDate = new Date();

    if (month) {
      const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
      beforeDateQuery = { date: { $lt: startOfMonth } };
      maxRequestedDate = endOfMonth;
    } else if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      query.date = { $gte: start, $lte: end };
      beforeDateQuery = { date: { $lt: start } };
      maxRequestedDate = end;
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

    const records = await FactoryLog.find(query).sort({ date: 1 }).lean();

    // ========================================================
    // 3. DAYS TO ZERO (AGE OF STOCK) CALCULATION LOGIC
    // ========================================================
    
    let reqYear = maxRequestedDate.getFullYear();
    if (maxRequestedDate.getMonth() < 3) {
        reqYear -= 1; 
    }
    const aprilFirstDate = new Date(`${reqYear}-04-01T00:00:00.000Z`);

    const allRecordsSinceApril = await FactoryLog.find({
        date: { $gte: aprilFirstDate, $lte: maxRequestedDate }
    }).sort({ date: 1 }).lean();

    let virtualBalance = 0;

    const processedAllRecords = allRecordsSinceApril.map((record, index) => {
        const mt = record.madeTea?.today || 0;
        const disp = record.dispatch || 0;
        const loc = record.localSaleAndGratis || 0;
        const ret = record.returnAmount || 0;
        const totalOut = disp + loc;

        virtualBalance = virtualBalance + mt - totalOut + ret;
        let tempBal = virtualBalance;
        let days = 0;

        for (let j = index; j >= 0; j--) {
            if (tempBal <= 0) break;
            days++;
            const pastMt = allRecordsSinceApril[j].madeTea?.today || 0;
            tempBal = tempBal - pastMt; 
        }

        return {
            ...record,
            daysToZero: days
        };
    });

    const finalRecords = records.map(record => {
        const processedMatch = processedAllRecords.find(
            pr => pr._id.toString() === record._id.toString()
        );
        return {
            ...record,
            daysToZero: processedMatch ? processedMatch.daysToZero : 0
        };
    });

    // ========================================================

    res.status(200).json({ bfFromLastMonth, records: finalRecords });
  } catch (error) {
    console.error("Error fetching factory logs:", error);
    res.status(500).json({ message: "Server error fetching factory logs." });
  }
};

// 2. SAVE OR UPDATE DAILY FACTORY LOG (UPDATED WITH NEW FIELDS)
export const saveDailyFactoryLog = async (req, res) => {
  try {
    // 🌟 Added new fields to destructuring from req.body
    const { 
      date, 
      greenLeafToday, 
      dispatch, 
      localSaleAndGratis, 
      returnAmount, 
      invoiceNo,           // NEW
      dispatchTeaType,     // NEW
      localSaleTeaType,    // NEW
      username, 
      isExplicitEdit 
    } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const glToday = Number(greenLeafToday) || 0;

    const selectedMonthNumber = targetDate.getMonth() + 1; 
    const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
    const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
    const madeTeaToday = glToday * conversionRate;

    const totalOut = (Number(dispatch) || 0) + (Number(localSaleAndGratis) || 0);
    const retAmount = Number(returnAmount) || 0;

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
    
    // 🌟 Added new fields to the update document
    let updateFields = {
      greenLeaf: { today: glToday },
      madeTea: { today: Number(madeTeaToday.toFixed(2)) }, 
      
      // Dispatch Fields
      dispatch: Number(dispatch) || 0,
      invoiceNo: invoiceNo || "",              // NEW
      dispatchTeaType: dispatchTeaType || "",  // NEW
      
      // Local Sale Fields
      localSaleAndGratis: Number(localSaleAndGratis) || 0,
      localSaleTeaType: localSaleTeaType || "", // NEW
      
      totalOut: totalOut,
      returnAmount: retAmount,
      
      bfBalance: Number(previousBalance.toFixed(2)),
      factoryBalance: Number(currentBalance.toFixed(2)),
    };

    if (existingRecord) {
      if (isExplicitEdit) {
        updateFields.isEdited = true;
        updateFields.lastUpdatedDate = new Date();
        updateFields.editedBy = username || req.user?.username || "Unknown User";
      }
    } else {
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
        status: "Pending" 
      });

      if (existingPending) {
        existingPending.sentQtyKg = updateFields.localSaleAndGratis;
        // Optionally pass Tea Type to packing if they need it later
        // existingPending.notes = `Type: ${updateFields.localSaleTeaType}`; 
        await existingPending.save();
      } else {
        const autoTransNo = `FACT/TO/${Date.now().toString().slice(-6)}`;
        
        const newPendingTransfer = new PendingTransfer({
          date: targetDate,
          transferNo: autoTransNo,
          grade: `Local Sale - ${updateFields.localSaleTeaType || 'General'}`,          
          sentQtyKg: updateFields.localSaleAndGratis,
          factoryUsername: updateFields.editedBy
        });
        await newPendingTransfer.save();
      }
    } else {
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

// 3. DELETE FACTORY LOG (Unchanged)
export const deleteFactoryLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await FactoryLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Record not found." });
    }

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