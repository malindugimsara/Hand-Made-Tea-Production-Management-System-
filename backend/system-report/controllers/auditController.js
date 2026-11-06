import MissingRecordLog from '../models/MissingRecordLog.js';
import { Dehydrator } from '../../models/Dehydrator.js';
import { GreenLeaf } from '../../models/GreenLeaf.js';
import SellingDetails from '../../models/SellingDetails.js';
import handmadeTransferModel from '../../models/handmadeTransferModel.js'; 
import TeaCenterIssue from '../../Packing/models/TeaCenterIssueModel.js';
import LocalSaleModel from '../../Packing/models/LocalSaleModel.js';
import TeaTransactionOther from '../../Packing/models/TeaTransactionOther.js';
import RawMaterialIn from '../../Packing/models/RawMaterialIn.js';
import TeaReceivedModel from '../../Packing/models/TeaReceivedModel.js';
import DailySummary from '../../localsale/models/DailySummary.js';
import IssueTypeSummary from '../../localsale/models/IssueTypeSummary.js';
import FiringSection from '../../manufacturer/models/FiringSection.js';
import HydroMeter from '../../manufacturer/models/HydroMeter.js';
import LoftLeaf from '../../manufacturer/models/LoftLeaf.js';
import RollingRoomSheet from '../../manufacturer/models/RollingRoomSheet.js';
import WitherLeaf from '../../manufacturer/models/WitherLeaf.js';
import FactoryLog from '../../factory/models/FactoryLog.js';
import FactoryPack from '../../factory/models/FactoryPack.js';
import LabourOutput from '../../factory/models/LabourOutput.js';



