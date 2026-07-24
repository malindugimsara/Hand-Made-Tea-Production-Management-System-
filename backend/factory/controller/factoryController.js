import FactoryLog from "../models/FactoryLog.js";
import PendingTransfer from "../../Packing/models/PendingTransfer.js";
import TeaReceived from "../../Packing/models/TeaReceivedModel.js"; 
import webpush from 'web-push';
import Subscription from '../../Packing/models/SubscriptionModel.js';// 1. GET FACTORY LOGS

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
// 2. SAVE OR UPDATE DAILY FACTORY LOG 
export const saveDailyFactoryLog = async (req, res) => {
  try {
    const { 
      date, greenLeafToday, dispatches = [], localSales = [], returns = [], 
      username, isExplicitEdit 
    } = req.body;

    if (!date) return res.status(400).json({ message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const currentUser = username || req.user?.username || "Factory Admin";
    const glToday = Number(greenLeafToday) || 0;

    const selectedMonthNumber = targetDate.getMonth() + 1; 
    const monthsWith21Percent = [4, 5, 6, 9, 10, 11, 12];
    const conversionRate = monthsWith21Percent.includes(selectedMonthNumber) ? 0.21 : 0.215;
    const madeTeaToday = glToday * conversionRate;

    // --- Arrays වලින් Totals ගණනය කිරීම ---
    const totalDispatch = dispatches.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const totalLocalSale = localSales.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const totalReturnAmount = returns.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const totalOut = totalDispatch + totalLocalSale;

    // Balance Calculation
    const aggrResult = await FactoryLog.aggregate([
      { $match: { date: { $lt: targetDate } } },
      { $group: { _id: null, totalMT: { $sum: "$madeTea.today" }, totalD: { $sum: "$dispatch" }, totalL: { $sum: "$localSaleAndGratis" }, totalR: { $sum: "$returnAmount" } } },
    ]);

    let previousBalance = aggrResult.length > 0 ? (aggrResult[0].totalMT - (aggrResult[0].totalD + aggrResult[0].totalL) + aggrResult[0].totalR) : 0;
    const currentBalance = previousBalance + madeTeaToday - totalOut + totalReturnAmount;

    if (currentBalance < 0) return res.status(400).json({ message: `Total Out exceeds available Factory Balance.` });

    const existingRecord = await FactoryLog.findOne({ date: targetDate });
    
    let updateFields = {
      greenLeaf: { today: glToday },
      madeTea: { today: Number(madeTeaToday.toFixed(2)) }, 
      dispatches, dispatch: totalDispatch,
      localSales, localSaleAndGratis: totalLocalSale,
      returns, returnAmount: totalReturnAmount,
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

    // ==========================================
    // 🌟 PACKING AUTOMATION (Local Sales to Pending) 🌟
    // ==========================================
    const d = new Date(targetDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    // Automation Helper Function (Only for Local Sale)
    const syncPendingTransfer = async (typePrefix, qty, teaType) => {
        const regex = new RegExp(`FACT/TO/${year}${month}${day}-${typePrefix}`);
        
        if (qty > 0 && teaType) {
            const existingPending = await PendingTransfer.findOne({
                date: targetDate,
                transferNo: { $regex: regex },
                status: "Pending" 
            });

            if (existingPending) {
                // Update existing
                existingPending.sentQtyKg = qty;
                existingPending.grade = teaType;   
                existingPending.teaType = teaType; 
                existingPending.factoryUsername = currentUser; 
                await existingPending.save();
            } else {
                // Create New
                const randomNum = Math.floor(100 + Math.random() * 900); // 3 digit random
                const autoTransNo = `FACT/TO/${year}${month}${day}-${typePrefix}-${randomNum}`;
                
                // 🌟 (නිවැරදි කළ තැන: new PendingTransfer ලෙස දැමීම)
                const newPendingTransfer = new PendingTransfer({
                    date: targetDate,
                    transferNo: autoTransNo,
                    grade: teaType,   
                    teaType: teaType, 
                    sentQtyKg: qty,
                    factoryUsername: currentUser 
                });
                await newPendingTransfer.save();

                // ========================================================
                // 🌟 PUSH NOTIFICATION CODE (Packing අංශයට මැසේජ් එක යැවීම) 🌟
                // ========================================================
                try {
                  const subscriptions = await Subscription.find({ section: "Packing" });

                  const payload = JSON.stringify({
                      title: '🏭 New Factory Transfer',
                      message: `A new transfer of ${qty}kg (${teaType}) arrived from Factory!`,
                      url: '/packing/trans-in-factory-entry'
                  });


                  await Promise.all(
                      subscriptions.map(async (sub) => {
                          try {
                              await webpush.sendNotification(sub, payload);
                          } 
                          catch(err) {

                              console.error(
                                  "Push failed:",
                                  err.statusCode,
                                  err.message
                              );

                              if(err.statusCode === 410){
                                  await Subscription.deleteOne({
                                      endpoint: sub.endpoint
                                  });
                              }
                          }
                      })
                  );


              } catch(pushErr){

                  console.error(
                    "Notification error:",
                    pushErr
                  );

              }
            }
        } else {
            // Delete if quantity is made 0
            await PendingTransfer.findOneAndDelete({
                date: targetDate,
                transferNo: { $regex: regex },
                status: "Pending"
            });
        }
    };

    // Packing එකට Local Sale එක යැවීම
    await syncPendingTransfer(
      'LOC',
      updateFields.localSaleAndGratis,
      updateFields.localSaleTeaType
    ).catch(err=>{
      console.error(err);
    });    
    // මකා දැමීම
    await PendingTransfer.deleteMany({
      date: targetDate,
      transferNo: { $regex: /FACT\/TO\// },
      status: "Pending"
    });

    // නැවත එකතු කිරීම (ලූපයක් භාවිතා කරමින්)
    for (const [index, sale] of localSales.entries()) {
      if (sale.weight > 0 && sale.teaType) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        await new PendingTransfer({
            date: targetDate,
            transferNo: `FACT/TO/${dateStr}-LOC-${randomNum}-${index}`,
            grade: sale.teaType,   
            teaType: sale.teaType, 
            sentQtyKg: sale.weight,
            factoryUsername: currentUser 
        }).save();
      }
    }

    res.status(200).json({ message: "Daily factory log saved successfully.", data: updatedLog });
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

    // අදාල දවසට අදාලව යවපු Pending Transfers ටිකත් මකා දමන්න
    await PendingTransfer.deleteMany({
        date: log.date,
        transferNo: { $regex: /FACT\/TO\// },
        status: "Pending"
    });

    await FactoryLog.findByIdAndDelete(id);
    res.status(200).json({ message: "Record deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting factory log." });
  }
};
