import TeaReceived from '../models/TeaReceivedModel.js'; 
import PackingStock from '../models/PackingStock.js'; // <-- Import the stock model!

// @desc    Create new tea received record
// @route   POST /api/tea-received
// @access  Private
export const createTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems } = req.body;

        if (!receivedItems || receivedItems.length === 0) {
            return res.status(400).json({ message: 'No received items provided' });
        }

        const newTeaReceived = new TeaReceived({
            date,
            transactionNo,
            totalQtyKg,
            receivedItems,
        });

        // 👇 AUTOMATED INVENTORY ADDITION LOGIC (FACTORY) 👇
        for (const item of receivedItems) {
            // Find the product name 
            const productName = item.product || item.grade || item.productName;
            
            // Get the incoming weight securely
            const incomingQty = Number(item.qtyKg || item.weight || item.receivedQtyKg || 0);

            if (incomingQty <= 0) continue; // Skip empty rows

            // වෙනස 1: නමින් පමණක් Stock එක සොයයි (Unique නිසා)
            let stock = await PackingStock.findOne({ productName: productName });

            if (stock) {
                // කලින් මේ නමින් තේ එකක් Database එකේ තිබේ නම් 'Factory' කියන source එක ඒකෙ තියෙනවද බලනවා
                let sourceObj = stock.stockBySource.find(s => s.sourceName === 'Factory');
                
                if (sourceObj) {
                    // 'Factory' එක දැනටමත් තිබේ නම් එයට අලුත් ප්‍රමාණය එකතු කරයි
                    sourceObj.quantityKg += incomingQty;
                } else {
                    // 'Factory' එකෙන් මේ තේ ජාතිය එන පළමු වතාව නම් අලුතින් Array එකට දමයි
                    stock.stockBySource.push({ sourceName: 'Factory', quantityKg: incomingQty });
                }
                
                // මුළු ප්‍රමාණයටත් (Grand Total) එකතු කරයි
                stock.totalBulkStockKg += incomingQty;
                await stock.save();

            } else {
                // මේ නමින් කිසිම තේ එකක් කලින් තිබිලා නැත්නම් අලුතින් සාදයි
                const newStock = new PackingStock({
                    productName: productName,
                    stockBySource: [{ sourceName: 'Factory', quantityKg: incomingQty }],
                    totalBulkStockKg: incomingQty,
                    packedItems: []
                });
                await newStock.save();
            }
        }
        // 👆 END OF AUTOMATED INVENTORY ADDITION 👆

        const savedRecord = await newTeaReceived.save();
        res.status(201).json(savedRecord);

    } catch (error) {
        console.error('Error saving tea received record:', error);
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
};

// @desc    Get all tea received records
// @route   GET /api/tea-received
// @access  Private
export const getTeaReceivedRecords = async (req, res) => {
    try {
        const records = await TeaReceived.find().sort({ date: -1 });
        res.status(200).json(records);
    } catch (error) {
        console.error('Error fetching tea received records:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Delete a tea received record
// @route   DELETE /api/tea-received/:id
// @access  Private
export const deleteTeaReceivedRecord = async (req, res) => {
    try {
        const record = await TeaReceived.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await record.deleteOne();
        res.status(200).json({ message: 'Record removed successfully' });
    } catch (error) {
        console.error('Error deleting tea received record:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};

// @desc    Update a tea received record
// @route   PUT /api/tea-received/:id
// @access  Private
export const updateTeaReceivedRecord = async (req, res) => {
    try {
        const { date, transactionNo, totalQtyKg, receivedItems, updatedBy } = req.body;

        const record = await TeaReceived.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }

        // Update the fields with new data from the frontend
        record.date = date;
        record.transactionNo = transactionNo;
        record.totalQtyKg = totalQtyKg;
        record.receivedItems = receivedItems;

        // Track who updated it if you are sending this from the frontend
        if (updatedBy) record.updatedBy = updatedBy;

        const updatedRecord = await record.save();
        res.status(200).json(updatedRecord);

    } catch (error) {
        console.error('Error updating tea received record:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};