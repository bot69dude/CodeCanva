import { IUser } from '../models/Users.Model';

declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}

export {};