/**
 * KV API
 * Handles key-value operations from shield_global_kv
 */

const express = require('express');
const router = express.Router();
const { getGlobal, setGlobal } = require('../../common/utils/store/electron');

// Get value by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getGlobal(key);

    res.json({ key, value });
  } catch (error) {
    console.error('[KV API] Error getting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set value by key
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    await setGlobal(key, value);

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('[KV API] Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete key
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    await removeGlobal(key);

    res.json({ success: true, key });
  } catch (error) {
    console.error('[KV API] Error deleting key:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
