const mongose = require("mongoose");



const AnalyticsSchema = new mongose.Schema({
    c_start_date: { type: String },
    c_end_date: { type: String },
    c_start_time: { type: String },
    c_end_time: { type: String },
    filename: { type: String, },
    cost_target: { type: Number },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

AnalyticsSchema.index({ filename: 1 }, { unique: true })
const AnalyticsModel = mongose.model('analytics', AnalyticsSchema)

module.exports = AnalyticsModel