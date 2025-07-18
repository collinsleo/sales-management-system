const express = require('express');
const router = express.Router();
const db = require('../config/db.js');
const { body, validationResult } = require('express-validator');
const validateExpenses = require('../middlewares/validateExpenses.js');
const {isAuthenticated, authorizeRoles, is_staff} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const activityLog = require('../middlewares/activitylogs.js');
const {notifications, expenceNotification} = require('../middlewares/notification.js');
const moment = require('moment');
const {tableCountAnalysis} = require('../middlewares/analysis.js')





// =================================
// sales 
// =================================
router.get('/', authorizeRoles('admin', 'manager'), tableCountAnalysis,  (req, res) => {
   try{
        const expensesAnalysis = res.locals.tableCount;

         db.query('SELECT * FROM expenses where status = $1',['active'], (err, results) => {
              if (err) {
                console.error('Error fetching sales:', err);
                req.flash('error_msg', 'An error occurred while fetching sales data.');
                return res.redirect('/sales');
              }
                // Format the date for each expense
                results.rows.forEach(expense => {
                    expense.created_at = moment(new Date(expense.created_at)).format("Do-MMMM-YYYY, h:mm A");
                   
                })
              res.render('admin/expenses.ejs', { expenses: results.rows, expensesAnalysis });
         });
   }catch(err){
       console.error(err);
       req.flash('error_msg', 'An error occurred while fetching sales data.');
       return res.redirect('/dashboard');
   }
});

// =================================
// Add Sale
// =================================
router.post('/', authorizeRoles('admin', 'manager'), validateExpenses,  async(req, res)=>{
    const { amount, reason, spent_at } = req.body;

    // Validate input
    const errors = validationResult(req);
    const error = []
    if (!errors.isEmpty()) {
        errors.array().forEach((element) =>{
            error.push(element.msg)
        })
        req.flash('error_msg', error[0]) ;
        return res.redirect('/expenses');
    }

    try {
        const user_id = req.user.id; // Assuming user ID is stored in req.user
        // Check if product exists
        if (!user_id) {
            req.flash('error_msg', 'User not authenticated.');
            return res.redirect('/expenses');
        }
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            req.flash('error_msg', 'Amount must be a number greater than 0.');
            return res.redirect('/expenses');
        }
        // Insert sale into the database
        const expenceQuery = await db.query('INSERT INTO expenses (amount, reason, created_at, user_id) VALUES ($1, $2, $3, $4) returning id', 
            [amount, reason, spent_at, user_id]);
        
        const expence_id = expenceQuery.rows[0].id;
        const message=`new expence added with id: ${expence_id}, amount: ${amount}, reason: ${reason}`

        await activityLog(message, req)
        await expenceNotification(expence_id, message)

        req.flash('success_msg', 'Sale added successfully.');
        res.redirect('/expenses');
        
    } catch (err) {
        console.error('Error adding Expenses:', err.message);
        req.flash('error_msg', 'An error occurred while adding the sale.');
        res.redirect('/expenses');
    }
})


// expense update
router.get('/update/:id',  authorizeRoles('admin', 'manager'), (req, res) => {
    const id = req.params.id;
   try{
        db.query('SELECT * FROM expenses where id = $1',[id], async(err, results) => {
            if (err) {
            console.error('Error fetching sales:', err);
            req.flash('error_msg', 'An error occurred while fetching sales data.');
            return res.redirect('/expenses');
            }
            // Check if the expense exists
            if (isNaN(id) || id <= 0) {
                req.flash('error_msg', 'Invalid expense ID.');
                return res.redirect('/expenses');
            }

            if(results.rows.length === 0){
                req.flash('error_msg', 'Expense not found.');
                return res.redirect('/expenses');
            }
            
            res.render('admin/update_expenses.ejs', { expenses: results.rows[0] });
         });
   }catch(err){
       console.error(err.message);
       req.flash('error_msg', 'An error occurred while fetching sales data.');
       return res.redirect('/expenses');
   }
});


router.post('/update/:id', authorizeRoles('admin', 'manager'), validateExpenses, async (req, res)=>{
    let id = req.params.id
    if(isNaN(id) || id <= 0){
        req.flash('error_msg', 'Invalid product ID.');
        return res.redirect('/expenses');
    }
    
   const { amount, reason, spent_at } = req.body;

    // Validate input
    const errors = validationResult(req);
    const error = []
    if (!errors.isEmpty()) {
        errors.array().forEach((element) =>{
            error.push(element.msg)
        })
        req.flash('error_msg', error[0]) ;
        return res.redirect('/expenses/update/' + id);
    }

    try {
        const user_id = req.user.id; // Assuming user ID is stored in req.user
        // Check if product exists
        if (!user_id) {
            req.flash('error_msg', 'User not authenticated.');
            return res.redirect('/expenses/update/' + id);
        }
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            req.flash('error_msg', 'Amount must be a number greater than 0.');
            return res.redirect('/expenses/update/' + id);
        }
        // Insert sale into the database
        await db.query('Update expenses set amount = $1, reason = $2, created_at = $3, user_id = $4 WHERE id = $5', 
            [amount, reason, spent_at, user_id, id]);
        
        await activityLog(`new expence update with id: ${expence_id} and amount${amount}`, req)
        req.flash('success_msg', 'Sale added successfully.');
        res.redirect('/expenses');
        
    } catch (err) {
        console.error('Error updating Expenses:', err.message);
        req.flash('error_msg', 'An error occurred while adding the sale.');
        res.redirect('/expenses');
    }
})

// receipt
router.get('/delete/:id', authorizeRoles('admin', 'manager'), (req,res)=>{
    const id = req.params.id;
    if(isNaN(id) || id <= 0){
        req.flash('error_msg', 'Invalid expense ID.');
        return res.redirect('/expenses');
    }
    try{
        db.query('UPDATE expenses set status = $1 where id = $2',['in_active', id], async(err, results) => {
            if (err) {
                console.error('Error deleting expense:', err.message);
                req.flash('error_msg', 'An error occurred while deleting the expense.');
                return res.redirect('/expenses');
            }
            
            await activityLog(`expence deleted; id: ${id}`, req)

            req.flash('success_msg', 'Expense deleted successfully.');
            res.redirect('/expenses');
        });
    }catch(err){
        console.error('Error deleting expense:', err.message);
        req.flash('error_msg', 'An error occurred while deleting the expense.');
        return res.redirect('/expenses');
    }
})



module.exports = router