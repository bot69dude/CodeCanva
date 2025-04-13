import { afterAll, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

declare global {
  var generateTestToken: (userId: string) => string;
  var getAuthHeader: (userId: string) => { Authorization: string };
}

dotenv.config({ path: '.env.test' });

jest.mock('../src/utils/redis', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn().mockImplementation(() => Promise.resolve<string | null>(null)),
      set: jest.fn().mockImplementation(() => Promise.resolve<string>("OK")),
      lpush: jest.fn().mockImplementation(() => Promise.resolve<number>(1)),
      expire: jest.fn().mockImplementation(() => Promise.resolve<number>(1)),
      lrange: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
      del: jest.fn().mockImplementation(() => Promise.resolve<number>(1))
    }
  };
});

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  await mongoose.connect(mongoUri);

  process.env.JWT_SECRET = '_YE2v_zVcLahxp6xxx';
  process.env.NODE_ENV = 'test';
  
  console.log('Test environment set up with MongoDB memory server at:', mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  console.log('Test environment torn down');
});
global.generateTestToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string);
};

global.getAuthHeader = (userId: string) => {
  const token = global.generateTestToken(userId);
  return { Authorization: `Bearer ${token}` };
};

global.console = {
  ...console,
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};