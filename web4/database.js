const mongoose = require('mongoose');

// Подключение к базе данных MongoDB Atlas
mongoose.connect('mongodb+srv://Aidana:Aidana17@cluster0.4juvz6h.mongodb.net/?retryWrites=true&w=majority')
    .then(() => console.log('Connected to MongoDB Atlas!'))
    .then(images => {
        if (images.length > 0) {
            console.log('Найдено изображение:', images[0]);
        } else {
            console.log('Изображение не найдено');
        }
    })
    .catch(err => console.error('Connection error:', err));

const { Schema, model } = mongoose;

// Схема астероида
const asteroidSchema = new Schema({
    name: String,
    id: String,
    closestApproachDate: String,
    missDistance: {
        kilometers: Number
    }
});


// Схема и модель истории запросов
const historySchema = new Schema({
    userRequest: String,
    apiOutcome: String,
    timestamp: { type: Date, default: Date.now }
});

// User schema
const userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    is_admin: { type: Boolean, default: false }
});

// Logs schema
const logsSchema = new Schema({
    user: { type: mongoose.Types.ObjectId, ref: 'User' },
    request_type: String,
    request_data: String,
    status_code: String,
    timestamp: { type: Date, default: Date.now },
    response_data: String
});

// User IP schema
const userIpSchema = new Schema({
    ip: String,
    user: { type: mongoose.Types.ObjectId, ref: 'User' }
});


const imageSchema = new mongoose.Schema({
    imageUrl: String,
    description: {
        en: String,
        fr: String,
        es: String
    }
});

// Define models
const UserModel = model('User', userSchema);
const LogsModel = model('Logs', logsSchema);
const UserIpModel = model('UserIp', userIpSchema);
const Asteroid = model('Asteroid', asteroidSchema);
const HistoryEntry = model('HistoryEntry', historySchema);
const Image = model('Image', imageSchema);

// Экспорт моделей и схем
module.exports = {
    Asteroid,
    HistoryEntry,
    UserModel,
    LogsModel,
    UserIpModel,
    Image
};

