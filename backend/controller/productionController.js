import { Production } from '../models/production.js';

export const createProduction = async (req, res) => {
    try {
        const { date, teaType, madeTeaWeight, dryerDetails } = req.body;
        
        // Auto-calculate dryer units if not provided
        const units = dryerDetails.meterEnd - dryerDetails.meterStart;
        
        const newProduction = new Production({
            date,
            teaType,
            madeTeaWeight,
            dryerDetails: { ...dryerDetails, units }
        });

        await newProduction.save();
        res.status(201).json(newProduction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getProductionSummary = async (req, res) => {
    try {
        const summary = await Production.find().sort({ date: -1 });
        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Simple CRUD: Delete
export const deleteProduction = async (req, res) => {
    try {
        await Production.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Production record removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update production record with new data, including auto-calculating units if meter readings are updated
export const updateProduction = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        
        // Auto-calculate dryer units if meter readings are provided in the update
        if (updatedData.dryerDetails && updatedData.dryerDetails.meterEnd && updatedData.dryerDetails.meterStart) {
            updatedData.dryerDetails.units = updatedData.dryerDetails.meterEnd - updatedData.dryerDetails.meterStart;
        }

        const record = await Production.findByIdAndUpdate(id, updatedData, { new: true });
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};