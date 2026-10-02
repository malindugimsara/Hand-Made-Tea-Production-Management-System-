import TC5Report from "../models/tc5ManualReport.js";

// @desc    Get TC5 manual report by month
// @route   GET /api/tc5manualreport
// @access  Private
export const getTC5ManualReportByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: "Month parameter is required (YYYY-MM)" });
    }

    const report = await TC5Report.findOne({ month });

    if (!report) {
      return res.status(200).json(null);
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error("Error fetching TC5 Manual Report:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving report" });
  }
};

// @desc    Create or update TC5 manual report
// @route   POST /api/tc5manualreport
// @access  Private
export const saveTC5ManualReport = async (req, res) => {
  try {
    const {
      month,
      section2_manufacture,
      section3_averageLeaf,
      section5_refuseTea,
      section8_disposals,
      refuseBalance,
      isManualEntry,
    } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, message: "Month is required" });
    }

    // Sanitize and ensure Section 8 array preserves rows
    const sanitizedSec8 = Array.isArray(section8_disposals)
      ? section8_disposals.map((row) => ({
          grade: row.grade || "",
          auction: Number(row.auction) || 0,
          private: Number(row.private) || 0,
          forward: Number(row.forward) || 0,
          exFactory: Number(row.exFactory) || 0,
          direct: Number(row.direct) || 0,
          gifts: Number(row.gifts) || 0,
          other: Number(row.other) || 0,
          total: Number(row.total) || 0,
        }))
      : [];

    const updateData = {
      month,
      section2_manufacture: section2_manufacture || {},
      section3_averageLeaf: section3_averageLeaf || {},
      section5_refuseTea: section5_refuseTea || {},
      section8_disposals: sanitizedSec8,
      refuseBalance: Number(refuseBalance) || 0,
      isManualEntry: Boolean(isManualEntry),
      ...(req.user?._id && { createdBy: req.user._id }),
    };

    // Upsert: Create if doesn't exist, update if already exists
    const report = await TC5Report.findOneAndUpdate(
      { month },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "TC5 Manual Report saved successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error saving TC5 Manual Report:", error);
    return res.status(500).json({ success: false, message: "Server error saving report" });
  }
};