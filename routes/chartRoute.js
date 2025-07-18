const express = require('express');
const router = express.Router();
const db = require('../config/db')
const {isAuthenticated, authorizeRoles} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const {BusinessGrowthAnlysis, cartegoryProfitAnalysis, productProfitAnalysis} = require('../middlewares/analysis.js')
const moment = require('moment')


router.get('/', authorizeRoles('admin'),BusinessGrowthAnlysis, async(req,res)=>{
    let businessAnalysis = res.locals.BusinessGrowth;
    businessAnalysis.sort((a, b) => new Date(a.day) - new Date(b.day));

    let expenses = res.locals.expences;
    
    
    // Convert expenses array to a map for quick lookup
    const expenseMap = {};
    expenses.forEach(exp => {
        const day = moment(exp.day).format('MMM-DD-YYYY');
        expenseMap[day] = Number(exp.total_expenses);
    });

    // Merge and calculate net profit
    businessAnalysis = businessAnalysis.map(sale => {
        const day = moment(sale.day).format('MMM-DD-YYYY');
        const grossProfit = Number(sale.gross_profit);
        const totalExpenses = expenseMap[day] || 0;
        const netProfit = grossProfit - totalExpenses;

        return {
            ...sale,
            day,
            netProfit:netProfit,
            gross_profit: grossProfit.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
            total_sales: Number(sale.total_sales).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
            cogs: Number(sale.cogs).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
            total_expenses: totalExpenses.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }),
            net_profit: netProfit.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
        };
    });
        console.log(businessAnalysis);

    

    res.render('admin/charts/businessAnalysis.ejs', {businessAnalysis})

})

router.get('/cathegoryprofit', authorizeRoles('admin','manager') , cartegoryProfitAnalysis,  async (req, res) => {
    try {
        const cartegoryprofit = res.locals.categoryProfit;
        res.render('admin/charts/categoryProfit.ejs', {cartegoryprofit});
    } catch (error) {
        console.error('Error fetching categories analysus chart:', error.message);
        req.flash('error_msg', 'Error fetching categories');
        return res.redirect('/dashboard');
    }
});

router.get('/productprofit', authorizeRoles('admin','manager') , productProfitAnalysis,  async (req, res) => {
    try {
        const productProfit = res.locals.productProfit;
        res.render('admin/charts/productProfit.ejs', {productProfit});
    } catch (error) {
        console.error('Error fetching categories analysus chart:', error.message);
        req.flash('error_msg', 'Error fetching categories');
        return res.redirect('/dashboard');
    }
});




module.exports = router;