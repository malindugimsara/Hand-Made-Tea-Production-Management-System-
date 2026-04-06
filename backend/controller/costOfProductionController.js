import { CostOfProduction } from '../models/CostOfProduction.js';

// Save or Update Cost of Production
export const saveCostOfProduction = async (req, res) => {
    try {
        const { month, monthlyGlRate, labourRate, electricityRate, teaCosts, grandTotal } = req.body;

        // අදාළ මාසය සඳහා record එකක් ඩේටාබේස් එකේ ඇත්දැයි බැලීම
        let record = await CostOfProduction.findOne({ month });

        if (record) {
            // තිබේ නම්, එය යාවත්කාලීන කිරීම (Update)
            record.monthlyGlRate = monthlyGlRate;
            record.labourRate = labourRate;
            record.electricityRate = electricityRate;
            record.teaCosts = teaCosts;
            record.grandTotal = grandTotal;
            
            await record.save();
            return res.status(200).json({ message: 'Record updated successfully', record });
        } else {
            // නැතිනම්, අලුත් record එකක් සෑදීම (Create)
            record = new CostOfProduction({
                month, 
                monthlyGlRate, 
                labourRate, 
                electricityRate, 
                teaCosts, 
                grandTotal
            });
            
            await record.save();
            return res.status(201).json({ message: 'Record saved successfully', record });
        }
    } catch (error) {
        console.error("Error saving Cost of Production:", error);
        return res.status(500).json({ error: 'Server error while saving Cost of Production' });
    }
};

// Get Cost of Production by Month (Optional: ඔබට පසුව අවශ්‍ය වුවහොත්)
export const getCostOfProductionByMonth = async (req, res) => {
    try {
        const { month } = req.params;
        const record = await CostOfProduction.findOne({ month });
        
        if (!record) {
            return res.status(404).json({ message: 'No records found for this month' });
        }
        
        return res.status(200).json(record);
    } catch (error) {
        console.error("Error fetching Cost of Production:", error);
        return res.status(500).json({ error: 'Server error' });
    }
};