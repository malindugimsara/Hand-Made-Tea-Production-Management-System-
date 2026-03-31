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