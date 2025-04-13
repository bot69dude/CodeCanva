import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request } from 'express';
import { registerUser, loginUser } from '../../../src/controllers/userController';
import UserModel from '../../../src/models/Users.Model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import setCookie from '../../../src/utils/cookies';

// Manually mock the cookies module so setCookie becomes a jest mock function
jest.mock('../../../src/utils/cookies', () => jest.fn());

type MockResponse = {
  status: jest.Mock<any>;
  json: jest.Mock<any>;
};

const createResponse = (): MockResponse => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as MockResponse;
};

describe('User Controller', () => {
  const validUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'ValidPass123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const req = { body: validUserData } as Request;
      const res = createResponse();

      // Simulate no existing user
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
      // Mock bcrypt functions
      jest.spyOn(bcrypt, 'genSalt').mockImplementation(() => Promise.resolve('somesalt'));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashedPassword'));

      // Create a fake user instance with _id and a save method
      const fakeUser = { 
        _id: 'user123',
        save: jest.fn().mockImplementation(() => Promise.resolve(true))
      };
      // Preserve "this" context when saving
      jest.spyOn(UserModel.prototype, 'save').mockImplementationOnce(function (this: any) {
        return Promise.resolve(this);
      });
      // Override constructor behavior for testing to yield fakeUser.
      jest.spyOn(UserModel.prototype, 'constructor' as any).mockImplementation(() => fakeUser);

      // Mock jwt.sign to return a fixed token
      jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

      await registerUser(req, res as any);

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: validUserData.email });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(validUserData.password, 'somesalt');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        expect.any(String),
        { expiresIn: '24h' }
      );
      // Check that setCookie was called with the proper arguments.
      expect(setCookie as jest.Mock).toHaveBeenCalledWith(res, 'signed-token');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully' }); 
    });
    
    it('should return 400 if user already exists', async () => {
      const req = { body: validUserData } as Request;
      const res = createResponse();
      jest.spyOn(UserModel, 'findOne').mockResolvedValue({ _id: 'existingUser' } as any);

      await registerUser(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });

    it('should return 400 for invalid input', async () => {
      const req = { body: { username: 'ab', email: 'invalid', password: 'short' } } as Request;
      const res = createResponse();
      await registerUser(req, res as any);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(typeof res.json.mock.calls[0][0]).toBe('object');
    });
  });

  describe('loginUser', () => {
    it('should login successfully with valid credentials', async () => {
      const req = { body: { email: validUserData.email, password: validUserData.password } } as Request;
      const res = createResponse();

      const fakeUser = {
        _id: 'user123',
        username: 'testuser',
        email: validUserData.email,
        password: 'hashedPassword'
      };

      jest.spyOn(UserModel, 'findOne').mockResolvedValue(fakeUser as any);
      // Mock bcrypt.compare to resolve true for valid password
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

      await loginUser(req, res as any);

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: validUserData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(validUserData.password, 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        expect.any(String),
        { expiresIn: '24h' }
      );
      expect(setCookie as jest.Mock).toHaveBeenCalledWith(res, 'signed-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Login successful' });
    });

    it('should return 400 if email not found', async () => {
      const req = { body: { email: validUserData.email, password: validUserData.password } } as Request;
      const res = createResponse();
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);

      await loginUser(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 400 if password is invalid', async () => {
      const req = { body: { email: validUserData.email, password: validUserData.password } } as Request;
      const res = createResponse();
      const fakeUser = {
        _id: 'user123',
        username: 'testuser',
        email: validUserData.email,
        password: 'hashedPassword'
      };
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(fakeUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await loginUser(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });
});