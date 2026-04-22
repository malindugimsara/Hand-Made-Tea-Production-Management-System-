import LocalSale from '../models/LocalSaleModel.js';

// @desc    Create a new local sale record
// @route   POST /api/local-sales
// @access  Private
export const createLocalSale = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, salesItems } = req.body;

        if (!date || !salesItems || salesItems.length === 0) {
            return res.status(400).json({ message: 'Date and at least one sale item are required.' });
        }

        const newSale = new LocalSale({
            date,
            totalBoxes,
            totalQtyKg,
            salesItems
        });

        const savedSale = await newSale.save();
        res.status(201).json(savedSale);

    } catch (error) {
        console.error('Error creating local sale:', error);
        res.status(500).json({ message: 'Server error while saving local sale record.' });
    }
};

// @desc    Get all local sale records
// @route   GET /api/local-sales
// @access  Private
export const getLocalSales = async (req, res) => {
    try {
        const sales = await LocalSale.find().sort({ date: -1, createdAt: -1 });
        res.status(200).json(sales);
    } catch (error) {
        console.error('Error fetching local sales:', error);
        res.status(500).json({ message: 'Server error while fetching local sales.' });
    }
};

// @desc    Update a local sale record
// @route   PUT /api/local-sales/:id
// @access  Private
export const updateLocalSale = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, salesItems, updatedBy, editorName } = req.body;

        const saleRecord = await LocalSale.findById(req.params.id);
        
        if (!saleRecord) {
            return res.status(404).json({ message: "Record not found." });
        }

        // Update the fields with the new data from the frontend
        if (date) saleRecord.date = date;
        if (totalBoxes !== undefined) saleRecord.totalBoxes = totalBoxes;
        if (totalQtyKg !== undefined) saleRecord.totalQtyKg = totalQtyKg;
        if (salesItems) saleRecord.salesItems = salesItems;
        
        // 👇 මෙතන තමයි වැදගත්ම දේ: Username එක Update කිරීම 👇
        if (updatedBy) {
            saleRecord.updatedBy = updatedBy;
        } else if (editorName) {
            saleRecord.updatedBy = editorName; // Fallback
        }

        await saleRecord.save();

        res.status(200).json({ message: "Record updated successfully.", record: saleRecord });

    } catch (error) {
        console.error("Update local sale error:", error);
        res.status(500).json({ message: "Error updating local sale record." });
    }
};

// @desc    Delete a local sale record
// @route   DELETE /api/local-sales/:id
// @access  Private
export const deleteLocalSale = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSale = await LocalSale.findByIdAndDelete(id);

        if (!deletedSale) {
            return res.status(404).json({ message: 'Local sale record not found.' });
        }

        res.status(200).json({ message: 'Local sale record deleted successfully.' });

    } catch (error) {
        console.error('Error deleting local sale:', error);
        res.status(500).json({ message: 'Server error while deleting local sale record.' });
    }
};