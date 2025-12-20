require("dotenv").config()
const express = require("express")
const userRoutes = require("./routes/userRoutes")
const shopRoutes = require("./routes/shopRoutes")
const analyticsRoute = require("./routes/analytics")
const productRoutes = require("./routes/productRoutes")
const mongoose = require("mongoose")
const dbConfig = require("./config/dbConfig")
const cors = require("cors")
const app = express()
const path = require("path")
const verifyToken = require("./middlewares/verifyToken")

const allowedOrigins = ["http://localhost:3000", "http://192.168.0.159:3000", "http://localhost:4173","https://api.goldencrust.london"]
// const allowedOrigins = ["https://goldencrust.london","https://api.goldencrust.london"]

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback("Not allowed by CORS", false)
      }
    },
  })
)
app.use(express.json())

mongoose
  .connect(dbConfig.url)
  .then(() => {
    console.log("MongoDB connected")
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
  })
app.use("/api/users", userRoutes)

app.use("/api/products", productRoutes)
app.use("/api/analytics", analyticsRoute)
app.get("/api/verify-token", verifyToken, (req, res) => {
  res.json({ message: "success", user: req.user })
})

app.use("/api/shops", shopRoutes)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")))
app.use((req, res) => {
  res.status(404).json({ message: "You are alone here!" })
})

module.exports = app
