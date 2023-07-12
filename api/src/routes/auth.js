const express = require('express');

const router = express.Router();
const { auth } = require('../controllers/auth');

router.route('/').get(auth);

module.exports = router;
