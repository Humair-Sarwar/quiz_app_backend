const mongoose = require('mongoose');

const {Schema} = mongoose

const mediaSchema = new Schema({
    business_id: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    
}, {
    timestamps: true
})


module.exports = mongoose.model('Media', mediaSchema, 'media');