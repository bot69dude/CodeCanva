/// <reference path="../types/express.d.ts" />
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/Users.Model';


export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies.token || 
                  (req.headers.authorization?.startsWith('Bearer ') && 
                   req.headers.authorization.split(' ')[1]);
                   
    if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return; 
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Forbidden' });
        return; 
    }
}