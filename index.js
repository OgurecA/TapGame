require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const axios = require('axios');
const app = express();
const cors = require('cors');
const path = require('path');
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*', // Разрешает запросы с любого домена
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешает эти методы
    allowedHeaders: ['Content-Type', 'Authorization'] // Разрешает эти заголовки
}));

app.use(express.static('CLICK'));
app.use(express.json());

const db = new sqlite3.Database('./clickerGame.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Ошибка при подключении к базе данных SQLite:', err);
    } else {
        console.log('Подключено к базе данных SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            telegramId TEXT PRIMARY KEY,
            clickCount INTEGER DEFAULT 0,
            fatigueLevel INTEGER DEFAULT 100,
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


// Этот маршрут теперь будет отправлять HTML страницу, если найдет пользователя
app.get('/:telegramId', (req, res) => {
    const telegramId = req.params.telegramId;
    db.get(`SELECT * FROM users WHERE telegramId = ?`, [telegramId], (err, row) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (row) {
            res.sendFile(path.join(__dirname, 'CLICK', 'clicker.html')); // Отправляем HTML файл
        } else {
            // Пользователь не найден, создаем новую запись с начальными данными
            db.run(`INSERT INTO users (telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount) VALUES (?, 0, 100, 0, 0)`,
            [telegramId], function(err) {
                if (err) {
                    console.error('Ошибка при регистрации нового пользователя:', err);
                    return res.status(500).json({ error: 'Failed to register user' });
                }
                console.log('Новый пользователь зарегистрирован:', telegramId);
                res.sendFile(path.join(__dirname, 'CLICK', 'clicker.html')); // Отправляем HTML файл после регистрации
            });
        }
    });
});

app.post('/:telegramId', (req, res) => {
    const { telegramId } = req.params;
    const { clickCount, fatigueLevel, experienceLevel, experienceAmount } = req.body;

    // Обновление данных пользователя в базе данных
    db.run(`UPDATE users SET clickCount = ?, fatigueLevel = ?, experienceLevel = ?, experienceAmount = ? WHERE telegramId = ?`,
        [clickCount, fatigueLevel, experienceLevel, experienceAmount, telegramId], function(err) {
            if (err) {
                console.error('Ошибка при сохранении данных:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            res.json({ message: 'Прогресс сохранен', telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount });
        });
});


// Загрузка данных игры для конкретного пользователя
app.get('/:telegramId', (req, res) => {
    const telegramId = req.params.telegramId;
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

app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
