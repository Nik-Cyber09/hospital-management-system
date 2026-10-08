# Carepoint Hospital Management

A responsive hospital operations dashboard built with React and Vite. The client uses the Express API for authentication and MongoDB-backed records.

## Run locally

Configure and start the backend first; follow the [repository setup guide](../README.md). Then run:

```sh
npm install
npm run dev
```

Run `npm run lint` and `npm run build` to validate the client.

## Included workflows

- Overview dashboard with appointment, patient, staffing, and billing summaries.
- Patient directory with add/edit forms, care assignments, search, and CSV export.
- Doctor directory with specialties, availability, search, and CSV export.
- Appointment scheduling and editing, visit status updates, search, and CSV export.
- Invoice create/delete flows, internal payment-status updates, and CSV export.
- Delete actions for clinic records, with server-side protection against deleting referenced patients or doctors.
- Signed-in clinic staff access; administrator-only staff account creation.
- MongoDB-backed records and secure, HTTP-only session cookies.

The database starts with empty patient, doctor, appointment, and invoice collections. Add a doctor and a patient to begin scheduling visits; invoices can be created once a patient is on file.

## Important limitations

This is a functional starter, not a production hospital information system:

- Do not enter real patient, health, billing, or other sensitive information.
- Authentication uses password hashing and signed HTTP-only cookies, but there is no MFA, recovery flow, or audit trail.
- Database backups, retention, encryption-at-rest policy, and monitoring must be configured separately.
- No payment processor, scheduling service, or clinical system is connected.

Before any real deployment, configure production TLS, secrets, restricted database access, backups, monitoring, privacy controls, and the compliance review required for the deployment jurisdiction. Never use the database credential shared in chat; rotate it first.
