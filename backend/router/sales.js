const express = require('express');
const router = express.Router();
const SellingDetails = require('../models/SellingDetails');

router.post('/api/selling-details', async (req, res) => {
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
});

module.exports = router;