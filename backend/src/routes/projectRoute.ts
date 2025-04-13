import express, { Request, Response, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/Authentication';
import { createProject, getProject, updateProject, DeleteProject, getUserProjects } from '../controllers/projectController';

const router = express.Router();

const asyncHandler = (fn: Function): RequestHandler => (req: Request, res: Response) => {
    void Promise.resolve(fn(req, res)).catch((err) => {
        console.error('Error caught in asyncHandler:', err);
        res.status(500).json({ error: err.message });
    });
};

router.post('/', authenticateToken, asyncHandler(createProject));
router.get('/all', authenticateToken, asyncHandler(getUserProjects)); 
router.get('/:id', authenticateToken, asyncHandler(getProject));
router.put('/:id', authenticateToken, asyncHandler(updateProject));
router.delete('/:id', authenticateToken, asyncHandler(DeleteProject));

export default router;