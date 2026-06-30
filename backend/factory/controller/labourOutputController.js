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

export const deleteLabourLogsByDate = async (req, res) => {
    try {
        const { date } = req.params;

        if (!date) {
            return res.status(400).json({ message: "Date parameter is required." });
        }

        // The 'date' field is stored as a string (YYYY-MM-DD), but we also
        // support ISO timestamp strings or actual Date objects in case data
        // changes later.
        const result = await LabourOutput.deleteMany({
            $or: [
                { date },
                { date: { $regex: `^${date}` } },
                {
                    date: {
                        $gte: new Date(`${date}T00:00:00.000Z`),
                        $lt: new Date(`${date}T23:59:59.999Z`)
                    }
                }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No records found for this date." });
        }

        res.status(200).json({ 
            message: `Successfully deleted ${result.deletedCount} record(s).`,
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server error while deleting records." });
    }
};