import SellingDetails from '../models/SellingDetails.js';

// @desc    Get selling details for a specific month
// @route   GET /api/selling-details
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

    // Use findOne instead of find, because we now only have ONE record per month
    const data = await SellingDetails.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!data) {
      return res.status(200).json({ records: [] });
    }

    // Since we overwrite the data now, we don't need to aggregate multiple saves!
    // We just return the exact records array saved in this document.
    res.status(200).json({
      exchangeRate: data.exchangeRate,
      records: data.records
    });

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Server error while fetching data" });
  }
};


// @desc    Create or Update selling details for a specific month
// @route   POST /api/selling-details
export const createSellingDetail = async (req, res) => {
  try {
    const { date, exchangeRate, records } = req.body;

    // Process records securely before saving
    const processedRecords = records.map(record => ({
      ...record,
      totalUsd: record.packs * record.price,
      totalLkr: (record.packs * record.price) * exchangeRate
    }));

    // Normalize dates to check if this month already exists
    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // findOneAndUpdate with upsert: true OVERWRITES existing data for that month.
    const updatedDetails = await SellingDetails.findOneAndUpdate(
      { 
        date: { 
          $gte: monthStart, 
          $lt: monthEnd 
        } 
      },
      { 
        date: monthStart, // Save as the 1st of the month
        exchangeRate, 
        records: processedRecords 
      },
      { 
        new: true,       // Return the updated document
        upsert: true     // Create a new document if one doesn't exist
      }
    );

    res.status(200).json({ 
        message: "Sales data saved and overwritten successfully", 
        data: updatedDetails 
    });
    
  } catch (error) {
    console.error("Error saving to MongoDB:", error);
    res.status(500).json({ error: "Server error while saving data" });
  }
};