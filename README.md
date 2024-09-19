# Risk Categories Microservice
CRUD operations for the `RiskCategory MongoDB collection` exposed via the **/risk-categories** API path.

As this is an internal microservice, the upstream API server is expected to provide the required authentication.

## Installation
To install Node.js packages, do the following at the top of the repository:
```
npm ci
```

## Development
Unit tests use *mongodb-memory-server* but in order to have the development environment as close to the production as possible,
it is required to install and run an instance of MongoDB 6.x locally - connection string: `mongodb://127.0.0.1:27017/test`. 

To run the locally installed MongoDB, do
```
mongod --config /usr/local/etc/mongod.conf --fork
```
To verify, check on the `mongod` process running in the background.
```
ps -ef | fgrep mongod
```
To stop a `mongod` running as a background process, connect to it using `mongosh`. Then issue the `db.shutdown` command.


To start the microservice locally using the local MongoDB, do
```
make start
```

To start the microservice locally using the staging MongoDB, should be on the staging VPN and successfully logged in to
`saml2aws`. Then do,

```
AWS_REGION=us-west-2 make build start-prod
```

To start the microservice locally using the production MongoDB, should be on the production VPN and successfully logged in to
`saml2aws`. Then do,

```
AWS_REGION=us-east-1 make build start-prod
```

In all the above cases, the URI domain is `localhost:3000`. e.g.
```
POST http://localhost:3000/risk-categories/
```

## Running Unit Tests
Running unit tests does not required building the server. That is required for production deployment only.

To run unit tests only, do

```
make test:fast
```

To perform tests as in CI/CD which runs lint, test coverage and other checks as well, do

```
make test
```

# Deployment

The `AWS_REGION` shell environment variable should be set to the AWS region where this microservice is going to be deployed.
Based on that, the deployment is targeted to either the **staging** or **prod** environment.

The AWS Secret Manger Name is `service/atlas/bacon_readwriteany` - used for MongoDB connection URI based on `AWS_REGION`.

The default deployment port is `3000` but it can be customized by assigning to the `PORT` shell environment varialbe.

To start the server in either the `prod` or `staging` environment, do the following:

```
make build start-prod
```

# How to Use
1. You have to be on the applicable VPN: `production` or `staging`.

2. Successfully login to `saml2aws`,
```
saml2aws login
```


# API
If the microservice is down or has any problems, the standard status code 500 is responded.

See the **RiskCategory** model, i.e. `riskCategorySchema` in `src/db.ts` for the valid fields and their details.

## Check Readiness Status
Load balancers can check the readiness of the server by the following:
```
GET /status
```

Only if the server ready for service the following is responded with status code 200.
e.g.
```
{
  "Status": "Ready",
  "Name": "risk-categories-microservice",
  "Version": "1.0.0",
  "Description": "Risk Categories Microservice",
  "AWS Region": "us-east-1",
  "API": "Server started on port 3000.",
  "MongoDB": "Successfully connected to MongoDB"
}
```

Failure example: status code is NOT 200,
```
{
  "Status": "Not Ready",
  "Name": "risk-categories-microservice",
  "Version": "1.0.0",
  "Description": "Risk Categories Microservice",
  "AWS Region": "us-east-1",
  "API": "Server started on port 3000.",
  "MongoDB": "No connection."
}
```

## Create a New RiskCategory Document

```
POST /risk-categories
```
The body of the request should contain at least the required fields. The `createdAt` and `updatedAt` fields are auto-generated.

Example:
```
{
  "keywords": [
    "protest",
    "protesting",
    "protester",
    "protested",
    "#protest",
    "#protesting",
    "#protester",
    "#protested"
  ],
  "language_iso": "en",
  "name": "Protests",
  "risk_level": 2,
  "updatedBy": "66de44192f5430f783e12f9b"   // User collection _id
}
```
`_deleted` defaults to false and need not be provided. If it is provided and set to true, an error will be generated and the response status code will be 400 to ensure that deleted documents are not created.

Note that if `{language_iso, name}` exists, an error will be generated and the response status code will be 400.

Upon success the newly created document including its `_id` is responded with 201 status code.

## Retrieve a RiskCategory Document by ID

```
GET /risk-categories/:id
```

If `id` is not a valid MongoDB ID, an error is responded with status code 400.

If `id` is a valid MongoDB ID but the document does not exist, the `Not Found` error is responded with status code 404.

Upon success the document is responded with status set to 200.

## Search RiskCategory Documents

```
POST /risk-categories/search
```
The body of the request should contain the fields to search.

Examples:

Find all documents in the collection:
```
{}
```

Find all the risk categories in the French language with risk level 3:
```
{
  "_deleted": false,
  "language_iso": "fr",
  "risk_level": 3
}
```

Find all the risk categories with name `Shooting` in all languages:
```
{
  "_deleted": false,
  "name: "Shooting"
}
```

Find all the risk categories excluded from the English language:
```
{
  "_deleted": false,
  "language_iso": "en",
  "risk_level": -1
}
```

Find the document with a specific ID. i.e. equivalent to `GET /risk-categories/:id`

```
{
  _id: "66de737469c65d9952570b44"
}
```

The respond status code is 200 even if no document is found.

**Fields not in the schema are NOT ignored.**  As they don't exist, they result in not finding any documents and the respond status code will still indicate success: 200.

## Patch Update a RiskCategory Document
```
PATCH /risk-categories/:id
```
If `id` is not a valid MongoDB ID, an error is responded with status code 400.

The body of the request should contain the fields to update except `_id` in which case an error is responded with status code 400. Fields not in the schema are ignored.

Upon success the updated new document is responded with status set to 200.

Example:
```
PATCH /risk-categories/66df5f58acd9a2feb10c4f4c
```

Update the risk level of a document:
```
{
  "risk_level": 1
}
```

Update the keywords of a risk category:
```
{
  "keywords": [
    "protest",
    "protesting",
    "protester",
    "protested",
    "#protest",
    "#protesting",
    "#protester",
    "#protested"
  ]
}
```
Note that you have to update the whole array and cannot append or remove individual keywords.

## Delete a RiskCategory Document

```
DELETE /risk-categories/:id
```

If `id` is not a valid MongoDB ID, an error is responded with status code 400.

If `id` is a valid MongoDB ID but the document does not exist, the `Not Found` error is responded with status code 404.

Upon success the soft deleted document (`_deleted` === true) is responded with status set to 200.
