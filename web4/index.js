const express = require('express');
const mongoose = require('mongoose');
const { getNASAImage , getNewsByCity,getAsteroids } = require('./api');
const { UserModel, LogsModel, UserIpModel,Asteroid, HistoryEntry, Image } = require('./database');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const fetch = require('node-fetch');
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });
const dbUrl = 'mongodb+srv://Aidana:Aidana17@cluster0.4juvz6h.mongodb.net/?retryWrites=true&w=majority';
const connectionParams = { useNewUrlParser: true, useUnifiedTopology: true };
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
// Настройка статических файлов
app.use(express.static('uploads'));

// Вызов метода find() для поиска изображения в базе данных и преобразование результатов в массив
const imageQuery = Image.find();

Image.find().exec()
    .then(images => {
        if (images.length > 0) {
            console.log('Найдено изображение:', images[0]);
        } else {
            console.log('Изображение не найдено');
        }
    })
    .catch(error => {
        console.error('Ошибка при поиске изображения:', error);
    });

imageQuery.then(images => {
    // Проверка, было ли найдено изображение
    if (images.length > 0) {
        // Если изображение найдено, выполните ваш код для обработки найденного изображения здесь
        console.log('Найдено изображение:', images[0]); // Предполагается, что images - массив изображений, и выводится первое изображение
    } else {
        // Если изображение не найдено, выполните ваш код для обработки этого случая здесь
        console.log('Изображение не найдено');
    }
})
.catch(error => {
    // Обработка ошибок при выполнении запроса
    console.error('Ошибка при поиске изображения:', error);
});




const imageData = {
    name: 'Foto',
    path: 'uploads'
};
// Создание нового объекта Image и сохранение его в базе данных
const newImage = new Image(imageData);
newImage.save()
    .then(savedImage => {
        console.log('Изображение успешно сохранено:', savedImage);
    })
    .catch(error => {
        console.error('Ошибка при сохранении изображения:', error);
    });


// Маршрут для обработки загрузки фотографии и описания
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const imageUrl = req.file.path; // Путь к загруженному изображению
        // Сохранение информации о фотографии в базе данных
        const image = new Image({ name, description, imageUrl });
        await image.save();
        res.redirect('/home');
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Маршрут для удаления изображения администратором
app.post('/adminpanel/deleteImage/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        await Image.findByIdAndDelete(imageId);
        res.redirect('/adminpanel');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/adminpanel/updateImage/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        const { description } = req.body;
        await Image.findByIdAndUpdate(imageId, { description });
        res.redirect('/adminpanel');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/adminpanel/addImage', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            // Если файл не был загружен, обработайте эту ситуацию здесь
            return res.status(400).send('No file uploaded');
        }
        
        const { filename } = req.file;
        const { name, description } = req.body;
        const imageUrl = `/uploads/${filename}`;
        const newImage = new Image({
            name,
            imageUrl,
            description
        });
        await newImage.save();
        res.redirect('/adminpanel');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});






app.get('/asteroids', async (req, res) => {
    try {
        const startDate = req.query.start_date || '2024-02-19';
        const endDate = req.query.end_date || '2024-02-20';
        const asteroidsData = await getAsteroids(startDate, endDate);
        const userRequest = `Asteroids API Request: start_date=${startDate}, end_date=${endDate}`;
        const apiOutcome = JSON.stringify(asteroidsData);
        const historyEntry = new HistoryEntry({ userRequest, apiOutcome });
        await historyEntry.save();

        // Saving asteroids to the database
        const savedAsteroids = await Promise.all(asteroidsData.map(async (asteroidData) => {
            const existingAsteroid = await Asteroid.findOne({ id: asteroidData.id });
            if (!existingAsteroid) {
                const newAsteroid = new Asteroid({
                    name: asteroidData.name,
                    id: asteroidData.id,
                    closestApproachDate: asteroidData.close_approach_data[0].close_approach_date,
                    missDistance: {
                        kilometers: asteroidData.close_approach_data[0].miss_distance.kilometers,
                    },
                });
                await newAsteroid.save();
                return newAsteroid;
            }
            return existingAsteroid;
        }));

        res.render('asteroids', { asteroids: savedAsteroids});

    } catch (error) {
        console.error('Error fetching asteroids:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get("/news", async (req, res) => {
    const news = await getNewsByCity();
    const user = await getUserInstance(req.ip);

    if (!news) {
        return res.render('news.ejs', { activePage: "news", user: user, error: "Could not fetch news", data: null });
    }

    res.render('news.ejs', { activePage: "news", user: user, data: news, error: null });
    LogsModel.create({ user: user ? user._id : null, request_type: "news", request_data: null, status_code: "200", timestamp: new Date(), response_data: JSON.stringify(news)});
});

app.get('/apod', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const image = await getNASAImage(date);
        res.render('apod', { image });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


mongoose.connect(dbUrl, connectionParams)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');

    try {
      const existingAdmin = await UserModel.findOne({ is_admin: true }); // Проверяем наличие администратора

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash("Aidana17", 10); // Хэшируем пароль
        const adminUser = new UserModel({
          username: "Aidana17",
          password: hashedPassword, // Пароль должен быть хэширован
          email: "ibrvevv@gmail.com",
          is_admin: true
        });

        await adminUser.save();
        console.log('Admin user created successfully');
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  })
  .catch(err => console.error('Connection error:', err));

// Здесь остальной код вашего приложения, включая установку прослушивания порта для Express


app.use(session({
    secret: 'secret-key', 
    resave: false,
    saveUninitialized: true
}));

app.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});
app.get('/profile', (req, res) => {
    if (req.session.user) {
        res.render('profile', { user: req.session.user });
    } else {
        res.redirect('/login');
    }
});


