const express = require('express');
const router = express.Router();
const db = require('../config/db.js');
const { body, validationResult } = require('express-validator');
const validateAdminSignup = require('../middlewares/validateAdminSignup.js');
const adminUpdateValidator = require('../middlewares/validateAdminUpdate.js');
const {isAuthenticated, authorizeRoles, is_staff} = require('../middlewares/authntication.js'); // Assuming you have an authentication middleware
const activityLog = require('../middlewares/activitylogs.js')
const {accountModifyNotification} = require('../middlewares/notification.js')
const bcrypt = require('bcrypt');
const passport = require('passport');
const moment = require('moment');
const upload = require('../middlewares/multer.js')
const sendEMail = require('../middlewares/mailer.js')
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto')



// =================================
//             admin  register
// =================================

// router.get("/admin_signup",authorizeRoles('admin'), (req, res)=>{
router.get("/admin_signup", (req, res)=>{
    res.render("auth/admin_signup.ejs")
    
})

// router.post('/admin_signup', authorizeRoles('admin'), validateAdminSignup, async(req,res)=>{
router.post('/admin_signup', validateAdminSignup, async(req,res)=>{
    const {fname, username, role, gender, email, mobile, address, password, confirm } = req.body
    let {company_id, company_name, company_email } = ["0", 'company', "companyemai@gmail.com"];
    if(req.session.company){
        company_id = req.session.company.id;
        company_name = req.session.company.name;
        company_email = req.session.company.email;
    }


    const errors = validationResult(req);
    const error = [];
    if(!errors.isEmpty()){
        errors.array().forEach((err) => {
            error.push(err.msg);
        });
        req.flash("error_msg", error);
        return res.redirect("/admin_signup");
    }
    if(password !== confirm){
        req.flash("error_msg", "passwords do not match");
        return res.redirect("/admin_signup");
    }

    try{
        await db.query("SELECT * FROM admins WHERE email = $1 OR phone = $2", [email, mobile] , async(err, result)=>{
            if(err){
                console.log("failed to check existing admin user",err.message);
                req.flash("error_msg", "Something went wrong, please try again later");
                return res.redirect("/admin_signup");
            }
            if(result.rows.length > 0){
                req.flash("error_msg", "user already exists");
                return res.redirect("/admin_signup");
            }else{
                // Hash the password before storing it
                const hashedPassword = bcrypt.hashSync(password, 10);

                await db.query("INSERT INTO admins (fullname, username, email, phone, role, gender, location,password, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [fname, username, email, mobile, role, gender, address, hashedPassword, company_id], async (err, result)=>{
                    if(err){
                        console.error("failed to insert new admin",err.message);
                        req.flash("error_msg", "Something went wrong, please try again later");
                        return res.redirect("/admin_signup");
                    }  
                    
                    if(req.user){

                        await activityLog(`new user created!!! name: ${fname}, role: ${role}`,req)
                    }
                    
                    
                    //sending email
                    // Build the absolute path to your template
                    const templatePath = path.join(__dirname, '../views/emails/new_user.html');
                    const template = fs.readFileSync(templatePath, 'utf-8');
                    const host = req.protocol + '://' + req.get('host');
                    const redirect_link = `${host}/auth/admin`;   

                    // Render the template with variables
                    const html = ejs.render(template, {
                        username: username,
                        login_link: redirect_link
                    });

                    const mail_sent = await sendEMail ({
                        to: email,
                        // to: "collinsebuleo@gmail.com",
                        subject: 'Account creation successfully done!',
                        html: html
                    });

                    if(mail_sent == true){
                        req.flash('success_msg', "successfuly created new account, and email send!!!. ")
                    }

                    req.flash("success_msg", "Admin registered successfully");
                    return res.redirect("/admin/staff");
                })
            }
        })
    }catch(err){
        console.error("Error: failed to singup new admin ",err.message);
        req.flash("error_msg", "Something went wrong, please try again later");
        return res.redirect("/badmin_signup");
    }
})

// ==========================
//          admin-login
// ==========================

router.get('/',(req,res)=>{
    return res.redirect('/logout')
});


router.get("/auth/admin", (req, res)=>{
    if(req.isAuthenticated() && req.user.user_type === 'staff'){          
        // req.flash('error_msg', "can't access the page") ;     
        return res.redirect("/dashboard")
    }

    if(req.isAuthenticated() && req.user.user_type !== 'staff'){ 
        req.flash('error_msg', "access denaied") ;     
        return res.redirect("/logout")
    }

    res.render("auth/admin_login.ejs")
})



