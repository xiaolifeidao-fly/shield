/**
 * User API
 * Handles user operations
 */

const express = require('express');
const router = express.Router();
const { UserImpl } = require('../../src/impl/user/user.impl');

// Get all users
router.get('/', async (req, res) => {
  try {
    const userImpl = new UserImpl();
    const users = await userImpl.getUserInfoList();

    res.json({ users });
  } catch (error) {
    console.error('[User API] Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userImpl = new UserImpl();
    const user = await userImpl.getUserInfo(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('[User API] Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
