const express =  require('express');
const router = express.Router();
const db = require('../config/db.js');
const { body, validationResult } = require('express-validator');
const validateSupplyer = require('../middlewares/validateSupplyer.js');
const { Query } = require('pg');
const { isAuthenticated, authorizeRoles, is_staff } = require('../middlewares/authntication');



// =================================
// Supplyer
// =================================
router.get('/', authorizeRoles('admin','manager'), async (req, res) => {
    try {
        const { rows : products } = await db.query('SELECT * FROM products ORDER BY id DESC');
        const { rows: supplyers } = await db.query('SELECT * FROM suppliers ORDER BY id DESC');
        res.render('admin/suppliers.ejs', { supplyers, products });
    } catch (error) {
        console.error('Error fetching supplyers:', error);
        req.flash('error_msg', 'Error fetching supplyers');
        return res.redirect('/supplyer');
    }
});

// ====================================
// Add Supplyer
// ====================================
router.post('/', authorizeRoles('admin','manager'), validateSupplyer, async (req, res) => {
    const errors = validationResult(req);
    const error = [];
    if (!errors.isEmpty()) {
        console.log(errors);
        errors.array().forEach(element => {
            error.push(element.msg);
        });
        req.flash('error_msg', error[0]);
        return res.redirect('/supplyer');
    }

    const { sName, sEmail, sPhone, sAddress, sCompany, product } = req.body;

    try {
               
        await db.query('INSERT INTO suppliers (name, email, phone, location, company) VALUES ($1, $2, $3, $4, $5)', 
            [sName, sEmail, sPhone, sAddress, sCompany]);
        req.flash('success_msg', 'Supplyer added successfully.');
        res.redirect('/supplyer');
    } catch (error) {
        console.error('Error adding supplyer:', error.message);
        req.flash('error_msg', 'An error occurred while adding the supplyer.');
        return res.redirect('/supplyer');
    }
});
// ====================================
// Edit Supplyer
// ====================================
router.get('/update/:id', authorizeRoles('admin','manager'), async (req, res) => {
    const { id } = req.params;

    const { rows : products } = await db.query('SELECT * FROM products ORDER BY id DESC');
    const { rows: supplyers } = await db.query('SELECT * FROM suppliers WHERE id = $1 ORDER BY id DESC',[id]);

    res.render('admin/update_suppliers.ejs', {products, supplyers: supplyers[0]});
})



router.post('/update/:id', authorizeRoles('admin','manager'), validateSupplyer, async (req, res) => {
    const { id } = req.params;

    const errors = validationResult(req);
    const error = [];
    if (!errors.isEmpty()) {
        console.log(errors);
        errors.array().forEach(element => {
            error.push(element.msg);
        });
        req.flash('error_msg', error[0]);
        return res.redirect('/supplyer/update/'+id);
    }

    const { sName, sEmail, sPhone, sAddress, sCompany, product } = req.body;

    try {
               
        await db.query('UPDATE suppliers SET name = $1, email = $2, phone = $3, location = $4, company = $5, product_id = $6 WHERE id = $7',
            [sName, sEmail, sPhone, sAddress, sCompany, product, id]);
        req.flash('success_msg', 'Supplyer added successfully.');
        res.redirect('/supplyer');
    } catch (error) {
        console.error('Error adding supplyer:', error.message);
        req.flash('error_msg', 'An error occurred while adding the supplyer.');
        return res.redirect('/supplyer/update/'+id);
    }
    
})
// ================================
//  DELETE SYPPLYER
// ================================

router.get('/delete/:id', authorizeRoles('admin','manager'), async(req,res)=>{
    const id = req.params.id
    try {
        await db.query("Delete from suppliers where id = $1", [id])
        req.flash('success_msg', "successfuly deleter one supplyer")
        res.redirect('/supplyer')
    } catch (error) {
        console.log("delete supplyer request failed ",error.message);
        req.flash('error_msg', "can't delete this supplyer, try again")
        res.redirect('/supplyer')
        
        
    }


})



module.exports = router;