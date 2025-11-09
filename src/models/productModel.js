const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true
  },
  wastage: {
    type:Number,
    default:0
  },
  baked: {
    type:Number,
    default:0
  },
  seq: { type: Number, default: 0 },
  shop_id: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserModel = mongoose.model("products", productSchema);
module.exports = UserModel;
