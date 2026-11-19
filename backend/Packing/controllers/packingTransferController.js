import mongoose from 'mongoose';
import StockTransfer from '../../models/StockTransfer.js';
import PackingStock from '../models/PackingStock.js';
import { paginate } from '../../utils/paginate.js';

// @desc    Get all pending transfers waiting for Packing verification
// @route   GET /api/packing/transfers/pending
export const getPendingTransfersForPacking = async (req, res) => {
    try {
        await paginate(StockTransfer, req, res, {
            filter: { status: 'PENDING' },
            dateField: 'dateIssued',
            sort: { dateIssued: 1 }
        });
    } catch (error) {
        console.error('Error fetching pending transfers:', error);
        res.status(500).json({ message: 'Server error while fetching pending stock.' });
    }
};

// @desc    Receive a transfer (Packing officer updates with actual received Kg)
//          Protected with ACID transactions and atomic $inc operators to prevent race conditions and lost updates.
// @route   PUT /api/packing/transfers/:id/receive
export const receiveTransferInPacking = async (req, res) => {
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch {
        // Fallback for standalone MongoDB environments without replica sets
        session = null;
    }

    try {
        const sessionOptions = session ? { session } : {};
        const { id } = req.params;
        const { receivedItems, remarks } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            if (session) await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid transfer ID provided.' });
        }

        if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
            if (session) await session.abortTransaction();
            return res.status(400).json({ message: 'At least one received item is required.' });
        }

        // Grab current user's name from auth token or payload fallback
        const currentUserName = req.user?.name || req.user?.username || req.body?.receivedBy || 'Packing Officer';

        // Atomically retrieve the pending transfer
        const transfer = await StockTransfer.findOne({ _id: id }, null, sessionOptions);

        if (!transfer) {
            if (session) await session.abortTransaction();
            return res.status(404).json({ message: 'Transfer record not found.' });
        }

        if (transfer.status === 'COMPLETED') {
            if (session) await session.abortTransaction();
            return res.status(400).json({ message: 'Transfer has already been received and completed.' });
        }

        // Update items with actual received quantities and validate numbers
        for (const item of transfer.items) {
            const receivedItem = receivedItems.find(r => r._id && r._id.toString() === item._id.toString());
            if (receivedItem) {
                const qty = Number(receivedItem.receivedQtyKg);
                if (isNaN(qty) || qty < 0) {
                    if (session) await session.abortTransaction();
                    return res.status(400).json({ message: `Invalid received quantity for product: ${item.product}. Must be a non-negative number.` });
                }
                item.receivedQtyKg = qty;
            }
        }

        transfer.status = 'COMPLETED';
        transfer.dateReceived = new Date();
        transfer.receivedBy = currentUserName;
        if (remarks !== undefined && remarks !== null) {
            transfer.remarks = String(remarks).trim();
        }

        const updatedTransfer = await transfer.save(sessionOptions);

        // Normalize source name to match PackingStock enum ('Handmade', 'Factory', 'Other')
        let incomingSource = transfer.source || 'Handmade';
        const lowerSource = incomingSource.toLowerCase();
        if (lowerSource.includes('hand')) incomingSource = 'Handmade';
        else if (lowerSource.includes('factory')) incomingSource = 'Factory';
        else if (lowerSource.includes('other')) incomingSource = 'Other';
        else incomingSource = 'Handmade';

        // Aggregate received quantities by product to avoid redundant updates for duplicates
        const stockIncrements = {};
        for (const item of transfer.items) {
            const qty = Number(item.receivedQtyKg);
            if (!qty || qty <= 0) continue;

            const productName = (item.product || item.grade || item.productName || '').trim();
            if (!productName) continue;

            stockIncrements[productName] = (stockIncrements[productName] || 0) + qty;
        }

        // Atomically update PackingStock using Mongoose $inc operator (eliminates Read-Modify-Write race conditions)
        for (const [productName, incomingQty] of Object.entries(stockIncrements)) {
            // Step 1: Attempt atomic $inc on existing source entry in stockBySource
            let updatedStock = await PackingStock.findOneAndUpdate(
                {
                    productName: productName,
                    "stockBySource.sourceName": incomingSource
                },
                {
                    $inc: {
                        totalBulkStockKg: incomingQty,
                        "stockBySource.$.quantityKg": incomingQty,
                        "stockBySource.$.transInAmount": incomingQty
                    }
                },
                { new: true, ...sessionOptions }
            );

            // Step 2: If the source entry does not exist in stockBySource, push it with atomic $inc on totalBulkStockKg
            if (!updatedStock) {
                updatedStock = await PackingStock.findOneAndUpdate(
                    {
                        productName: productName,
                        "stockBySource.sourceName": { $ne: incomingSource }
                    },
                    {
                        $inc: { totalBulkStockKg: incomingQty },
                        $push: {
                            stockBySource: {
                                sourceName: incomingSource,
                                quantityKg: incomingQty,
                                transInAmount: incomingQty,
                                issueAmount: 0
                            }
                        }
                    },
                    { new: true, ...sessionOptions }
                );
            }

            // Step 3: If no document exists at all for this product, create a new master stock record
            if (!updatedStock) {
                try {
                    const newStock = new PackingStock({
                        productName: productName,
                        stockBySource: [{
                            sourceName: incomingSource,
                            quantityKg: incomingQty,
                            transInAmount: incomingQty,
                            issueAmount: 0
                        }],
                        totalBulkStockKg: incomingQty,
                        packedItems: []
                    });
                    await newStock.save(sessionOptions);
                } catch (err) {
                    // Handle duplicate key error gracefully if created concurrently by another process
                    if (err.code === 11000) {
                        await PackingStock.findOneAndUpdate(
                            {
                                productName: productName,
                                "stockBySource.sourceName": incomingSource
                            },
                            {
                                $inc: {
                                    totalBulkStockKg: incomingQty,
                                    "stockBySource.$.quantityKg": incomingQty,
                                    "stockBySource.$.transInAmount": incomingQty
                                }
                            },
                            sessionOptions
                        );
                    } else {
                        throw err;
                    }
                }
            }
        }

        if (session) {
            await session.commitTransaction();
        }

        return res.status(200).json(updatedTransfer);

    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error('Failed to abort transaction in receiveTransferInPacking:', abortError);
            }
        }
        console.error('Error receiving transfer in packing:', error);
        return res.status(500).json({ message: 'Server error while receiving transfer.', error: error.message });
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// @desc    Get all COMPLETED transfers (Trans In History)
// @route   GET /api/packing/transfers/completed
export const getCompletedTransfers = async (req, res) => {
    try {
        await paginate(StockTransfer, req, res, {
            filter: { status: 'COMPLETED' },
            dateField: 'dateReceived',
            sort: { dateReceived: -1 }
        });
    } catch (error) {
        console.error('Error fetching transfer history:', error);
        res.status(500).json({ message: 'Server error while fetching history.' });
    }
};
