import mongoose from 'mongoose';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { setServerStatus } from './controller';

interface DbSecret {
  username: string;
  password: string;
  MONGO_CONNECTION: string
};

const { Types } = mongoose.Schema;

// TODO this is a hack! Find a way to mock getSecret using jest.mock
const getSecretMocked = (awsRegion: string) : DbSecret | null => {
  switch(awsRegion) {
    case 'stagingRegion':
      return {
        username: 'stagingUser',
        password: 'stagingPassword',
        MONGO_CONNECTION: 'stagingMongoConnection'
      };
    case 'prodRegion':
      return {
        username: 'prodUser',
        password: 'prodPassword',
        MONGO_CONNECTION: 'prodMongoConnection'
      };
    default:
      return null;
  }
};

/**
 * See AWS Secrets Manager > Secrets > service/atlas/platformation_readwriteany
 * https://us-east-1.console.aws.amazon.com/secretsmanager/secret?name=service%2Fatlas%2Fplatformation_readwriteany&region=us-east-1#
 */
/* istanbul ignore next */
const getSecret = async (awsRegion: string): Promise<DbSecret | null> => {
  const secret_name = 'service/atlas/bacon_readwriteany';
  const client = new SecretsManagerClient({ region: awsRegion });
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secret_name,
      VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
    })
  );
  if (response?.SecretString) {
    return JSON.parse(response.SecretString);
  }
  
  return null;
};

const getConnectURI = async () => {
  switch (process.env.NODE_ENV) {
    case 'test':
      return ''; // tests use mongodb-memory-server
    case 'production': {
      // staging or prod according to the AWS deployment region
      const awsRegion = process.env.AWS_REGION;
      if (!awsRegion) {
        throw new Error('AWS_REGION shell environment variable is not defined.');
      }
      setServerStatus('AWS Region', awsRegion);
      let secret = null;
      /* istanbul ignore next */
      if (process.env.MOCK_SECRETS) {
        secret = getSecretMocked(awsRegion); // TODO remove this is a hack!
      } else {
        /* istanbul ignore next */
        secret = await getSecret(awsRegion);
      }
      if (!secret || !secret.username || !secret.password || !secret.MONGO_CONNECTION) {
        throw new Error('Failed to construct to MongoDB connection URI.');
      }
      return `mongodb://${secret.username}:${secret.password}@${secret.MONGO_CONNECTION}`;
    }
    case 'development':
    default:
      return 'mongodb://127.0.0.1:27017/test';
  };

};

export const dbConnect = async (): Promise<void> => {
  try {
    const dbConnectURI = await getConnectURI();
    if (!dbConnectURI) {
      return; // tests use mongodb-memory-server
    }
    // console.log(`dbConnectURI: ${dbConnectURI}`);  // never uncomment out except for debugging
    await mongoose.connect(dbConnectURI);
    setServerStatus('MongoDB', 'Successfully connected to MongoDB.', 200);
  } catch(err) {
    setServerStatus('MongoDB', `MongoDB connection failure: ${(err as Error).message}`);
  };
};

const riskCategorySchema = new mongoose.Schema({
  // please keep these in alphabetical order
  _deleted: {
    type: Types.Boolean,
    default: false,
    required: true
  },
  keywords: {
    type: [ Types.String ],
    default: [],
    required: true
  },
  language_iso: {
    type: Types.String,
    required: true
  },
  name: {
    type: Types.String,
    required: true
  },
  risk_level: {
    type: Types.Number,
    required: true,
    enum: [ -1, 1, 2, 3, 4 ]
  },
  updatedBy: {
    type: Types.ObjectId, // user's _id
    required: true,
    cast: '{VALUE} is not a MongoDB ObjectId.'
  }
}, {
  timestamps: true //auto-generates createdAt and updatedAt
});

export const RiskCategory = mongoose.model('RiskCategory', riskCategorySchema, 'RiskCategory');
