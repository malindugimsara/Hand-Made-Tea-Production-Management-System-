import TeaCenterIssue from '../models/TeaCenterIssueModel.js';
import PackingStock from '../models/PackingStock.js'; 

// --- NEW LOGIC: BASE TEA MAPPING (Must match frontend) ---
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

// @desc    Create new tea center issue records
// @route   POST /api/tea-center-issues
// @access  Private
export const createTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems } = req.body;

        if (!issueItems || issueItems.length === 0) {
            return res.status(400).json({ message: 'No issue items provided' });
        }

        const newIssue = new TeaCenterIssue({
            date,
            totalBoxes,
            totalQtyKg,
            issueItems,
        });

        // 👇 AUTOMATED INVENTORY DEDUCTION LOGIC 👇
        for (const item of issueItems) {
            let remainingToDeduct = Number(item.totalQtyKg);
            
            // MAP THE FLAVORED TEA TO THE BASE GRADE! (e.g. Ginger Tea -> BOPF)
            const baseGradeName = getBaseTeaGrade(item.product);
            
            // Find ALL stock rows for this Base Grade (Combines Factory AND Handmade)
            const stocks = await PackingStock.find({ productName: baseGradeName });

            for (let stock of stocks) {
                if (remainingToDeduct <= 0) break; // Finished deducting this item

                if (stock.bulkStockKg >= remainingToDeduct) {
                    // This row has enough to cover the rest of the deduction
                    stock.bulkStockKg -= remainingToDeduct;
                    remainingToDeduct = 0;
                } else {
                    // This row doesn't have enough, so drain it to 0 and keep deducting from the next row
                    remainingToDeduct -= stock.bulkStockKg;
                    stock.bulkStockKg = 0;
                }
                
                await stock.save();
            }

            if (remainingToDeduct > 0) {
                console.warn(`Warning: Issued ${item.totalQtyKg}kg of ${item.product} (Base: ${baseGradeName}) but bulk stock was short by ${remainingToDeduct}kg.`);
            }
        }
        // 👆 END OF AUTOMATED INVENTORY DEDUCTION 👆

        const savedIssue = await newIssue.save();
        res.status(201).json(savedIssue);

    } catch (error) {
        console.error('Error saving tea center issue:', error); 
        res.status(500).json({ message: 'Server error failed to save record', error: error.message });
    }
}

// @desc    Get all tea center issues
// @route   GET /api/tea-center-issues
// @access  Private
export const getTeaCenterIssues = async (req, res) => {
    try {
        const issues = await TeaCenterIssue.find().sort({ date: -1 });
        res.status(200).json(issues);
    } catch (error) {
        console.error('Error fetching tea center issues:', error);
        res.status(500).json({ message: 'Server error failed to fetch records', error: error.message });
    }
};

// @desc    Update a tea center issue record
// @route   PUT /api/tea-center-issues/:id
// @access  Private
export const updateTeaCenterIssue = async (req, res) => {
    try {
        const { date, totalBoxes, totalQtyKg, issueItems, updatedBy, editorName } = req.body;

        const issue = await TeaCenterIssue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Record not found' });
        }

        issue.date = date;
        issue.totalBoxes = totalBoxes;
        issue.totalQtyKg = totalQtyKg;
        issue.issueItems = issueItems;

        if (updatedBy) issue.updatedBy = updatedBy;
        if (editorName) issue.editorName = editorName;

        const updatedIssue = await issue.save();
        res.status(200).json(updatedIssue);

    } catch (error) {
        console.error('Error updating tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to update record', error: error.message });
    }
};

export const deleteTeaCenterIssue = async (req, res) => {
    try {
        const issue = await TeaCenterIssue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await issue.deleteOne();
        res.status(200).json({ message: 'Record deleted successfully' });

    } catch (error) {
        console.error('Error deleting tea center issue:', error);
        res.status(500).json({ message: 'Server error failed to delete record', error: error.message });
    }
};