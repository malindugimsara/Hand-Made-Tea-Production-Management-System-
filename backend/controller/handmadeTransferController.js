import StockTransfer from '../models/StockTransfer.js';
import {Production} from '../models/Production.js'; // <-- Changed to your Production model
import webpush from 'web-push';
import Subscription from '../Packing/models/SubscriptionModel.js';

// @desc    Create a new stock transfer (Handmade -> Packing)
// @route   POST /api/handmade/transfers
// @desc    Create a new stock transfer (Handmade -> Packing)
// @route   POST /api/handmade/transfers
export const createHandmadeTransfer = async (req, res) => {
    try {
        const { items, remarks } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'At least one item is required.' });
        }

        const currentUserName = req.user?.name || req.user?.username || 'Handmade Officer';

        // Generate Transfer ID (e.g., TR-20260423-XXXX)
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const transferId = `TR-${dateStr}-${randomNum}`;

        const newTransfer = new StockTransfer({
            transferId,
            items: items.map(item => ({
                product: item.product,
                issuedQtyKg: Number(item.issuedQtyKg)
            })),
            issuedBy: currentUserName,
            source: 'Handmade', 
            remarks,
            status: 'PENDING'
        });

        const savedTransfer = await newTransfer.save();

        // ========================================================
        // 🌟 PUSH NOTIFICATION CODE (Packing Officer ට පමණක් යැවීම) 🌟
        // ========================================================
        try {
            // "Packing Officer" Role එක තියෙන අයව පමණක් තෝරාගැනීම
            const subscriptions = await Subscription.find({ role: "Packing Officer" });
            
            // යවන සම්පූර්ණ ප්‍රමාණය (Total Qty) එකතු කරගැනීම
            const totalQty = items.reduce((sum, item) => sum + Number(item.issuedQtyKg), 0);

            const payload = JSON.stringify({
                title: '📦 New Handmade Transfer',
                message: `A new transfer of ${totalQty}kg arrived from Handmade! (${transferId})`,
                url: 'packing/trans-in-entry'
            });

            await Promise.all(
                subscriptions.map(async (sub) => {
                    try {
                        await webpush.sendNotification(sub, payload);
                    } catch(err) {
                        if (err.statusCode === 410) {
                            await Subscription.deleteOne({ endpoint: sub.endpoint });
                        }
                    }
                })
            );
        } catch (pushErr) {
            console.error("Notification error:", pushErr);
        }
        // ========================================================

        res.status(201).json(savedTransfer);

    } catch (error) {
        console.error('Error creating handmade transfer:', error);
        res.status(500).json({ message: 'Server error while sending stock.' });
    }
};

export const getStockSummary = async (req, res) => {
    try {
        const { date } = req.query; 
        
        // Target exact end of day for both Production and StockTransfers
        const targetDate = new Date(date);
        targetDate.setHours(23, 59, 59, 999);

        // 1. Fetch all Daily Production records up to and including the target date
        const productionData = await Production.find({
            date: { $lte: targetDate } 
        });

        // 2. Sum up all the produced tea from the flat daily records
        const totalProduced = {};
        
        productionData.forEach(record => {
            // 👇 THIS IS THE FIX: Using your exact schema field names 👇
            const teaName = record.teaType;
            const teaQty = record.madeTeaWeight;

            if (teaName && teaQty) {
                if (!totalProduced[teaName]) totalProduced[teaName] = 0;
                totalProduced[teaName] += Number(teaQty);
            }
        });

        // 3. Calculate Total Stock already Transferred OUT up to the exact selected date
        const transferTotals = await StockTransfer.aggregate([
            {
                $match: {
                    dateIssued: { $lte: targetDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalTransferred: { $sum: "$items.issuedQtyKg" }
                }
            }
        ]);

        // 4. Calculate Available Stock = (Total Produced) - (Total Transferred)
        const availableStock = { ...totalProduced };

        transferTotals.forEach(trans => {
            if (availableStock[trans._id] !== undefined) {
                availableStock[trans._id] -= trans.totalTransferred;
            } else {
                // Edge case: if there is a transfer but no recorded production
                availableStock[trans._id] = -(trans.totalTransferred);
            }
        });

        // 5. Clean up the data (Only send back products that actually have > 0 stock)
        const finalStock = {};
        for (const [teaType, qty] of Object.entries(availableStock)) {
            if (qty > 0) {
                // Ensure floating point math doesn't leave weird decimals (e.g. 0.00000001)
                finalStock[teaType] = Math.round(qty * 1000) / 1000; 
            }
        }

        res.status(200).json(finalStock);

    } catch (error) {
        console.error('Error fetching stock summary:', error);
        res.status(500).json({ message: 'Server error while calculating stock.' });
    }
};

export const getTransOutRecords = async (req, res) => {
    try {
        const transOutRecords = await StockTransfer.find({
             // Filter logic if needed
        }).sort({ dateIssued: -1 }); 

        res.status(200).json(transOutRecords);
    } catch (error) {
        console.error("Error fetching Trans Out records:", error);
        res.status(500).json({ message: "Failed to fetch transfer history" });
    }
};      

export const getHandmadeTransfersHistory = async (req, res) => {
    try {
        const transfers = await StockTransfer.find().sort({ dateIssued: -1 });
        res.status(200).json(transfers);
    } catch (error) {
        console.error('Error fetching handmade transfer history:', error);
        res.status(500).json({ message: 'Server error while fetching transfer history.' });
    }
};