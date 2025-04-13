import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import redis from '../../../src/utils/redis';

// Define function types for Redis methods
type GetFn = (key: string) => Promise<string | null>;
type SetFn = (key: string, value: string, options: { ex: number }) => Promise<string>;
type LpushFn = (key: string, value: string) => Promise<number>;
type ExpireFn = (key: string, seconds: number) => Promise<number>;
type LrangeFn = (key: string, start: number, stop: number) => Promise<string[]>;
type DelFn = (...keys: string[]) => Promise<number>;

// Create a typed mock using one generic argument (the function type)
jest.mock('../../../src/utils/redis', () => {
  const mock = {
    get: jest.fn<GetFn>(),
    set: jest.fn<SetFn>(),
    lpush: jest.fn<LpushFn>(),
    expire: jest.fn<ExpireFn>(),
    lrange: jest.fn<LrangeFn>(),
    del: jest.fn<DelFn>()
  };

  // Set default implementations
  mock.get.mockResolvedValue(null);
  mock.set.mockResolvedValue("OK");
  mock.lpush.mockResolvedValue(1);
  mock.expire.mockResolvedValue(1);
  mock.lrange.mockResolvedValue([]);
  mock.del.mockResolvedValue(1);

  return {
    __esModule: true,
    default: mock
  };
});

describe('Redis Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set values correctly', async () => {
    const key = 'test-key';
    const value = 'test-value';
    const mockOptions = { ex: 3600 };

    await redis.set(key, value, mockOptions);
    expect(redis.set).toHaveBeenCalledWith(key, value, mockOptions);
  });

  it('should get values correctly', async () => {
    const key = 'test-key';
    // Use jest.MockedFunction to explicitly type the mock function
    (redis.get as jest.MockedFunction<GetFn>).mockResolvedValueOnce('test-value');
    const result = await redis.get(key);
    expect(redis.get).toHaveBeenCalledWith(key);
    expect(result).toBe('test-value');
  });

  it('should push items to list', async () => {
    const key = 'test-list';
    const value = 'test-item';
    await redis.lpush(key, value);
    expect(redis.lpush).toHaveBeenCalledWith(key, value);
  });

  it('should retrieve list ranges', async () => {
    const key = 'test-list';
    const start = 0;
    const stop = -1;
    const mockItems = ['item1', 'item2', 'item3'];
    (redis.lrange as jest.MockedFunction<LrangeFn>).mockResolvedValueOnce(mockItems);
    const result = await redis.lrange(key, start, stop);
    expect(redis.lrange).toHaveBeenCalledWith(key, start, stop);
    expect(result).toEqual(mockItems);
  });

  it('should set expiration on keys', async () => {
    const key = 'test-key';
    const seconds = 3600;
    await redis.expire(key, seconds);
    expect(redis.expire).toHaveBeenCalledWith(key, seconds);
  });

  it('should delete keys', async () => {
    const key = 'test-key';
    await redis.del(key);
    expect(redis.del).toHaveBeenCalledWith(key);
  });

  it('should handle multiple keys in delete operation', async () => {
    const keys = ['key1', 'key2', 'key3'];
    (redis.del as jest.MockedFunction<DelFn>).mockResolvedValueOnce(3);
    const result = await redis.del(...keys);
    expect(redis.del).toHaveBeenCalledWith(...keys);
    expect(result).toBe(3);
  });

  it('should handle non-existent keys gracefully', async () => {
    const nonExistentKey = 'non-existent-key';
    (redis.get as jest.MockedFunction<GetFn>).mockResolvedValueOnce(null);
    const result = await redis.get(nonExistentKey);
    expect(redis.get).toHaveBeenCalledWith(nonExistentKey);
    expect(result).toBeNull();
  });
});