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
const {BusinessGrowthAnlysis, profitAnalysis, tableCountAnalysis, hotProduct} = require('./middlewares/analysis.js')
const sendEMail = require('./middlewares/mailer.js')
const app = express()
const fs = require('fs');
const path = require('path');



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
    db.query("SELECT id,fullname,username, email, phone, role, user_type, company_id FROM admins WHERE id = $1", [id], (err, result) => {
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
      //today's date
      res.locals.today = moment().format('MMM--DD--YYYY');
       // format date for input
      res.locals.formatDateForInput =  function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toISOString().slice(0,16);
      }

      // user
      if(req.user){
        res.locals.user = req.user ; 
        
        //turning notification alaert into local variable
        let notificationQuery;
        if(req.user && req.user.role === 'admin' || req.user.role === 'manager'){
          notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 ORDER BY created_at DESC limit 20', [false])
        }else if(req.user && req.user.role === 'cashier'){
          notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 and type =$2 or type = $3 ORDER BY created_at DESC limit 20', [false,'promo','low_stock'])
        }else{
          notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 and type =$2 or type = $3 ORDER BY created_at DESC limit 20', [false,'promo','low_stock'])
        }


        notificationQuery.rows.forEach((notify)=>{
          notify.created_at = moment(notify.created_at).format('MMM--DD--YYYY HH:mm:ss');
        })
        res.locals.notificationAlart = notificationQuery.rows
        res.locals.notificationAlartCount = notificationQuery.rows.length

        //===================COMPANY DETAILS============================
      try{
        const  companyQuery = await db.query( 'SELECT * FROM company where id = $1', [req.user.company_id])
        let companyDetail= {
            id:0,
            name:"company",
            email:"",
            location:"",
            website:"",
            image:"company_image.png",
          };
        if(companyQuery.rows.length > 0){
          companyDetail = companyQuery.rows[0];
        }
        res.locals.company = companyDetail;
        req.session.company = companyDetail;

      }catch(err){
        console.log('failure to catch company info', err.message);
      }


    }else{
      notificationQuery = await db.query( 'SELECT * FROM notifications WHERE is_read = $1 and type =$2 or type = $3 ORDER BY created_at DESC limit 20', [false,'promo','low_stock'])
    }


      //===================ACTIVITY LOG============================
      try{
        const  activityQuery = await db.query( 'SELECT * FROM activity_logs where is_read = $1 ORDER BY created_at DESC limit 50 ',[false])

        activityQuery.rows.forEach((notify)=>{
        notify.created_at = moment(notify.created_at).format('MMM--DD--YYYY HH:mm:ss');
      })
        res.locals.activityLog = activityQuery.rows;
        res.locals.activityLogCount = activityQuery.rowCount;

        
      } catch (err) {
        console.log('failure to catch activity log', err.message);
        
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
    //admin emails
    const getAdmin = await db.query('SELECT email from admins where is_active = $1 and  role = $2 or role = $3 ',[true, 'admin', 'manager'])
    adminEmails = [];
    getAdmin.rows.forEach((item)=>{
      adminEmails.push(item.email)
    })
    const emailString = adminEmails.join(', ')




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
          console.log('low stock alart');
            
          
          //send email
          //get all admins email
           const getAdmin = await db.query('SELECT email from admins where is_active = $1 and  role = $2 or role = $3 ',[true, 'admin', 'manager'])
            adminEmails = [];
            getAdmin.rows.forEach((item)=>{
              adminEmails.push(item.email)
            })

            const Emails = adminEmails.join(', '); // "user1@example.com, user2@example.com"
           
                          
          // Build the absolute path to your template
          const templatePath = path.join(__dirname, './views/emails/stock_decrease.html');
          const template = fs.readFileSync(templatePath, 'utf-8');

          // Render the template with variables
          const html = ejs.render(template, {
              username: "Admin / Manager",
              redirect_link: "http://localhost:3000/auth/admin",
              id: product.id,
              quantity: product.quantity,
              threshold: product.threshold,
          });

          const mail_sent = await sendEMail ({
              to: Emails,
              // to: "collinsebuleo@gmail.com,codedcrafter@gmail.com",
              subject: 'low stock alert!',
              html: html
          });

                 

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
          console.log('hight stock alart');
          
          //send email
          //get all admins email
           const getAdmin = await db.query('SELECT email from admins where is_active = $1 and  role = $2 or role = $3 ',[true, 'admin', 'manager'])
            adminEmails = [];
            getAdmin.rows.forEach((item)=>{
              adminEmails.push(item.email)
            })

            const Emails = adminEmails.join(', '); // "user1@example.com, user2@example.com"
               
          // Build the absolute path to your template
          const templatePath = path.join(__dirname, './views/emails/stock_increase.html');
          const template = fs.readFileSync(templatePath, 'utf-8');
          

          // Render the template with variables
          const html = ejs.render(template, {
              username: "Admin / Manager",
              redirect_link: "http://localhost:3000/auth/admin",
              id: product.id,
              quantity: product.quantity,
              threshold: product.threshold,
              
          });
          //getting all admin and manager
         

          const mail_sent = await sendEMail ({
              to: Emails,
              // to: "collinsebuleo@gmail.com, codedcrafter@gmail.com",
              subject: 'stock increase alert!',
              html: html
          });   
        }

      })
    }
  }catch(err){
    console.error("stock notification failed "+err)
  }
}



                                                                                                                                                                                                                                                                                                                                                                                  
cron.schedule("*/10 * * * *", async()=>{
  // notify low stock
  await stockNotification(db)
  // notify chanage promo status when promo dues

  await promonotitfication(db)

})

