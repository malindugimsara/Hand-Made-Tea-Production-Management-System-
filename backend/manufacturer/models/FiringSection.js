import mongoose from 'mongoose';

// Drier Operational Parameters Sub-Schema
const DrierScheduleSchema = new mongoose.Schema({
  start: { type: String, default: '', trim: true },
  finish: { type: String, default: '', trim: true },
  day: { type: String, default: '' },
  allocatedDhool: { type: String, default: 'drier1' }, // 'drier1' or 'drier2'
  allocatedDhoolLabel: { type: String, default: 'Dhool 01' }, // 'Dhool 01' or 'Dhool 02'
  periodStr: { type: String, default: '' },
  periodDecimal: { type: Number, default: 0, min: 0 },
  ffrw1: { type: Number, default: 0, min: 0 },
  ffrw2: { type: Number, default: 0, min: 0 },
  ffrw3: { type: Number, default: 0, min: 0 },
  ffrw4: { type: Number, default: 0, min: 0 },
  totalHours: { type: Number, default: 0, min: 0 },
  outputPerHour: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Allocation Sub-Schema
const AllocationSchema = new mongoose.Schema({
  slot1Dhool: { type: String, default: 'drier1' },
  slot2Dhool: { type: String, default: 'drier2' }
}, { _id: false });

// Dhools Grading Output Sub-Schema
const DhoolsOutputSchema = new mongoose.Schema({
  first: { type: Number, default: 0, min: 0 },
  second: { type: Number, default: 0, min: 0 },
  third: { type: Number, default: 0, min: 0 },
  dir: { type: Number, default: 0, min: 0 },
  bigBulk: { type: Number, default: 0, min: 0 },
  totalFiredKg: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Firewood Output Sub-Schema
const FirewoodOutputSchema = new mongoose.Schema({
  withoutWithering: { type: Number, default: 0, min: 0 },
  withWithering: { type: Number, default: 0, min: 0 },
  rf: { type: Number, default: 0, min: 0 },
  totalOutputKg: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Firewood Cost Sub-Schema
const FirewoodCostSchema = new mongoose.Schema({
  totalFwKg: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  madeTeaKg: { type: Number, default: 0, min: 0 },
  totalCostRs: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Main Firing Section Schema
const FiringSectionSchema = new mongoose.Schema({
  factory: {
    type: String,
    default: 'ATHUKORALA TEA FACTORY - MF1398',
    trim: true
  },
  dateOfManufacture: {
    type: String, // Format: YYYY-MM-DD
    required: [true, 'Date of manufacture is required'],
    index: true
  },
  cropDate: {
    type: String,
    default: ''
  },
  cropKg: {
    type: Number,
    default: 0
  },

  // Allocation Configuration
  allocation: {
    type: AllocationSchema,
    default: () => ({ slot1Dhool: 'drier1', slot2Dhool: 'drier2' })
  },

  // Section 1: Drier Schedules
  drier1: { type: DrierScheduleSchema, default: () => ({}) },
  drier2: { type: DrierScheduleSchema, default: () => ({}) },

  // Section 2: Dhool Fractions
  dhools: {
    drier1: { type: DhoolsOutputSchema, default: () => ({}) },
    drier2: { type: DhoolsOutputSchema, default: () => ({}) }
  },

  // Section 3: Firewood Output
  firewoodOutput: {
    drier1: { type: FirewoodOutputSchema, default: () => ({}) },
    drier2: { type: FirewoodOutputSchema, default: () => ({}) }
  },

  // Section 4: Cost of Firewood
  firewoodCost: {
    drier1: { type: FirewoodCostSchema, default: () => ({}) },
    drier2: { type: FirewoodCostSchema, default: () => ({}) }
  },

  // Calculated Aggregate Summary
  summary: {
    d1TotalFiredKg: { type: Number, default: 0 },
    d2TotalFiredKg: { type: Number, default: 0 },
    rawDhool1TotalKg: { type: Number, default: 0 },
    rawDhool2TotalKg: { type: Number, default: 0 },
    grandTotalFiredTeaKg: { type: Number, default: 0 },
    d1TotalFirewoodKg: { type: Number, default: 0 },
    d2TotalFirewoodKg: { type: Number, default: 0 },
    grandTotalFirewoodKg: { type: Number, default: 0 },
    d1TotalCostRs: { type: Number, default: 0 },
    d2TotalCostRs: { type: Number, default: 0 },
    grandTotalFirewoodCostRs: { type: Number, default: 0 }
  },

  // Sign-offs
  officerName: { type: String, default: '', trim: true },
  checkedBy: { type: String, default: '', trim: true },
  createdBy: { type: String, default: 'Admin' },
  editedBy: { type: String, default: null }
}, {
  timestamps: true
});

// Pre-save calculation hook: respects Dhool Allocation
FiringSectionSchema.pre('save', function (next) {
  // 1. Calculate Raw Dhools Fired Tea Totals
  const d1Dhool = this.dhools?.drier1 || {};
  const d2Dhool = this.dhools?.drier2 || {};

  const d1Fired =
    (Number(d1Dhool.first) || 0) +
    (Number(d1Dhool.second) || 0) +
    (Number(d1Dhool.third) || 0) +
    (Number(d1Dhool.dir) || 0) +
    (Number(d1Dhool.bigBulk) || 0);

  const d2Fired =
    (Number(d2Dhool.first) || 0) +
    (Number(d2Dhool.second) || 0) +
    (Number(d2Dhool.third) || 0) +
    (Number(d2Dhool.dir) || 0) +
    (Number(d2Dhool.bigBulk) || 0);

  if (this.dhools?.drier1) this.dhools.drier1.totalFiredKg = parseFloat(d1Fired.toFixed(2));
  if (this.dhools?.drier2) this.dhools.drier2.totalFiredKg = parseFloat(d2Fired.toFixed(2));

  // 2. Resolve tea mapped to each drier based on allocation
  const slot1Target = this.allocation?.slot1Dhool || this.drier1?.allocatedDhool || 'drier1';
  const slot2Target = this.allocation?.slot2Dhool || this.drier2?.allocatedDhool || 'drier2';

  const d1AllocatedTea = slot1Target === 'drier2' ? d2Fired : d1Fired;
  const d2AllocatedTea = slot2Target === 'drier1' ? d1Fired : d2Fired;

  // Sync labels
  if (this.drier1) {
    this.drier1.allocatedDhool = slot1Target;
    this.drier1.allocatedDhoolLabel = slot1Target === 'drier1' ? 'Dhool 01' : 'Dhool 02';
    const d1Hours = Number(this.drier1.totalHours) || Number(this.drier1.periodDecimal) || 0;
    this.drier1.outputPerHour = d1Hours > 0 ? parseFloat((d1AllocatedTea / d1Hours).toFixed(2)) : 0;
  }

  if (this.drier2) {
    this.drier2.allocatedDhool = slot2Target;
    this.drier2.allocatedDhoolLabel = slot2Target === 'drier1' ? 'Dhool 01' : 'Dhool 02';
    const d2Hours = Number(this.drier2.totalHours) || Number(this.drier2.periodDecimal) || 0;
    this.drier2.outputPerHour = d2Hours > 0 ? parseFloat((d2AllocatedTea / d2Hours).toFixed(2)) : 0;
  }

  // 3. Calculate Firewood Output Totals
  const d1FwOut = this.firewoodOutput?.drier1 || {};
  const d2FwOut = this.firewoodOutput?.drier2 || {};

  const d1FwTotal =
    (Number(d1FwOut.withoutWithering) || 0) +
    (Number(d1FwOut.withWithering) || 0) +
    (Number(d1FwOut.rf) || 0);

  const d2FwTotal =
    (Number(d2FwOut.withoutWithering) || 0) +
    (Number(d2FwOut.withWithering) || 0) +
    (Number(d2FwOut.rf) || 0);

  if (this.firewoodOutput?.drier1) this.firewoodOutput.drier1.totalOutputKg = parseFloat(d1FwTotal.toFixed(2));
  if (this.firewoodOutput?.drier2) this.firewoodOutput.drier2.totalOutputKg = parseFloat(d2FwTotal.toFixed(2));

  // 4. Calculate Firewood Costs
  const d1Cost =
    (Number(this.firewoodCost?.drier1?.totalFwKg) || 0) *
    (Number(this.firewoodCost?.drier1?.unitPrice) || 0);

  const d2Cost =
    (Number(this.firewoodCost?.drier2?.totalFwKg) || 0) *
    (Number(this.firewoodCost?.drier2?.unitPrice) || 0);

  if (this.firewoodCost?.drier1) this.firewoodCost.drier1.totalCostRs = parseFloat(d1Cost.toFixed(2));
  if (this.firewoodCost?.drier2) this.firewoodCost.drier2.totalCostRs = parseFloat(d2Cost.toFixed(2));

  // 5. Populate Global Summary with Allocated Fired Tea
  this.summary = {
    d1TotalFiredKg: parseFloat(d1AllocatedTea.toFixed(2)),
    d2TotalFiredKg: parseFloat(d2AllocatedTea.toFixed(2)),
    rawDhool1TotalKg: parseFloat(d1Fired.toFixed(2)),
    rawDhool2TotalKg: parseFloat(d2Fired.toFixed(2)),
    grandTotalFiredTeaKg: parseFloat((d1Fired + d2Fired).toFixed(2)),
    d1TotalFirewoodKg: parseFloat(d1FwTotal.toFixed(2)),
    d2TotalFirewoodKg: parseFloat(d2FwTotal.toFixed(2)),
    grandTotalFirewoodKg: parseFloat((d1FwTotal + d2FwTotal).toFixed(2)),
    d1TotalCostRs: parseFloat(d1Cost.toFixed(2)),
    d2TotalCostRs: parseFloat(d2Cost.toFixed(2)),
    grandTotalFirewoodCostRs: parseFloat((d1Cost + d2Cost).toFixed(2))
  };

  next();
});

const FiringSection =
  mongoose.models.FiringSection || mongoose.model('FiringSection', FiringSectionSchema);

export default FiringSection;