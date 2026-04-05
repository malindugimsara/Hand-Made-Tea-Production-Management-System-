import SellingDetails from '../models/SellingDetails.js';


export const getSellingDetailsByMonth = async (req, res) => {
  try {
    const { month } = req.query; // Expects format "YYYY-MM"

    if (!month) {
      return res.status(400).json({ message: "Month is required in YYYY-MM format." });
    }

    // Parse the year and month
    const [year, monthStr] = month.split('-');
    
    // Create Start Date: 1st day of the month at 00:00:00
    const startDate = new Date(year, parseInt(monthStr) - 1, 1);
    
    // Create End Date: Last day of the month at 23:59:59
    const endDate = new Date(year, parseInt(monthStr), 0, 23, 59, 59, 999);

    // Find all records that were saved inside this specific month
    const data = await SellingDetails.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!data || data.length === 0) {
      return res.status(200).json({ records: [] });
    }

    // Aggregate packs if there are multiple saves in the same month
    const aggregatedRecords = {};
    let latestExchangeRate = 300;

    data.forEach(entry => {
      latestExchangeRate = entry.exchangeRate; // Keep the most recently saved exchange rate
      entry.records.forEach(item => {
        if (!aggregatedRecords[item.type]) {
          aggregatedRecords[item.type] = { type: item.type, amount: item.amount, price: item.price, packs: 0 };
        }
        aggregatedRecords[item.type].packs += item.packs;
      });
    });

    const finalRecordsArray = Object.values(aggregatedRecords);

    res.status(200).json({
      exchangeRate: latestExchangeRate,
      records: finalRecordsArray
    });

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Server error while fetching data" });
  }
};

export const createSellingDetail = async (req, res) => {
  try {
    const { date, exchangeRate, records } = req.body;

    // Map through records to ensure the backend calculates totals securely before saving
    const processedRecords = records.map(record => ({
      ...record,
      totalUsd: record.packs * record.price,
      totalLkr: (record.packs * record.price) * exchangeRate
    }));

    const newSaleEntry = new SellingDetails({
      date,
      exchangeRate,
      records: processedRecords
    });

    await newSaleEntry.save();
    res.status(201).json({ message: "Sales data saved successfully" });
    
  } catch (error) {
    console.error("Error saving to MongoDB:", error);
    res.status(500).json({ error: "Server error while saving data" });
  }
};