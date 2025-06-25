const multer = require('multer')
const path =  require('path')

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null, 'public/uploads/');
    },

    filename:(req,file,cb)=>{
        const   uniqueName = Date.now() +'-'+ file.originalname;
        cb( null, uniqueName) 
    }
})

function filefilter(req, file,cb){
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if(extName && mimetype){
        return cb(null, true);
    } else {
        cb('File upload only supports ' + String(allowedTypes).replaceAll("|", " - "), false)
    }   
}

const upload = multer({
    storage:storage,
    limits:{fileSize: 2 * 1024 * 1024}, // 2MB
    fileFilter:filefilter
});


module.exports = upload;
// module.exports = upload.single('image'); // for single file upload