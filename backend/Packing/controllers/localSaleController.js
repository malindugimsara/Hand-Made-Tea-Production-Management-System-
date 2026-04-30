import LocalSale from '../models/LocalSaleModel.js';
import PackingStock from '../models/PackingStock.js';
import RawMaterialStock from '../models/RawMaterialStock.js';

// --- NEW LOGIC: BASE TEA MAPPING (Should match frontend) ---
const getBaseTeaGrade = (productName) => {
    if (!productName) return "";
    const p = productName.toLowerCase().trim();

    const bopf = ["lemongrass - bopf", "cinnamon tea - bopf", "ginger tea - bopf", "masala tea - bopf", "pineapple tea", "mix fruit", "peach", "strawberry", "jasmin - bopf", "mango tea", "carmel", "honey", "earl grey", "lime", "soursop - bopf", "cardamom", "gift pack", "guide issue-bopf"];
    const bopfSp = ["english breakfast", "cinnamon tea - bopf sp", "ginger tea - bopf sp", "masala tea - bopf sp", "vanilla", "mint - bopf sp", "moringa - bopf sp", "curry leaves - bopf sp", "gotukola - bopf sp", "heen bovitiya - bopf sp", "black t/b", "english afternoon"];
    const greenTea = ["lemongrass - green tea", "g/t lemangrass", "mint - green tea", "soursop - green tea", "moringa - green tea", "curry leaves - green tea", "heen bovitiya - green tea", "gotukola - green tea", "jasmin - green tea", "green tea t/b"];
    const pekoe = ["pekoe", "rose tea"];
    const ff = ["ceylon premium - ff"];
    const op = ["op", "hibiscus"];
    const fbop = ["ceylon supreme"];

    const standaloneMap = {
        "opa": "OPA", "bop": "BOP", "bop pack": "BOP", "pink tea": "Pink Tea", "pink tea can": "Pink Tea", "pink tea pack": "Pink Tea",
        "op 1": "OP 1", "op1 pack": "OP 1", "ff ex sp": "FF EX SP", "ff ex sp pack": "FF EX SP", "ff ex sp box": "FF EX SP",
        "white tea": "White Tea", "white tea can": "White Tea", "purple tea": "Purple Tea", "purple tea can": "Purple Tea",
        "purple pack": "Purple Tea", "slim beauty": "Slim Beauty", "slim beauty can": "Slim Beauty", "vita glow": "Vita Glow",
        "silver green": "Silver Green", "premium": "Premium", "ceylon premium": "FF", "black pepper": "Black Pepper",
        "black pepar": "Black Pepper", "cinnamon stick": "Cinnamon Stick", "turmeric": "Turmeric", "silver tips": "Silver Tips",
        "golden tips": "Golden Tips", "flower": "Flower", "chakra": "Chakra", "green tea": "Green Tea"
    };

    if (bopf.includes(p)) return "BOPF";
    if (bopfSp.includes(p)) return "BOPF SP";
    if (greenTea.includes(p)) return "Green Tea";
    if (pekoe.includes(p)) return "Pekoe";
    if (ff.includes(p)) return "FF";
    if (op.includes(p)) return "OP";
    if (fbop.includes(p)) return "FBOP";
    if (standaloneMap[p]) return standaloneMap[p];
    
    return productName; 
};

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

        // 👇 AUTOMATED INVENTORY DEDUCTION LOGIC 👇
        for (const item of salesItems) {
            // ==========================================
            // 1. DEDUCT FROM TEA STOCK (PackingStock)
            // ==========================================
            let remainingToDeduct = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg);
            const baseGradeName = getBaseTeaGrade(item.product);
            const stock = await PackingStock.findOne({ productName: baseGradeName });

            if (stock) {
                const originalDeductAmount = remainingToDeduct;

                if (stock.stockBySource && stock.stockBySource.length > 0) {
                    for (let source of stock.stockBySource) {
                        if (remainingToDeduct <= 0) break; 
                        
                        let amountDeductedFromThisSource = 0;
                        if (source.quantityKg >= remainingToDeduct) {
                            amountDeductedFromThisSource = remainingToDeduct;
                            source.quantityKg -= remainingToDeduct;
                            remainingToDeduct = 0;
                        } else {
                            amountDeductedFromThisSource = source.quantityKg;
                            remainingToDeduct -= source.quantityKg;
                            source.quantityKg = 0;
                        }

                        // TEA ISSUE AMOUNT Update
                        source.issueAmount = (source.issueAmount || 0) + amountDeductedFromThisSource;
                    }
                }

                const successfullyDeducted = originalDeductAmount - remainingToDeduct;
                stock.totalBulkStockKg -= successfullyDeducted;
                if (stock.totalBulkStockKg < 0) stock.totalBulkStockKg = 0;

                await stock.save();

                if (remainingToDeduct > 0) {
                    console.warn(`Warning: Local Sale issued ${item.totalQtyKg}kg of ${item.product} (Base: ${baseGradeName}) but bulk stock was short by ${remainingToDeduct}kg.`);
                }
            } else {
                console.warn(`Warning: Base product ${baseGradeName} not found in inventory.`);
            }

            // ==========================================
            // 2. DEDUCT FROM RAW MATERIAL STOCK (RawMaterialStock)
            // ==========================================
            if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
                const rmDeductAmount = Number(item.rawMaterialQtyKg);
                
                const rmStock = await RawMaterialStock.findOne({ materialName: item.rawMaterialName });

                if (rmStock) {
                    rmStock.totalQuantity -= rmDeductAmount;
                    
                    // 👇 අලුතින්: RAW MATERIAL ISSUE AMOUNT Update කිරීම 👇
                    rmStock.issueAmount = (rmStock.issueAmount || 0) + rmDeductAmount;

                    if (rmStock.totalQuantity < 0) rmStock.totalQuantity = 0; 
                    await rmStock.save();
                } else {
                    console.warn(`Warning: Raw Material ${item.rawMaterialName} not found in stock.`);
                }
            }
        }
        // 👆 END OF AUTOMATED INVENTORY DEDUCTION 👆

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

        if (date) saleRecord.date = date;
        if (totalBoxes !== undefined) saleRecord.totalBoxes = totalBoxes;
        if (totalQtyKg !== undefined) saleRecord.totalQtyKg = totalQtyKg;
        if (salesItems) saleRecord.salesItems = salesItems;
        
        if (updatedBy) {
            saleRecord.updatedBy = updatedBy;
        } else if (editorName) {
            saleRecord.updatedBy = editorName;
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
        const saleRecord = await LocalSale.findById(id);

        if (!saleRecord) {
            return res.status(404).json({ message: 'Local sale record not found.' });
        }

        // 👇 AUTOMATED STOCK REVERSAL LOGIC 👇
        for (const item of saleRecord.salesItems) {
            
            // 1. REVERSE TEA STOCK
            let amountToReturn = Number(item.baseTeaQtyKg) || Number(item.totalQtyKg);
            const baseGradeName = getBaseTeaGrade(item.product);
            const stock = await PackingStock.findOne({ productName: baseGradeName });

            if (stock) {
                if (stock.stockBySource && stock.stockBySource.length > 0) {
                    let targetSource = stock.stockBySource.find(s => s.sourceName === 'Factory') || stock.stockBySource[0];
                    
                    targetSource.quantityKg += amountToReturn;
                    
                    targetSource.issueAmount -= amountToReturn;
                    if(targetSource.issueAmount < 0) targetSource.issueAmount = 0;
                }
                
                stock.totalBulkStockKg += amountToReturn;
                await stock.save();
            }

            // 2. REVERSE RAW MATERIAL STOCK
            if (item.rawMaterialName && Number(item.rawMaterialQtyKg) > 0) {
                const rmReturnAmount = Number(item.rawMaterialQtyKg);
                const rmStock = await RawMaterialStock.findOne({ materialName: item.rawMaterialName });

                if (rmStock) {
                    rmStock.totalQuantity += rmReturnAmount;

                    // 👇 අලුතින්: RAW MATERIAL ISSUE AMOUNT REVERSAL 👇
                    rmStock.issueAmount -= rmReturnAmount;
                    if (rmStock.issueAmount < 0) rmStock.issueAmount = 0;

                    await rmStock.save();
                }
            }
        }
        // 👆 END OF AUTOMATED STOCK REVERSAL 👆

        await saleRecord.deleteOne();
        res.status(200).json({ message: 'Local sale record deleted and stock reversed successfully.' });

    } catch (error) {
        console.error('Error deleting local sale:', error);
        res.status(500).json({ message: 'Server error while deleting local sale record.' });
    }
};