router.post('/auth/admin',
    passport.authenticate('local',{
        successRedirect: '/dashboard',
        failureRedirect: '/auth/admin',
        failureFlash: true,
        successFlash: 'Welcome back!',   
    })
);

router.get('/logout', (req, res) => {
    let path ="/auth/admin";
    
    // if(req.user !== 'undefined'){
    //     path = '/auth/admin';
    // }else if(req.user.role !== 'user'){
    //     path = '/auth/admin';
    // }else{
    //     path = '/login';
    // }    
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      
      req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Important: clears session cookie
        res.session = null;
        res.redirect(path); // Redirect to login or homepage
      });
    });
  });
  


// ====================================================
//             show admin | staff | cashier
// ===================================================
router.get('/admin/staff', authorizeRoles('admin', 'manager'),async(req, res)=>{

try{
    const staffsquery =  await db.query(
        "SELECT * FROM admins order by id desc"
    );
    const results = staffsquery.rows;  
    if(results.length < 1){
        req.flash('error_msg', "no staff found")
        return res.redirect('/dashboard')
    }
    // format date
    results.forEach((staff) => {
        staff.last_login = moment(staff.last_login).format('YYYY-MMM-DD HH:mm:ss');
    });

    res.render('admin/adminusers.ejs', {staffs:results})

}catch(err){
    console.error("failed fetching sdmin staff table: "+ err.message)
    req.flash('error_msg', "somthing went wrong please try agin")
    returnres.redirect('/dashboard')  
}
    
})
// show staff update page
router.get('/staff/update/:id', authorizeRoles('admin', 'manager'), async(req, res)=>{
    const id = req.params.id;

    if(!id || id < 1 || isNaN(id)){
        req.flash('error_msg', "invalid id")
        returnres.redirect('/admin/staff')  
    }

try{
    const staffsquery =  await db.query(
        "SELECT * FROM admins WHERE id = $1",[id]
    );
    const results = staffsquery.rows[0];
    

    res.render('admin/update_adminusers.ejs', {staff:results})

}catch(err){
    console.error("failed fetching admin staff table: "+ err.message)
    req.flash('error_msg', "somthing went wrong please try agin")
    returnres.redirect('/admin/staff')  
}
    
})

// updating staffs

router.post('/staff/update/:id', authorizeRoles('admin', 'manager'), adminUpdateValidator, async(req, res)=>{

    const id = req.params.id;
    const {fname, username, gender, email, role, mobile, address } = req.body;
    const errors = validationResult(req);
    const error = [];
    if(!errors.isEmpty()){
        errors.array().forEach((err) => {
            error.push(err.msg);
        });
        req.flash("error_msg", error);
        return res.redirect("/staff/update/"+id);
    }
    
    try{
        const checkuser = await db.query("SELECT * FROM admins WHERE id = $1", [id]);
           
        if(checkuser.rows.length < 1){
            req.flash("error_msg", "can't fetch this user");
            return res.redirect("/admin/staff");
        }

        await db.query("UPDATE admins  SET fullname = $1, username = $2, phone = $3, gender = $4, location = $5, email = $6, role = $7 where id = $8",
        [fname, username, mobile, gender, address, email, role, id ]);

        await activityLog(`staff updated!!! name: ${fname}, id: ${id}, role: ${role}`,req)
        await accountModifyNotification(id,"update",'admins') 
        //email the user
        // =============here===============
        
        req.flash("success_msg", "Admin updated successfully");
        return res.redirect("/admin/staff");     
        
    }catch(err){
        console.error("Error: failed to update staff ",err);

        req.flash("error_msg", "Something went wrong, please try again later");
        return res.redirect("/admin/staff");
    }

})


router.get('/staff/delete/:id', authorizeRoles('admin','manager'), adminUpdateValidator, async(req, res)=>{
    const id = req.params.id;
    
    
    try{
        const checkuser = await db.query("SELECT * FROM admins WHERE id = $1", [id]);
           
        if(checkuser.rows.length < 1){
            req.flash("error_msg", "can't fetch this user");
            return res.redirect("/admin/staff");
        }

        await db.query("UPDATE admins  SET is_active = $1 WHERE id = $2 ",
        [false, id ]);
        const userrole = checkuser.rows[0].role;

        await activityLog(`staff account deleted !!! id: ${id}, role: ${userrole}`, req)
        await accountModifyNotification(id, 'delete', 'admins')
        // email user


        req.flash("success_msg", "Admin muted successfully");
        return res.redirect("/admin/staff");     
        
    }catch(err){
        console.error("Error: failed to update staff ",err.message);
        req.flash("error_msg", "Something went wrong, please try again later");
        return res.redirect("/admin/staff");
    }

})

