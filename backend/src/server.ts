import express from 'express';
import { app, server } from './app';
import connectDB from './utils/db';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoute from './routes/userRoute';
import projectRoute from './routes/projectRoute';
import logger from './middleware/logger';

dotenv.config();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(cookieParser());
app.use(logger);
app.use(express.json());

app.use("/api/v1/user", userRoute);
app.use("/api/v1/project", projectRoute);

connectDB();
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});