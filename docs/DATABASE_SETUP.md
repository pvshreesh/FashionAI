# Database Setup – Store Your Clothes Properly

Get MongoDB running so wardrobe items **persist**. No more re-uploading every time.

---

## Option A: MongoDB Atlas (cloud, free) – recommended

No local install. Free tier is enough for development.

### 1. Create an account and cluster

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Sign up or log in.
3. **Create a free cluster** (e.g. M0).
4. Choose a cloud provider and region (closest to you).
5. Click **Create**.

### 2. Create a database user

1. In Atlas: **Database Access** → **Add New Database User**.
2. Choose **Password** auth.
3. Username: e.g. `fashionapp`
4. Password: generate a strong one and **save it**.
5. Database User Privileges: **Atlas admin** or **Read and write to any database**.
6. Click **Add User**.

### 3. Allow network access

1. **Network Access** → **Add IP Address**.
2. For dev: **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Confirm.

### 4. Get the connection string

1. **Database** → **Connect** on your cluster.
2. **Connect your application** → Driver: **Node.js**.
3. Copy the URI. It looks like:
   ```text
   mongodb+srv://fashionapp:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password (special chars encoded, e.g. `@` → `%40`).

### 5. Add it to the project

1. Open `code/backend/.env`.
2. Set:
   ```env
   DATABASE_URL=mongodb+srv://fashionapp:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/fashion-app?retryWrites=true&w=majority
   ```
3. Use your real URI; ensure the database name is `fashion-app` (or change it in the URI).

### 6. Restart the backend

```bash
cd code/backend
npm start
```

You should see: `✅ MongoDB Connected: ...`

---

## Option B: Local MongoDB

Good if you prefer everything on your machine.

### 1. Install MongoDB

- **Windows (winget):** In PowerShell (Run as Administrator if the install asks):
  ```powershell
  winget install MongoDB.Server --accept-package-agreements --accept-source-agreements
  ```
  If a UAC prompt appears, accept it. The download is large (~750 MB); install may take a few minutes.
- **Windows (manual):** [MongoDB Community Server](https://www.mongodb.com/try/download/community) – run the MSI installer.
- **macOS:** `brew install mongodb-community` then `brew services start mongodb-community`.
- **Linux:** use the [official docs](https://docs.mongodb.com/manual/administration/install-on-linux/) for your distro.

### 2. Start MongoDB

- **Windows:** After install, MongoDB usually runs as a Windows service. If not, open **Services** (Win+R → `services.msc`), find **MongoDB**, and start it. Or from an admin PowerShell: `Start-Service MongoDB`.
- **macOS:** `brew services start mongodb-community`.

### 3. Configure the app

In `code/backend/.env`:

```env
DATABASE_URL=mongodb://localhost:27017/fashion-app
```

### 4. Restart the backend

```bash
cd code/backend
npm start
```

You should see: `✅ MongoDB Connected: localhost`.

---

## Verify it works

### 1. Health check

Open: [http://localhost:3000/health](http://localhost:3000/health)

You should see: `"database": "connected"`.

### 2. Test script

```bash
cd code/backend
node test-database.js
```

This checks the connection and optionally creates a test wardrobe item.

### 3. Use the app

1. Open the prototype and upload a few clothing images.
2. Refresh the page or close and reopen the browser.
3. Call **GET** `http://localhost:3000/api/wardrobe` (or use “View Stats” in the app).
4. Your items should still be there – they’re now stored in the database.

---

## What gets stored

- **WardrobeItem**: name, images (base64 for now), tags, type, color, style, size, brand, AI description, etc.
- **User** (when you add auth): email, hashed password, profile, body measurements (backend only, never shown in UI).
- **Outfit** (when you add it): saved outfit combinations.

All wardrobe items are associated with a user (or a temporary demo user when not logged in).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `MongoServerError: bad auth` | Wrong username/password in `DATABASE_URL`. |
| `connection refused` | MongoDB not running (local) or wrong URI (Atlas). |
| `IP not allowed` | In Atlas, add your IP (or `0.0.0.0/0` for dev) under Network Access. |
| Special characters in password | Encode them in the URI (e.g. `@` → `%40`, `#` → `%23`). |

---

Once `DATABASE_URL` is set and the server shows MongoDB connected, you’re good to go.
