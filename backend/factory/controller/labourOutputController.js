import LabourOutput from '../models/LabourOutput.js'; // Ensure the path is correct

export const saveLabourOutput = async (req, res) => {
  try {
    const records = Array.isArray(req.body.records) ? req.body.records : [req.body];

    if (records.length === 0) {
      return res.status(400).json({ message: "No labour output records provided." });
    }

    const savedRecords = await LabourOutput.insertMany(records);
    res.status(201).json({ message: `${savedRecords.length} labour output record(s) saved successfully`, records: savedRecords });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Example in your controller
export const getLabourOutputs = async (req, res) => {
    try {
        const outputs = await LabourOutput.find(); // Fetches all documents
        res.status(200).json(outputs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};