// ====================================================
//             seetings undate  user profi
// ===================================================
//multerErrorHandling
function multerErrorHadling(req, res, next) {
    upload.single('cImage')(req, res, (err)=>{
        if(err){
            req.flash("error_msg", err.message)
            return res.redirect('/setting')
        }else if(!req.file){
            req.flash('error_msg', "no file found")
            return res.redirect('/setting')   
        }
        next();
    });  
}

//update product image 
router.post('/company/upload/', authorizeRoles('admin'), multerErrorHadling, async(req, res)=>{
    try{
        const {company_id} = req.body;
       
        const image = req.file ? req.file.filename : null;

        const checkuser = await db.query(
            'SELECT * FROM admins WHERE id = $1 and role = $2',[req.user.id, 'admin']   
        )
        if(checkuser.rows.length < 1){
            req.flash('error_msg', 'can\'t perform this action');
            return res.redirect('/setting');
        }else{
            const checkcompany = await db.query(
            'SELECT * FROM company WHERE id = $1',[company_id]   
            )

            if(checkcompany.rows.length <= 0){

                const query = await db.query(
                    'INSERT INTO company (image) VALUES ($1) RETURNING id',
                    [image]
                )

                const my_company_id = query.rows[0].id
                
                await db.query(
                    'Update  admins set company_id = $1  where id = $2',
                    [my_company_id, req.user.id]
                )

                await activityLog(`company image added by ${req.user.username} with id: ${req.user.id}`, req)
                req.flash('success_msg', 'company logo successfully added');

            }else if(checkcompany.rows.length === 1){
                const query = await db.query(
                    'Update  company set image = $1  where id = $2',
                    [image, company_id]
                )
                await activityLog(`company image updated by ${req.user.username} with id: ${req.user.id}`, req)
                req.flash('success_msg', 'company logo successfully changed');
            }else{
                req.flash('error_msg', 'something went wrong');

            }

            return res.redirect('/setting');
        }
    }catch(err){
        console.error('Error company request sent returns error: ', err.message)
    }

})


//add company details 
router.post('/company/add/', authorizeRoles('admin'),  async(req, res)=>{
    try{
        const {name, email, address, website, company_id} = req.body;
        

        const checkuser = await db.query(
            'SELECT * FROM admins WHERE id = $1 and role = $2',[req.user.id, 'admin']   
        )
        if(checkuser.rows.length < 1){
            req.flash('error_msg', 'can\'t perform this action');
            return res.redirect('/setting');
        }else{
            const checkcompany = await db.query(
            'SELECT * FROM company WHERE id = $1',[company_id]   
            )

            if(checkcompany.rows.length <= 0){

                const query = await db.query(
                    'INSERT INTO company (name, email, location, website) VALUES ($1, $2, $3, $4) RETURNING id',
                    [name, email, address, website]
                )

                const my_company_id = query.rows[0].id
                
                await db.query(
                    'Update  admins set company_id = $1  where id = $2',
                    [my_company_id, req.user.id]
                )

                await activityLog(`company detail created by ${req.user.username} with id: ${req.user.id}`, req)
                req.flash('success_msg', 'company details successfully added');

            }else if(checkcompany.rows.length === 1){
                 const query = await db.query(
                    'UPDATE  company SET name = $1, email=$2, location=$3, website=$4',
                    [name, email, address, website]
                )
                await activityLog(`company details updated by ${req.user.username} with id: ${req.user.id}`, req)
                req.flash('success_msg', 'company details successfully changed');
            }else{
                req.flash('error_msg', 'something went wrong');

            }

            return res.redirect('/setting');
        }
    }catch(err){
        console.error('Error company request sent returns error: ', err.message)
    }

})



// ====================================================
//             password reset
// ===================================================

