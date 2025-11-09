const express = require("express")
const { registerUser, loginUser, getUsers, deleteUser, getProtectedData } = require("../controllers/userController")
const { authMiddleware, adminMiddleware } = require("../middlewares/authMiddleware")

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.get("/", adminMiddleware, getUsers)
router.delete("/:id", adminMiddleware, deleteUser)

module.exports = router
