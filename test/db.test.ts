import mongoose from 'mongoose';
import { dbConnect } from '../src/db';
import { setServerStatus } from '../src/controller';

jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  connect: jest.fn().mockName('mongooseConnectMocked')
}));

jest.mock('../src/controller', () => ({
  setServerStatus: jest.fn().mockName('setServerStatusMocked')
}));
  
describe('Database Connection', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {};
    process.env.NODE_ENV = 'test';
    process.env.MOCK_SECRETS = 'true';
  });

  it('should not attempt to connect to real MongoDB in test environment', async () => {
    // process.env.NODE_ENV is set to 'test'
    await dbConnect();
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('should successfully set db connection URI in development environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.AWS_REGION = 'irrelevant';
    await dbConnect();
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://127.0.0.1:27017/test');
    expect(setServerStatus).toHaveBeenCalledWith(
      'MongoDB',
      'Successfully connected to MongoDB.',
      200
    );
  });

  it('should fail if in production environment AWS_REGION is not defined', async () => {
    process.env.NODE_ENV = 'production';
    // process.env.AWS_REGION is undefined;
    await dbConnect();
    expect(setServerStatus).toHaveBeenCalledWith(
      'MongoDB',
      'MongoDB connection failure: AWS_REGION shell environment variable is not defined.'
    );
  });

  it('should fail if in production environment cannot get info from AWS secret manager', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_REGION = 'invalid';
    await dbConnect();
    expect(setServerStatus).toHaveBeenNthCalledWith(1, 'AWS Region', 'invalid');
    expect(setServerStatus).toHaveBeenNthCalledWith(2,
      'MongoDB',
      'MongoDB connection failure: Failed to construct to MongoDB connection URI.'
    );
  });

  it('should construct db connection string for the staging environment correctly', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_REGION = 'stagingRegion';
    await dbConnect();
    expect(setServerStatus).toHaveBeenNthCalledWith(1, 'AWS Region', 'stagingRegion');
    expect(setServerStatus).toHaveBeenNthCalledWith(2,
      'MongoDB',
      'Successfully connected to MongoDB.',
      200
    );
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://stagingUser:stagingPassword@stagingMongoConnection');
  });

  it('should construct db connection string for the prod environment correctly', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AWS_REGION = 'prodRegion';
    await dbConnect();
    expect(setServerStatus).toHaveBeenNthCalledWith(1, 'AWS Region', 'prodRegion');
    expect(setServerStatus).toHaveBeenNthCalledWith(2,
      'MongoDB',
      'Successfully connected to MongoDB.',
      200
    );
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://prodUser:prodPassword@prodMongoConnection');
  });
});
