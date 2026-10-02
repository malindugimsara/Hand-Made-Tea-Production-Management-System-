import mongoose from "mongoose";

const disposalRowSchema = new mongoose.Schema(
  {
    grade: { type: String, default: "" },
    auction: { type: mongoose.Schema.Types.Mixed, default: 0 },
    private: { type: mongoose.Schema.Types.Mixed, default: 0 },
    forward: { type: mongoose.Schema.Types.Mixed, default: 0 },
    exFactory: { type: mongoose.Schema.Types.Mixed, default: 0 },
    direct: { type: mongoose.Schema.Types.Mixed, default: 0 },
    gifts: { type: mongoose.Schema.Types.Mixed, default: 0 },
    other: { type: mongoose.Schema.Types.Mixed, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const tc5ManualReportSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      index: true, // Format: "YYYY-MM"
    },
    isManualEntry: {
      type: Boolean,
      default: false,
    },
    section2_manufacture: {
      bf: { type: mongoose.Schema.Types.Mixed, default: 0 },
      ownLeaf: { type: mongoose.Schema.Types.Mixed, default: 0 },
      boughtLeaf: { type: mongoose.Schema.Types.Mixed, default: 0 },
      otherEstate: { type: mongoose.Schema.Types.Mixed, default: 0 },
      otherFactory: { type: mongoose.Schema.Types.Mixed, default: 0 },
      total: { type: Number, default: 0 },
      disposals: { type: mongoose.Schema.Types.Mixed, default: 0 },
      closing: { type: Number, default: 0 },
    },
    section3_averageLeaf: {
      best: { type: mongoose.Schema.Types.Mixed, default: 0 },
      below: { type: mongoose.Schema.Types.Mixed, default: 0 },
      poor: { type: mongoose.Schema.Types.Mixed, default: 0 },
    },
    section5_refuseTea: {
      bf: { type: mongoose.Schema.Types.Mixed, default: "" },
      manufactured: { type: mongoose.Schema.Types.Mixed, default: "" },
      sold: { type: mongoose.Schema.Types.Mixed, default: "" },
      manure: { type: mongoose.Schema.Types.Mixed, default: "" },
      other: { type: mongoose.Schema.Types.Mixed, default: "" },
    },
    section8_disposals: [disposalRowSchema],
    refuseBalance: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate entries for the same month
tc5ManualReportSchema.index({ month: 1 }, { unique: true });

const TC5ManualReport = mongoose.model("TC5ManualReport", tc5ManualReportSchema);

export default TC5ManualReport;