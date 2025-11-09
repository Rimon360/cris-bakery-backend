require("dotenv").config()
const UserModel = require("../models/userModel")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { seq } = require("../utils/util")
module.exports.registerUser = async (req, res) => {
  try {
    let { username, password, role } = req.body
    if (!role) role = "member"
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" })
    }
    // check if user exists
    const userExists = await UserModel.findOne({ username })
    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }
    // hash password
    const solt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, solt)
    // create user
    const random = seq()
    const user = await UserModel.create({
      seq: random,
      username,
      password: hashedPassword,
      role,
    })
    if (user) {
      return res.status(200).json({
        message: "User registered successfully",
        user,
        token: generateToken(user._id),
      })
    }
  } catch (error) {
    return res.status(200).json({
      message: error.message,
    })
  }
}

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body

    const user = await UserModel.findOne({ username })
    if (!user) {
      return res.status(404).json({ message: "Invalid Credentials" })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(404).json({ message: "Invalid Credentials" })
    }
    const token = jwt.sign({ _id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" })

    return res.json({ token })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  })
}

exports.getUsers = async (req, res) => {
  try {
    const users = await UserModel.find().sort({ createdAt: -1 })
   return res.json(users)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.params.id)
    if (!deletedUser) return res.status(404).json({ message: "User not found" })
    return res.json({ message: "User deleted successfully" })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}
