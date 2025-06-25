const express = require('express');
const router = express.Router();
const db = require('../config/db')
const {isAuthenticated, authorizeRoles} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware




router.get('/product', authorizeRoles('admin', 'manager', 'cashier'),  async(req,res)=>{
     try {
        const { rows } = await db.query('SELECT * FROM products ORDER BY id DESC');
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

        const productQuery = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        const product = productQuery.rows;
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
            req.session.cart.push({
                productId: product[0].id,
                name: product[0].name,
                image: product[0].image,
                quantity: quantity,
                applyto: applyto,
                price: applyto === 'carton' ? product[0].carton_selling_price : product[0].unit_selling_price,
                promoId: null,
                totalcost: (applyto === 'carton' ? product[0].carton_selling_price : product[0].unit_selling_price) * quantity

            });
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
        const { rows } = await db.query('SELECT * FROM products ORDER BY id DESC');
        const categoryQuery = await db.query('SELECT * FROM categories ORDER BY id DESC');
        res.render('admin/cashierproducthold.ejs', { products: rows, categories: categoryQuery.rows });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error_msg', 'Error fetching products');
        return res.redirect('/cashier/product');
    }
});


module.exports = router