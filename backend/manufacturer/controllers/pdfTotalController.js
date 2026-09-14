import PdfTotal from '../models/PdfTotal.js';

// save or update PDF totals
export const savePdfTotals = async (req, res) => {
    try {
        const { totals } = req.body; 
        
        const bulkOps = totals.map(t => ({
            updateOne: {
                filter: { date: t.date, routeKey: t.routeKey },
                update: { $set: t },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await PdfTotal.bulkWrite(bulkOps);
        }

        res.status(200).json({ success: true, message: 'PDF Totals saved successfully' });
    } catch (error) {
        console.error("Save PDF Totals Error:", error);
        res.status(500).json({ success: false, message: 'Server error saving PDF totals' });
    }
};

// get PDF totals by month
export const getPdfTotalsByMonth = async (req, res) => {
    try {
        const { month } = req.query;
        const totals = await PdfTotal.find({ month });
        res.status(200).json({ success: true, data: totals });
    } catch (error) {
        console.error("Get PDF Totals Error:", error);
        res.status(500).json({ success: false, message: 'Server error fetching PDF totals' });
    }
};