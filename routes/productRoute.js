const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer.js')
const validateProduct = require('../middlewares/validateProduct.js');
const validateCategory = require('../middlewares/validatecategory.js');
const validatePurchase = require('../middlewares/validatePurchase.js')
const activityLog = require('../middlewares/activitylogs.js')
const db = require('../config/db.js');
const {check , validationResult, query } = require('express-validator');
const {notifications, productRestockNotification} = require('../middlewares/notification.js');
const {isAuthenticated, authorizeRoles, is_staff} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const {tableCountAnalysis} = require('../middlewares/analysis.js')
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');


// show product page
router.get('/', authorizeRoles('admin','manager','staff'), tableCountAnalysis,  async (req, res)=>{
    try {
        let productAnalysis = res.locals.tableCount;
        let product;
        if(req.user.role == "admin" || req.user.role == "manager"){
            product = await db.query('SELECT * FROM products ORDER BY id DESC');
        }else{
            product = await db.query('SELECT * FROM products WHERE status = $1 ORDER BY id DESC',['active']);
        }

        const categoryQuery = await db.query('SELECT * FROM categories ORDER BY id DESC');
        res.render('admin/products.ejs', { products: product.rows, categories: categoryQuery.rows, productAnalysis });
    } catch (error) {
        console.error('Error fetching products:', error);
        
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/product');
    }
})



// ====================================
// product registration
// ====================================

//multerErrorHandling
function multerErrorHadling(req, res, next) {
    upload.single('pImage')(req, res, (err)=>{
        if(err){
            req.flash("error_msg", err.message)
            return res.redirect('/product')
        }else if(!req.file){
            req.flash('error_msg', "no file found")
            return res.redirect('/product')   
        }
        next();
    });  
}

function barcodeGenerator(req, res, next) {
    const num = Math.floor(Math.random() * 1000000000); // Generate a random number
    const barcode = num.toString().padStart(10, '0'); // Pad with leading zeros to ensure 10 digits
    // next();
    return barcode;
}

router.post('/add', 
    authorizeRoles('admin','manager','staff'),
    multerErrorHadling , 
    validateProduct ,  
    async (req, res)=>{
// validateProduct
    try {
        const errors = validationResult(req);
        const error = []
        if(!errors.isEmpty()){
            errors.array().forEach(element => {
                
                error.push(element.msg)                
            });
            req.flash('error_msg', error[0])
            return res.redirect('/product');
        }else{
            // console.log(req.body,);
            
            // If there are no validation errors, proceed with product registration
            // Extract product details from the request body and convert to lowercase
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = req.body[key].toLowerCase();
                }
            });

            const { pName, cartonCostPrice, cartonSellingPrice, unitPerCarton, unitCostPrice, unitSellingPrice, treshold, quantity,  category} = req.body;
            const image = req.file ? req.file.filename : null;
            // Generate barcode
            const barcode = barcodeGenerator(req, res);

            // console.log(req.body, image, barcode);


            // check if product exits
            const checkproduct = await db.query(
                'SELECT * FROM products WHERE name = $1 or barcode = $2',[pName, barcode]   
            )
            if(checkproduct.rows.length > 0){
                req.flash('error_msg', 'Product already exists, try again');
                return res.redirect('/product');
            }else{

                // Insert product into the database
                const query = await db.query(
                    'INSERT INTO products (name, barcode, carton_cost_price, carton_selling_price, unit_per_carton, unit_cost_price, unit_selling_price, threshold, quantity, image, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
                    [pName, barcode, cartonCostPrice, cartonSellingPrice, unitPerCarton, unitCostPrice, unitSellingPrice, treshold, quantity, image, category]
                )

                const id = await query.rows[0].id;

                await activityLog(`new product added product name:${pName} with barcode: ${barcode}`, req)
                await notifications(id, "new product alert", `New Product Added with id: ${id} name: ${pName} and  barcode: ${barcode}`, 'product alert', 'products');
                req.flash('success_msg', 'Product added successfully');
                return res.redirect('/product');
            }
        }

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
})


// ====================================
// product edit page
// ====================================
// show update paage

