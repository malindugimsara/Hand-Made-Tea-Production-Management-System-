import TC5Report from '../models/TC5Report.js';

export const saveTC5Report = async (req, res) => {
  try {
    const { 
      month, 
      section2_manufacture, 
      section3_averageLeaf, 
      section5_refuseTea, 
      section8_disposals, 
      refuseBalance 
    } = req.body;

    if (!month) {
      return res.status(400).json({ message: "Month identifier is required." });
    }

    const savedReport = await TC5Report.findOneAndUpdate(
      { month }, 
      {
        section2_manufacture,
        section3_averageLeaf,
        section5_refuseTea,
        section8_disposals,
        refuseBalance
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ 
      message: "TC5 Report saved successfully", 
      data: savedReport 
    });

  } catch (error) {
    console.error("Error saving TC5 Report:", error);
    res.status(500).json({ 
      message: "Server error while saving the report", 
      error: error.message 
    });
  }
};

export const getTC5ReportByMonth = async (req, res) => {
  try {
    const { month } = req.query;
    const report = await TC5Report.findOne({ month });
    
    res.status(200).json(report || null);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching report", error: error.message });
  }
};