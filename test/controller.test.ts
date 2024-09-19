import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/server';
import { setServerStatus } from '../src/controller';
import { RiskCategory } from '../src/db';

const { ObjectId } = mongoose.Types;

const generateBody0 = () => ({
  keywords: ['protest', 'protesting', 'protester', 'protested', '#protest', '#protesting', '#protester', '#protested'],
  language_iso: 'en',
  name: 'Protests',
  risk_level: 2,
  updatedBy: new ObjectId('5f4e994f025923001fdd6bc8')
});

const generateBody1 = () => ({
  keywords: ['fake protest', '@protest', 'counter protest', 'counter protesting'],
  language_iso: 'en',
  name: 'Exclusions',
  risk_level: -1,
  updatedBy: new ObjectId('5f4e994f025923001fdd6bc8')
});
    
describe('Status', () => {
  it('should respond with the initial status', async () => {
    const res = await request(app)
      .get('/risk-categories/status');

    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({
      Status: 'Not Ready',
      Name: 'risk-categories-microservice',
      Version: '1.0.0',
      Description: 'Risk Categories Microservice',
      'AWS Region': '',
      API: 'Failed to start the server.',
      MongoDB: 'No connection.'
    });
  });

  it('should respond with the changed status', async () => {
    const awsRegion = 'us-west-2';
    setServerStatus('AWS Region', awsRegion);
    setServerStatus('MongoDB', 'Successfully connected to MongoDB.', 200);
    const res = await request(app)
      .get('/risk-categories/status');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      Status: 'Ready',
      Name: 'risk-categories-microservice',
      Version: '1.0.0',
      Description: 'Risk Categories Microservice',
      'AWS Region': awsRegion,
      API: 'Failed to start the server.',
      MongoDB: 'Successfully connected to MongoDB.'
    });
  });
});

