require("dotenv").config()
const AnalyticsModel = require("../models/analyticsModel")
const path = require("path")
const fs = require("fs")
const { getFormattedDate, subtractDaysFromNow } = require("../utils/util")

// module.exports.analyticsAdd = async (req, res) => {
//     let dataDest = req.files['data']?.[0].filename;
//     let codeDest = req.files['code']?.[0].filename;
//     if (!dataDest || !codeDest) return res.status(422).json({ error: true, message: "Missing input field" })
//     let { title } = req.body;

//     let [c_end_date, c_end_time, c_start_date, c_start_time, cost_target] = [getFormattedDate(), '20:00', getFormattedDate(), '05:00', 80]

//     try {
//         let result = await AnalyticsModel.insertOne({ title, dataDest, codeDest, c_end_date, c_end_time, c_start_date, c_start_time, cost_target })
//         return res.status(200).json({ message: "Chart created successfully!", result })
//     } catch (error) {
//         return res.status(400).json({ message: "Failed to create chart", error })
//     }

// }
const uploadPath = path.join(__dirname, "..", "..", "uploads")

module.exports.getChart = async (req, res) => {
  fs.readdir(uploadPath, async (err, files) => {
    if (err) {
      fs.mkdir(uploadPath, (e) => { })
      return res.status(200).json({ dest: [] })
    }
    let dest = []
    let isError = false;
    let resMain = null
    for (const file of files) {
      try {
        const fileName = file.split(".")[0]

        if (path.extname(file) != ".js") continue
        if (!file.includes(fileName)) continue

        // db start
        let result = await AnalyticsModel.findOne({ filename: fileName })
        if (!result) {
          result = await AnalyticsModel.findOneAndUpdate({ filename: fileName }, {
            $setOnInsert: {
              filename: fileName,
              c_end_date: subtractDaysFromNow(1),
              c_start_date: subtractDaysFromNow(8),
              c_end_time: "20:00",
              c_start_time: "05:00",
              cost_target: 40,
            }
          }, { upsert: true, new: true })
        }
        const chartDest = fileName + ".png"
        const output = path.join(__dirname, "..", "..", "uploads", fileName + ".png")
        const {
          c_start_date,
          c_end_date,
          c_start_time,
          c_end_time,
          cost_target,
          cat_Interest_in_Halal,
          cat_Knows_Eastern_Food,
          cat_Local_Customer,
          cat_Parent_with_Child,
          cat_Student,
          cat_Uncategorised, selected_products } = result;
        if (fs.existsSync(output) && !fileName.includes('ProductsQty')) {
          dest.push({
            selected_products,
            resMain,
            url: chartDest,
            id: fileName,
            cat_Interest_in_Halal,
            cat_Knows_Eastern_Food,
            cat_Local_Customer,
            cat_Parent_with_Child,
            cat_Student,
            cat_Uncategorised,
            c_end_date: result?.c_end_date,
            c_start_date: result?.c_start_date,
            c_end_time: result?.c_end_time,
            c_start_time: result?.c_start_time,
            cost_target: result?.cost_target,
          })
          continue
        }
        const main = require(`../../uploads/${file}`)
        let endDateSplited = c_end_date.split("-")
        let startDateSplited = c_start_date.split("-")
        let formatted_c_end_date = endDateSplited.reverse().join("/")
        let formatted_c_start_date = startDateSplited.reverse().join("/")

        let options = {
          formatted_c_start_date,
          formatted_c_end_date,
          c_start_time,
          c_end_time,
          cost_target,
          cat_Interest_in_Halal,
          cat_Knows_Eastern_Food,
          cat_Local_Customer,
          cat_Parent_with_Child,
          cat_Student,
          cat_Uncategorised,
          selected_products
        }

        try {
          resMain = await main(uploadPath + `/${fileName}.png`, options)
        } catch (error) {
          isError = error.message
        }
        dest.push({
          resMain,
          url: chartDest,
          id: fileName,
          cat_Interest_in_Halal,
          cat_Knows_Eastern_Food,
          cat_Local_Customer,
          cat_Parent_with_Child,
          cat_Student,
          cat_Uncategorised,
          c_end_date: result?.c_end_date,
          c_start_date: result?.c_start_date,
          c_end_time: result?.c_end_time,
          c_start_time: result?.c_start_time,
          cost_target: result?.cost_target,
        })
      } catch (error) {
        return res.status(500).json({ message: error.message })
      }
    }
    return res.status(200).json({ dest, isError })
  })
}
// module.exports.deleteChart = async (req, res) => {
//     const { id } = req.body;
//     try {
//         let data = await AnalyticsModel.findById({ _id: id });
//         let { codeDest, dataDest } = data;
//         fs.unlink('uploads/' + codeDest, e => console.log(e))
//         fs.unlink('uploads/' + dataDest, e => console.log(e))
//         fs.unlink('uploads/' + dataDest + '.jpg', e => console.log(e))
//         await AnalyticsModel.deleteOne({ _id: id }).sort({ createdAt: -1 })
//         return res.status(200).json({ message: "Chart has been deleted!" })
//     } catch (err) {

