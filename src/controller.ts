import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as pkg from '../package.json';
import { RiskCategory } from './db';

const serverStatus: Record<string, string | number> = {
  Status: 500,
  Name: pkg.name,
  Version: pkg.version,
  Description: pkg.description,
  'AWS Region': '',
  API: 'Failed to start the server.',
  MongoDB: 'No connection.',
};

export const setServerStatus = (statusKey: string, statusMsg: string, newStatusCode?: number) => {
  if (newStatusCode) {
    serverStatus.Status = newStatusCode;
  }
  serverStatus[statusKey] = statusMsg;
  console.log(statusMsg);
};

export const sendServerStatus = async (_req: Request, res: Response) => {
  res.status(Number(serverStatus.Status)).send({
    ...serverStatus,
    Status: serverStatus.Status === 200 ? 'Ready' : 'Not Ready'
  });
};

/*
 * `req.body._id` may exist to forcefully assign an _id.
 * Mongoose is `strict` by default. i.e. It silently strips off fields not in schema.
 */
export const createRiskCategory = async (req: Request, res: Response) => {
  const { body } = req;
  if (body._deleted) {
    return res.status(400).send('Cannot create deleted Risk Category.');
  }

  try {
    const alreadyExists = await RiskCategory.countDocuments({
      language_iso: body.language_iso,
      name: body.name
    });
    if (alreadyExists) {
      return res.status(400)
        .send(`{language_iso: ${body.language_iso}, name: ${body.name}} already exists.`);
    }
    const riskCategory = new RiskCategory(body);
    await riskCategory.save();
    res.status(201).send(riskCategory);
  } catch (err) {
    res.status(500).send((err as Error).message);
  }
};

export const getRiskCategoryById = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send(`'${id}' is not a valid MongoDB ID.`);
    }
    const riskCategory = await RiskCategory.findById(id);
    if (!riskCategory) {
      return res.status(404).send();
    }
    res.status(200).send(riskCategory);
  } catch (err) {
    /* istanbul ignore next */
    res.status(500).send((err as Error).message);
  }
};

/*
 * `req.body` is the query object,
 * - if not passed or empty {}, responds with ALL the document in RiskCategory collection
 * - if it contains only the `_id`, equivalent to getRiskCategoryById()
 * - if it contains a subset of the fields, responds with all the documents with those fields
 * - if it contains a field not in the schema, responds with an empty array
 */
export const findRiskCategories = async (req: Request, res: Response) => {
  try {
    if (req.body._id && !mongoose.Types.ObjectId.isValid(req.body._id)) {
      return res.status(400).send(`'${req.body._id}' is not a valid MongoDB ID.`);
    }

    const riskCategories = await RiskCategory.find(req.body);
    res.status(200).send(riskCategories);
  } catch (err) {
    /* istanbul ignore next */
    res.status(500).send((err as Error).message);
  }
};

/*
 * `req.body` should not have _id and contain the fields to be updated.
 * Mongoose is `strict` by default. i.e. It silently strips off fields not in schema.
 */
export const patchRiskCategory = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send(`'${id}' is not a valid MongoDB ID.`);
    }
    if (req.body._id) {
      return res.status(400).send('Request body cannot have _id.');
    }
    const riskCategory = await RiskCategory
      .findByIdAndUpdate(
        id,
        { $set: req.body },
        {
          runValidators: true,
          new: true
        }
      )
      .exec();
    if (!riskCategory) {
      return res.status(404).send();
    }
    res.status(200).send(riskCategory);
  } catch (err) {
    res.status(500).send((err as Error).message);
  }
};

export const softDeleteRiskCategory = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send(`'${id}' is not a valid MongoDB ID.`);
    }
    const riskCategory = await RiskCategory
      .findByIdAndUpdate(
        id,
        { $set: {_deleted: true} },
        { new: true }
      )
      .exec();
    if (!riskCategory) {
      return res.status(404).send();
    }
    res.status(200).send(riskCategory);
  } catch (err) {
    /* istanbul ignore next */
    res.status(500).send((err as Error).message);
  }
};