cron.schedule("59 23 * * *", async()=>{
  // delete all pending sells
  await db.query(`
    DELETE FROM hold_carts where created_at < Now() - INTERVAL '1 day'
  `,(err,result)=>{
    if(err){
      console.error('ERROR occured on clearing cart holds');  
    }
    
  })
    
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
const chartRoute = require('./routes/chartRoute.js')


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
app.use('/chart', chartRoute)



// =====home page========
app.get('/dashboard', isAuthenticated, profitAnalysis,tableCountAnalysis, hotProduct,  async(req,res)=>{

  let businessAnalysis = res.locals.BusinessGrowth;
  let expenses = res.locals.expences;
  let tableAnalysis = res.locals.tableCount;
  let bestproducts = res.locals.hotproduct

  
  // const getAdmin = await db.query('SELECT email from admins where is_active = $1 and  role = $2 or role = $3 ',[true, 'admin', 'manager'])
  // adminEmails = [];
  // getAdmin.rows.forEach((item)=>{
  //   adminEmails.push(item.email)
  // })

  // const emailString = adminEmails.join(', '); // "user1@example.com, user2@example.com"
  // if(req.session.company){
  //   console.log(req.session.company);
  // }
  // console.log(emailString);
  
  // Convert expenses array to a map for quick lookup
  const expenseMap = {};
  expenses.forEach(exp => {
    const day = moment(exp.day).format('MMM-DD-YYYY');
    expenseMap[day] = Number(exp.total_expenses);
  });

   // Sort by date (oldest to newest)
  businessAnalysis.sort((a, b) => new Date(a.day) - new Date(b.day));

  // Merge and calculate net profit for each day
  businessAnalysis = businessAnalysis.map(sale => {
    const day = moment(sale.day).format('MMM-DD-YYYY');
    const grossProfit = Number(sale.gross_profit);
    const totalExpenses = expenseMap[day] || 0;
    const netProfit = grossProfit - totalExpenses;

    return {
      ...sale,
      day,
      gross_profit: grossProfit,
      total_expenses: totalExpenses,
      net_profit: netProfit,
    };
    
  });

  if(req.user){
    res.locals.currentUser = req.user;
    
  }
// console.log(tableAnalysis);

  


  res.render('admin/index.ejs',{businessAnalysis, tableAnalysis, bestproducts, currentUser:req.user})
})



// =======read notifications========
app.get('/notification/:id', async(req, res) => {
  const id = req.params.id
  try {
    await db.query(
      'UPDATE notifications SET is_read = $1 WHERE id = $2',[true,id], (err,result)=>{
        if(err){
          console.error("failed to read notification", err.message); 
        }
        req.flash('success_msg', "just read one notification")
        return res.redirect('/dashboard')  
      }
    ) 
  } catch (error) {
    console.error("failed to read notification", error.message); 
  }
    
});

// =======actitivity log notification on seen by admin========
app.get('/action/:id', async(req, res) => {
  const id = req.params.id
  try {
    await db.query(
      'UPDATE activity_logs SET is_read = $1 WHERE id = $2',[true,id], (err,result)=>{
        if(err){
          console.error("failed to read notification", err.message); 
        }
        req.flash('success_msg', "just read one activity log")
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