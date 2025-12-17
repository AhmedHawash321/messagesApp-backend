import express from 'express';
import dotenv from 'dotenv';
import bootstrap from './src/controllers/app.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

await bootstrap(app,express);

app.listen (PORT, () => {
    console.log(`server is listening on port: ${PORT}`)
});