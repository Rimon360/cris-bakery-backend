const mongose = require("mongoose");



const AnalyticsSchema = new mongose.Schema({
    cat_Interest_in_Halal: { type: Boolean, default: true },
    cat_Knows_Eastern_Food: { type: Boolean, default: true },
    cat_Local_Customer: { type: Boolean, default: true },
    cat_Parent_with_Child: { type: Boolean, default: true },
    cat_Student: { type: Boolean, default: true },
    cat_Uncategorised: { type: Boolean, default: true }, 

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