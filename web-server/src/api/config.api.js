/**
 * Config API
 * Handles system configuration
 */

const express = require('express');
const router = express.Router();
const { getGlobal, setGlobal } = require('../../common/utils/store/electron');
const { SystemImpl } = require('../../src/impl/config/system.impl');
const { rescheduleScheduledTasks } = require('../../src/task/task');

// Get sync time config
router.get('/sync-time', async (req, res) => {
  try {
    const { businessType } = req.query;
    const systemImpl = new SystemImpl();

    let config;
    if (businessType) {
      config = await systemImpl.getSyncTimeConfigByBusiness(businessType);
    } else {
      config = await systemImpl.getSyncTimeConfig();
    }

    res.json({ config });
  } catch (error) {
    console.error('[Config API] Error getting sync time config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save sync time config
router.post('/sync-time', async (req, res) => {
  try {
    const { businessType, ...config } = req.body;
    const systemImpl = new SystemImpl();

    if (businessType) {
      await systemImpl.saveSyncTimeConfigByBusiness(businessType, { ...config, businessType });
    } else {
      await systemImpl.saveSyncTimeConfig(config);
    }

    // Reschedule tasks
    await rescheduleScheduledTasks();

    res.json({ success: true, config: req.body });
  } catch (error) {
    console.error('[Config API] Error saving sync time config:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
