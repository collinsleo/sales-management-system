const express = require('express')
const db = require('../config/db');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authntication');
const {body, validationResult} = require('express-validator')
const router = express.Router()
const activityLog = require('../middlewares/activitylogs.js');



router.get('/', isAuthenticated, async (req, res) => {
    // get products from cart 
    let cart ;
    if(req.session.cart ){
        cart = req.session.cart ;
    }else{
        req.session.cart = []
        cart = req.session.cart;
    }

    if(cart){
        const cartproduct = req.session.cart;
        res.locals.carts = cartproduct;
        let productPriceSum = 0;
        console.log(cartproduct);
        
        if (cartproduct.length > 0){
            cartproduct.forEach(product => {
                productPriceSum += product.totalcost
            });
        }

        res.locals.cartCount = cartproduct.length;
        res.locals.subtotal = productPriceSum ? productPriceSum : 0;
    }
    res.render('carts.ejs')
    
})


router.get('/clear', isAuthenticated, (req, res) => {
    // Clear the cart
    if (req.session.cart && req.session.cart.length > 0) {
        req.session.cart = [];
        req.flash('success_msg', 'Cart cleared successfully');
    } else {
        req.flash('error_msg', 'you have an empty cart already');
    }
    res.redirect('/cart');
})

router.get('/clear/:cart_id', isAuthenticated, (req,res)=>{
    const cart_id = req.params.cart_id;

    if(req.session.cart){
        req.session.cart = req.session.cart.filter((item)=>{
            //remove one item
            
            item.id == cart_id
        })
        res.redirect('/cart')
    }

})

router.get('/hide', isAuthenticated, (req,res)=>{
    let cart = req.session.cart;
    const items = JSON.stringify(cart)
    const user_id = req.user.id
    const user_role = req.user.role
    try{
        // if(user_id < 1 || user_role !== 'cashier'){
        if(user_id < 1){
            req.flash('error_msg', "user is invalid", err.message)
            return res.redirect('/cart')

        }else{
            db.query(
                'INSERT INTO hold_carts (user_id, user_role,cart_products) values($1, $2, $3)',
                [user_id, user_role, items],
                (err, result)=>{
                    if(err){
                        req.flash('error_msg', "something went wrong on holding the cart", err.message)
                        return res.redirect('/cart')
                    }

                    req.session.cart = [];
                    req.flash("success_msg", "new cart added on hold")
                    return res.redirect('/cart')
                }
            )

        }

    }catch(err){
        console.error("failure holding cart: ", err.message)
        req.flash('error_msg', "something went wrong on holding the cart")
        return res.redirect('/cart')
    }
    
})

router.post('/checkout', isAuthenticated, [body('payment').notEmpty().withMessage("no payment method choosed")], isAuthenticated, (req,res)=>{
    const errors = validationResult(req)
    const error = []
    if(!errors.isEmpty()){
        errors.array().forEach(err => {
            error.push(err.msg)
        });
        req.flash('error_msg', error[0])
        return res.redirect('/cart')            
    }

    const cartLength = req.session.cart.length
    const {payment} = req.body
    if(cartLength <= 0 ){
        req.flash('error_msg', "can't  proceed to checkout no item found")
        return res.redirect('/cart')
    }
    
    if(payment === "cash" || payment === "pos"|| payment === "transfer" ){
        req.flash('success_message', "please confirm the payment")
        return res.redirect('/cart/confirm?payment='+payment)
    }

    if(payment == "paystarck"){
        console.log("integrade a paystarck account");
        
    }
    if(payment == "stripe"){
        console.log("integrade a stripe account");
        
    }    
    
})

router.get('/confirm', authorizeRoles('admin', 'manager', 'cashier'), (req,res)=>{
    const {payment}=req.query
   

    res.render('admin/confirmPayment.ejs', {paymentMethod : payment})
})

