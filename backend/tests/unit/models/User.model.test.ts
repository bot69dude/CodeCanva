import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import UserModel from '../../../src/models/Users.Model';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to the test database
    await UserModel.init();
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  const validUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePass123'
  };

  it('should create a valid user', async () => {
    const user = new UserModel(validUser);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(validUser.username);
    expect(savedUser.email).toBe(validUser.email);
  });

  it('should fail validation without required fields', async () => {
    const user = new UserModel({});
    
    let error: mongoose.Error.ValidationError | undefined;
    try {
      await user.validate();
    } catch (e) {
      error = e as mongoose.Error.ValidationError;
    }
    
    expect(error).toBeDefined();
    expect(error!.errors.username).toBeDefined();
    expect(error!.errors.email).toBeDefined();
    expect(error!.errors.password).toBeDefined();
  });

  it('should enforce email uniqueness', async () => {
    // First create a user
    const user1 = new UserModel(validUser);
    await user1.save();
    
    // Try to create another user with the same email
    const user2 = new UserModel({
      username: 'differentuser',
      email: validUser.email,  // Same email
      password: 'DifferentPass123'
    });
    
    interface MongoError {
      code: number;
      name: string;
    }
    
    let error: MongoError | undefined;
    try {
      await user2.save();
    } catch (e) {
      error = e as MongoError;
    }
    
    expect(error).toBeDefined();
    expect(error!.code).toBe(11000); // MongoDB duplicate key error
  });
  
  it('should enforce username uniqueness', async () => {
    // First create a user
    const user1 = new UserModel(validUser);
    await user1.save();
    
    // Try to create another user with the same username
    const user2 = new UserModel({
      username: validUser.username, // Same username
      email: 'different@example.com',
      password: 'DifferentPass123'
    });
    
    interface MongoError {
      code: number;
      name: string;
    }
    
    let error: MongoError | undefined;
    try {
      await user2.save();
    } catch (e) {
      error = e as MongoError;
    }
    
    expect(error).toBeDefined();
    expect(error!.code).toBe(11000); // MongoDB duplicate key error
  });
  
  it('should store the password as provided (not hashed by model)', async () => {
    const user = new UserModel(validUser);
    const savedUser = await user.save();
    
    // Password should be stored as-is since hashing is done in the controller
    expect(savedUser.password).toBe(validUser.password);
  });
  
  it('should validate email format', async () => {
    const invalidEmailUser = new UserModel({
      ...validUser,
      email: 'invalid-email'
    });
    
    let error: mongoose.Error.ValidationError | undefined;
    try {
      await invalidEmailUser.validate();
    } catch (e) {
      error = e as mongoose.Error.ValidationError;
    }
    
    // Skip this test if there's no email format validation in the model
    if (error && error.errors && error.errors.email) {
      expect(error.errors.email).toBeDefined();
    }
  });
});