// 1. Auto-Generate Missing Records (Date Range Logic)
export const autoGenerateMissing = async (req, res) => {
    try {
        const { startDate, endDate, section } = req.query;
        const missingData = [];

        const formatDate = (dateInput) => {
            if (!dateInput) return null;
            const d = new Date(dateInput);
            if (isNaN(d)) return String(dateInput).trim();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        let endLimit = endDate;
        const todayStr = formatDate(new Date());
        if (endDate > todayStr) {
            endLimit = todayStr; 
        }

        // 💡 Function ti ekbar define kora hoyeche (DRY Principle) + Safety check add kora hoyeche
        const checkModuleMissingRange = (dataList, moduleName, remark) => {
            if (!dataList || !Array.isArray(dataList)) {
                console.warn(`⚠️ Warning: No valid data for ${moduleName}`);
                return;
            }

            const datesInRange = dataList
                .map(r => formatDate(r.date || r.dateOfManufacture || r.cropDate || r.mfDate || r.dateOfCrop || (r.month ? `${r.month}-01` : null) || r.createdAt))
                .filter(d => d && d >= startDate && d <= endLimit)
                .sort(); 

            if (datesInRange.length === 0) {
                missingData.push({ 
                    id: Date.now() + Math.random(), 
                    date: `${startDate} to ${endLimit}`, 
                    moduleName: moduleName, 
                    details: `No records entered from ${startDate}` 
                });
            } else {
                const lastEnteredDate = datesInRange[datesInRange.length - 1];
                const nextDayObj = new Date(lastEnteredDate);
                nextDayObj.setDate(nextDayObj.getDate() + 1);
                const nextDayStr = formatDate(nextDayObj);

                if (nextDayStr <= endLimit) {
                    missingData.push({ 
                        id: Date.now() + Math.random(), 
                        date: `${nextDayStr} to ${endLimit}`,
                        moduleName: moduleName, 
                        details: remark
                    });
                }
            }
        };

        if (section === 'H/T Factory') {
            // 💡 transferData-er jonno handmadeTransferModel.find() add kora hoyeche
            const [greenLeafData, dehydratorData, sellingDetailsData, transferData] = await Promise.all([
                GreenLeaf.find(),
                Dehydrator.find(),  
                SellingDetails.find(),
                handmadeTransferModel.find() 
            ]);

            checkModuleMissingRange(greenLeafData, "Green Leaf", "Missing data after last entry");
            checkModuleMissingRange(dehydratorData, "Dehydrator", "Missing dehydrator operations after last entry");
            checkModuleMissingRange(sellingDetailsData, "Selling Details", "Missing selling records after last entry");
            checkModuleMissingRange(transferData, "H/T Transfer out", "Missing H/T Transfer out after last entry");
            
        } else if (section === 'Packing Section') {
            const [LocalSaleModelData, TeaCenterIssueData, RawMaterialInData, TeaReceivedModelData, TeaTransactionOtherData] = await Promise.all([
                LocalSaleModel.find(),
                TeaCenterIssue.find(),
                RawMaterialIn.find(),
                TeaReceivedModel.find(),
                TeaTransactionOther.find(),
            ]);

            checkModuleMissingRange(LocalSaleModelData, "Local Sale Tea Issue", "Missing local sale records after last entry");
            checkModuleMissingRange(TeaCenterIssueData, "Tea Center Tea Issue", "Missing tea center logs after last entry");
            checkModuleMissingRange(RawMaterialInData, "Raw Material In", "Missing raw material intake after last entry");
            checkModuleMissingRange(TeaReceivedModelData, "Tea Received", "Missing tea received stock after last entry");
            checkModuleMissingRange(TeaTransactionOtherData, "Other Tea Transactions", "Missing transaction data after last entry");

        } else if (section === 'Local Sale') {
            const [DailySummaryData, IssueTypeSummaryData] = await Promise.all([
                DailySummary.find(),  
                IssueTypeSummary.find(),  
            ]);

            checkModuleMissingRange(DailySummaryData, "Daily Sales", "Missing daily sales records after last entry");
            checkModuleMissingRange(IssueTypeSummaryData, "Free Issue", "Missing free issue logs after last entry");
        } else if (section === 'Manufacturer') {
            const [
                FiringSectionData, 
                HydroMeterData,
                LoftLeafData,
                RollingRoomSheetData,
                WitherLeafData
            ] = await Promise.all([
                FiringSection.find(),  
                HydroMeter.find(),  
                LoftLeaf.find(),
                RollingRoomSheet.find(),
                WitherLeaf.find()
            ]);

            checkModuleMissingRange(FiringSectionData, "Firing Section", "Missing firing section records after last entry");
            checkModuleMissingRange(HydroMeterData, "Hydro Meter", "Missing hydro meter readings after last entry");
            checkModuleMissingRange(LoftLeafData, "Loft Leaf", "Missing loft leaf details after last entry");
            checkModuleMissingRange(RollingRoomSheetData, "Rolling Room Sheet", "Missing rolling room records after last entry");
            checkModuleMissingRange(WitherLeafData, "Wither Leaf", "Missing wither leaf records after last entry");

        } else if (section === 'Factory') { 
            const [
                FactoryLogData,
                FactoryPackData,
                LabourOutputData
            ] = await Promise.all([
                FactoryLog.find(),  
                FactoryPack.find(),  
                LabourOutput.find()
            ]);

            checkModuleMissingRange(FactoryLogData, "Factory Log", "Missing factory logs after last entry");
            checkModuleMissingRange(FactoryPackData, "Factory Pack", "Missing factory pack records after last entry");
            checkModuleMissingRange(LabourOutputData, "Labour Output", "Missing labour output records after last entry");
        }
        res.status(200).json({ success: true, data: missingData });
    } catch (error) {
        console.error("🔴 AUTO GENERATE ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. CRUD: Save New Audit Log
export const saveAuditLog = async (req, res) => {
    try {
        const newLog = new MissingRecordLog(req.body);
        await newLog.save();
        res.status(201).json({ success: true, data: newLog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. CRUD: Get All Saved Logs
export const getAuditLogs = async (req, res) => {
    try {
        const logs = await MissingRecordLog.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. CRUD: Update Log
export const updateAuditLog = async (req, res) => {
    try {
        const updated = await MissingRecordLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. CRUD: Delete Log
export const deleteAuditLog = async (req, res) => {
    try {
        await MissingRecordLog.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Log deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};