router.post('/confirm', authorizeRoles('admin', 'manager', 'cashier'), async(req,res)=>{
    const {payment}=req.query
    const{total_amount, payment_method, amount_received, note}= req.body
    const change = amount_received - total_amount;
    let {customer_type, customer_name} = ['',''];
    const user_id = req.user.id
    const user_role = req.user.role

    if(req.user.role == "user"){
        customer_name = req.user.name;
        customer_type = "online"
    }else{
        customer_name = 'walk-in customer';
        customer_type = "walk-in"
    }
    
    if(Number(total_amount) > Number(amount_received)){

        req.flash('error_msg', "insufficient fund, amount received is less than the goods total amount")
        return res.redirect('/cart/confirm?payment='+payment_method)

    }else if(change < 0){
        req.flash('error_msg', "something went wrong, change given is less than zero")
        return res.redirect('/cart/confirm?payment='+payment_method)
    
    }else{
        //insert to sales table
        const salesquery = await db.query(
            'INSERT INTO sales (user_id, user_role, total_amount, payment_method, paid_amount, change_given, customer_type, customer_name, note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
            [user_id, user_role, total_amount, payment_method, amount_received, change,customer_type,customer_name, note], 
        )
        if(salesquery.err){
            console.error("Error inserting into sales table: ", salesquery.err.message);
            req.flash('error_msg', "something went wrong on inserting the sales data")
            return res.redirect('/cart/confirm?payment='+payment_method)
        }
        // geting back the sales id
        const sales_id = salesquery.rows[0].id;

        //loop through cart to recalculate stock quantity and insert to sales_products table
        const cartProduct = req.session.cart;
        
        cartProduct.forEach( async product => {
            const {productId, quantity, price, applyto} = product;


            //insert to sales_products table
            db.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity, selling_price) VALUES ($1, $2, $3, $4)',
                [sales_id, productId, quantity, price],
                (err,result)=>{
                    if(err){
                        console.error("Error inserting into sales_products: ", err.message);
                        req.flash('error_msg', "something went wrong on inserting the products to sales_products")
                        return res.redirect('/cart/confirm?payment='+payment_method)
                    }
                }
            )

            // Recalculate stock quantity based on the product type (carton or unit)
            //getting product details from product table
            await db.query("SELECT * FROM products WHERE id = $1",[productId],(err, result)=>{
                if(err){
                    console.error("Error fetching product details: ", err.message);
                    req.flash('error_msg', "something went wrong on fetching the product details")
                    return res.redirect('/cart/confirm?payment='+payment_method)
                }

                if(result.rows.length === 0){
                    req.flash('error_msg', "product not found")
                    return res.redirect('/cart/confirm?payment='+payment_method)
                }

                const productDetails = result.rows[0];
                const unit_per_carton = productDetails.unit_per_carton;
                const product_quantity = productDetails.quantity;
                let new_quantity = product_quantity;
                
                
                // Update stock quantity based on applyto type
                if(applyto === 'carton'){
                    new_quantity = Number(product_quantity - (quantity * unit_per_carton));
                    
                }else if(applyto === 'unit'){
                    new_quantity = Number(product_quantity - quantity) ;
                }

                // Update the product stock quantity in the database
                
                db.query(
                    'UPDATE products SET quantity = $1 WHERE id = $2',
                    [new_quantity, productId],
                    async (err, result) => {
                        if(err){
                            console.error("Error updating product stock quantity: ", err.message);
                            req.flash('error_msg', "something went wrong on updating the product stock quantity")
                            return res.redirect('/cart/confirm?payment='+payment_method)
                        }

                    }
                )
                

            })
           
           
        })
        
        
        await activityLog(`new sale made with sale_id: ${sales_id}`, req);

        req.session.cart = [];
        //geting last cart sales id for receipt 
        req.session.lastcart = sales_id;

        req.flash('success_msg', "payment confirmed successfully, thank you for your purchase")
        return res.redirect('/sales/receipt')
    }

})

module.exports = router