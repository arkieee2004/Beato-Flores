# Beato Flores — MERN Inventory Management System

A full-stack starter application for a flower shop using **MongoDB, Express.js, React, and Node.js**. It includes role-based access, client email verification by OTP, forgot-password OTP, product CRUD, suppliers, orders, employee account management, profile editing, reports, and audit logs.

> This is a runnable starter implementation. Before real business use, review and test all workflows, add production email/domain setup, secure image storage, stronger monitoring, automated tests, backups, and deployment configuration.

## Stack
- Frontend: React + Vite + React Router + Lucide icons
- Backend: Node.js + Express REST API
- Database: MongoDB + Mongoose
- Authentication: JWT (8-hour expiry) and bcrypt password hashing
- Email OTP: Nodemailer + Gmail SMTP App Password
- API protection: Helmet, CORS allowlist, rate limits, role checks, validation

## Requirements
- Node.js 20+ recommended
- MongoDB local instance or MongoDB Atlas database
- Gmail account with 2-Step Verification enabled and an App Password generated

## 1. Configure the backend
```bash
cd server
cp .env.example .env
```
Edit `server/.env`:
- `MONGODB_URI`: your local MongoDB URI or Atlas connection string
- `JWT_SECRET`: long random secret (32+ characters)
- `CLIENT_URL=http://localhost:5173`
- `SMTP_USER`: Gmail address
- `SMTP_PASS`: Gmail **App Password**, not your normal Gmail password
- `MAIL_FROM`: sender display name/address

### Gmail App Password setup
1. Enable 2-Step Verification on the Google account.
2. Open the Google Account security settings and create an App Password (if your account is eligible).
3. Put the generated app password in `SMTP_PASS`. Google may display spaces; enter the value as instructed by Google.
4. Do not commit `.env`, share the App Password, or put SMTP credentials in the React client.

### MongoDB connection check
- For local MongoDB, make sure the MongoDB service is running and keep `MONGODB_URI=mongodb://127.0.0.1:27017/beato_flores` in `server/.env`.
- For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string, URL-encode special characters in the database password, and allow your development IP in Atlas Network Access.
- The backend waits for `mongoose.connect()` to succeed before listening on port 5000. If the URI is missing or invalid, the server exits and prints a startup error; it does not silently use temporary/in-memory data.
- Check `http://localhost:5000/api/health` after startup. A successful health response confirms the API is running; the terminal's `MongoDB connected` message confirms the database connection.

## 2. Install and run the backend
```bash
cd server
npm install
npm run dev
```
The API listens on `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health`.

## 3. Create the first Admin account
Public registration always creates a `client`; a browser user cannot choose an Admin/Employee role. With the backend configured and MongoDB running:
```bash
cd server
node src/seedAdmin.js "Beato Flores Admin" admin@yourshop.com "Use-A-Strong-Password-123!"
```
Use a unique email and a strong password. The script refuses to overwrite an existing account. Keep the Admin credentials private.

## 4. Install and run the frontend
In another terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

## Client registration and OTP
1. Client creates an account on `/register`.
2. Backend creates an unverified client account and sends a 6-digit email OTP.
3. Client enters the OTP on `/verify-email`.
4. Code expires in 5 minutes, is single-use, and is stored as a keyed SHA-256 hash. Incorrect attempts are limited to 5 per code. OTP request endpoints are rate-limited.
5. Client can log in after email verification.

Forgot password: `/forgot-password` → request code → enter OTP and a new password. API replies generically where appropriate to reduce account enumeration.

## Roles
- **Admin:** manage employees, inventory, suppliers, orders, reports/audit logs.
- **Employee:** inventory create/update, supplier operations, order fulfillment, reports summary. Cannot create employees or manage user accounts.
- **Client:** self-register after email OTP, browse inventory, place orders through the API, and see their own orders. The UI's inventory catalog is included; customer cart/checkout UI is an extension point.

