const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { requireAdmin } = require('../middleware/auth');

router.post('/login', authCtrl.login);
router.get('/me', requireAdmin, authCtrl.me);

module.exports = router;
