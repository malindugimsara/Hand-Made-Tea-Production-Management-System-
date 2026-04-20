import { GreenLeaf } from '../models/GreenLeaf.js';

// Create new Green Leaf record
export const createGreenLeaf = async (req, res) => {
    try {
        const { date, totalWeight, selectedWeight } = req.body;
        // Logic: returnedWeight = totalWeight - selectedWeight
        const returnedWeight = totalWeight - selectedWeight;
        
        const newRecord = new GreenLeaf({
            date,
            totalWeight,
            selectedWeight,
            returnedWeight
        });
        
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all Green Leaf records
export const getAllGreenLeaf = async (req, res) => {
    try {
        const records = await GreenLeaf.find().sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update record
export const updateGreenLeaf = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        
        if (updatedData.totalWeight && updatedData.selectedWeight) {
            updatedData.returnedWeight = updatedData.totalWeight - updatedData.selectedWeight;
        }

        const record = await GreenLeaf.findByIdAndUpdate(id, updatedData, { new: true });
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete record
export const deleteGreenLeaf = async (req, res) => {
    try {
        await GreenLeaf.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};