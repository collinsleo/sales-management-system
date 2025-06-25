const express = require("express")
const ejs = require("ejs")
const bodyParser = require("body-parser")
const db = require("./config/db.js")
const session = require('express-session')
const pgsession = require('connect-pg-simple')(session)
const flash = require("connect-flash")
const passport= require('passport')
const localStrategy= require('passport-local').Strategy
const bcrypt = require('bcrypt')
const cron = require('node-cron')
const {notifications} = require('./middlewares/notification.js')
const moment = require('moment');

const {isAuthenticated, authorizeRoles} = require('./middlewares/authntication.js'); // Assuming you have an authentication middleware


const app = express()



// session setups
app.use(session({
  store: new pgsession({
    pool:db,
    tableName:'session',
    // createTableIfMissing: true, //auto create table if missing
  }),

  secret:process.env.PG_SECRET,
  resave:false,
  saveUninitialized:false,
  cookie:{
    maxAge:1000*60*60*24,
  },

}))



// =====app.use========
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine", "ejs")


app.use(flash())
app.use((req, res, next) =>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
})


app.use(passport.initialize())//start passport
app.use(passport.session())//Middleware that will restore login state from a session.


passport.use(new localStrategy (
  {usernameField: 'username', passwordField: 'password'},
  async (username, password, done)=>{
      await db.query("SELECT * FROM admins WHERE email = $1 OR username = $2", [username, username], (err, result) => {
        if(err){
          console.error("Error: failed to authenticate user through passport", err.message);
          return done("something went wrong, please try again");
        }
        if(result.rows.length === 0){
          console.error("Error: failed to authenticate user through passport, no user found");
          return done(null, false, { message: 'Incorrect details' });
        }
        
        const user =  result.rows[0];
        const isPasswordValid = password && user.password && bcrypt.compareSync(password, user.password);
        if(!isPasswordValid){
          console.error("Error: failed to authenticate user through passport, password mismatch");
          return done(null, false, { message: 'Incorrect password.' });
        } else {
          console.error("User authenticated successfully");
          return done(null, user);
        }
      })

  } 

))

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  //last logged in
  db.query("UPDATE admins SET last_login = NOW() WHERE id = $1", [user.id], (err) => {
      if (err) {
          console.error("Error: failed to update last logged in time", err.message);
          return done(err);
      }
    })

    done(null, user.id);
})

// Deserialize user from session
// This function retrieves the user from the database using the id stored in the session
passport.deserializeUser((id, done) => {
    db.query("SELECT id,fullname,username, email, phone, role, user_type FROM admins WHERE id = $1", [id], (err, result) => {
        if (err) {
            console.error("Error: failed to deserialize user", err.message);
            return done(err);
        }
        if (result.rows.length === 0) {
            console.error("Error: no user found for deserialization");
            return done(null, false);
        }
        done(null, result.rows[0]);
    });
})


// ===========creating local variable ==============
app.use(async (req,res,next)=>{
   let cart = req.session.cart ? [...req.session.cart]:[];
   res.locals.cart = cart
    if(cart){
      let productPriceSum = 0;
      let cartproducts = [];
      if (cart.length > 0){
          cart.forEach(product => {            
              productPriceSum += product.totalcost ;
              cartproducts.push(product.name);
          });
      }
      res.locals.cartproducts = cartproducts;      
      res.locals.cartCount = cart.length;
      res.locals.subtotal = productPriceSum ? productPriceSum : 0;

      // user
      res.locals.user = req.user || []; 
      
      //turning notification alaert into local variable
      let notificationQuery;
      if(req.user && req.user.role === 'admin' || req.user.role === 'manager'){
        notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 ORDER BY created_at DESC', [false])
      }else if(req.user && req.user.role === 'cashier'){
        notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 and type =$2 or type = $3 ORDER BY created_at DESC', [false,'promo','low_stock'])
      }else{
        notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 and type =$2 or type = $3 ORDER BY created_at DESC', [false,'promo','low_stock'])
      }
      //formart date 
      notificationQuery.rows.forEach((notify)=>{
        notify.created_at = moment(notify.created_at).format('MMM--DD--YYYY HH:mm:ss');
      })
      res.locals.notificationAlart = notificationQuery.rows
      res.locals.notificationAlartCount = notificationQuery.rows.length
     
      
      


      // format date for input
      res.locals.formatDateForInput =  function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toISOString().slice(0,16);
      }

      

    }


    next();
})

// =============cron job =====================

