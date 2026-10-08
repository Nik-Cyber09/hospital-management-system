# Carepoint Hospital Management

Carepoint is a small-clinic hospital-operations application with a React/Vite client, an Express API, MongoDB storage, and authenticated staff access.

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm.
- A MongoDB database and a database user with access only to the Carepoint database.

## Configure secrets

1. **Rotate the MongoDB database password that was shared in chat before connecting this app.** Do not reuse the exposed password. Use the replacement credential in your local environment only.
2. Copy `server/.env.example` to `server/.env`.
3. Set `MONGODB_URI` to the rotated Atlas URI, including a database name. URL-encode special characters in the database password.
4. Generate a signing secret and set `JWT_SECRET`:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

5. Set `CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173` for local development (so either loopback URL works). Configure only the exact HTTPS client origin or origins in production.

Never commit `.env` files, database credentials, or administrator passwords. Atlas network access and database-user privileges must be configured in Atlas; keep access restricted rather than allowing all IPs.

## Install and run locally

In separate terminals:

```sh
cd server
npm install
npm run dev
```

```sh
cd client
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Vite forwards `/api` requests to the local server on port 4000. The server must connect to MongoDB before it accepts requests.

## Create the first administrator

Set these temporary values in `server/.env`:

```dotenv
ADMIN_NAME=Clinic Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a-unique-password-of-at-least-12-characters
```

Then, from `server/`, run:

```sh
npm run create-admin
```

The bootstrap command refuses to create a second administrator. Remove `ADMIN_PASSWORD` from `.env` after the command succeeds. Sign in through the app, then use the account menu to change the initial password. Administrators can create staff accounts from **Staff**; open registration is not available.

Patient, doctor, appointment, and invoice records support create, update, and delete actions. A patient or doctor cannot be deleted while another record refers to them; remove or reassign those references first.

## Checks

```sh
cd server
npm test
```

```sh
cd client
npm run lint
npm run build
```

For a single-server deployment, build the client and run the server with `NODE_ENV=production`; Express serves `client/dist`. Set `CLIENT_ORIGIN` to the actual HTTPS origin and configure TLS at the hosting layer.

MongoDB uses the Node driver's default connection pool settings. For a single-clinic development deployment without measured concurrent traffic, the defaults avoid tuning arbitrary pool sizes; review Atlas connection metrics and request latency before making workload-driven adjustments.

During load testing and production monitoring, watch Atlas connection counts and API latency. Repeated MongoDB driver `ConnectionCheckOutFailed` or rapid `ConnectionCreated` events warrant investigation before changing the default pool settings.

## Security and clinical-use limitations

This is a starting point, **not a certified or production-ready electronic health record**. Do not enter real patient, health, billing, or other sensitive data until the system has undergone a full security, privacy, operational, and jurisdiction-specific compliance review. It does not yet provide encryption-at-rest policy, MFA, account recovery, audit/event history, automated backups, availability commitments, clinical safety controls, or a payment processor. Configure Atlas backups and retention separately and obtain appropriate legal/security review before any clinical deployment.
