import SystemInvoice from '../models/SystemInvoice.js';

// Create new invoice
export const createInvoice = async (req, res) => {
    try {
        const newInvoice = new SystemInvoice(req.body);
        await newInvoice.save();
        res.status(201).json({ success: true, data: newInvoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all invoices
export const getInvoices = async (req, res) => {
    try {
        const invoices = await SystemInvoice.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update invoice
export const updateInvoice = async (req, res) => {
    try {
        const updated = await SystemInvoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete invoice
export const deleteInvoice = async (req, res) => {
    try {
        await SystemInvoice.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Invoice deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};