describe('Database Operations', () => {
  let mongoServer: MongoMemoryServer;
  
  // Use an in-memory database for testing
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });
  
  describe('Create', () => {
    it('should create a RiskCategory document', async () => {
      let id = null;
      try {
        const body = generateBody0();
        const res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);
        // the newly created doc is responded
        expect(res.body._deleted).toBe(false);
        expect(res.body.keywords).toEqual(body.keywords);
        expect(res.body.language_iso).toEqual(body.language_iso);
        expect(res.body.name).toEqual(body.name);
        expect(res.body.risk_level).toEqual(body.risk_level);
        expect(res.body.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(res.body.createdAt.toString()).toEqual(res.body.updatedAt.toString());

        // verify that it exists in database
        const doc = await RiskCategory.findById(res.body._id);
        expect(doc).not.toBeNull();
        expect(doc?._deleted).toBe(false);
        expect(doc?.keywords).toEqual(body.keywords);
        expect(doc?.language_iso).toEqual(body.language_iso);
        expect(doc?.name).toEqual(body.name);
        expect(doc?.risk_level).toEqual(body.risk_level);
        expect(doc?.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(doc?.createdAt.toISOString()).toEqual(res.body.createdAt.toString());
        expect(doc?.updatedAt.toISOString()).toEqual(res.body.updatedAt.toString());
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should fail if _deleted is set to true', async () => {
      const body = generateBody0();
      const res = await request(app)
        .post('/risk-categories')
        .send({
          ...body,
          _deleted: true
        });
      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual('Cannot create deleted Risk Category.');
    });

    it('should ignore fields if not in schema', async () => {
      let id = null;
      try {
        const body = generateBody0();
        const res = await request(app)
          .post('/risk-categories')
          .send({
            ...body,
            notInSchema: true
          });
          
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);
        // the newly created doc is responded
        expect(res.body.notInSchema).toBeUndefined();

        // verify that it exists in database
        const doc = await RiskCategory.findById(res.body._id);
        expect(doc).not.toBeNull();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((doc as Record<string, any>)?.notInSchema).toBeUndefined();
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should enforce risk_level validation', async () => {
      const body = generateBody0();
      const res = await request(app)
        .post('/risk-categories')
        .send({
          ...body,
          risk_level: 5
        });
      expect(res.statusCode).toEqual(500);
      expect(res.text)
        .toEqual('RiskCategory validation failed: risk_level: `5` is not a valid enum value for path `risk_level`.');
    });

    it('should enforce updatedBy validation', async () => {
      const body = generateBody0();
      const res = await request(app)
        .post('/risk-categories')
        .send({
          ...body,
          updatedBy: 'invalid'
        });
      expect(res.statusCode).toEqual(500);
      expect(res.text)
        .toEqual('RiskCategory validation failed: updatedBy: "invalid" is not a MongoDB ObjectId.');
    });

    it('should fail if {language_iso, name} already exist', async () => {
      let id0 = null;
      let id1 = null;
      try {
        // first let's create one
        const body0 = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body0);
          
        id0 = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // let's create a second one but with the same name and language_iso
        const body1 = generateBody1();
        res = await request(app)
          .post('/risk-categories')
          .send({
            ...body1,
            language_iso: body0.language_iso,
            name: body0.name
          });
          
        id1 = res?.body?._id;
        expect(res.statusCode).toEqual(400);
        expect(res.text).toEqual('{language_iso: en, name: Protests} already exists.');
      } finally {
        // clean up by removing the docs
        if (id0) {
          await RiskCategory.findOneAndDelete(id0);
        }
        if (id1) {
          await RiskCategory.findOneAndDelete(id1);
        }
      }
    });
  });
  
  describe('Get by ID', () => {
    it('should retrieve a RiskCategory document by ID', async () => {
      let id = null;
      // first let's create one
      try {
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
  
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's look for it
        res = await request(app)
          .get(`/risk-categories/${id}`);

        expect(res.statusCode).toEqual(200);
        // the found doc is responded
        expect(res.body._id).toEqual(id);
        expect(res.body._deleted).toBe(false);
        expect(res.body.keywords).toEqual(body.keywords);
        expect(res.body.language_iso).toEqual(body.language_iso);
        expect(res.body.name).toEqual(body.name);
        expect(res.body.risk_level).toEqual(body.risk_level);
        expect(res.body.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(res.body.createdAt.toString()).toEqual(res.body.updatedAt.toString());
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should fail if ID is not a valid MongoDB ID', async () => {
      const id = 100;
      const res = await request(app)
        .get(`/risk-categories/${id}`);

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual(`'100' is not a valid MongoDB ID.`);
    });

    it('should fail if ID is valid but document doesnt exist', async () => {
      const id = new ObjectId('5f4e994f025923001fdd6bc8');
      const res = await request(app)
        .get(`/risk-categories/${id}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('Search', () => {
    it('should find a RiskCategory document by ID', async () => {
      let id0 = null;
      let id1 = null;
      try {
        // first let's create one
        const body0 = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body0);
          
        id0 = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // let's create a second one
        const body1 = generateBody1();
        res = await request(app)
          .post('/risk-categories')
          .send(body1);
          
        id1 = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's search for them
        const filter = {
          language_iso: 'en',
        };
        res = await request(app)
          .post(`/risk-categories/search`)
          .send(filter);

        expect(res.statusCode).toEqual(200);
        // verify we got the 1st one
        expect(res.body[0]._id).toEqual(id0);
        expect(res.body[0]._deleted).toBe(false);
        expect(res.body[0].keywords).toEqual(body0.keywords);
        expect(res.body[0].language_iso).toEqual(filter.language_iso);
        expect(res.body[0].name).toEqual(body0.name);
        expect(res.body[0].risk_level).toEqual(body0.risk_level);
        expect(res.body[0].updatedBy.toString()).toEqual(body0.updatedBy.toString());
        expect(res.body[0].createdAt.toString()).toEqual(res.body[0].updatedAt.toString());
        // verify we got the 1st one
        expect(res.body[1]._id).toEqual(id1);
        expect(res.body[1]._deleted).toBe(false);
        expect(res.body[1].keywords).toEqual(body1.keywords);
        expect(res.body[1].language_iso).toEqual(filter.language_iso);
        expect(res.body[1].name).toEqual(body1.name);
        expect(res.body[1].risk_level).toEqual(body1.risk_level);
        expect(res.body[1].updatedBy.toString()).toEqual(body1.updatedBy.toString());
        expect(res.body[1].createdAt.toString()).toEqual(res.body[1].updatedAt.toString());
      } finally {
        // clean up by removing the docs
        if (id0) {
          await RiskCategory.findOneAndDelete(id0);
        }
        if (id1) {
          await RiskCategory.findOneAndDelete(id1);
        }
      }
    });

    it('should fail if ID is not a valid MongoDB ID', async () => {
      const id = '100';
      const res = await request(app)
        .post(`/risk-categories/search`)
        .send({ _id: id });

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual(`'100' is not a valid MongoDB ID.`);
    });
  });

  describe('Update', () => {
    it('should update a RiskCategory document by ID', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's update it
        const changes = {
          name: 'New Name',
          language_iso: 'fr',
          risk_level: 4
        };
        res = await request(app)
          .patch(`/risk-categories/${id}`)
          .send(changes);

        expect(res.statusCode).toEqual(200);
        // the updated doc is responded
        expect(res.body._id).toEqual(id);
        expect(res.body._deleted).toBe(false);
        expect(res.body.keywords).toEqual(body.keywords);
        expect(res.body.language_iso).toEqual(changes.language_iso);
        expect(res.body.name).toEqual(changes.name);
        expect(res.body.risk_level).toEqual(changes.risk_level);
        expect(res.body.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(res.body.createdAt.toString()).not.toEqual(res.body.updatedAt.toString());

        // verify that it is changed in database
        const doc = await RiskCategory.findById(res.body._id);
        expect(doc).not.toBeNull();
        expect(doc?._deleted).toBe(false);
        expect(doc?.keywords).toEqual(body.keywords);
        expect(doc?.language_iso).toEqual(changes.language_iso);
        expect(doc?.name).toEqual(changes.name);
        expect(doc?.risk_level).toEqual(changes.risk_level);
        expect(doc?.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(doc?.createdAt.toISOString()).toEqual(res.body.createdAt.toString());
        expect(doc?.updatedAt.toISOString()).toEqual(res.body.updatedAt.toString());
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should fail if ID is not a valid MongoDB ID', async () => {
      const id = 100;
      const res = await request(app)
        .patch(`/risk-categories/${id}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual(`'100' is not a valid MongoDB ID.`);
    });

    it('should fail if document does not exist', async () => {
      const id = new ObjectId('5f4e994f025923001fdd6bc8');
      const res = await request(app)
        .patch(`/risk-categories/${id}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toEqual(404);
    });

    it('should fail if _id is passed in the body', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's pass _id
        res = await request(app)
          .patch(`/risk-categories/${id}`)
          .send({ _id: '100' });

        expect(res.statusCode).toEqual(400);
        expect(res.text).toEqual('Request body cannot have _id.');
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should ignore fields if not in schema', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's pass invalid field
        res = await request(app)
          .patch(`/risk-categories/${id}`)
          .send({ notInSchema: true });

        // the newly created doc is responded
        expect(res.body.notInSchema).toBeUndefined();

        // verify that it exists in database
        const doc = await RiskCategory.findById(id);
        expect(doc).not.toBeNull();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((doc as Record<string, any>)?.notInSchema).toBeUndefined();
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should enforce risk_level validation', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's pass an invalid risk_level
        res = await request(app)
          .patch(`/risk-categories/${id}`)
          .send({ risk_level: -2 });

        expect(res.statusCode).toEqual(500);
        expect(res.text)
          .toEqual('Validation failed: risk_level: `-2` is not a valid enum value for path `risk_level`.');
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should enforce updatedBy validation', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
        
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's pass an invalid risk_level
        res = await request(app)
          .patch(`/risk-categories/${id}`)
          .send({ updatedBy: 'invalid' });

        expect(res.statusCode).toEqual(500);
        expect(res.text)
          .toEqual('"invalid" is not a MongoDB ObjectId.');
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });
  });

  describe('Delete', () => {
    it('should delete a RiskCategory document by ID', async () => {
      let id = null;
      try {
        // first let's create one
        const body = generateBody0();
        let res = await request(app)
          .post('/risk-categories')
          .send(body);
          
        id = res?.body?._id;
        expect(res.statusCode).toEqual(201);

        // now let's delete it
        res = await request(app)
          .delete(`/risk-categories/${id}`);

        expect(res.statusCode).toEqual(200);
        // the soft deleted doc is responded
        expect(res.body._id).toEqual(id);
        expect(res.body._deleted).toBe(true); // soft delete
        expect(res.body.keywords).toEqual(body.keywords);
        expect(res.body.language_iso).toEqual(body.language_iso);
        expect(res.body.name).toEqual(body.name);
        expect(res.body.risk_level).toEqual(body.risk_level);
        expect(res.body.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(res.body.createdAt.toString()).not.toEqual(res.body.updatedAt.toString());

        // verify that it still exists in database
        const doc = await RiskCategory.findById(res.body._id);
        expect(doc).not.toBeNull();
        expect(doc?._deleted).toBe(true); // but soft deleted
        expect(doc?.keywords).toEqual(body.keywords);
        expect(doc?.language_iso).toEqual(body.language_iso);
        expect(doc?.name).toEqual(body.name);
        expect(doc?.risk_level).toEqual(body.risk_level);
        expect(doc?.updatedBy.toString()).toEqual(body.updatedBy.toString());
        expect(doc?.createdAt.toISOString()).toEqual(res.body.createdAt.toString());
        expect(doc?.updatedAt.toISOString()).toEqual(res.body.updatedAt.toString());
      } finally {
        // clean up by removing the doc
        if (id) {
          await RiskCategory.findOneAndDelete(id);
        }
      }
    });

    it('should fail if ID is not a valid MongoDB ID', async () => {
      const id = 100;
      const res = await request(app)
        .delete(`/risk-categories/${id}`);

      expect(res.statusCode).toEqual(400);
      expect(res.text).toEqual(`'100' is not a valid MongoDB ID.`);
    });

    it('should fail if ID is valid but document doesnt exist', async () => {
      const id = new ObjectId('5f4e994f025923001fdd6bc8');
      const res = await request(app)
        .delete(`/risk-categories/${id}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
