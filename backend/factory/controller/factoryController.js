import FactoryLog from "../models/FactoryLog.js";

// 1. GET FACTORY LOGS
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

    res.status(200).json({ bfFromLastMonth, records: finalRecords });
  } catch (error) {
    console.error("Error fetching factory logs:", error);
    res.status(500).json({ message: "Server error fetching factory logs." });
  }
};

// 2. SAVE OR UPDATE DAILY FACTORY LOG 
export const saveDailyFactoryLog = async (req, res) => {
  try {
    const { 
      date, 
      estateLeafToday, // 💡 අලුත්: Estate Leaf සඳහා
      broughtLeafToday, // 💡 අලුත්: Brought Leaf සඳහා
      greenLeafToday, // Fallback එකක් ලෙස පරණ Data ආවොත් අල්ලගන්න
      dispatches, 
      localSales, 
      returns, 
      username, 
      isExplicitEdit 
    } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const currentUser = username || req.user?.username || "Factory Admin";
    
    const existingRecord = await FactoryLog.findOne({ date: targetDate });

    const finalDispatches = dispatches !== undefined ? dispatches : (existingRecord?.dispatches || []);
    const finalLocalSales = localSales !== undefined ? localSales : (existingRecord?.localSales || []);
    const finalReturns = returns !== undefined ? returns : (existingRecord?.returns || []);

    // 💡 අලුත්: Estate සහ Brought අගයන් වෙන් වෙන්ව ගැනීම
    const eLeaf = Number(estateLeafToday) || (existingRecord?.greenLeaf?.estateLeaf?.today || 0);
    
    // Frontend එක Update කරලා නැත්නම් පරණ greenLeafToday එක Brought Leaf එකට වැටෙන්න සකසා ඇත (ආරක්ෂිත පියවරක්)
    const bLeaf = broughtLeafToday !== undefined 
                    ? Number(broughtLeafToday) 
                    : (greenLeafToday !== undefined ? Number(greenLeafToday) : (existingRecord?.greenLeaf?.broughtLeaf?.today || 0));

    const totalGlToday = eLeaf + bLeaf; // 💡 අලුත්: මුළු එකතුව

    const selectedMonthNumber = targetDate.getMonth() + 1; 
    const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
    const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
    
    const madeTeaToday = totalGlToday * conversionRate; // 💡 අලුත් මුළු එකතුවෙන් Made Tea සෑදීම

    // --- Arrays වලින් Totals ගණනය කිරීම ---
    const totalDispatch = finalDispatches.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const totalLocalSale = finalLocalSales.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const totalReturnAmount = finalReturns.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const totalOut = totalDispatch + totalLocalSale;

    // Balance Calculation
    const aggrResult = await FactoryLog.aggregate([
      { $match: { date: { $lt: targetDate } } },
      { $group: { _id: null, totalMT: { $sum: "$madeTea.today" }, totalD: { $sum: "$dispatch" }, totalL: { $sum: "$localSaleAndGratis" }, totalR: { $sum: "$returnAmount" } } },
    ]);

    let previousBalance = aggrResult.length > 0 ? (aggrResult[0].totalMT - (aggrResult[0].totalD + aggrResult[0].totalL) + aggrResult[0].totalR) : 0;
    const currentBalance = previousBalance + madeTeaToday - totalOut + totalReturnAmount;

    if (currentBalance < 0) return res.status(400).json({ message: `Total Out exceeds available Factory Balance.` });

    // 💡 අලුත්: Update Fields සෑදීම (New DB Schema එකට අනුකූලව)
    let updateFields = {
      greenLeaf: { 
        estateLeaf: { today: eLeaf },
        broughtLeaf: { today: bLeaf },
        totalToday: totalGlToday
      },
      madeTea: { today: Number(madeTeaToday.toFixed(2)) }, 
      dispatches: finalDispatches, dispatch: totalDispatch,
      localSales: finalLocalSales, localSaleAndGratis: totalLocalSale,
      returns: finalReturns, returnAmount: totalReturnAmount,
      totalOut,
      bfBalance: Number(previousBalance.toFixed(2)),
      factoryBalance: Number(currentBalance.toFixed(2)),
      isEdited: !!isExplicitEdit,
      lastUpdatedDate: isExplicitEdit ? new Date() : undefined,
      editedBy: currentUser 
    };

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

// 3. DELETE FACTORY LOG (Supports both Full Delete & Dispatch Only Clear)
export const deleteFactoryLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { clearDispatchOnly } = req.query; 

    const log = await FactoryLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Record not found." });
    }

    if (clearDispatchOnly === 'true') {
        
        // ==========================================
        // 🟢 DISPATCH පමනක් මකා දැමීම (Green Leaf ඉතුරු වේ)
        // ==========================================
        log.dispatches = [];
        log.dispatch = 0;
        
        log.localSales = [];
        log.localSaleAndGratis = 0;
        
        log.returns = [];
        log.returnAmount = 0;
        
        log.totalOut = 0;

        // අලුතින් Factory Balance එක ගණනය කිරීම
        const aggrResult = await FactoryLog.aggregate([
          { $match: { date: { $lt: log.date } } },
          { $group: { 
              _id: null, 
              totalMT: { $sum: "$madeTea.today" }, 
              totalD: { $sum: "$dispatch" }, 
              totalL: { $sum: "$localSaleAndGratis" }, 
              totalR: { $sum: "$returnAmount" } 
          } },
        ]);
        
        let previousBalance = aggrResult.length > 0 
            ? (aggrResult[0].totalMT - (aggrResult[0].totalD + aggrResult[0].totalL) + aggrResult[0].totalR) 
            : 0;
        
        log.bfBalance = Number(previousBalance.toFixed(2));
        log.factoryBalance = Number((previousBalance + log.madeTea.today).toFixed(2));

        await log.save();
        return res.status(200).json({ message: "Dispatch data cleared successfully." });
        
    } else {
        // ==========================================
        // 🔴 සම්පූර්ණ රෙකෝඩ් එකම මකා දැමීම (Factory View සඳහා)
        // ==========================================
        await FactoryLog.findByIdAndDelete(id);
        return res.status(200).json({ message: "Record completely deleted." });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting factory log." });
  }
};