app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Проверка на уникальность имени пользователя
        const existingUser = await UserModel.findOne({ username: username });
        if (existingUser) {
            return res.render('signup', { error: 'Пользователь с таким именем уже существует' });
        }

        // Хэширование пароля с помощью bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание нового пользователя
        const newUser = new UserModel({
            username: username,
            email: email,
            password: hashedPassword,
            is_admin: false
        });

        // Сохранение пользователя в базе данных
        await newUser.save();

        req.session.user = newUser; // Авторизация пользователя после регистрации
        res.redirect('/profile'); // Перенаправление на страницу профиля
    } catch (error) {
        res.status(500).send('Ошибка при регистрации пользователя: ' + error.message);
    }
});





app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Находим пользователя по имени пользователя в базе данных
        const user = await UserModel.findOne({ username: username }).exec();

        // Проверяем, существует ли пользователь и совпадает ли введенный пароль с хэшированным паролем из базы данных
        if (user && await bcrypt.compare(password, user.password)) {
            // Аутентификация пользователя и установка сессии
            req.session.user = user;
            
            // Перенаправляем аутентифицированного пользователя на главную страницу
            if (user.is_admin) {
                res.redirect('/adminpanel');
            } else {
                res.redirect('/home');
            }
        } else {
            // Если пользователь не найден или пароль не совпадает, отображаем сообщение об ошибке на странице входа
            res.render('login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        // Обработка ошибок при выполнении запроса к базе данных
        res.status(500).send('Error logging in: ' + error.message);
    }
});

app.get(['/', '/home'], async (req, res) => {
    try {
        const images = await Image.find(); // Получаем изображения из базы данных
        const imageUrl = images.length > 0 ? images[0].imageUrl : ''; // Получаем URL первого изображения или пустую строку, если изображений нет
        res.render('home', { imageUrl: imageUrl, images: images }); // Передаем и URL первого изображения, и массив всех изображений
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

const isAdmin = (req, res, next) => {
    console.log(req.session.user);
    // Проверяем, авторизован ли пользователь и является ли он администратором
    if (req.session.user && req.session.user.is_admin) {
        next();// Если пользователь администратор, переходим к следующему middleware или маршруту
    } else {
        // Если пользователь не администратор, отправляем сообщение об ошибке или перенаправляем на другую страницу
        res.status(403).send('У вас нет доступа к этой странице');
    }
};

app.get('/adminpanel', isAdmin, async (req, res) => {
    try {
        const images = await Image.find(); // Получаем изображения из базы данных
        res.render('adminpanel', { images: images }); // Передаем изображения в шаблон
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Маршрут для загрузки нового изображения администратором
app.post('/adminpanel', upload.single('image'), async (req, res) => {
    try {
        const { filename } = req.file;
        const { en, fr, es } = req.body;
        const imageUrl = `/uploads/${filename}`;
        const newImage = new Image({
            filename,
            description: { en, fr, es }
        });
        await newImage.save();
        res.redirect('/');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error destroying session');
        }
        res.redirect('/home');
    });
});


// Listening
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on ${PORT}`);
});

// Utils
async function getUserInstance(ip) {
    let username = await UserIpModel.findOne({ ip: ip }).exec();
    username = username ? username.user : null;

    let userInstance = null;
    if (username) {
        userInstance = await UserModel.findOne({ _id: username }).exec();
    }

    return userInstance;
}
