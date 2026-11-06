import mongoose from 'mongoose';

const MissingRecordLogSchema = new mongoose.Schema({
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    section: { type: String, required: true },
    records: [{
        date: { type: String },
        moduleName: { type: String },
        details: { type: String }
    }]
}, { timestamps: true });

export default mongoose.model('MissingRecordLog', MissingRecordLogSchema);