router.post('/passwordreset', isAuthenticated, async(req, res)=>{
    const {password, newpassword, comfirmpassword, email} = req.body


    const is_user_valid = await db.query(`
        SELECT * FROM admins where email = $1 
    `, [email])

    if(is_user_valid.rows.length <= 0){
        req.flash('error_msg', 'we can\'t find your record')
        return res.redirect('/setting')
    }

    if(newpassword !== comfirmpassword){
        
        req.flash('error_msg', 'password and confirm password mismatch')
        return res.redirect('/setting')
    }

    if(is_user_valid.rows.length === 1){
        const user_password = is_user_valid.rows[0].password
        const user_id = is_user_valid.rows[0].id

        const isPasswordValid = password && user_password && bcrypt.compareSync(password, user_password);

        if(!isPasswordValid){

            req.flash('error_msg', 'password is invalid, type your correct password')
            return res.redirect('/setting')

        } else {
            const hashedPassword = bcrypt.hashSync(newpassword, 10);
            await db.query(`
                UPDATE admins set password = $1 where id = $2
            `, [hashedPassword, user_id], (err, result)=>{
                if(err){
                    console.error('Error in password reset '+err.message)
                    req.flash('error_msg', "somthing went wrong; trying to change password, please try again later")
                }
                req.flash('success_msg', "successfuly changed password")
            })

            const username = (is_user_valid.rows[0].username);
            const email = (is_user_valid.rows[0].email);

            
            // Build the absolute path to your template
            const templatePath = path.join(__dirname, '../views/emails/password_reset.html');
            const template = fs.readFileSync(templatePath, 'utf-8');
            //getting host
            const host = req.protocol + '://' + req.get('host');
            const redirect_link = `${host}/auth/admin`;        
       


            // Render the template with variables
            const html = ejs.render(template, {
                username: username,
                login_link: redirect_link
            });

            const mail_sent = await sendEMail ({
                to: email,
                // to: "collinsebuleo@gmail.com",
                subject: 'Password reset successfully done!',
                html: html
            });

            if(mail_sent == true){
                req.flash('success_msg', "and email to login")
            }
           return res.redirect('/setting');
        }

      
    }

})

// ====================================================
//           forgotten password
// ===================================================
router.get('/forgotpassword', (req, res)=>{

    res.render('auth/forgot_Password.ejs')

    
})

router.post('/forgotpassword', async(req, res)=>{
    const {email} = req.body
    const token = crypto.randomBytes(32).toString('hex');
    let checkQuery;
    try{
        checkQuery = await db.query(`
        SELECT * FROM admins WHERE email = $1
        `, [email])
        
        if(checkQuery.rows.length <= 0){
            req.flash('error_msg', "no record found");
            return res.redirect('/forgotpassword')
        }

        const user_id = checkQuery.rows[0].id
        const username = checkQuery.rows[0].username
        const emailsplit = email.split('@')
        const shortEmail = (emailsplit[0].slice(0,2)+"***"+emailsplit[0].slice(-3)+"@"+emailsplit[1]);
        //get the host
        const host = req.protocol + '://' + req.get('host');
        const redirect_link = `${req.protocol}://${req.get('host')}/change_password/${token}`;        
       
        const date = new Date();

        await db.query(`
            update admins set token = $1, updated_at = $2 where id = $3   
        `,[token, date, user_id])

        
        // Build the absolute path to your template
        const templatePath = path.join(__dirname, '../views/emails/password_recovery.html');
        const template = fs.readFileSync(templatePath, 'utf-8');

        // Render the template with variables
        const html = ejs.render(template, {
            username: username,
            redirect_link: redirect_link,
        });

        const mail_sent = await sendEMail ({
            // to: email,
            to: "collinsebuleo@gmail.com",
            subject: 'Password resetting request',
            html: html
        });

        if(mail_sent == true){
            req.flash('success_msg', `we just sent you an email, please check your inbox (${shortEmail}) Thanks.`)
            return res.redirect('/forgotpassword');
        }else{
            req.flash('error_msg', `something went wrong please try again`)
            return res.redirect('/forgotpassword');
        }
            
    }catch(err){
        console.error('Error occured on forgotten passsword '+ err.message)
    }    
    
})

router.get('/change_password/:auth', async(req, res)=>{
    let {auth} = req.params
    
    if(!auth){
        auth = "";
    }
    
   try{
        const checkQuery = await db.query(`
            SELECT * FROM admins WHERE token = $1       
        `, [auth])
        if(checkQuery.rows.length <= 0){
            req.flash('error_msg', "can't find the record, please try again?")
            return res.redirect('/forgotpassword')
        }        

   }catch(err){
    console.error("error authenticating tokens for chnage password", err.message);
    
   }
    

    res.render('auth/change_password.ejs' , {auth: auth})

})