//promotion dues notification
async function promonotitfication(db=db) {
  try {
    const promoQuery = await db.query(
      "SELECT id, status, end_at FROM product_promos WHERE status = $1", [true]
    );
    const results = promoQuery.rows;
    
    if (results.length > 0) {
      results.forEach(async (promo) => {
        const currentDate = new Date();
        const dueDate = new Date(promo.due_date);
                      
        
        // Check if the promo is due
        if (dueDate <= currentDate) {
          const title = 'Promo Due Alert';
          const type = 'promo_due';
          const message = `Promo ID: ${promo.id} is due and promo automaticaly deactivated, Please check the status.`;
          
          // Send notification
          await notifications(promo.id, title, message, type, 'product_promos');
          
          // Update promo status to inactive
          await db.query(
            "UPDATE promos SET status = $1 WHERE id = $2", [false, promo.id]
          );
        }
      });
    }
  } catch (err) {
    console.error("Promo notification failed: " + err);
  }

  
}


//   // notify when stock is low
async function stockNotification(db=db){
  try{
    const lowstockquery = await db.query(
      "Select quantity, threshold, id, low_stock from products"
    )
    const results = lowstockquery.rows;
    if(results.length > 0){
      results.forEach(async (product)=>{
        // getting products that are low on stock and not notified
        if(product.quantity <= product.threshold && product.low_stock === false){
          const title = 'low stock alert';
          const type = 'low_stock';
          const message = `Product ${product.id} is low on stock. Current quantity: ${product.quantity}, Threshold: ${product.threshold}.`;
          // send notification
          await notifications(product.id,title,message,type,'products')

          // update the low_stock_notified to true
          await db.query(
            "UPDATE products SET low_stock = $1 WHERE id = $2",[true,product.id]
          )        
        }

        // if product is high on stock and low_stock_notified is false, send notification
        if(product.quantity > product.threshold && product.low_stock === true){
          const title = 'high stock alert';
          const type = 'stuck_increase';
          const message = `Product ${product.id} is back in stock. Current quantity: ${product.quantity}, Threshold: ${product.threshold}.`;
          // send notification
          await notifications(product.id,title,message,type)

          // update the low_stock_notified to true
          await db.query(
            "UPDATE products SET low_stock = $1 WHERE id = $2",[false,product.id]
          )  
                
        }

      })
    }
  }catch(err){
    console.error("stock notification failed "+err.message)
  }
}


                                                                                                                                                                                                                                                                                                                                                                                  
cron.schedule("*/1 * * * *", async()=>{
  // notify low stock
  await stockNotification(db)
  // notify chanage promo status when promo dues

  await promonotitfication(db)

})

// =============cron job ========================



// =====routes========

const registerRoute = require("./routes/registerRoute.js")
const productRoute = require("./routes/productRoute.js")
const categoryRoute = require("./routes/categoryRoute.js")
const supplyRoute = require("./routes/supplyerRoute.js")
const promoRoute = require("./routes/promoRoute.js")
const cartRoute = require('./routes/cartRoute.js')
const cashierRoute = require('./routes/cashierRoute.js')
const salesRoute = require('./routes/salesRoute.js')
const expensesRoute = require('./routes/expensesRoute.js')


// =====routes use========

app.use('', registerRoute);
app.use('/product', productRoute)
app.use('/category', categoryRoute)
app.use('/supplyer', supplyRoute)
app.use('/promo', promoRoute)
app.use('/cart', cartRoute)
app.use('/cashier', cashierRoute)
app.use('/sales', salesRoute)
app.use('/expenses', expensesRoute)



// =====home page========
app.get('/dashboard', isAuthenticated,  (req,res)=>{
    res.render('admin/index.ejs')
})



// =======read notifications========
app.get('/notification/:id', async(req, res) => {
  const id = req.params.id
  try {
    await db.query(
      'UPDATE notifications SET is_read = $1 WHERE id = $1',[true,id], (err,result)=>{
        if(err){
          console.error("failed to read notification", err.message); 
        }
        req.flash('success_msg', "read notification")
        return res.redirect('/dashboard')  
      }
    ) 
  } catch (error) {
    console.error("failed to read notification", error.message); 
  }
    
});

// =====404 page========
app.get('*', (req, res) => {
    res.status(404).render('404.ejs');
});





// const port = process.env.PG_port || 3000
const port = 3000

app.listen(port,'0.0.0.0', ()=>{
    console.log("port running on http//locahost:"+port);
})