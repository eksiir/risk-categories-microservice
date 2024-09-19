import express from 'express';
import bodyParser from 'body-parser';
import { dbConnect } from './db';
import {
  createRiskCategory,
  findRiskCategories,
  getRiskCategoryById,
  patchRiskCategory,
  sendServerStatus,
  setServerStatus,
  softDeleteRiskCategory,
} from './controller';

const app = express();
app.use(bodyParser.json());

// routes
app.get('/risk-categories/status', sendServerStatus);
app.post('/risk-categories', createRiskCategory);
app.get('/risk-categories/:id', getRiskCategoryById);
app.post('/risk-categories/search', findRiskCategories);
app.patch('/risk-categories/:id', patchRiskCategory);
app.delete('/risk-categories/:id', softDeleteRiskCategory);

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  dbConnect();

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    setServerStatus('API', `Server started on port ${port}.`);
  });
};

export default app;
