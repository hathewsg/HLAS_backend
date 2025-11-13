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
app.use(cors()); // allow requests from GitHub Pages

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('missing');
  const users = loadUsers();
  if (users.find((u) => u.email === email)) return res.status(400).send('exists');
  users.push({ email, password }); // plaintext for demo only
  saveUsers(users);
  res.send('registered');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).send('invalid');
  res.cookie('session', email);
  res.send('logged in');
});

app.get('/me', (req, res) => {
  if (!req.cookies.session) return res.status(401).send('not logged in');
  res.send(`Hello ${req.cookies.session}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
