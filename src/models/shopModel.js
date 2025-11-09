const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  shop_name: {
    type: String,
    required: true
  },
  seq: { type: Number, default: 0 },
  cash_today: { type: String, default: "" },
  expenses_today: { type: String, default: "" },
  cash_deposit: { type: String, default: "" },
  date_deposit: { type: String, default: "" },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const assignedShopSchema = new mongoose.Schema({
  shop_id: {
    type: String,
    ref: "shops",
  },
  user_id: {
    type: String,
    ref: "users",
  },
  seq: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const shopsModel = mongoose.model("shops", shopSchema);
const assignModel = mongoose.model("assigned_shops", assignedShopSchema);
module.exports = { shopsModel, assignModel };