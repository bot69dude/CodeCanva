import express, { Request, Response } from 'express';
import { registerUser, loginUser } from '../controllers/userController';

const router = express.Router();


const asyncHandler = (fn: Function) => (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((err) => {
        res.status(500).json({ error: err.message });
    });
};

router.post('/register', asyncHandler(registerUser));
router.post('/login', asyncHandler(loginUser));
router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;