router.get('/update/:productId', authorizeRoles('admin', 'manager', 'staff'), async (req, res)=>{
    const productId = req.params.productId
    try {
        const products = await db.query('SELECT * FROM products WHERE id = $1 ORDER BY id DESC', [productId]);
        const categoryQuery = await db.query('SELECT * FROM categories ORDER BY id DESC');
        res.render('admin/update_product.ejs', { product: products.rows[0], categories: categoryQuery.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/product');
    }
})
// update product
router.post('/update/:productId', authorizeRoles('admin', 'manager', 'staff'), validateProduct, async(req,res)=>{
    const {productId} =  req.params
    const { pName, cartonCostPrice, cartonSellingPrice, unitPerCarton, unitCostPrice, unitSellingPrice, treshold, quantity, barcode , category} = req.body;
    const errors = validationResult(req);
    let error = []
    if(!errors.isEmpty()){
        errors.array().forEach((err)=>{
            error.push(err.msg)
        })
        console.log(error);
        req.flash=("error_msg", error[0])
        return res.redirect('/product/update/'+productId)
    }
    const checkproduct = await db.query(
        'SELECT * FROM products WHERE id = $1 and barcode = $2',[productId, barcode]   
    )
    if(checkproduct.rows.length < 1){
        req.flash('error_msg', 'no product found');
        return res.redirect('/product/update/'+productId);
    }else{

        // Insert product into the database
        const query = await db.query(
            'Update  products set name = $1, carton_cost_price = $2, carton_selling_price = $3, unit_per_carton = $4, unit_cost_price = $5, unit_selling_price = $6, threshold = $7, quantity = $8, category_id = $9 WHERE id = $10',
            [pName, cartonCostPrice, cartonSellingPrice, unitPerCarton, unitCostPrice, unitSellingPrice, treshold, quantity, category, productId]
        )
        await activityLog(`product name:${pName} with barcode: ${barcode} was updated`, req)
        req.flash('success_msg', 'Product updated successfully');
        return res.redirect('/product');
    }
})

//update product image 
router.post('/updateimage/:productId', authorizeRoles('admin', 'manager', 'staff'), multerErrorHadling, async(req, res)=>{
    const productId = req.params.productId
    const { barcode} = req.body
    const image = req.file ? req.file.filename : null;

     const checkproduct = await db.query(
        'SELECT * FROM products WHERE id = $1 and barcode = $2',[productId, barcode]   
    )
    if(checkproduct.rows.length < 1){
        req.flash('error_msg', 'no product found');
        return res.redirect('/product/update/'+productId);
    }else{
        const pName = checkproduct.rows[0].name

        // Insert product into the database
        const query = await db.query(
            'Update  products set image = $1  where id = $2',
            [image, productId]
        )
        await activityLog(`product image update, product name: ${pName} with barcode: ${barcode}`, req)
        req.flash('success_msg', 'Product image successfully changed');
        return res.redirect('/product');
    }

})

// ====================================
// product delete page
// ====================================

router.post('/delete/:id', authorizeRoles('admin', 'manager'), async (req, res)=>{
    try {
        const { id } = req.params;
        const query = await db.query('update products set status =$1 WHERE id = $2', ['inactive', id]);

        await activityLog(`product with id: ${id} was deleted`, req)
        req.flash('success_msg', 'Product deleted successfully');
        return res.redirect('/product');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error_msg', 'Error deleting product');
        return res.redirect('/product');
    }
})


router.get('/resolve/:id', authorizeRoles('admin', 'manager'), async (req, res)=>{
    try {
        const { id } = req.params;
        const query = await db.query('update products set status =$1 WHERE id = $2', ['active', id]);


        await activityLog(`product with id: ${id} has been resolved`, req)
        req.flash('success_msg', 'Product resolved successfully');
        return res.redirect('/product');
    } catch (error) {
        console.error('Error resolving  product:', error);
        req.flash('error_msg', 'Error resolving product ');
        return res.redirect('/product');
    }
})



router.get('/purchase',  authorizeRoles('admin', 'manager'), async (req, res)=>{
    let id = req.query.id;
    
    try {

        let productsQuery = [];
        let products = [];

        if(!id || isNaN(id)) {
            products = {
                    id: 0,
                    name: 'All Products',
                    barcode: '',
                    carton_cost_price: 0,
                    carton_selling_price: 0,
                    unit_per_carton: 0,
                    unit_cost_price: 0,
                    unit_selling_price: 0,
                    threshold: 0,
                    quantity: 0,
                    image: '',
                    category_id: null
                }
            
            // fetching purchase table and product name and image
            purchases = await db.query(
                "SELECT p.*, pr.name AS product_name, pr.image AS product_image FROM purchases p JOIN products pr ON p.product_id = pr.id ORDER BY p.id DESC"
            )

          
          
        }else if(id && !isNaN(id)){
            productsQuery = await db.query('SELECT * FROM products WHERE id = $1',[id]);
            products = productsQuery.rows[0];
            

            if (productsQuery.rows.length === 0) {
                req.flash('error_msg', 'No products found.');
                return res.redirect('/product');
            }

            purchases = await db.query(
                "SELECT p.*, pr.name AS product_name, pr.image AS product_image FROM purchases p JOIN products pr ON p.product_id = pr.id WHERE p.product_id = $1 ORDER BY p.id DESC",[id]
            )
            
        }

        const { rows: suppliers } = await db.query('SELECT * FROM suppliers ORDER BY id DESC');
        // Fetch products for the purchase page
        
        res.render('admin/purchase.ejs', { product: products, suppliers, purchases : purchases.rows });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
})


// ====================================
// purchase product
// ====================================

//notifications



router.post('/purchase', authorizeRoles('admin', 'manager'), validatePurchase, async (req, res)=>{
    const { product_id, supplyer_id, carton, unit_per_carton, unit_cost_price} = req.body;
    const quantity_purchased = carton * unit_per_carton; // Calculate total quantity based on carton and unit per carton
    
    const errors = validationResult(req);
    const error = []
    if(!errors.isEmpty()){
        errors.array().forEach(element => {
            
            error.push(element.msg)                
        });
        req.flash('error_msg', error[0])
        return res.redirect('/product/purchase');
    }

    try {
        // Validate input
        const errors = validationResult(req);
        const error = []
        if (!errors.isEmpty()) {
            req.flash('error_msg', error.array().map(err => error.push(err.msg)));
            return res.redirect('/product/purchase?id='+product_id);
        }


        // Check if product exists
        const product = await db.query('SELECT * FROM products WHERE id = $1', [product_id]);
        if (product.rows.length === 0) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/product/purchase?id='+product_id);
        }else{
            if(unit_cost_price > product.rows[0].unit_cost_price){
                //notify for price increase
                const message = `The cost price of ${product.rows[0].name} has increased from ${product.rows[0].unit_cost_price} to ${unit_cost_price}. Please review the new price.`;
                await notifications(product_id, 'Price Increase', message, 'price change','products');      
            }
            if( unit_cost_price < product.rows[0].unit_cost_price){
               //notify for price decrease
                const message = `The cost price of ${product.rows[0].name} has decreased from ${product.rows[0].unit_cost_price} to ${unit_cost_price}. Please review the new price.`;
                await notifications(product_id, 'Price Decrease', message, 'price change', 'products');
            }

                        
            // insert purchase into the database
            // const supplyer_id = supplyer_id || null; // Handle case where supplier ID is not provided
            

            await db.query(
                'INSERT INTO purchases (product_id, supplier_id, cartons, units_per_carton, unit_cost) VALUES ($1, $2, $3, $4, $5)',
                [product_id, supplyer_id, carton, unit_per_carton, unit_cost_price]
            );
            // add quantity to product
            const newQuantity = product.rows[0].quantity + quantity_purchased;
            await db.query('UPDATE products SET quantity = $1 WHERE id = $2', [newQuantity, product_id]);
        
            await activityLog(`new product purchase made on produt id ${product_id}, please confirm`, req)
            await productRestockNotification(product_id)
            req.flash('success_msg', 'Purchase added successfully.');
            res.redirect('/product/purchase?id='+product_id);
        }

    } catch (err) {
        console.error('Error adding purchase:', err);
        req.flash('error_msg', 'An error occurred while adding the purchase.');
        res.redirect('/product/purchase?id='+product_id);
    }
})

router.get('/reversal',  authorizeRoles('admin', 'manager'), async(req,res)=>{
    const id = req.query.id;
    if(!id || isNaN(id)){
        req.flash('error_msg', "invalid id, try again")
        return res.redirect('/product/purchase')
    }
    try{
        const purchase = await db.query(
            "SELECT * FROM purchases WHERE id = $1",[id]
        )
        if(purchase.rows.length <= 0){
            req.flash('error_msg', "invalid id, try again")
            return res.redirect('/product/purchase')
        }
        
        
        res.render('admin/reversal.ejs', {purchase: purchase.rows[0]})

    }catch(err){
        console.error("failed to fech reversal page ", err.message)
        req.flash('error_msg', "something went wrong, please try again")
        return res.redirect('/product/purchase')
    }
})



router.post('/reversal',  authorizeRoles('admin', 'manager'), async (req, res)=>{
    const id = req.query.id;
    if(!id || isNaN(id)){
        req.flash('error_msg', "invalid id, try again")
        return res.redirect('/product/purchase')
    }

    const { product_id, carton, unit_per_carton, reason} = req.body;
    const quantity_purchased = carton * unit_per_carton; // Calculate total quantity based on carton and unit per carton
    
    const errors = validationResult(req);
    const error = []
    if(!errors.isEmpty()){
        errors.array().forEach(element => {
            
            error.push(element.msg)                
        });
        req.flash('error_msg', error[0])
        return res.redirect('/product/purchase');
    }

    try {
       
        // Check if product exists
        const purchase = await db.query('SELECT products.quantity as product_quantity, products.id as product_id, purchases.* FROM purchases JOIN products ON purchases.product_id = products.id WHERE purchases.id = $1', [id]);
        if (purchase.rows.length === 0) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/product/purchase?id='+product_id);
        }else{
            const {supplier_id,product_quantity, unit_cost} = purchase.rows[0];
            
            await db.query(
                'INSERT INTO purchases (product_id, supplier_id, cartons, units_per_carton, unit_cost, note, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [product_id, supplier_id, carton, unit_per_carton, unit_cost, reason, "reverse"]
            );
            // add quantity to product
            const newQuantity = product_quantity - quantity_purchased;
            await db.query('UPDATE products SET quantity = $1 WHERE id = $2', [newQuantity, product_id]);
            
            await activityLog(`reversal made on produt with id ${product_id}, please confirm`, req)
            await productRestockNotification(product_id,action = 'reversal' );

                    
            // Build the absolute path to your template
            const templatePath = path.join(__dirname, './views/emails/reversal.html');
            const template = fs.readFileSync(templatePath, 'utf-8');

            // Render the template with variables
            const html = ejs.render(template, {
                username: "Admin / Manager",
                login_link: 'http://localhost:3000/auth/admin'
            });
            // getting all admin and manager emails
            const getAdmin = await db.query('SELECT email from admins where is_active = $1 and  role = $2 or role = $3 ',[true, 'admin', 'manager'])
            adminEmails = [];
            getAdmin.rows.forEach((item)=>{
              adminEmails.push(item.email)
            })
            const adminEmails = adminEmails.join(', '); // "user1@example.com, user2@example.com"

            const mail_sent = await sendEMail ({
                to: adminEmails,
                // to: "collinsebuleo@gmail.com",
                subject: 'Password reset successfully done!',
                html: html
            });
            
            if(mail_sent == true){
                req.flash('success_msg', "successfully changed check your email to login")
            }
                   

            req.flash('success_msg', 'Purchase added successfully.');
            res.redirect('/product/purchase?id='+product_id);
        }
        

    } catch (err) {
        console.error('Error on product reversal:', err);
        req.flash('error_msg', 'An error occurred while adding a product reversal.');
        res.redirect('/product/purchase?id='+product_id);
    }
})


module.exports = router;