const express = require('express');
const router = express.Router();
const db = require('../config/db');
const {notifications, newPromoNotiication} = require('../middlewares/notification.js');
const validatePromo = require('../middlewares/validatePromo.js')
const {validationResult} = require('express-validator')
const {isAuthenticated, authorizeRoles, is_staff} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const moment = require('moment');
const activityLog = require('../middlewares/activitylogs.js');
// const moment = require('m')

router.get('/', authorizeRoles('admin', 'manager', 'staff', 'cashier') , async(req, res)=>{
    
    let product_id = req.query.product_id;
    let sql
    if(!product_id || isNaN(product_id) || product_id <= 0){

        sql = 'SELECT products.id as product_id,products.name, products.image, product_promos.* FROM product_promos join products ON product_promos.product_id = products.id order by product_promos.id desc';
    }else{
        sql = `SELECT products.id as product_id,products.name, products.image, product_promos.* FROM product_promos join products ON product_promos.product_id = products.id WHERE product_promos.id = ${product_id} order by product_promos.id desc`;
    }

    await db.query(sql, (err, results) => {
        if (err) {
        console.error('Error fetching promotions:', err.message);
        req.flash('error', 'Failed to fetch promotions');
        return res.redirect('/promo');
        } 
        results.rows.forEach(element => {
            // start_at = new Date(element.start_at).toLocalString
            element.start_at = moment(new Date(element.start_at)).format("Do-MMMM-YYYY, h:mm A")
            element.end_at = moment(new Date(element.end_at)).format("Do-MMMM-YYYY, h:mm A")
            
        });       
        res.render('admin/promo.ejs', {promoProducts:results.rows, product_id} )
    });
})

router.post('/', authorizeRoles('admin', 'manager'), validatePromo, async(req,res)=>{
    const { product_id, discount_type, applied_to, discount, start_at, end_at } = req.body;
    const error = validationResult(req)
    const errors = []
    if(!error.isEmpty()){
        error.array().forEach(element => {
            errors.push(element.msg)  
        });
        req.flash('error_msg', errors[0])
        return res.redirect('/promo?product_id='+product_id )
    }

    const is_product_existing =  await db.query('SELECT * FROM products WHERE id = $1', [product_id])
    if (is_product_existing.rows.length === 0){
        req.flash('error_msg', 'can\'t find the product' )
        return res.redirect('/promo?product_id='+product_id)
    }
    // Check if the product already has an active promo
    const is_existing =  await db.query('SELECT * FROM product_promos WHERE product_id = $1', [product_id])
    
    if (is_existing.rows.length > 0 && is_existing.rows[0].end_at > new Date()) {   
        // If a promo exists and is still active, do not allow adding a new one     
        req.flash('error_msg', 'this product already has an active promo' )
        return res.redirect('/promo?product_id='+product_id)
    }
    // Insert the new promotion into the database
    const sql = 'INSERT INTO product_promos (product_id, applies_to, discount_type, discount_value, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id ';
    await db.query(sql, [product_id, applied_to, discount_type, discount, start_at, end_at], async (err) => {
        if (err) {
            console.error('Error inserting promotion:', err);
            req.flash('error', 'Failed to add promotion');
            return res.redirect('/promo?product_id=' + product_id);
        }
        // Send notification after successful insertion
        const msg = `A new promotion has been added for product ID ${product_id}. Discount Type: ${discount_type}, Applied To: ${applied_to}, Discount Value: ${discount}, Start At: ${start_at}, End At: ${end_at}`;
        await activityLog(`new promo added with product id ${product_id}`, req)
        await newPromoNotiication(product_id, msg);

        req.flash('success_msg', 'Promotion added successfully');
        res.redirect('/promo?product_id=' + product_id);
    });

})

router.get('/update/:id', authorizeRoles('admin','manager'), async(req, res)=>{
    let product_id = req.params.id

    try{
        const promoProduct = await db.query(
            "SELECT * FROM product_promos WHERE id = $1", [product_id]
        )
        console.log(promoProduct.rows[0].start_at);
        
        res.render('admin/update_promo.ejs',{promoProduct:promoProduct.rows[0]})

    }catch(err){
        console.error('Error fetching promotions for update:', err.message);
        req.flash('error', 'Failed to fetch promotions');
        return res.redirect('/promo');
    }

})


router.post('/update/:id', authorizeRoles('admin','manager'), validatePromo, async(req,res)=>{
    const id = req.params.id;
    const {product_id, discount_type, applied_to, discount, start_at, end_at } = req.body;
    const error = validationResult(req)
    const errors = []
    if(!error.isEmpty()){
        error.array().forEach(element => {
            errors.push(element.msg)  
        });
        req.flash('error_msg', errors[0])
        return res.redirect('/promo/update'+product_id )
    }

    try{
        const is_product_existing =  await db.query('SELECT * FROM products WHERE id = $1', [product_id])
        if (is_product_existing.rows.length === 0){
            req.flash('error_msg', 'can\'t find the product' )
            return res.redirect('/promo/update/'+product_id)
        }
        // Check if the product already has an active promo
        const is_existing =  await db.query('SELECT * FROM product_promos WHERE product_id = $1', [product_id])
        
        if (is_existing.rows.length > 0 && is_existing.rows[0].end_at > new Date()) {         
        
            // update the new promotion into the database
            const sql = 'UPDATE product_promos SET  applies_to = $1, discount_type = $2, discount_value = $3, start_at = $4, end_at = $5 WHERE id = $6 VALUES ($1, $2, $3, $4, $5, $6)';
            await db.query(sql, [applied_to, discount_type, discount, start_at, end_at, id])
            
            // Send activity log after successful update

            await activityLog(`promo updated with id ${id}`, req)

            req.flash('success_msg', 'Promotion added successfully');
            return res.redirect('/promo?product_id=' + product_id);
        }else{
            req.flash('error_msg', 'product not currently on promo');
            return res.redirect('/promo?product_id=' + product_id);

        }
    }catch(err){
        console.error("failed to update promo "+ err.message)
        req.flash("error_msg", "something went wrong, try again later")
        return res.redirect('/promo?product_id=' + product_id);
    }
})


router.post('/delete', authorizeRoles('admin','manager'), async(req, res)=>{
    const promo_id = req.query.promo_id;
    if (!promo_id || isNaN(promo_id)) {
        req.flash('error_msg', 'Invalid request');
        return res.redirect('/promo');
    }
    // Delete the promotion from the database
    const sql = 'DELETE FROM product_promos WHERE id = $1';
    await db.query(sql, [promo_id], async (err) => {
        if (err) {
            console.error('Error deleting promotion:', err);
            req.flash('error', 'Failed to delete promotion');
            return res.redirect('/promo');
        }

        await activityLog(`new promo added with id ${promo_id}`, req)

        req.flash('success_msg', 'Promotion deleted successfully');
        res.redirect('/promo');
    });
})


module.exports = router;