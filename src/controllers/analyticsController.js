require("dotenv").config()
const AnalyticsModel = require("../models/analyticsModel")
const path = require("path")
const fs = require("fs")
const { getFormattedDate } = require("../utils/util")

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
              c_end_date: process.env[fileName + "_END_DATE"] || "2025-08-28",
              c_end_time: process.env[fileName + "_END_TIME"] || "20:00",
              c_start_date: process.env[fileName + "_START_DATE"] || "2025-07-28",
              c_start_time: process.env[fileName + "_START_TIME"] || "05:00",
              cost_target: process.env[fileName + "_COST_TARGET"] || 40,
            }
          }, { upsert: true, new: true })
        } 
        // let checklists = ["c_end_date", "c_end_time", "c_start_date", "c_start_time", "cost_target"]
        // for (const p of checklists) {
        //   if (!result[p]) {
        //     return res.status(400).json({ message: `(${p}) - value is null or undefined. ` })
        //   }
        // }
        const chartDest = fileName + ".png"
        const output = path.join(__dirname, "..", "..", "uploads", fileName + ".png")
        if (fs.existsSync(output)) {
          dest.push({
            url: chartDest,
            id: fileName,
            c_end_date: result?.c_end_date,
            c_end_time: result?.c_end_time,
            c_start_date: result?.c_start_date,
            c_start_time: result?.c_start_time,
            cost_target: result?.cost_target,
          })
          continue
        }
        const main = require(`../../uploads/${file}`)

        await main(output)
        dest.push({
          url: chartDest,
          id: fileName,
          c_end_date: result?.c_end_date,
          c_end_time: result?.c_end_time,
          c_start_date: result?.c_start_date,
          c_start_time: result?.c_start_time,
          cost_target: result?.cost_target,
        })
      } catch (error) {
        return res.status(500).json({ message: error.message })
      }
    }
    return res.status(200).json({ dest })
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

module.exports.updateChart = async (req, res) => {
  try {
    let { c_end_date, c_end_time, c_start_date, c_start_time, cost_target, id } = req.body
    fs.readdir(uploadPath, async (err, files) => {
      if (err) {
        fs.mkdir(uploadPath, (e) => { })
        return res.status(200).json({ dest: [] })
      }
      for (const file of files) {
        if (path.extname(file) != ".js" || !file.includes(id)) continue
        let update = await AnalyticsModel.updateOne({ filename: id }, { $set: { c_end_date, c_end_time, c_start_date, c_start_time, cost_target } })

        if (update.modifiedCount > 0) {
          const main = require(`../../uploads/${file}`)
          let endDateSplited = c_end_date.split("-")
          let startDateSplited = c_start_date.split("-")
          let formatted_c_end_date = endDateSplited.reverse().join("/")
          let formatted_c_start_date = startDateSplited.reverse().join("/")


          await main(uploadPath + `/${id}.png`, formatted_c_start_date, formatted_c_end_date, c_start_time, c_end_time, cost_target)
        } else {
          return res.status(409).json({ message: "No changes detected" })
        }
      }
      return res.status(200).json({ dest: { c_end_date, c_end_time, c_start_date, c_start_time, cost_target, id, url: id + ".png" } })
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}