## API overview
All protected endpoints use `Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

### Products
- `GET /api/products?search=&category=&stock=&page=&limit=`
- `GET /api/products/:id`
- `POST /api/products` (Admin/Employee)
- `PATCH /api/products/:id` (Admin/Employee)
- `DELETE /api/products/:id` (Admin soft-delete)

### Users (authenticated)
- `GET /api/users` (Admin)
- `POST /api/users/employees` (Admin only)
- `PATCH /api/users/:id` (Admin; Employee accounts only; body: `{ "isActive": false }` to deactivate or `{ "isActive": true }` to reactivate)
- `PATCH /api/users/profile/me` (own profile)
- `PATCH /api/users/profile/password` (own password, current password required)

### Suppliers, orders, reports
- `/api/suppliers` CRUD; deletion is Admin-only
- `GET /api/orders`; `POST /api/orders` (Client); `PATCH /api/orders/:id/status` (Admin/Employee)
- `GET /api/reports/summary` (Admin/Employee)
- `GET /api/reports/audit-logs` (Admin)

### Deactivate or reactivate an Employee
1. Sign in with the Admin account.
2. Open **Employee Management**.
3. Press **Deactivate** beside an active Employee, then confirm if prompted by the interface.
4. The Employee is marked inactive in MongoDB and cannot log in or continue using protected API endpoints. Use **Reactivate** to restore access.
5. The action is written to the audit log. This endpoint cannot deactivate Admin or Client accounts and cannot change a user's role.

## Important implementation notes
- Profile images in this starter are accepted as small data URLs in MongoDB. For production, use Cloudinary or object storage and store only the URL/public ID in MongoDB. Add server-side file-type/size checks and do not accept arbitrary data URLs.
- The frontend uses localStorage for the JWT for simplicity in this class project. A production deployment should evaluate secure, HttpOnly cookies and CSRF protections.
- OTP records have a MongoDB TTL index; TTL deletion is asynchronous, but verification also checks `expiresAt` directly.
- The order API checks available stock when a client submits and deducts stock when an employee/admin confirms. For high-concurrency production use, replace this with atomic transactions to prevent race conditions.
- This starter includes API-level client order creation but does not yet include a visual shopping cart/checkout form. If your final scope requires online checkout, build that UI and decide how payment will be handled; no payment gateway is included.
- Email sending requires valid Gmail SMTP settings. Without them, OTP email delivery fails and the server returns a configuration error; it intentionally does not display OTP codes in API responses.
- Do not deploy with sample secrets. Configure HTTPS, restricted CORS, secrets manager, logging, database backups, and tests before real use.

## Project structure
```text
beato-flores-mern/
  server/
    src/config/       MongoDB connection
    src/models/       User, OTP, Product, Supplier, Order, AuditLog
    src/middleware/   Auth, role authorization, error handling
    src/routes/       Auth, products, users, suppliers, orders, reports
    src/utils/        Gmail SMTP mailer
  client/
    src/components/   Shared app layout
    src/context/      Auth session
    src/pages/        Auth and inventory pages
```

## Sample flower catalog

On first backend startup, the app automatically inserts eight sample flower and bouquet products **only if the Products collection is empty**. These are demo records with sample prices and quantities so the catalog is not blank for a presentation. Admins can update or deactivate them from Inventory. Change the sample prices, stock, descriptions, and image URLs to match the real shop before production. Product images are loaded from remote Unsplash URLs, so an internet connection is needed to display them.


## Windows / VS Code quick start

Open the folder that contains `client` and `server` in VS Code. Do not run `npm run dev` from the Downloads parent folder; run it inside the correct subfolder.

**Terminal 1 — backend (PowerShell):**
```powershell
cd .\server
Copy-Item .env.example .env
notepad .env
npm install
npm run dev
```

Fill in `MONGODB_URI` and `JWT_SECRET` in `server/.env`. For Atlas, use the connection string copied from your own MongoDB Atlas cluster, replace the password placeholder, URL-encode special characters in the password, and allow your current IP in Atlas Network Access. Do not share your `.env` file. Gmail OTP requires a Gmail address and a Google App Password in `SMTP_USER` and `SMTP_PASS`.

**Terminal 2 — frontend (PowerShell):** open a second terminal using the `+` button, then run:
```powershell
cd .\client
npm install
npm run dev
```

Open `http://localhost:5173`. Leave both terminals running. If your terminal starts in the project parent, use `cd .\Beato-Flores-Inventory-System\server` or `cd .\Beato-Flores-Inventory-System\client` only if that nested folder is actually shown in Explorer. You can avoid path typos by right-clicking the `server` or `client` folder in VS Code Explorer and choosing **Open in Integrated Terminal**.

**Create the first Admin:** with the backend terminal stopped or in a separate terminal, run this from `server` after MongoDB connects:
```powershell
node src/seedAdmin.js "Beato Flores Admin" admin@yourshop.com "Use-A-Strong-Password-123!"
```
Replace the example email and password with your own. Do not use that example password in a public deployment.

**Check the API:** open `http://localhost:5000/api/health`; it should report `status: ok` and `database: connected`. If the page is blank, open browser DevTools Console and fix the first red error shown there.

## Important notes
- The sample flower products are inserted only when the products collection is empty. Their prices and quantities are demo values; update them before real use.
- Payment choices, shipping/courier selection, and OTP email depend on the implemented backend configuration; this starter does not represent a verified live payment-gateway or courier API integration.
- Backend JavaScript syntax was checked when packaging. A full frontend build and live MongoDB/SMTP end-to-end test could not be confirmed in this environment, so test those steps on your machine before presenting or deploying.
