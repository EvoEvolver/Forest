const PORT = process.env.PORT || 3001;
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import issueRoutes from './routes/issues';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Routes
app.use('/api/issues', issueRoutes);

export default app;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 