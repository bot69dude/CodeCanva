import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../../src/middleware/Authentication';
import UserModel from '../../../src/models/Users.Model';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

jest.mock('jsonwebtoken');
jest.mock('../../../src/models/Users.Model');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  let responseObject: any = {};
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret';
    
    mockRequest = {
      headers: {},
      cookies: {}
    };
    
    responseObject = {
      statusCode: 0,
      jsonData: {}
    };
    
    mockResponse = {
      status: jest.fn().mockImplementation((code) => {
        responseObject.statusCode = code;
        return mockResponse as unknown as Response;
      }) as unknown as Response['status'],
      
      json: jest.fn().mockImplementation((data) => {
        responseObject.jsonData = data;
        return mockResponse as unknown as Response;
      }) as unknown as Response['json']
    };
    
    (nextFunction as jest.Mock).mockClear();
  });

  it('should call next() with valid token in Authorization header', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token'
    };
    
    const mockUser = {
      _id: userId,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword'
    };
    
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId });
    (UserModel.findById as jest.MockedFunction<typeof UserModel.findById>).mockResolvedValue(mockUser as any);

    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test_secret');
    expect(UserModel.findById).toHaveBeenCalledWith(userId);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual(mockUser);
  });

  it('should call next() with valid token in cookie', async () => {
    mockRequest.cookies = {
      token: 'valid-cookie-token'
    };
    
    const mockUser = {
      _id: userId,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword'
    };
    
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId });
    (UserModel.findById as jest.MockedFunction<typeof UserModel.findById>).mockResolvedValue(mockUser);

    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('valid-cookie-token', 'test_secret');
    expect(UserModel.findById).toHaveBeenCalledWith(userId);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual(mockUser);
  });

  it('should return 401 with no token', async () => {
    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(responseObject.statusCode).toBe(401);
    expect(responseObject.jsonData.message).toBe('Unauthorized');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 with invalid token', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token'
    };
    
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(responseObject.statusCode).toBe(403);
    expect(responseObject.jsonData.message).toBe('Forbidden');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle user not found', async () => {
    mockRequest.headers = {
      authorization: 'Bearer valid-token'
    };
    
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId });
    (UserModel.findById as jest.MockedFunction<typeof UserModel.findById>).mockResolvedValue(null);

    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(responseObject.statusCode).toBe(403);
    expect(responseObject.jsonData.message).toBe('Forbidden');
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should prioritize cookie token over auth header', async () => {
    mockRequest.cookies = {
      token: 'cookie-token'
    };
    mockRequest.headers = {
      authorization: 'Bearer header-token'
    };
    
    const mockUser = {
      _id: userId,
      username: 'testuser'
    };
    
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId });
    (UserModel.findById as jest.MockedFunction<typeof UserModel.findById>).mockResolvedValue(mockUser as any);

    await authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

    // Should use the cookie token, not the header token
    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test_secret');
    expect(nextFunction).toHaveBeenCalled();
  });
});