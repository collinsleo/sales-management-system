const express = require('express');
const router = express.Router();
const db = require('../config/db')
const {isAuthenticated, authorizeRoles} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const { json } = require('body-parser');




router.get('/product', authorizeRoles( 'cashier', 'admin', 'manager'),  async(req,res)=>{
     try {
        const { rows } = await db.query('SELECT * FROM products where status = $1 ORDER BY id DESC', ['active']);
        const categoryQuery = await db.query('SELECT * FROM categories ORDER BY id DESC');
        res.render('admin/cashierproducts.ejs', { products: rows, categories: categoryQuery.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/cashier/product');
    }
})

// add to cart
router.post('/product/addtocart', authorizeRoles('admin', 'manager', 'cashier'),  async (req, res) => {
    const { productId, quantity, applyto  } = req.body;
    try{
        if(!req.session.cart){
            req.session.cart = [];
        }

        const promoQuery = await db.query('SELECT * FROM product_promos WHERE id = $1 and applies_to = $2 and status = $3 and current_date between start_at and end_at', [productId, applyto, true]);
        const promo = promoQuery.rows;

        const productQuery = await db.query('SELECT * FROM products WHERE id = $1 ', [productId]);
        const product = productQuery.rows;
        console.log(product);
        
        
        //cheacking product qauantitty is avalable and giving error base on the usertype
       if(product.length <= 0){
           req.flash('error_msg', `can't find the product`)
           return res.redirect('/cashier/product')
       }else if(applyto == 'unit' && product[0].quantity < quantity){
            req.flash('error_msg', `${product[0].name} has only ${product[0].quantity} left`)
            return res.redirect('/cashier/product')
        }
        if(applyto == 'carton' && product[0].quantity < (product[0].unit_per_carton * quantity)){
            req.flash('error_msg', `${product[0].name} has only ${product[0].quantity} left`)
            return res.redirect('/cashier/product')
        }

        
        if ( promo.length > 0){
            const discountType = product[0].discount_type
            const discount = product[0].discount_value;

            if(discountType === 'percentage'){
                if(applyto === 'carton'){
                    const carton_price = product[0].carton_selling_price;
                    const new_carton_price = carton_price - (carton_price * (discount / 100));
                    // Update the product price in the database or session as needed
                    product[0].carton_selling_price = new_carton_price;
                }
                if(applyto === 'unit'){
                    const unit_price = product[0].unit_selling_price;
                    const new_unit_price = piece_price - (piece_price * (discount / 100));
                    // Update the product price in the database or session as needed
                    product[0].unit_selling_price = new_unit_price;
                }

            }
            // if discount type is fiat
            if(discountType === 'fiat'){
                if(applyto === 'carton'){
                    const carton_price = product[0].carton_selling_price;
                    const new_carton_price = carton_price - discount;
                    // Update the product price in the database or session as needed
                    product[0].carton_selling_price = new_carton_price;
                }
                if(applyto === 'unit'){
                    const unit_price = product[0].unit_selling_price;
                    const new_unit_price = unit_price - discount;
                    // Update the product price in the database or session as needed
                    product[0].unit_selling_price = new_unit_price;
                }
            }

            req.session.cart.push({
                productId: product[0].id,
                name: product[0].name,
                image: product[0].image,
                quantity: quantity,
                applyto: applyto,
                price: applyto === 'carton' ? product[0].carton_selling_price : product[0].unit_selling_price,
                promoId: promo[0].id,
                totalcost : (applyto === 'carton' ? new_carton_price : new_unit_price) * quantity
            });
            req.flash('success_msg', 'Product added to cart with promo applied');
            return res.redirect('/cashier/product');
    
        }else{
            // If no promo, just add the product to the cart
            let id = Number (req.session.cart.length + 1)
            req.session.cart.push({
                id: id,
                productId: product[0].id,
                name: product[0].name,
                image: product[0].image,
                quantity: quantity,
                applyto: applyto,
                cost: applyto === 'carton' ? product[0].carton_cost_price : product[0].unit_cost_price,
                price: applyto === 'carton' ? product[0].carton_selling_price : product[0].unit_selling_price,
                promoId: null,
                totalcost: (applyto === 'carton' ? product[0].carton_selling_price : product[0].unit_selling_price) * quantity

            });
            // console.log(req.session.cart);
            req.flash('success_msg', 'Product added to cart');
            return res.redirect('/cashier/product');
        }

   
    } catch (error) {
        console.error('Error adding product to cart:', error);
        req.flash('error_msg', 'Error adding product to cart');
        return res.redirect('/cashier/product');
    }
   
});


router.get('/product/hold', authorizeRoles('admin', 'manager', 'cashier'),  async(req,res)=>{
     try {
         const holdQuery= await db.query('SELECT * FROM hold_carts ORDER BY id DESC');
        //  const holdQuery= await db.query('SELECT * FROM hold_carts where user_id = $1 ORDER BY id DESC',[req.user.id]);
         const productholds = (holdQuery.rows);
         
         
        const categoryQuery = await db.query('SELECT * FROM categories ORDER BY id DESC');
        res.render('admin/cashierproducthold.ejs', { categories: categoryQuery.rows, productholds });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/cashier/product');
    }
});


router.get('/product/readdtocart', authorizeRoles('admin', 'manager', 'cashier'),  async (req, res) => {
    try{
        const id = req.query.id;
        const holdQuery= await db.query('SELECT * FROM hold_carts where id = $1',[id]);
        const productholds = (holdQuery.rows);
        
        // console.log('session',req.session.cart);
        req.session.cart = [];
        const prodhold = JSON.parse(productholds[0].cart_products)
        console.log(prodhold);
        prodhold.forEach(element => {
            req.session.cart.push(element)
        });

        console.log('session',req.session.cart);
        
        req.flash('success_msg', 'continue your shopping');
        // return res.redirect('/cashier/product');
        return res.redirect('/cart');
        

    } catch (error) {
        console.error('Error problem on re-addCart :', error.message);
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/cashier/product');
    }
})



module.exports = router