import { Labour } from '../models/Labour.js'; // Adjust the path if your model file is named differently

// Create a new Labour record
export const createLabour = async (req, res) => {
    try {
        const { date, workerCount } = req.body;
        
        const newRecord = new Labour({
            date,
            workerCount
        });
        
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all Labour records
export const getAllLabour = async (req, res) => {
    try {
        const records = await Labour.find().sort({ date: -1 }); // Sorts by newest date first
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a Labour record
export const updateLabour = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const record = await Labour.findByIdAndUpdate(id, updatedData, { new: true });
        
        if (!record) {
            return res.status(404).json({ message: "Record not found" });
        }
        
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a Labour record
export const deleteLabour = async (req, res) => {
    try {
        const record = await Labour.findByIdAndDelete(req.params.id);
        
        if (!record) {
            return res.status(404).json({ message: "Record not found" });
        }
        
        res.status(200).json({ message: "Labour record deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};