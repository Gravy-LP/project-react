import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingsRouter from './routes/bookings.js';
import patientsRouter from './routes/patients.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/bookings', bookingsRouter);
app.use('/api/patients', patientsRouter);

app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
});
