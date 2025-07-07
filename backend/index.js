import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import summarizeRoute from './routes/summarize.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/summarize', summarizeRoute);

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
