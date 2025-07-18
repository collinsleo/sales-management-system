const db = require('../config/db')

// Middleware to analyze the database
// getting tottal amout made daily
const tableCountAnalysis = async (req, res, next) => {
    try {
        const product = await db.query(`
            Select COUNT(*) AS count from products
       
        `,);
        const productPromo = await db.query(`
            Select COUNT(*) AS count from product_promos where status = $1
       
        `,[true]);
        const totalstaff = await db.query(`
            Select COUNT(*) AS count from admins
       
        `,);
        const totaladmin = await db.query(`
            Select role, COUNT(*) AS count from admins group by role 
        `,);
        const users = await db.query(`
            Select username, COUNT(*) AS count from users group by username
        `,);
        const supplyer = await db.query(`
            Select company, COUNT(*) AS count from suppliers group by company 
        `,);
        const category = await db.query(`
            Select name, COUNT(*) AS count from categories group by name
        `,);

        const thresholds = await db.query(`
            Select name, COUNT(*) AS count from products where quantity < threshold group by name 
        `,);
        const currentproducthold = await db.query(`
            Select id, COUNT(*) AS count from hold_carts group by id 
        `,);
        const outOfStock = await db.query(`
            Select name, COUNT(*) AS count from products where quantity = ${0} group by name 
        `,);
        
        const todayExpenses = await db.query(`
            SELECT 
                DATE(created_at) AS sale_date,
                COUNT(*) AS total_expenses_count,
                SUM(amount) AS total_expenses_amount
            FROM expenses
            WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY sale_date
            ORDER BY sale_date DESC
        `,);
        const todaySales = await db.query(`
           SELECT
            s.id AS id,
            DATE(s.created_at) AS day,
            SUM(si.total_price) AS total_sales,
            SUM(si.quantity * si.cost_price) AS cogs,
            (SUM(si.total_price) - SUM(si.quantity * si.cost_price)) AS gross_profit
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.status = 'completed' and DATE(s.created_at) = CURRENT_DATE
            GROUP BY s.id
            ORDER BY day DESC
        `,);
        const monthsSales = await db.query(`
           SELECT
            s.id AS id,
            DATE(s.created_at) AS day,
            SUM(si.total_price) AS total_sales,
            SUM(si.quantity * si.cost_price) AS cogs,
            (SUM(si.total_price) - SUM(si.quantity * si.cost_price)) AS gross_profit
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.status = 'completed' and DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY s.id
            ORDER BY day DESC
        `,);

        const monthExpenses = await db.query(`
            SELECT 
                DATE(created_at) AS sale_date,
                COUNT(*) AS total_expenses_count,
                SUM(amount) AS total_expenses_amount
            FROM expenses
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY sale_date
            ORDER BY sale_date DESC
        `,);
        const yearSales = await db.query(`
           SELECT
            DATE(s.created_at) AS day,
            s.id AS id,
            SUM(si.total_price) AS total_sales,
            SUM(si.quantity * si.cost_price) AS cogs,
            (SUM(si.total_price) - SUM(si.quantity * si.cost_price)) AS gross_profit
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.status = 'completed' AND DATE_TRUNC('year', s.created_at) = DATE_TRUNC('year', CURRENT_DATE)
            GROUP BY s.id
            ORDER BY day DESC
        `,);

        const yearExpenses = await db.query(`
            SELECT 
                DATE(created_at) AS sale_date,
                COUNT(*) AS total_expenses_count,
                SUM(amount) AS total_expenses_amount
            FROM expenses
            WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)
            GROUP BY sale_date
            ORDER BY sale_date DESC
        `,);

     
        
        
        
        res.locals.tableCount = {
            product_count : product.rows[0].count,
            productPromo_count : productPromo.rows[0].count,
            totalstaff : totalstaff.rows[0].count,
            totaladmin : totaladmin.rows,
            supplyer : supplyer.rows.length,
            users : users.rows.length,
            categories : category.rows.length,
            currentproducthold : currentproducthold.rowCount || 0,
            thresholds : thresholds.rowCount || 0,
            outOfStock : outOfStock.rowCount || 0,
            todaySalesCount : todaySales.rows.length,
            todaySale : todaySales.rows,//.reduce((sum, sales)=> sum += Number(sales.total_sales || 0), 0),
            todaySales : todaySales.rows.reduce((sum, sales)=> sum += Number(sales.total_sales || 0), 0),
            todayGrossProfit : todaySales.rows.reduce((sum, sales)=> sum += Number(sales.gross_profit || 0), 0),
            todayExpenses : todayExpenses.rows.reduce((sum, sales)=> sum += Number(sales.total_expenses_amount || 0), 0),
            monthsSalesCount : monthsSales.rows.length,
            monthsSales : monthsSales.rows.reduce((sum, sales)=> sum += Number(sales.total_sales || 0), 0),
            monthGrossProfit : monthsSales.rows.reduce((sum, sales)=> sum += Number(sales.gross_profit || 0), 0),
            monthExpenses : monthExpenses.rows.reduce((sum, sales)=> sum += Number(sales.total_expenses_amount || 0), 0),
            yearSalesCount : yearSales.rows.length,
            yearSalesSales : yearSales.rows.reduce((sum, sales)=> sum += Number(sales.total_sales || 0), 0),
            yearGrossProfit : yearSales.rows.reduce((sum, sales)=> sum += Number(sales.gross_profit || 0), 0),
            yearcogs : yearSales.rows.reduce((sum, sales)=> sum += Number(sales.cogs || 0), 0),
            yearExpenses : yearExpenses.rows.reduce((sum, sales)=> sum += Number(sales.total_expenses_amount || 0), 0),
        };
        // console.log(res.locals.tableCount)
        next();

    } catch (error) {
        console.error('Error in daily sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//  COUNT(*) AS total_sales_count,

//total sales profit made my cashier each day
const cashierSalesAnalysis = async (req, res, next) => {
    try {
        //sales analysis
        const result = await db.query(`
            SELECT 
                DATE(created_at) AS sale_date,
                COUNT(*) AS total_sales_count,
                SUM(total_amount) AS total_sales_amount
            FROM sales
            WHERE user_id = $1 AND status = 'completed' AND DATE(created_at) = CURRENT_DATE
            GROUP BY sale_date
            ORDER BY sale_date DESC
        `, [req.user.id]);

        //pending sales analysis
        const pendingQuery = await db.query(`
            SELECT 
                DATE(created_at) AS hold_date,
                COUNT(*) AS pending_sales_count
            FROM hold_carts
            WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
            GROUP BY hold_date
            ORDER BY hold_date DESC
        `, [req.user.id]);

        //payment methos analysis
        const paymentBreakdownQuery = await db.query(`
            SELECT payment_method, COUNT(*) AS count
            FROM sales
            WHERE user_id = $1 AND status = 'completed' AND DATE(created_at) = CURRENT_DATE
            GROUP BY payment_method
        `, [req.user.id]);

        res.locals.paymentBreakdown = paymentBreakdownQuery.rows;


        res.locals.cashierSalesAnalysis = result.rows;
        if( pendingQuery.rows > 0){
            res.locals.pendingSales = pendingQuery.rows[0].pending_sales_count;
            
        }else{
            res.locals.pendingSales = 0;
        }
            
            
            
        next();
    } catch (error) {
        console.error('Error in cashier sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


//admin level
const BusinessGrowthAnlysis = async (req, res, next) => {
    try {
        const result = await db.query(`
        SELECT
        DATE(s.created_at) AS day,
        SUM(si.total_price) AS total_sales,
        SUM(si.quantity * si.cost_price) AS cogs,
        (SUM(si.total_price) - SUM(si.quantity * si.cost_price)) AS gross_profit
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        WHERE s.status = 'completed'
        GROUP BY day
        ORDER BY day DESC
        `);
        //expenses
        const expenses = await db.query(`
            SELECT
            DATE(created_at) AS day,
            SUM(amount) AS total_expenses
            FROM expenses
            GROUP BY day
            ORDER BY day DESC
        `)
            
        res.locals.expences = expenses.rows;
        res.locals.BusinessGrowth = result.rows;
        next();

    } catch (error) {
        console.error('Error in daily sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// TO_CHAR(DATE_TRUNC('day', s.created_at), 'YYYY-MM') AS period,
const profitAnalysis = async (req, res, next) => {
    try {
        const result = await db.query(`
        SELECT
         DATE(s.created_at) AS day,

        SUM(s.total_amount) AS total_sales,
        SUM(si.quantity * si.cost_price) AS cogs,
        (SUM(si.total_price) - SUM(si.quantity * si.cost_price)) AS gross_profit
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        WHERE s.status = 'completed'
        GROUP BY day
        ORDER BY day DESC
        `);
        //expenses
        const expenses = await db.query(`
            SELECT
            DATE(created_at) AS day,
            SUM(amount) AS total_expenses
            FROM expenses
            GROUP BY day
            ORDER BY day DESC
        `)
            
        res.locals.expences = expenses.rows;
        res.locals.BusinessGrowth = result.rows;
        next();

    } catch (error) {
        console.error('Error in daily sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//5 best hot product

const hotProduct = async (req, res, next) => {
    try {
        const hotproducts = await db.query(`

        SELECT
                p.id,
                p.name,
                p.image,
                SUM(si.quantity) AS total_quantity_sold
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            GROUP BY p.id, p.name, p.image
            ORDER BY total_quantity_sold DESC
            LIMIT 5
        `);
        res.locals.hotproduct = hotproducts.rows
        next();
                
    } catch (error) {
        console.error('Error in daily sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const cartegoryProfitAnalysis = async (req, res, next) => {
    try {
        const result = await db.query(`
               SELECT
                c.id AS id,
                c.name AS name,
                count(p.id) as product_count, 
                SUM(si.quantity * (si.selling_price - si.cost_price)) AS profit,
                SUM(si.quantity * (si.cost_price)) AS cost
                FROM categories c
                JOIN products p ON c.id = p.category_id
                JOIN sale_items si ON si.product_id = p.id
                GROUP BY c.id, C.name
                ORDER BY profit DESC;
       
        `);
        res.locals.categoryProfit = result.rows
        // console.log(res.locals.categoryProfit);
        next()
        

    }catch(err){
        console.error('failed to calculate category produt profit' + err.message)
    }
}


const productProfitAnalysis = async (req, res, next) => {
    try {
        const result = await db.query(`
        SELECT
            p.id AS id,
            p.name AS name,
            c.name AS cathegory,
            SUM(si.quantity) AS quantity,
            SUM(si.quantity * si.cost_price) AS cost,
            SUM(si.quantity * (si.selling_price - si.cost_price)) AS profit
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN sale_items si ON si.product_id = p.id
        GROUP BY p.id, p.name, c.name
        ORDER BY profit DESC;
        `);
        res.locals.productProfit = result.rows
        // console.log(res.locals.productProfit);
        next()
        

    }catch(err){
        console.error('failed to calculate category produt profit' + err.message)
    }
}

module.exports = {cashierSalesAnalysis, BusinessGrowthAnlysis, profitAnalysis, hotProduct, tableCountAnalysis, cartegoryProfitAnalysis, productProfitAnalysis}