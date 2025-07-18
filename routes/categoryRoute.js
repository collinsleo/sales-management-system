const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { check, validationResult } = require('express-validator');
const validateCategory = require('../middlewares/validatecategory');
const activityLog = require('../middlewares/activitylogs.js') 
const { isAuthenticated, authorizeRoles, is_staff } = require('../middlewares/authntication');
const {cartegoryProfitAnalysis} = require('../middlewares/analysis.js')



// Show category page
router.get('/', authorizeRoles('admin','manager','cashier','staff') , cartegoryProfitAnalysis,  async (req, res) => {
    try {
        const cartegoryprofit = res.locals.categoryProfit;
        const { rows } = await db.query(`
             SELECT
                c.id AS id,
                c.name AS name,
                count(p.id) as product_count 
                FROM categories c
                LEFT
                JOIN products p ON c.id = p.category_id
                GROUP BY c.id, C.name
                ORDER BY product_count DESC;
            `);
        res.render('admin/categories.ejs', { categories: rows, cartegoryprofit});
    } catch (error) {
        console.error('Error fetching categories:', error);
        req.flash('error_msg', 'Error fetching categories');
        return res.redirect('/category');
    }
});


// ====================================
// product category
// ====================================
router.post('/add-category',authorizeRoles('admin','manager','staff'), validateCategory,async (req, res)=>{
    try {
        const errors = validationResult(req);
        const error = []
        errors.array().forEach(element => {
            error.push(element.msg)                
        });

        if(!errors.isEmpty()){
            console.log(errors);
            req.flash('error_msg', error[0])
            return res.redirect('/category');
        } else{
            // Extract category name from the request body and convert to lowercase
            const categoryName = req.body.category.toLowerCase();

            // Check if category already exists
            const checkCategory = await db.query('SELECT * FROM categories WHERE name = $1', [categoryName]);
            if (checkCategory.rows.length > 0) {
                req.flash('error_msg', 'Category already exists, try again');
                return res.redirect('/category');
            } else {
                // Insert category into the database
                await db.query('INSERT INTO categories (name) VALUES ($1)', [categoryName]);
                await activityLog(`added new category ${categoryName} by ${req.user.username} with id ${req.user.id}`, req)

                req.flash('success_msg', 'Category added successfully');
                return res.redirect('/category');
            }
        }
    } catch (error) {
        console.error('Error posting category:', error);
        req.flash('error_msg', 'Category could not be added, try again');
        return res.redirect('/category');    }
})

// ===================================
        // edit category
// ====================================


router.post('/update', authorizeRoles('admin','manager','staff'), validateCategory,async (req, res)=>{
    try {
        const {categoryId, category} = req.body
        const errors = validationResult(req);
        const error = []
        errors.array().forEach(element => {
            error.push(element.msg)                
        });

        if(!errors.isEmpty()){
            console.log(errors);
            req.flash('error_msg', error[0])
            return res.redirect('/category');
        }  
        if(categoryId.trim() == "" || isNaN(categoryId))  {
            req.flash('error_msg', "invalid category id")
            return res.redirect('/category');  
        }         
        // Extract category name from the request body and convert to lowercase

        // Check if category already exists
        let checkCategory = await db.query('SELECT * FROM categories WHERE name = $1', [category]);
        if (checkCategory.rows.length > 0) {
            req.flash('error_msg', 'Category already exists, try again');
            return res.redirect('/category');
        } else {
            checkCategory = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
            if (checkCategory.rows.length < 1) {
                req.flash('error_msg', 'invalid Category id');
                return res.redirect('/category');
            }    
            // update category into the database
            await db.query('UPDATE categories SET name = $1 WHERE id = $2', [category, categoryId]);
            await activityLog(` category updated from ${checkCategory.rows[0].name} to  ${category}`, req)

            req.flash('success_msg', 'Category added successfully');
            return res.redirect('/category');
        }
        
    } catch (error) {
        console.error('Error posting category:', error);
        req.flash('error_msg', 'Category could not be added, try again');
        return res.redirect('/category');    
    }
})



// ===================================
        // delete category
// ====================================

router.get('/:category_id/delete', authorizeRoles('admin', 'manager'), async(req,res)=>{
    const category_id= req.params.category_id;
    try{
        await db.query('DELETE FROM categories WHERE id = $1', [category_id])
        req.flash('success_msg', "item successfuly deleted")
        return res.redirect('/category')
    
    }catch (error){
        console.error("Error: category failed to delete", error.message);
        req.flash('error_msg', "item failed to delete, please try again later")
        return res.redirect('/category')
    }

})


module.exports = router;