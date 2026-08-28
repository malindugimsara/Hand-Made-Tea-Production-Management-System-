import HydroMeter from '../models/HydroMeter.js'; // අගට .js තිබිය යුතුය

// 💡 දත්ත Save කිරීම හෝ Update කිරීම (Upsert)
export const saveHydroMeterData = async (req, res) => {
    try {
        const { date, formData } = req.body;
        const enteredBy = req.user ? req.user.username : 'Unknown';

        if (!date || !formData) {
            return res.status(400).json({ message: "Date and formData are required." });
        }

        // අදාළ දිනයට දත්ත ඇත්නම් Update කරයි, නැත්නම් අලුතින් සාදයි (upsert: true)
        const savedData = await HydroMeter.findOneAndUpdate(
            { date: date },
            { $set: { formData: formData, enteredBy: enteredBy } },
            { new: true, upsert: true }
        );

        res.status(200).json({ 
            message: "Hydro Meter data saved successfully!", 
            data: savedData 
        });

    } catch (error) {
        console.error("Save Hydro Meter Error:", error);
        res.status(500).json({ message: "Failed to save data.", error: error.message });
    }
};

// 💡 අදාළ දිනයට අයත් දත්ත ලබා ගැනීම
export const getHydroMeterDataByDate = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: "Date parameter is required." });
        }

        const hydroData = await HydroMeter.findOne({ date: date });

        res.status(200).json({ 
            data: hydroData ? hydroData.formData : null 
        });

    } catch (error) {
        console.error("Get Hydro Meter Error:", error);
        res.status(500).json({ message: "Failed to fetch data.", error: error.message });
    }
};