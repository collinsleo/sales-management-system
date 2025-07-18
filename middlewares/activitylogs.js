
const activityLog = async function(action, req){
    const db = require('../config/db')
    let user_id ="unknown"; let user_role = "unknown";

    if(req.user){
        user_id = Number(req.user.id) ;
        user_role = req.user.role ;
    }
    
    await db.query(
        'INSERT INTO activity_logs (user_id, user_role, action) values ($1, $2, $3)',[user_id, user_role, action]
    )
}

module.exports = activityLog;