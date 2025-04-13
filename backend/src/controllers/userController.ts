import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import UserModel from '../models/Users.Model';
import setCookie from '../utils/cookies';
import { z } from 'zod';
import jwt from 'jsonwebtoken';


const registerSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
    password: z.string().min(8).max(100).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]+$/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'),
    email: z.string().email('Invalid email address.').max(100),
});

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, password, email } = registerSchema.parse(req.body);

        const existsUser = await UserModel.findOne({ email});
        if (existsUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new UserModel({
            username,
            password: hashedPassword,
            email,
        });
        await newUser.save();
        const token = jwt.sign({ id: newUser._id.toString() }, process.env.JWT_SECRET as string, {
            expiresIn: '24h'
        });
        setCookie(res, token);
        return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const Nonexists = await UserModel.findOne({ email });
        if (!Nonexists) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await bcrypt.compare(password, Nonexists.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: Nonexists._id.toString() }, process.env.JWT_SECRET as string, {
            expiresIn: '24h'
        });
        setCookie(res, token);
        return res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};
