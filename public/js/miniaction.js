function generateUniqeId(){
    var nums = "1234567890"
    var userid = Math.floor(Math.random(0, nums) * 9999999999)
    document.getElementById("userid").value=Number(userid)

}

// showing success notification
function notify(){
    let notifyEl = document.getElementById("notification");
    notifyEl.classList.remove('d-none')
    console.log("active");
    
    setTimeout(offNotify, 5000);
    
}

function offNotify(){
    let notifyEl = document.getElementById("notification");
    notifyEl.classList.add('d-none')
    console.log("hide");
    

}