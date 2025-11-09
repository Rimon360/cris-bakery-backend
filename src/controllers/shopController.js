const { shopsModel, assignModel } = require("../models/shopModel")
const productModel = require("../models/productModel")
const { seq } = require("../utils/util")
const UserModel = require("../models/userModel")
module.exports.createShop = async (req, res) => {
  try {
    const { shop_name } = req.body
    if (!shop_name) {
      return res.status(400).json({ message: "Shop name is required" })
    }

    const exists = await shopsModel.findOne({ shop_name })
    if (exists) {
      return res.status(400).json({ message: "Shop already exists" })
    }

    const shops = await shopsModel.create({ shop_name, seq: seq() })
    return res.status(200).json({ message: "Shop created successfully", shops })
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}
module.exports.updateShopHeader = async (req, res) => {
  try {
    const { shop_id, cash_today, expenses_today, cash_deposit, date_deposit } = req.body
    if (!shop_id) {
      return res.status(400).json({ message: "Shop id is required" })
    }
    const update = await shopsModel.updateOne(
      { _id: shop_id },
      {
        $set: {
          cash_today: cash_today.trim(),
          expenses_today: expenses_today.trim(),
          cash_deposit: cash_deposit.trim(),
          date_deposit: date_deposit.trim(),
        },
      }
    )
    if (update.modifiedCount > 0) {
      return res.status(200).json({ message: "Updated Successfully" })
    } else {
      return res.status(400).json({ message: "No Changes Detected" })
    }
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
}
module.exports.assignShop = async (req, res) => {
  try {
    const { shop_id, user_id } = req.body
    if (!shop_id) {
      return res.status(400).json({ message: "shop id is required" })
    }
    if (!user_id) {
      return res.status(400).json({ message: "user id is required" })
    }
    const shop = await assignModel.findById(shop_id)
    if (shop) {
      return res.status(404).json({ message: "shop already assigned" })
    }
    const random = seq()
    const shops = await assignModel.create({
      seq: random,
      shop_id,
      user_id,
    })
    if (!shops) {
      return res.status(400).json({ message: "shop not assigned" })
    }
    return res.status(200).json({ message: "Shop assigned successfully", shops })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}
module.exports.unassignShop = async (req, res) => {
  try {
    const { shop_id, user_id } = req.body
    if (!shop_id) {
      return res.status(400).json({ message: "Shop id is required" })
    }
    if (!user_id) {
      return res.status(400).json({ message: "User id is required" })
    }
    const deleted = await assignModel.findOneAndDelete({ shop_id, user_id })
    if (!deleted) {
      return res.status(404).json({ message: "Shop not found" })
    }
    return res.status(200).json({ message: "Shop unassigned successfully" })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}
module.exports.deleteShop = async (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({ message: "Shop id is required" })
    }
    const deleted = await shopsModel.deleteOne({ _id: id })
    const assignDeleted = await assignModel.deleteMany({ shop_id: id })
    const assignProduct = await productModel.deleteMany({ shop_id: id })
    return res.status(200).json({ message: "Shop deleted successfully", deleted, assignDeleted, assignProduct })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}
module.exports.getAssignedShops = async (req, res) => {
  try {
    const { user_id } = req.params
    if (!user_id) {
      return res.status(400).json({ message: "User id is required" })
    }
    const shops = await assignModel.find({ user_id }).distinct("shop_id").sort({ createdAt: -1 })
    if (!shops) {
      return res.status(200).json({ message: "No shop assigned", shops: [] })
    }
    return res.status(200).json({ shops })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}

module.exports.getAllShop = async (req, res) => {
  try {
    const shops = await shopsModel.find().sort({ _id: 1 })
    return res.status(200).json({
      shops,
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}
module.exports.getShopByUserId = async (req, res) => {
  try {
    const { id } = req.params
    const shopsId = await assignModel.find({ user_id: id }).distinct("shop_id")
    if (shopsId.length < 1) {
      return res.status(200).json({ message: "No shop assigned yet", shops: [] })
    }
    const shops = await shopsModel.find({ _id: { $in: shopsId } }).sort({ createdAt: -1 })
    return res.status(200).json({
      shops,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}
module.exports.getUserByShopId = async (req, res) => {
  try {
    const { shop_id } = req.params
    const user_ids = await assignModel.find({ shop_id: shop_id }).distinct("user_id")
    if (user_ids.length < 1) {
      return res.status(200).json({ message: "No shop assigned yet", users: [] })
    }
    const users = await UserModel.find({ _id: { $in: user_ids } }).sort({ username: 1 })
    return res.status(200).json({
      users,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}
module.exports.getShopById = async (req, res) => {
  try {
    const { shop_id } = req.params
    if (!shop_id) {
      return res.status(400).json({ message: "Shop id is required" })
    }
    const shop = await shopsModel.findOne({ _id: shop_id }, { cash_today: 1, cash_deposit: 1, date_deposit: 1, expenses_today: 1 })
    return res.status(200).json(shop)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
}
