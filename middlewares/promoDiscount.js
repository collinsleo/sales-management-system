const db = require('../config/db.js');

const promoDiscount = async (productId) => {
    try{
        const checkpromo = await db.query('select * from promos where product_id = $1, status= $2', 
            [productId, true]
        );
        if(checkpromo.rows.length > 0){
            const promo = checkpromo.rows[0];
            const discountType = promo.discount_type;
            const discount = promo.discount;
            const productPrice = promo.product_price;
            const discountedPrice = productPrice - (productPrice * (discount / 100));
            return {
                discount,
                discountedPrice
            };
        }
        const now = new Date();

    }catch (error) {
        console.error('Error fetching promo discount:', error);
        throw new Error('Failed to fetch promo discount');
    }

}