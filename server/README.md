# Carepoint API

Express 5 API for Carepoint staff authentication and MongoDB-backed patient, doctor, appointment, and invoice records.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`; set `MONGODB_URI`, a random `JWT_SECRET` with at least 32 characters, and the exact `CLIENT_ORIGIN`.
3. Start the service with `npm run dev`.
4. Create the first administrator using the instructions in the repository [README](../README.md).

The app deliberately uses MongoDB driver's default pool settings for the initial low-traffic, single-clinic deployment. Do not use the connection string previously shared in chat; rotate it and configure the replacement only in the untracked `.env` file.

`npm test` runs API access-control and input-validation tests without requiring a MongoDB connection.
