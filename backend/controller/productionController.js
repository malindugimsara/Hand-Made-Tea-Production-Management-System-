import { Production } from '../models/Production.js'; // Adjust path if needed

export const createProduction = async (req, res) => {
    try {
        const { date, teaType, madeTeaWeight, expectedDryerDate, dryerDetails } = req.body;
        
        let processedDryerDetails = dryerDetails;

        // Safely auto-calculate dryer units ONLY IF dryer details are actually provided
        if (dryerDetails && dryerDetails.meterStart !== undefined && dryerDetails.meterEnd !== undefined) {
            const units = Number(dryerDetails.meterEnd) - Number(dryerDetails.meterStart);
            // rollerPoints will automatically be included via spread operator
            processedDryerDetails = { ...dryerDetails, units };
        }
        
        const newProduction = new Production({
            date,
            teaType,
            madeTeaWeight,
            expectedDryerDate, 
            dryerDetails: processedDryerDetails
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

// Update production record with new data (Used by Day 2 Pop-Up)
export const updateProduction = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        
        // Safely Auto-calculate dryer units if meter readings are provided in the update
        if (updatedData.dryerDetails && 
            updatedData.dryerDetails.meterEnd !== undefined && 
            updatedData.dryerDetails.meterStart !== undefined) {
            
            updatedData.dryerDetails.units = Number(updatedData.dryerDetails.meterEnd) - Number(updatedData.dryerDetails.meterStart);
        }
        
        // Note: updatedData.dryerDetails.rollerPoints is automatically passed from the frontend payload

        const record = await Production.findByIdAndUpdate(id, updatedData, { new: true });
        
        if (!record) {
            return res.status(404).json({ message: "Production record not found" });
        }

        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};