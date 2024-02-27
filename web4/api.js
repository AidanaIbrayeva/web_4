const axios = require('axios');
const { Asteroid, HistoryEntry } = require('./database');

const NASA_API_KEY = '1R3aDxskVwbhZvYbOdOe4LRp1yj25UzECByeKhY8';
const NEWSAPI_KEY = "384e155a49954f6caf57ed2e0c760bd7";
const AstroAPI_KEY ="HI2Whm6JOk4qB3I1jsWxY0o0EP8l3yDwhQNpcHwE";

async function getNASAImage(date) {
    try {
        const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${date}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}


async function getNewsByCity() {
    let response, responseData = null;

    try {
        response = await axios.get(`https://newsapi.org/v2/everything?q=weather&apiKey=${NEWSAPI_KEY}&pageSize=10&page=1`);
        responseData = response?.data?.articles;
    } catch {
        return null;
    }

    let answer = [];

    responseData.forEach(article => {
        answer.push({
            "source": article.source.name,
            "title": article.title,
            "description": article.description,
            "url": article.url,
            "image": article.urlToImage,
            "published_at": new Date(article.publishedAt).toLocaleString('en-GB', { 
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric', hour12: false
            })
        });
    });

    return answer;
}

async function getAsteroids(startDate, endDate) {
    try {
        const userRequest = `Asteroids API Request: start_date=${startDate}, end_date=${endDate}`;
        const response = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${AstroAPI_KEY}`);
        const asteroidsData = response.data.near_earth_objects[startDate].slice(0, 3);
        const apiOutcome = JSON.stringify(asteroidsData);
        const historyEntry = new HistoryEntry({
            userRequest,
            apiOutcome
        });
        await historyEntry.save();

        const asteroids = asteroidsData.map(async (asteroidData) => {
            const existingAsteroid = await Asteroid.findOne({ id: asteroidData.id });
            if (!existingAsteroid) {
                const newAsteroid = new Asteroid({
                    name: asteroidData.name,
                    id: asteroidData.id,
                    closestApproachDate: asteroidData.close_approach_data[0].close_approach_date,
                    missDistance: {
                        kilometers: asteroidData.close_approach_data[0].miss_distance.kilometers
                    }
                });
                await newAsteroid.save();
                return newAsteroid;
            }
            return existingAsteroid;
        });

        return Promise.all(asteroids);
    } catch (error) {
        console.error('Ошибка при получении данных из NeoWs API:', error);
        throw error;
    }
}


module.exports = { getNASAImage , getNewsByCity ,getAsteroids};

