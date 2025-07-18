
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/admin');
}

//checking for a cathegory user
function authorizeRoles(...cathegory) {
    return function(req, res, next) {
        if (req.isAuthenticated() && cathegory.includes(req.user.role)) {
            return next();
        }
        res.redirect('/auth/admin');
    };
}




//checking if is not a customer role(user)
function is_staff(req){
   if(req.isAuthenticated() &&  req.user.user_type === 'staff'){
       return next();
   }
   res.redirect('/logout')
}


module.exports = {isAuthenticated, authorizeRoles, is_staff};