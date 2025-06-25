const { Result } = require('pg');
const db = require('../config/db.js');

const notifications = async (row_id, title, message, type, table='products') => {
    // product id : the is of the product
    //title: the short explain of action
    // message: the detailed message of the action
    // type: action
    try {
        await db.query(
            'INSERT INTO notifications (row_id, title, message, type, table_name) VALUES ($1, $2, $3, $4, $5)',
            [row_id, title, message, type, table]
        )
        
    } catch (error) {
        console.error('Error sending notification:', error);  
    }

}

//new order/sales notification
async function newSalesNotification(product_id, sales_id) {
  const type = 'new_sales';
  const title = 'New Sales Alert';
  const message= `A new sales has been made for product ID: ${product_id} with Sales ID: ${sales_id}.`;

  await notifications(product_id, title, message, type)

}

// product restock and reversal notification
async function productRestockNotification( product_id, action='purchase') {
  if(action === "reversal"){
    const type = 'reversal';
    const title = 'Purchase Reversal Alert';
    const message = `A purchase order with ID: ${purchase_id} has been reversed.`;
    // send notification
    await notifications(purchase_id, title, message, type)

  }else{
    const type = 'purchase';
    const title = 'New purchase Alert';
    const message= `A new purchase has been made for product ID: ${product_id}, please verify now.`;

    await notifications(product_id, title, message, type)
  }
}

//expence dues
async function expenceNotification(expence_id, message="") {
  const type = 'expenses';
  const title = 'expence alert';
  if(message == ""){
     message = `new expence has been added with ID: ${expence_id}.`;
  }

  await notifications(expence_id, title, message, type)
}



//user acount update dues
async function accountModifyNotification( user_id, action, table_name) {
  let { type, title, message} = "";
  if(action === 'delete'){
    type = 'account_detete';
    title = 'Account Delete Alert';
    message = `User account with ID: ${user_id} has been deleted.`;
  }else{
     type = 'account_update';
     title = 'Account Update Alert';
     message = `User account with ID: ${user_id} has been updated, please confirm the new details`;
  }
  
  // send notification
  await notifications(user_id, title, message, type, table_name)
}

//read notification
async function readNotification(id, db,res,res) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = $1 WHERE id = $1',[id], (err,result)=>{
        if(err){
          console.error("failed to read notification", error.message); 
        }
        res.redirect('/notification')  
      }
    ) 
  } catch (error) {
    console.error("failed to read notification", error.message); 
  }
  
}

//new promo notification
async function newPromoNotiication( promo_id, message = "") {
  const type = 'promo';
  const title = 'new Promo alert';
  if(message = ""){
    message = `new promo has been added with ID: ${promo_id}.`;
  }
  await notifications(promo_id, title, message, type, 'product_promos')
}







module.exports = {notifications, productRestockNotification, newPromoNotiication, newSalesNotification, expenceNotification, accountModifyNotification, readNotification};