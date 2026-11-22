import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './db.js';
import buildingsRouter from './routes/buildings.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const db = await testDatabaseConnection();

    res.json({
      success: true,
      service: 'campus-guide-ai-backend',
      database: 'connected',
      time: db.now,
      ai: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        grokConfigured: Boolean(process.env.XAI_API_KEY),
      },
    });
  } catch (error) {
    console.error('Health check database error:', error);

    res.status(503).json({
      success: false,
      service: 'campus-guide-ai-backend',
      database: 'disconnected',
      message: 'Backend is running, but the database is not connected.',
    });
  }
});

app.use('/api/buildings', buildingsRouter);
app.use('/api/chat', chatRouter);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

app.listen(PORT, () => {
  console.log(`Campus Guide-AI backend running on http://localhost:${PORT}`);
});
