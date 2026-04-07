import { RawMaterialCost } from '../models/RawMaterialCostModel.js';

// 1. අලුත් රෙකෝඩ් එකක් ඩේටාබේස් එකට Save කිරීම (Create)
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

// 2. ඩේටාබේස් එකේ ඇති සියලුම රෙකෝඩ්ස් ලබා ගැනීම (Read - Frontend Table එකට පෙන්වීමට)
export const getAllRawMaterialCosts = async (req, res) => {
    try {
        // අලුත්ම දත්ත මුලින් එන සේ sort කර ඇත
        const records = await RawMaterialCost.find().sort({ date: -1 }); 
        return res.status(200).json(records);
    } catch (error) {
        console.error("Error fetching raw material costs:", error);
        return res.status(500).json({ error: 'Server error while fetching records' });
    }
};

// 3. රෙකෝඩ් එකක් මකා දැමීම (Delete - අත්වැරදීමකින් දැමූ රෙකෝඩ් මකා දැමීමට)
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

// රෙකෝඩ් එකක් Update කිරීම (Update)
export const updateRawMaterialCost = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRecord = await RawMaterialCost.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true } // Update වූ අලුත් දත්ත return කිරීමට
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