// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({
  origin: ["https://hathewsg.github.io", "http://localhost:5500"],
  credentials: true
}));; // allow requests from GitHub Pages


////////////////////////////////////////
// 1. REGISTER (default role = "user")
////////////////////////////////////////
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('missing');

  const users = loadUsers();

  if (users.find((u) => u.email === email)) {
    return res.status(400).send('exists');
  }

  users.push({
    email,
    password, // (insecure, for demo)
    role: "user", // <-- NEW
    displayName: email.split("@")[0], // default
    profilePicture: null // user can upload later
  });

  saveUsers(users);
  res.send('registered');
});

////////////////////////////////////////
// 2. LOGIN
////////////////////////////////////////
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).send('invalid');

  // Store session cookie containing the email
  res.cookie('session', email, {
    httpOnly: true,       // prevents JS from reading cookie
    secure: true,         // must be true for HTTPS
    sameSite: 'None'      // allows cross-site requests
  });
  res.send('logged in');

});

////////////////////////////////////////
// 2.5 LOGOUT
////////////////////////////////////////
app.post("/logout", (req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    secure: true,
    sameSite: "None"
  });
  res.send("logged out");
});




////////////////////////////////////////
// 3. USER INFO
////////////////////////////////////////

app.get('/me', (req, res) => {
  const sessionEmail = req.cookies.session;
  if (!sessionEmail) return res.status(401).json({ error: 'not logged in' });

  const users = loadUsers();
  const user = users.find(u => u.email === sessionEmail);
  if (!user) return res.status(401).json({ error: 'not logged in' });

  res.json({
    email: user.email,
    role: user.role || 'user', // default role if not set
    displayName: user.displayName || user.email.split("@")[0],
    profilePicture: user.profilePicture || null
  });
});

////////////////////////////////////////
// 4. Role-check middleware
////////////////////////////////////////
function requireRole(role) {
  return (req, res, next) => {
    const users = loadUsers();
    const user = users.find(u => u.email === req.cookies.session);

    if (!user) return res.status(401).send('not logged in');

    // Admins can access everything
    if (user.role === 'admin') return next();

    // Check required role
    if (user.role !== role) {
      return res.status(403).send('forbidden');
    }

    next();
  };
}

////////////////////////////////////////
// 5. Example moderator-only route
////////////////////////////////////////
app.get('/moderator-area', requireRole('moderator'), (req, res) => {
  res.send('Welcome moderator (or admin)');
});

////////////////////////////////////////
// 6. Example admin-only route
////////////////////////////////////////
app.get('/admin-area', requireRole('admin'), (req, res) => {
  res.send('Welcome admin!');
});

////////////////////////////////////////
// 7. OPTIONAL: Admin can change user roles
////////////////////////////////////////
app.post('/set-role', requireRole('admin'), (req, res) => {
  const { email, role } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.status(404).send('user not found');

  if (!["user", "moderator", "admin"].includes(role)) {
    return res.status(400).send('invalid role');
  }

  user.role = role;
  saveUsers(users);

  res.send(`Role updated to ${role}`);
});

////////////////////////////////////////
// 8. OPTIONAL: User can change display name
////////////////////////////////////////
app.post('/update-display-name', (req, res) => {
  const sessionEmail = req.cookies.session;
  if (!sessionEmail) return res.status(401).send('not logged in');

  const { displayName } = req.body;
  if (!displayName) return res.status(400).send('missing displayName');

  const users = loadUsers();
  const user = users.find(u => u.email === sessionEmail);

  user.displayName = displayName;
  saveUsers(users);

  res.send('displayName updated');
});

////////////////////////////////////////
// 9. OPTIONAL: User can change profile picture
////////////////////////////////////////
app.post('/update-profile-picture', (req, res) => {
  const sessionEmail = req.cookies.session;
  if (!sessionEmail) return res.status(401).send('not logged in');

  const { image } = req.body;
  if (!image) return res.status(400).send('missing image');

  const users = loadUsers();
  const user = users.find(u => u.email === sessionEmail);

  user.profilePicture = image;
  saveUsers(users);

  res.send('profile picture updated');
});


////////////////////////////////////////

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
