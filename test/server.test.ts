import request from 'supertest';
import app from '../src/server';
import {
  createRiskCategory,
  findRiskCategories,
  getRiskCategoryById,
  patchRiskCategory,
  sendServerStatus,
  softDeleteRiskCategory
} from '../src/controller';

jest.mock('../src/controller', () => ({
  createRiskCategory: jest
  .fn((req, res) =>
    res.status(201).json({ _id: 1, ...req.body }))
  .mockName('createRiskCategoryMocked'),

  findRiskCategories: jest
  .fn((req, res) =>
    res.status(200).json({ ...req.body, found: true }))
  .mockName('findRiskCategoriesMocked'),

  getRiskCategoryById: jest
  .fn((req, res) =>
    res.status(200).json({ _id: `${req.params.id}`, name: `name${req.params.id}` }))
  .mockName('getRiskCategoryByIdMocked'),

  patchRiskCategory: jest
  .fn((req, res) =>
    res.status(200).json({ ...req.body, _id: `${req.params.id}`, updated: true }))
  .mockName('patchRiskCategoryMocked'),

  sendServerStatus: jest
  .fn((_req, res) =>
    res.status(200).json({ status: 'ok' }))
  .mockName('sendServerStatus'),

  softDeleteRiskCategory: jest
  .fn((req, res) =>
    res.status(200).json({ _id: `${req.params.id}`, softDeleted: true }))
  .mockName('softDeleteRiskCategoryMocked'),
}));

describe('Routes', () => {
  it('should successfully route GET /risk-categories/status', async () => {
    const res = await request(app)
      .get('/risk-categories/status');

      expect(sendServerStatus).toHaveBeenCalled();
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ status: 'ok' });
  });

  it('should successfully route POST /risk-categories', async () => {
    const body = { name: 'name1' };

    const res = await request(app)
      .post('/risk-categories')
      .send(body);

    expect(createRiskCategory).toHaveBeenCalled();
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual({ _id: 1, ...body });
  });

  it('should successfully route GET /risk-categories/:id', async () => {
    const res = await request(app)
      .get('/risk-categories/100');

      expect(getRiskCategoryById).toHaveBeenCalled();
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ _id: '100', name: `name100` });
    });

  it('should successfully route POST /risk-categories/search', async () => {
    const body = { name: 'name1' };

    const res = await request(app)
      .post('/risk-categories/search')
      .send(body);

    expect(findRiskCategories).toHaveBeenCalled();
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ ...body, found: true });
  });

  it('should successfully route PATCH /risk-categories/search', async () => {
    const body = { name: 'name1' };

    const res = await request(app)
      .patch('/risk-categories/100')
      .send(body);

    expect(patchRiskCategory).toHaveBeenCalled();
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ ...body, _id: "100", updated: true });
  });

  it('should successfully route DELETE /risk-categories/:id', async () => {
    const res = await request(app)
      .delete('/risk-categories/100');

      expect(softDeleteRiskCategory).toHaveBeenCalled();
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ _id: '100', softDeleted: true });
  });
});
