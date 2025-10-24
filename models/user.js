const mongoose = require('mongoose');

const {Schema} = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    type: {
        type: Number,
        default: 1
    },
    image: {
        type: String,
        default: ""
    },
    cover_image: {
        type: String,
        default: ""
    },
    phone: {
        type: Number,
        default: ""
    },
    country: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
})


module.exports = mongoose.model('User', userSchema, 'users');