//         return res.status(500).json({ error: true, message: "Failed to delete chart!" })
//     }
// }
module.exports.resetChartDate = async (req, res) => {


  function deleteAllPng(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.toLowerCase().endsWith(".png")) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }

  // usage
  deleteAllPng(uploadPath);

  await AnalyticsModel.updateMany({}, { c_end_date: subtractDaysFromNow(1), c_start_date: subtractDaysFromNow(8) })
  return res.status(200).json({})
}
module.exports.updateChart = async (req, res) => {
  try {
    let { c_end_date, c_end_time, c_start_date, c_start_time, cost_target, id,
      cat_Interest_in_Halal,
      cat_Knows_Eastern_Food,
      cat_Local_Customer,
      cat_Parent_with_Child,
      cat_Student,
      cat_Uncategorised, selected_products } = req.body

    fs.readdir(uploadPath, async (err, files) => {
      if (err) {
        fs.mkdir(uploadPath, (e) => { })
        return res.status(200).json({ dest: [] })
      }
      let isError = false;
      let resMain = null
      for (const file of files) {
        if (path.extname(file) != ".js" || !file.includes(id)) continue
        let update = await AnalyticsModel.updateOne({ filename: id }, {
          $set: {
            cat_Interest_in_Halal,
            cat_Knows_Eastern_Food,
            cat_Local_Customer,
            cat_Parent_with_Child,
            cat_Student,
            cat_Uncategorised,
            selected_products,
            c_end_date,
            c_end_time,
            c_start_date,
            c_start_time,
            cost_target
          }
        })

        if (update.modifiedCount > 0) {
          const main = require(`../../uploads/${file}`)
          let endDateSplited = c_end_date.split("-")
          let startDateSplited = c_start_date.split("-")
          let formatted_c_end_date = endDateSplited.reverse().join("/")
          let formatted_c_start_date = startDateSplited.reverse().join("/")

          let options = {
            formatted_c_start_date, formatted_c_end_date, c_start_time, c_end_time, cost_target,
            cat_Interest_in_Halal,
            cat_Knows_Eastern_Food,
            cat_Local_Customer,
            cat_Parent_with_Child,
            cat_Student,
            cat_Uncategorised,
            selected_products
          }

          try {
            resMain = await main(uploadPath + `/${id}.png`, options)
          } catch (error) {
            isError = error.message
          }
        } else {
          return res.status(409).json({ message: "No changes detected" })
        }
      }
      return res.status(200).json({
        dest: {
          resMain,
          c_end_date, c_end_time, c_start_date, c_start_time, cost_target, id, url: id + ".png", cat_Interest_in_Halal,
          cat_Knows_Eastern_Food,
          cat_Local_Customer,
          cat_Parent_with_Child,
          cat_Student,
          cat_Uncategorised,
          selected_products
        }, isError
      })
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
