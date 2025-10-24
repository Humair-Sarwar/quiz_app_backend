const { adminCounts } = require('../controllers/DashboardController');
const auth = require('../middlewares/Authentication');

const router = require('express').Router();


router.get('/admin/counts', auth, adminCounts)

module.exports = router