router.post('/change_password/:auth', async(req, res)=>{
    const auth = req.params.auth;
    const {password, confirm} = req.body

    try{
        if(! passport == confirm ){
            req.flash('error_msg', "your passwords are not matching")
            return res.redirect('/change_password/'+ auth)
        }

        const checkQuery = await db.query(`
            SELECT * FROM admins WHERE token = $1       
        `, [auth])

        if(checkQuery.rows.length <= 0){
            req.flash('error_msg', "can't find the record, please try again?")
            return res.redirect('/change_password/'+ auth)
        }

        console.log(checkQuery.rows[0]);
        
        const user_id = checkQuery.rows[0].id;

        
        const hashedPassword = bcrypt.hashSync(password, 10);
        await db.query(`
            UPDATE admins set password = $1 where id = $2
        `, [hashedPassword, user_id], (err, result)=>{
            if(err){
                console.error('Error in password reset '+err.message)
                req.flash('error_msg', "somthing went wrong; trying to change password, please try again later")
                return res.redirect('/change_password/'+ auth)
            }
            req.flash('success_msg', "successfuly changed password")
            return res.redirect('/auth/admin')
        })

    }catch(err){
        console.error("Error occured on change password", err.message)
    }


})



// ====================================================
//             settings undate  user profi
// ===================================================
router.post('/setting/update/:userId', isAuthenticated, adminUpdateValidator, async(req, res)=>{
    const userId = req.params.userId;
    const {fname, username, gender, email, mobile, address } = req.body;
    const errors = validationResult(req);
    const error = [];
    if(!errors.isEmpty()){
        errors.array().forEach((err) => {
            error.push(err.msg);
        });
        req.flash("error_msg", error);
        return res.redirect("/setting");
    }
    
    try{
        const checkuser = await db.query("SELECT * FROM admins WHERE id = $1", [userId]);
           
        if(checkuser.rows.length < 1){
            req.flash("error_msg", "can't fetch this user");
            return res.redirect("/setting");
        }

        await db.query("UPDATE admins  SET fullname = $1, username = $2, email = $3, phone = $4, gender = $5, location = $6 where id = $7 ",
        [fname, username, email, mobile, gender, address, userId ]);
        
        if(req.user.user_type === 'staff'){
            await activityLog(`staff record updated name ${fname}, role${req.user.role} `, req);
            await accountModifyNotification(userId,'account update','admins')
        }

        // send email
        
        // Build the absolute path to your template
        const templatePath = path.join(__dirname, '../views/emails/profile_update.html');
        const template = fs.readFileSync(templatePath, 'utf-8');
        // GETTING THE HOST
        const host = req.protocol + '://' + req.get('host');
        const redirect_link = `${host}/auth/admin`;

        // Render the template with variables
        const html = ejs.render(template, {
            username: username,
            redirect_link: redirect_link // this should be customer care whatsapp link
        });

        const mail_sent = await sendEMail ({
            // to: email,
            to: "collinsebuleo@gmail.com",
            subject: 'Profile Update on Ogbu-oge store!',
            html: html
        });

        req.flash("success_msg", "successfully updated");
        if(mail_sent == true){
            req.flash("success_msg", "successfully updated");
        }

        return res.redirect("/setting");

        
    }catch(err){
        console.error("Error: failed to update user ",err.message);
        req.flash("error_msg", "Something went wrong, please try again later");
        return res.redirect("/setting");
    }

})


// ====================================================
//             seetings
// ===================================================

router.get('/setting', isAuthenticated, async(req,res)=>{
    try{
        let query = []
        if(req.user.role == "user"){
            query = await db.query(
                "SELECT * FROM users where id = $1", [req.user.id]
            )   
        }else{
            query = await db.query(
                "SELECT * FROM admins where id = $1", [req.user.id]
            )   
        }
        const userDatail = query.rows[0]

        res.render("admin/settings.ejs", {userDatail})

    }catch(err){
        console.error("error in fetching data for setting: ", err.message);
        req.flash("err_message", "something went wrong please try again few minuites")
        return res.redirect('/dashboard')
        
    }
})



// ============================================ users =========================================
router.get('/users', isAuthenticated, async(req,res)=>{
    try{
        let query = []
        query = await db.query(
            "SELECT * FROM users order by id desc" ,
        )
        const userDatail = query.rows

        res.render("admin/users.ejs", {userDatail})

    }catch(err){
        console.error("error in fetching data for setting: ", err.message);
        req.flash("err_message", "something went wrong please try again few minuites")
        return res.redirect('/dashboard')
        
    }
})

// =================================
//             users  register
// =================================

router.get("/register", (req, res)=>{
    res.render("auth/register.ejs")
})

// ==========================
//          login
// ==========================
router.get("/login", (req, res)=>{
    res.render("auth/login.ejs")

})


module.exports = router;