const express = require("express");
const { adminMiddleware } = require("../middlewares/authMiddleware");
const path = require("path"); 
const { analyticsAdd, getChart, deleteChart,updateChart, resetChartDate } = require("../controllers/analyticsController")
const router = express.Router();

 

// const fileFilter = (req, file, cb) => {
//     console.log("Checking:", file.fieldname, file.originalname, file.mimetype);
//     const rule = {
//         data: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
//         code: ['application/javascript', 'text/javascript']
//     }
//     const allowedType = rule[file.fieldname];
//     if (!allowedType) return cb(new Error("Unexpacted field: " + file.filename), false)
//     if (allowedType.includes(file.mimetype)) {
//         cb(null, true)
//     } else {
//         cb(new Error("Invalid file format"), false)
//     }

// }
// const upload = multer({
//     storage,
//     limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
//     fileFilter,
// })



// router.post('/add', adminMiddleware, upload.fields([{ name: "data", maxCount: 1 }, { name: "code", maxCount: 1 }]), (err, req, res, next) => { if (err) { return res.status(400).json({ error: err.message }) } else next() }, analyticsAdd)

router.get("/getchart", adminMiddleware, getChart)
router.post("/update", adminMiddleware, updateChart)
router.post("/resetchartdate",  resetChartDate)
// router.post("/delete", adminMiddleware, deleteChart)

module.exports = router;