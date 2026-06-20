import FactoryLog from '../models/FactoryLog.js';

// 1. GET MONTHLY FACTORY LOGS (සම්පූර්ණ මාසයේම දත්ත Auto-calculate කර ලබා ගැනීම)
// 1. GET FACTORY LOGS (Now supports a Date Range!)
export const getFactoryLogsByMonth = async (req, res) => {
  try {
    const { startMonth, endMonth, month } = req.query; 

    let startDate, endDate;

    // Support the new range selection (e.g., "2026-01" to "2026-06")
    if (startMonth && endMonth) {
        startDate = new Date(`${startMonth}-01T00:00:00.000Z`);
        endDate = new Date(`${endMonth}-01T00:00:00.000Z`);
        endDate.setMonth(endDate.getMonth() + 1); // Push to the very end of the endMonth
    } 
    // Fallback for your single month logic
    else if (month) {
        startDate = new Date(`${month}-01T00:00:00.000Z`);
        endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
    } else {
        return res.status(400).json({ message: "Please provide startMonth and endMonth." });
    }

    // Find the Factory Balance right before the startDate (for B/F)
    const lastMonthRecord = await FactoryLog.findOne({ date: { $lt: startDate } }).sort({ date: -1 });
    const initialBF = lastMonthRecord ? lastMonthRecord.factoryBalance : 0;

    const currentMonthLogs = await FactoryLog.find({
      date: { $gte: startDate, $lt: endDate }
    }).sort({ date: 1 });

    let runningGreenLeafToDate = 0;
    let runningMadeTeaToDate = 0;
    let currentBalance = initialBF;

    const processedRecords = currentMonthLogs.map((log, index) => {
      runningGreenLeafToDate += log.greenLeaf.today;
      runningMadeTeaToDate += log.madeTea.today;
      const isFirstDay = index === 0;
      
      currentBalance = currentBalance + log.madeTea.today - log.totalOut + log.returnAmount;

      return {
        ...log._doc,
        greenLeaf: { today: log.greenLeaf.today, toDate: runningGreenLeafToDate },
        madeTea: { today: log.madeTea.today, toDate: runningMadeTeaToDate },
        bfBalance: isFirstDay ? initialBF : 0, 
        factoryBalance: currentBalance
      };
    });

    res.status(200).json({ bfFromLastMonth: initialBF, records: processedRecords });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching factory logs." });
  }
};

// 2. SAVE OR UPDATE DAILY FACTORY LOG (Edit karaddi Username eka show wenne methanadi)
export const saveDailyFactoryLog = async (req, res) => {
  try {
    const { date, greenLeafToday, dispatch, localSaleAndGratis, returnAmount, username } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const glToday = Number(greenLeafToday) || 0;

    // Made Tea Today = User දුන් Green Leaf Today * 21.5%
    const madeTeaToday = glToday * 0.215;

    // Total Out = Dispatch + Local Sale and Gratis
    const totalOut = (Number(dispatch) || 0) + (Number(localSaleAndGratis) || 0);

    // Record eka kalin thiyenawada kiyala check karagන්නවා (Edit check)
    const existingRecord = await FactoryLog.findOne({ date: targetDate });
    
    let updateFields = {
      greenLeaf: { today: glToday },
      madeTea: { today: madeTeaToday },
      dispatch: Number(dispatch) || 0,
      localSaleAndGratis: Number(localSaleAndGratis) || 0,
      totalOut: totalOut,
      returnAmount: Number(returnAmount) || 0
    };

    // Kalin record ekak thibila edit wenawa nam login user ge name eka athulath karanawa
    if (existingRecord) {
      updateFields.isEdited = true;
      updateFields.lastUpdatedDate = new Date();
      updateFields.editedBy = username || req.user?.username || 'Unknown User';
    } else {
      updateFields.isEdited = false;
      updateFields.editedBy = '';
    }

    const updatedLog = await FactoryLog.findOneAndUpdate(
      { date: targetDate },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Daily factory log saved successfully.", data: updatedLog });

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