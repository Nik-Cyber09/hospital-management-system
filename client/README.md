# Carepoint Hospital Management Demo

A responsive, local-first hospital operations dashboard built with React and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create and preview a production build:

```sh
npm run build
npm run preview
```

Run the code checks with `npm run lint`.

## Included workflows

- Overview dashboard with appointment, patient, staffing, and billing summaries.
- Patient directory with add/edit forms, care assignments, search, and CSV export.
- Doctor directory with specialties, availability, search, and CSV export.
- Appointment scheduling and editing, visit status updates, search, and CSV export.
- Invoice list with demo payment-status toggles and CSV export.
- Local browser persistence using `localStorage`; reloads retain changes on the same browser.

The app starts with empty patient, doctor, appointment, and invoice lists. Add a doctor and a patient to begin scheduling visits; invoices can be created once a patient is on file. Data is stored locally in the browser under `carepoint-hospital-demo-v2`.

## Important limitations

This repository currently contains only a browser client. The `server` folder has no API or database implementation. This is a functional demonstration, not a production hospital information system:

- Do not enter real patient, health, billing, or other sensitive information.
- There is no authentication, authorization, audit trail, backup, or cross-user synchronization.
- Browser storage and invoice status toggles are not secure or authoritative.
- No payment processor, scheduling service, or clinical system is connected.

Before any real deployment, add a properly secured backend and database, role-based access, encryption, audit logging, backups, privacy controls, and the compliance review required for the deployment jurisdiction.
