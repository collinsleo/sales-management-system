// ============================================
//              show error function
// ============================================
function showError(error) {
    const errDisp = document.getElementById("errDisp");
    if(error != ""){
        // alert(error)
        errDisp.parentElement.classList.remove("d-none")
        errDisp.textContent = error
        
    }            
}

// ============================================
//              show passwod function
// ============================================
function togglePassword() {
    
    const pwd = document.getElementById('password');
    pwd.type = pwd.type === 'password' ? 'text' : 'password';

    const confirm = document.getElementById('confirm');
    if(confirm == null){
        return
    }else{

        confirm.type = confirm.type === 'password' ? 'text' : 'password';
    }
}


// ============================================
//              registration form validation
// ============================================
console.log("form validation script loaded");
function newUser(){
    const fNameEl = document.getElementById("FullName").value;
    const lNameEl = document.getElementById("Username").value;
    const emailEl = document.getElementById("email").value;
    const mobileEl = document.getElementById("mobile").value;
    const addressEl = document.getElementById("address").value;
    const passwordEl = document.getElementById("password").value;
    const confirmEl = document.getElementById("confirm").value;
    const regBtn = document.getElementById("regBtn");
    let error = "";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const mobileRegex= /^\+?\d{10,15}$/


    if(fNameEl.trim() == ""|| fNameEl.length < 3){
        error = "first name must be upto 3 characters"
    }else if(lNameEl.trim() == ""|| lNameEl.lenght < 3){
        error = "username name must be upto 3 characters"
    }else if(emailEl.trim() == "" || !emailRegex.test(emailEl)){
        error = "input a valid email"
    }else if(!mobileRegex.test(mobileEl)){
        error= "invalid mobile number"
    }else if(addressEl.trim() == ""){
        error = 'adress is empty'
    }else if(passwordEl.trim() == ""){
        error = "password is required"
    }else if(passwordEl.length < 7){
        error = "password must be up to 7 characters"
    }else if(passwordEl != confirmEl){
        error = "password mismarch"
    }
    else{  
        regBtn.type = "submit";
    }
    console.log(error, regBtn);

    showError(error)

}

// ============================================
//              login form validation
// ============================================
function loginUser(){
    const username = document.getElementById("Username").value;
    const passwordEl = document.getElementById("password").value;
    const loginBtn = document.getElementById("login");
    let error = "";


    if(username.trim() == ""|| username.length < 3){
        error = "invalide username"
    
    }else if(passwordEl.trim() == ""){
        error = "password is required"
    }else{  
        loginBtn.type = "submit";
    }

    showError(error)

}

// ============================================
//              new product form validation
// ============================================
function newProduct(){
    const pNameEl = document.getElementById("product_name").value;
    const cartonCostEl = document.getElementById("cartonCost").value;
    const unitPerCartonEl = document.getElementById("unitPerCarton").value;
    const cartonPriceEl = document.getElementById("cartonPrice").value;
    const unitCostPriceEl = document.getElementById("unitCostPrice").value;
    const quantityEl = document.getElementById("quantity").value;
    const tresholdEl = document.getElementById("treshold").value;
    const regBtn = document.getElementById("addNewProduct");
    let error = "";



    if(pNameEl.trim() == ""|| pNameEl.length < 3){
        error = "product name must be upto 3 characters"
    }else if(cartonCostEl.trim() == ""){
        error = "carton Cost is empty"
    }else if(Number(cartonCostEl) == NaN){
        error = "carton Cost is not a number"
    }else if(unitPerCartonEl.trim() == "" || Number (unitPerCartonEl) == NaN){
        error = "invalid input for unit per carton"
    }else if(cartonPriceEl.trim() == "" || Number (cartonPriceEl) == NaN){
        error = "invalid input for  carton selling price"
    }else if(unitCostPriceEl.trim() == "" || Number (unitCostPriceEl) == NaN){
        error = "invalid input for unit cost price"
    }else if(quantityEl.trim() == "" || Number (quantityEl) == NaN){
        error = "invalid input for quantity"
    }else if(tresholdEl.trim() == "" || Number (quantityEl) == NaN){
        error = "invalid input for treshold"
    }else if(tresholdEl.trim() == "" || Number (quantityEl) == NaN){
        error = "invalid input for treshold"
    }else{  
        regBtn.type = "submit";
        console.log(error, regBtn);
        
    }

    showError(error)

}