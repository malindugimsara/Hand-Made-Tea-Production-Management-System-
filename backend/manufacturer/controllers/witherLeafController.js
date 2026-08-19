import WitherLeaf from '../models/WitherLeaf.js';

// @desc    Create a new Wither Leaf record
// @route   POST /api/wither-leaf
export const createWitherLeaf = async (req, res) => {
  try {
    const newWitherLeaf = new WitherLeaf(req.body);
    const savedRecord = await newWitherLeaf.save();
    res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all Wither Leaf records
// @route   GET /api/wither-leaf
export const getWitherLeaves = async (req, res) => {
  try {
    const records = await WitherLeaf.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single Wither Leaf record by ID
// @route   GET /api/wither-leaf/:id
export const getWitherLeafById = async (req, res) => {
  try {
    const record = await WitherLeaf.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a Wither Leaf record
// @route   PUT /api/wither-leaf/:id
export const updateWitherLeaf = async (req, res) => {
  try {
    const updatedRecord = await WitherLeaf.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Wither Leaf record
// @route   DELETE /api/wither-leaf/:id
export const deleteWitherLeaf = async (req, res) => {
  try {
    const record = await WitherLeaf.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};