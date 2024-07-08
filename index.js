require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*', // Разрешает запросы с любого домена
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешает эти методы
    allowedHeaders: ['Content-Type', 'Authorization'] // Разрешает эти заголовки
}));

app.use(express.static('CLICK'));
app.use(express.json());

// Подключение и создание таблицы в базе данных SQLite
const db = new sqlite3.Database('./clickerGame.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных SQLite:', err);
    } else {
        console.log('Подключено к базе данных SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            telegramId TEXT PRIMARY KEY,
            clickCount INTEGER DEFAULT 0,
            fatigueLevel INTEGER DEFAULT 0,
            experienceLevel INTEGER DEFAULT 0,
            experienceAmount INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('Ошибка при создании таблицы пользователей:', err);
            } else {
                console.log('Таблица пользователей успешно создана или уже существует.');
            }
        });
    }
});

// Маршрут по умолчанию для отдачи HTML-файла
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/CLICK/clicker.html');
});

// API для сохранения игры
app.post('/save-game', (req, res) => {
    const { telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount } = req.body;
    console.log("Получен запрос на сохранение для пользователя:", telegramId); // Логирование telegramId
    const query = `REPLACE INTO users (telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount], function(err) {
        if (err) {
            console.error('Ошибка при сохранении данных:', err);
            res.status(500).json({ message: 'Ошибка при сохранении данных', error: err.message });
        } else {
            res.json({ message: 'Прогресс сохранен' });
        }
    });
});

// API для загрузки игры
app.get('/load-game', (req, res) => {
    const { telegramId } = req.query;
    console.log("Получен запрос на загрузку для пользователя:", telegramId); // Логирование telegramId
    db.get(`SELECT * FROM users WHERE telegramId = ?`, [telegramId], (err, row) => {
        if (err) {
            console.error('Ошибка при загрузке данных:', err);
            res.status(500).json({ message: 'Ошибка при загрузке данных', error: err.message });
        } else if (row) {
            res.json(row);
        } else {
            res.status(404).json({ message: 'Прогресс не найден' });
        }
    });
});


// Запуск сервера
app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
