import { Dehydrator } from '../models/Dehydrator.js';

// Create new Dehydrator record
export const createDehydrator = async (req, res) => {
    try {
        const { date, trial, meterStart, meterEnd, timePeriodHours } = req.body;
        
        // Logic: totalUnits = meterEnd - meterStart
        const totalUnits = meterEnd - meterStart;
        
        const newRecord = new Dehydrator({
            date,
            trial,
            meterStart,
            meterEnd,
            totalUnits,
            timePeriodHours
        });
        
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all Dehydrator records
export const getAllDehydrator = async (req, res) => {
    try {
        const records = await Dehydrator.find().sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update record
export const updateDehydrator = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        
        // Recalculate totalUnits if meter readings are updated
        if (updatedData.meterStart !== undefined && updatedData.meterEnd !== undefined) {
            updatedData.totalUnits = updatedData.meterEnd - updatedData.meterStart;
        }

        const record = await Dehydrator.findByIdAndUpdate(id, updatedData, { new: true });
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete record
export const deleteDehydrator = async (req, res) => {
    try {
        await Dehydrator.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Record deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};