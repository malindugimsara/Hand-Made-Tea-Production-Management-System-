import mongoose from 'mongoose';

const hydroMeterSchema = new mongoose.Schema({
    date: { 
        type: String, 
        required: true, 
        unique: true 
    },
    formData: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    },
    enteredBy: {
        type: String
    }
}, { timestamps: true });

const HydroMeter = mongoose.model('HydroMeter', hydroMeterSchema);

export default HydroMeter;