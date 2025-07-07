import express from 'express';
import fetchTranscript from '../utils/fetchTranscript.js';
import summarize from '../utils/summarize.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    const transcript = await fetchTranscript(url);
    const notes = await summarize(transcript);

    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
