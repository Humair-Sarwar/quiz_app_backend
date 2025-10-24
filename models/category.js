const mongoose = require('mongoose');

const {Schema} = mongoose

const categorySchema = new Schema({
    category_name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    sort_order: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: ""
    },
    business_id: {
        type: String,
        required: true

    }
}, {
    timestamps: true
})


module.exports = mongoose.model('Category', categorySchema, 'categories');