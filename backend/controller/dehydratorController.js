import { Dehydrator } from '../models/Dehydrator.js';

// Create new Dehydrator record
export const createDehydrator = async (req, res) => {
    try {
        const { 
            date, 
            trialsData,            // --- NEW: Array replacing trial, weights, and moisture ---
            meterStart, 
            meterEnd, 
            timePeriodHours,
            labourHours,
            labourCostPer8Hours,
            totalLabourCost, 
            electricityRate,       
            totalElectricityCost   
        } = req.body;
        
        // Logic: totalUnits = meterEnd - meterStart
        const totalUnits = meterEnd - meterStart;
        
        const newRecord = new Dehydrator({
            date,
            trialsData,            // --- NEW ---
            meterStart,
            meterEnd,
            totalUnits,
            timePeriodHours,
            labourHours,
            labourCostPer8Hours,
            totalLabourCost,
            electricityRate,       
            totalElectricityCost   
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
        const updatedData = { ...req.body }; // Clone the body
        
        // 1. Recalculate totalUnits if meter readings are updated
        if (updatedData.meterStart !== undefined && updatedData.meterEnd !== undefined) {
            updatedData.totalUnits = updatedData.meterEnd - updatedData.meterStart;
        }

        // 2. Auto-recalculate electricity cost if needed
        if (updatedData.totalUnits !== undefined && updatedData.electricityRate !== undefined) {
            updatedData.totalElectricityCost = updatedData.totalUnits * updatedData.electricityRate;
        }

        // 3. Recalculate totalLabourCost if labour details are updated
        if (updatedData.labourHours !== undefined && updatedData.labourCostPer8Hours !== undefined) {
            updatedData.totalLabourCost = (updatedData.labourCostPer8Hours / 8) * updatedData.labourHours;
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