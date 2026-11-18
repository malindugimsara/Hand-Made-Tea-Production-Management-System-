import { RawMaterialCost } from '../models/RawMaterialCostModel.js';

// Create new Raw Material Cost record
export const createRawMaterialCost = async (req, res) => {
    try {
        const newRecord = new RawMaterialCost(req.body);
        await newRecord.save();
        return res.status(201).json({ message: 'Record saved successfully', record: newRecord });
    } catch (error) {
        console.error("Error saving raw material cost:", error);
        return res.status(500).json({ error: 'Server error while saving record' });
    }
};

// 2. Get all records 
export const getAllRawMaterialCosts = async (req, res) => {
    try {
        
        const records = await RawMaterialCost.find().sort({ date: -1 }); 
        return res.status(200).json(records);
    } catch (error) {
        console.error("Error fetching raw material costs:", error);
        return res.status(500).json({ error: 'Server error while fetching records' });
    }
};
// 3. Delete a record
export const deleteRawMaterialCost = async (req, res) => {
    try {
        const { id } = req.params;
        await RawMaterialCost.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error("Error deleting raw material cost:", error);
        return res.status(500).json({ error: 'Server error while deleting record' });
    }
};

// 4. Update a record
export const updateRawMaterialCost = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRecord = await RawMaterialCost.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true } // Return the updated document
        );

        if (!updatedRecord) {
            return res.status(404).json({ message: 'Record not found' });
        }

        return res.status(200).json({ message: 'Record updated successfully', record: updatedRecord });
    } catch (error) {
        console.error("Error updating raw material cost:", error);
        return res.status(500).json({ error: 'Server error while updating record' });
    }
};