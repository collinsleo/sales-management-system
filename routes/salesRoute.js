const express = require('express');
const router = express.Router();
const db = require('../config/db.js');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const {isAuthenticated, authorizeRoles, is_staff} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const activityLog = require('../middlewares/activitylogs.js');
const {cashierSalesAnalysis} = require('../middlewares/analysis.js')



// =================================
// sales 
// =================================
router.get('/',authorizeRoles('admin', 'cashier','manager'), cashierSalesAnalysis, (req, res) => {
   try{
         db.query('SELECT * FROM sales where status = $1',['completed'], async(err, results) => {
              if (err) {
                console.error('Error fetching sales:', err);
                req.flash('error_msg', 'An error occurred while fetching sales data.');
                return res.redirect('/sales');
              }
              //format date
              results.rows.forEach(sale => {
                sale.created_at = moment(sale.created_at).format('YYYY-MM-DD HH:mm:ss');
              })
              
              res.render('admin/sales.ejs', 
                { 
                    sales: results.rows, cashierAnalysis: 
                    res.locals.cashierSalesAnalysis[0], 
                    pendingSales : res.locals.pendingSales,
                    paymentBreakdown: res.locals.paymentBreakdown, 
                    user: req.user });
         });
   }catch(err){
       console.error(err);
       req.flash('error_msg', 'An error occurred while fetching sales data.');
       return res.redirect('/sales');
   }
});

// =================================
// Add Sale
// =================================
router.post('/', authorizeRoles('admin','cashier'), async(req, res)=>{
    const { customerName, productId, quantity, totalPrice } = req.body;

    // Validate input
    const errors = validationResult(req);
    const error = []
    if (!errors.isEmpty()) {
        req.flash('error_msg', error.array().map(err => error.push(err.msg)));
        return res.redirect('/sales');
    }

    try {
        // Check if product exists
        const product = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (product.length === 0) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/sales');
        }
        // Insert sale into the database
        const salesQuery = await db.query('INSERT INTO sales (customerName, productId, quantity, totalPrice) VALUES (?, ?, ?, ?) returning id', 
            [customerName, productId, quantity, totalPrice]);
                      
        const sales_id = salesQuery.rows[0].id
        await activityLog(`new sales made ID: ${sales_id}`, req)

        req.flash('success_msg', 'Sale added successfully.');
        res.redirect('/sales');
        
    } catch (err) {
        console.error('Error adding sale:', err);
        req.flash('error_msg', 'An error occurred while adding the sale.');
        res.redirect('/sales');
    }
})


// sales item
router.get('/item', authorizeRoles('admin', 'manager','cashier'), async (req, res)=>{
    let id = req.query.salesId
    let salesQuery;
    try{
        if(id && id > 0  && !isNaN(id)){
            //fetch sale and sales items
           
            salesQuery = await db.query(
                'SELECT products.name, products.image, sale_items.* from sale_items join products ON sale_items.product_id = products.id where sale_items.sale_id = $1 order by sale_items.id desc',[id]
            )
        }else{
            salesQuery = await db.query(
                'SELECT products.name, products.image, sale_items.* from sale_items join products ON sale_items.product_id = products.id order by sale_items.id desc, sale_items.sale_id asc',
            )

        }
        const sales = salesQuery.rows;
        if(sales.length === 0){
            req.flash('error_msg', 'No sales found');
            return res.redirect('/sales');
        }

        console.log(sales);
        

        res.render('admin/sales_item.ejs', {sales: sales});

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
})

// receipt
router.get('/receipt', isAuthenticated, async(req,res)=>{
    if(!req.session.lastcart){
        req.flash('error_msg', "no cart found, please add items to cart")
        return res.redirect('/cashier/product');
    }
    
    try{
        // get the last cart sales id
        const sales_id = req.session.lastcart;

        // get last cart from sales and sales_item table
        const lastcart = await db.query(
            "SELECT products.id as product_id, products.name as product_name,sale_items.* from sale_items join products on sale_items.product_id = products.id where sale_items.sale_id = $1",
            [sales_id]
        )
        //get total price 
        const total_amountQuery = await db.query(
            "SELECT total_amount, payment_method, created_at from sales where id = $1", [sales_id]
        )

        sales = total_amountQuery.rows[0]
        sales.created_at = moment(new Date(sales.created_at)).format("Do-MMM-YYYY, h:mm A");
        res.render('admin/receipt.ejs', {userProducts:lastcart.rows, sales: total_amountQuery.rows[0]});
    }catch(error){
        console.error('Error fetching last cart sales id:', error.message);
        req.flash('error_msg', 'Error fetching last cart sales id');
        return res.redirect('/cashier/product');
    }
})
  

router.get('/printreceipt/:id', isAuthenticated, (req,res)=>{
    const id = req.params.id;
    if(req.session.lastcart){
        req.session.lastcart = id; 
    }else{
        req.session.lastcart = id; 
    }
    return res.redirect('/sales/receipt');
})



module.exports = router