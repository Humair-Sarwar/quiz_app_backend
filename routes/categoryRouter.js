const { createCategory, deleteCategory, updateCategory, getAllCategories, deleteSelectedCategory, getAllCategoriesWebsite } = require('../controllers/CategoryController');
const auth = require('../middlewares/Authentication');

const router = require('express').Router();

router.post('/category', auth, createCategory);

router.delete('/category', auth, deleteCategory);

router.put('/category', auth, updateCategory);

router.get('/category', auth, getAllCategories);

router.delete('/category-selected', auth, deleteSelectedCategory);

router.get('/category-all-website', getAllCategoriesWebsite)

module.exports = router;