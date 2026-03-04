/**
 * Sync API
 * Handles sync operations: start, status, result
 */

const express = require('express');
const router = express.Router();
const { getGlobal, setGlobal } = require('../../common/utils/store/electron');
const { UserImpl } = require('../../src/impl/user/user.impl');

// Start sync for a user
router.post('/start', async (req, res) => {
  try {
    const { username, businessType } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    console.log(`[Sync API] Starting sync for user: ${username}, businessType: ${businessType}`);

    const userImpl = new UserImpl();
    await userImpl.runUser(username, false);

    res.json({ success: true, message: 'Sync started', username, businessType });
  } catch (error) {
    console.error('[Sync API] Error starting sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sync status for a user
router.get('/status/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const statsKey = `sync_stats_${username}`;
    const stats = await getGlobal(statsKey);

    res.json({
      username,
      stats: stats || {
        totalCount: 0,
        successCount: 0,
        skipCount: 0,
        failCount: 0,
        running: false
      }
    });
  } catch (error) {
    console.error('[Sync API] Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sync result for a user
router.get('/result/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const statsKey = `sync_stats_${username}`;
    const stats = await getGlobal(statsKey);

    res.json({
      username,
      result: stats || null
    });
  } catch (error) {
    console.error('[Sync API] Error getting result:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
