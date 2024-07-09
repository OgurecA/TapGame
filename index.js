require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
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

app.post('/register-user', (req, res) => {
    const { telegramId } = req.body;
    db.get(`SELECT telegramId FROM users WHERE telegramId = ?`, [telegramId], function(err, row) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (row) {
            return res.status(200).json({ status: 'already_registered' });
        } else {
            db.run(`INSERT INTO users (telegramId) VALUES (?)`, [telegramId], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to register user' });
                }
                res.json({ status: 'registered', telegramId });
            });
        }
    });
});



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/CLICK/clicker.html');
});

app.post('/save-game', (req, res) => {
    const { telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount } = req.body;
    console.log("Saving game data for:", telegramId);
    const query = `REPLACE INTO users (telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount], function(err) {
        if (err) {
            console.error('Ошибка при сохранении данных:', err);
            res.status(500).json({ message: 'Ошибка при сохранении данных', error: err.message });
        } else {
            res.json({ message: 'Прогресс сохранен', data: req.body });
        }
    });
});


app.get('/load-game', (req, res) => {
    const { telegramId } = req.query;
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

app.post('/telegram-auth', (req, res) => {
    if (checkTelegramAuthentication(req.body)) {
        // Действия после успешной аутентификации
        console.log('Аутентификация пользователя через Telegram прошла успешно:', req.body);
        res.status(200).json({ message: 'Аутентификация успешна' });
    } else {
        res.status(401).json({ message: 'Ошибка аутентификации' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});

function checkTelegramAuthentication(data) {
  const secretKey = crypto.createHash('sha256').update(process.env.BOT_TOKEN).digest();
  const checkString = Object.keys(data).filter(key => key !== 'hash').map(key => `${key}=${data[key]}`).sort().join('\n');
  const hash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
  return hash === data.hash;
}
