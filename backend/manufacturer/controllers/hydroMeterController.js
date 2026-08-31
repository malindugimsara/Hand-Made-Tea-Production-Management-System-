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

// 💡 සියලුම දත්ත ලබා ගැනීම (List View එක සඳහා)
export const getAllHydroMeters = async (req, res) => {
    try {
        // දින අනුපිළිවෙලට (අලුත්ම දින මුලින් එන ලෙස) ලබාගැනීම. formData එක මෙහිදී අවශ්‍ය නැත.
        const records = await HydroMeter.find().sort({ date: -1 }).select('date enteredBy updatedAt');
        
        res.status(200).json({ 
            message: "Records fetched successfully", 
            data: records 
        });
    } catch (error) {
        console.error("Get All Hydro Meters Error:", error);
        res.status(500).json({ message: "Failed to fetch records.", error: error.message });
    }
};

// 💡 වාර්තාවක් Delete කිරීම
export const deleteHydroMeter = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: "Date parameter is required." });
        }

        const deletedRecord = await HydroMeter.findOneAndDelete({ date: date });

        if (!deletedRecord) {
            return res.status(404).json({ message: "Record not found for this date." });
        }

        res.status(200).json({ message: "Record deleted successfully!" });
    } catch (error) {
        console.error("Delete Hydro Meter Error:", error);
        res.status(500).json({ message: "Failed to delete record.", error: error.message });
    }
};