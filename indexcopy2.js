require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const axios = require('axios');
const app = express();
const cors = require('cors');
const path = require('path');
const port = process.env.PORT || 3000;
const fs = require('fs'); // Добавьте эту строку в начало файла
const bodyParser = require('body-parser');

let lastTelegramId = null;

//export TELEGRAM_BOT_TOKEN='7426292134:AAF0lGQa32nn5M8c4WuK8PYvB1CVhHA7qH8'


app.use(cors({
    origin: '*', // Разрешает запросы с любого домена
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Разрешает эти методы
    allowedHeaders: ['Content-Type', 'Authorization'] // Разрешает эти заголовки
}));

app.use(bodyParser.json());
app.use(express.static('CLICK'));
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.status(204)); // Отправляет статус 204 (No Content)


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
            experienceAmount INTEGER DEFAULT 0,
			lastTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Ошибка при создании таблицы пользователей:', err);
            } else {
                console.log('Таблица пользователей успешно создана или уже существует.');
            }
        });
    }
});


function getUserData(telegramId, callback) {
    db.get("SELECT * FROM users WHERE telegramId = ?", [telegramId], (err, row) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            callback(err, null); // Возвращаем ошибку и null в качестве данных
        } else if (row) {
            console.log('Данные пользователя получены:', row);
            callback(null, row); // Возвращаем null в качестве ошибки и данные пользователя
        } else {
            console.log('Пользователь не найден:', telegramId);
            callback(null, null); // Пользователь не найден, возвращаем null в качестве ошибки и данных
        }
    });
}



app.post('/hook', async (req, res) => {
    console.log(req.body); // Логируем входящий запрос для отладки

    if (req.body.message && req.body.message.chat && req.body.message.text) {
        const chatId = req.body.message.chat.id;
        const telegramId = req.body.message.from.id; // Получаем ID пользователя
        const text = req.body.message.text;

        console.log("Chat ID:", chatId);
        console.log("Telegram ID:", telegramId);
		
		lastTelegramId = telegramId;
		
        // Логика ответа на команду /start
        if (text === '/start') {
            await sendMessage(chatId, 't.me/ABoogieWoogieBot/BoxingL');
            // Перенаправление сразу после отправки сообщения
        }

        res.status(200).send('Received');
    } else {
        res.status(400).send('Bad Request');
    }
});


app.get('/hook', (req, res) => {
    if (lastTelegramId) {
        res.redirect(`https://boxinglab.online/${lastTelegramId}`);
    } else {
        res.status(404).send('No telegram ID available');
    }
});




async function sendMessage(chatId, text) {
    const token = '7426292134:AAF0lGQa32nn5M8c4WuK8PYvB1CVhHA7qH8'; // Убедитесь, что ваш токен корректен и сохранён безопасно
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
    };

    try {
        const response = await axios.post(url, payload);
        console.log('Message sent:', response.data);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}



















app.post('/:telegramId', (req, res) => {
    console.log('Получен POST запрос для:', req.params.telegramId); // Логирование при получении запроса
    const telegramId = req.params.telegramId;
    const { clickCount, fatigueLevel, experienceLevel, experienceAmount } = req.body;
	const lastTime = new Date().toISOString();
    console.log('Данные для обновления:', req.body); // Логирование полученных данных

    db.run(
        `UPDATE users SET clickCount = ?, fatigueLevel = ?, experienceLevel = ?, experienceAmount = ? WHERE telegramId = ?`,
        [clickCount, fatigueLevel, experienceLevel, experienceAmount, telegramId],
        function(err) {
            if (err) {
                console.error('Ошибка при обновлении данных пользователя:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log('Прогресс для пользователя', telegramId, 'был успешно обновлен'); // Логирование успешного обновления
            res.json({ message: 'Прогресс сохранен', telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount });
        }
    );
});

app.get('/', (req, res) => {
    // Отправляем HTML, который загрузит Telegram Web App SDK и выполнит перенаправление
    res.sendFile(__dirname + '/CLICK/clicker.html');
});


// Этот маршрут теперь будет отправлять HTML страницу, если найдет пользователя
app.get('/:telegramId', (req, res) => {
    const telegramId = req.params.telegramId;
    db.get(`SELECT * FROM users WHERE telegramId = ?`, [telegramId], (err, row) => {
        if (row) {
            console.log(`Пользователь подключен: ${telegramId}`);
            console.log(`Статы пользователя: 
                ClickCount: ${row.clickCount},
                FatigueLevel: ${row.fatigueLevel},
                ExperienceLevel: ${row.experienceLevel},
                ExperienceAmount: ${row.experienceAmount}`);
			res.sendFile(path.join(__dirname, 'CLICK', 'clicker.html'));
        } else {
            console.log(`Пользователь не найден, регистрируем и перенаправляем`);
            db.run(`INSERT INTO users (telegramId, clickCount, fatigueLevel, experienceLevel, experienceAmount) VALUES (?, 0, 100, 0, 0)`,
            [telegramId], function(err) {
                if (err) {
                    console.error('Ошибка при регистрации нового пользователя:', err);
                    return res.status(500).send('Failed to register user');
                } else {
					res.redirect(`/${telegramId}`);
				}
            });
        }
		
    });
});

function calculateFatigueRecovery(fatigueLevel, lastTime) {
    const recoveryRate = 240; // Скорость восстановления в час
    const now = new Date();
    const lastUpdateDate = new Date(lastTime);
    const hoursPassed = (now - lastUpdateDate) / 3600000; // Прошедшие часы

    return Math.round(Math.min(100, fatigueLevel + hoursPassed * recoveryRate));
}

// Загрузка данных игры для конкретного пользователя
app.get('/load/:telegramId', (req, res) => {
    const telegramId = req.params.telegramId;
    db.get(`SELECT * FROM users WHERE telegramId = ?`, [telegramId], (err, row) => {
        if (err) {
            console.error('Ошибка при запросе к базе данных:', err);
            return res.status(500).send('Database error');
        }
        if (row) {
            const updatedFatigue = calculateFatigueRecovery(row.fatigueLevel, row.lastUpdated);
            const now = new Date().toISOString();
            db.run(
                `UPDATE users SET fatigueLevel = ?, lastUpdated = ? WHERE telegramId = ?`,
                [updatedFatigue, now, telegramId],
                (updateErr) => {
                    if (updateErr) {
                        console.error('Ошибка при обновлении данных пользователя:', updateErr);
                        return res.status(500).send('Database update error');
                    }
                    row.fatigueLevel = updatedFatigue;
                    row.lastUpdated = now;
                    console.log(`Данные обновлены для Telegram ID: ${telegramId}`);
                    res.json(row);
                }
            );
        } else {
            res.status(404).send('User not found');
        }
    });
});



app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});