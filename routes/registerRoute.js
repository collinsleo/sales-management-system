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

// =================================
//             admin  register
// =================================

router.get("/admin_signup",authorizeRoles('admin'), (req, res)=>{
    res.render("auth/admin_signup.ejs")
    
})

router.post('/admin_signup', authorizeRoles('admin'), validateAdminSignup, async(req,res)=>{
    const {fname, username, role, gender, email, mobile, address, password, confirm } = req.body
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

                await db.query("INSERT INTO admins (fullname, username, email, phone, role, gender, location,password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [fname, username, email, mobile, role, gender, address, hashedPassword], async (err, result)=>{
                    if(err){
                        console.error("failed to insert new admin",err.message);
                        req.flash("error_msg", "Something went wrong, please try again later");
                        return res.redirect("/admin_signup");
                    }  
                    
                    await activityLog(`new user created!!! name: ${fname}, role: ${role}`,req)

                    req.flash("success_msg", "Admin registered successfully");
                    return res.redirect("/admin/staff");
                })
            }
        })
    }catch(err){
        console.error("Error: failed to singup new admin ",err.message);
        req.flash("error_msg", "Something went wrong, please try again later");
        return res.redirect("/admin_signup");
    }
})

// ==========================
//          admin-login
// ==========================

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
    let path ="";
    if(req.user.role !== 'user'){
        path = '/auth/admin';
    }else{
        path = '/login';
    }    
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

        req.flash("success_msg", "successfully updated");
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




// =================================
//             users  register
// =================================



// ==========================
//          login
// ==========================
router.get("/login", (req, res)=>{
    res.render("auth/login.ejs")

})


module.exports = router;