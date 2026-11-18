import mongoose from 'mongoose';

const SystemInvoiceSchema = new mongoose.Schema({
    invoiceNo: { type: String, required: true },
    month: { type: String, required: true },
    date: { type: String, required: true },
    maintenanceFee: { type: Number, default: 10000 },
    features: [{
        title: { type: String },
        cost: { type: Number, default: 0 }
    }],
    grandTotal: { type: Number, required: true }
}, { timestamps: true });

SystemInvoiceSchema.index({ month: 1 });
SystemInvoiceSchema.index({ createdAt: -1 });

export default mongoose.model('SystemInvoice', SystemInvoiceSchema);