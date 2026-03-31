const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Simple JSON file "database"
const dbFile = path.join(__dirname, 'data.json');

function loadDb() {
  try {
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    // fallthrough to default
  }

  return {
    users: [],
    groups: [],
    groupMembers: [],
    messages: [],
    meetings: [],
  };
}

let db = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    // For a simple testcase app, we log but don't crash
    console.error('Failed to save database file:', err.message);
  }
}

function nextId(collection) {
  if (!collection || collection.length === 0) return 1;
  return Math.max(...collection.map((item) => item.id || 0)) + 1;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

app.use(cors());
app.use(express.json());

// Public auth routes (no auth middleware)
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const normalizedRole = role === 'admin' ? 'admin' : 'user';

  if (normalizedRole === 'admin') {
    const existingAdmin = db.users.find((u) => u.role === 'admin');
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin user already exists.' });
    }
  }

  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'A user with that email already exists.' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const newUser = {
    id: nextId(db.users),
    name,
    email,
    password_hash,
    role: normalizedRole,
    created_at: now,
    last_login_at: null,
    last_seen_at: null,
  };

  db.users.push(newUser);
  saveDb();

  return res.status(201).json({
    user: sanitizeUser(newUser),
    message: 'User registered successfully.',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  // If a role is specified, enforce it
  if (role && role !== user.role) {
    return res.status(403).json({ message: 'Incorrect role for this account.' });
  }

  const now = new Date().toISOString();
  user.last_login_at = now;
  user.last_seen_at = now;
  saveDb();

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

// Auth middleware for all other /api routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((u) => u.id === payload.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = { id: user.id, role: user.role };

    // Update activity timestamp
    user.last_seen_at = new Date().toISOString();
    saveDb();

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
}

// Everything below requires auth
app.use('/api', authMiddleware);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Profile
app.get('/api/auth/profile/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const requestingUser = req.user;

  if (!requestingUser) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  if (requestingUser.id !== targetId && requestingUser.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const user = db.users.find((u) => u.id === targetId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const createdGroups = db.groups
    .filter((g) => g.creator_id === user.id)
    .map((g) => {
      const membersCount = db.groupMembers.filter((gm) => gm.group_id === g.id).length + 1;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        subject: g.subject,
        members_count: membersCount,
      };
    });

  const joinedGroupIds = db.groupMembers
    .filter((gm) => gm.user_id === user.id)
    .map((gm) => gm.group_id);

  const joinedGroups = db.groups
    .filter((g) => joinedGroupIds.includes(g.id) && g.creator_id !== user.id)
    .map((g) => {
      const membersCount = db.groupMembers.filter((gm) => gm.group_id === g.id).length + 1;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        subject: g.subject,
        members_count: membersCount,
      };
    });

  res.json({
    created_groups: createdGroups,
    joined_groups: joinedGroups,
  });
});

// Groups list
app.get('/api/groups', (req, res) => {
  const groups = db.groups.map((g) => {
    const creator = db.users.find((u) => u.id === g.creator_id);
    const membersCount = db.groupMembers.filter((gm) => gm.group_id === g.id).length + 1;
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      subject: g.subject,
      invitation_code: g.invitation_code,
      creator_id: g.creator_id,
      creator_name: creator ? creator.name : null,
      creator_email: creator ? creator.email : null,
      created_at: g.created_at,
      members_count: membersCount,
    };
  });

  res.json(groups);
});

// Single group details
app.get('/api/groups/:id', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = db.groups.find((g) => g.id === groupId);

  if (!group) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const members = db.groupMembers
    .filter((gm) => gm.group_id === group.id)
    .map((gm) => {
      const user = db.users.find((u) => u.id === gm.user_id);
      return user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
          }
        : null;
    })
    .filter(Boolean);

  const messages = db.messages
    .filter((m) => m.group_id === group.id)
    .map((m) => {
      const author = db.users.find((u) => u.id === m.user_id);
      return {
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        author: author ? { id: author.id, name: author.name } : null,
      };
    });

  const meetings = db.meetings
    .filter((mt) => mt.group_id === group.id)
    .map((mt) => {
      const creator = db.users.find((u) => u.id === mt.user_id);
      return {
        id: mt.id,
        title: mt.title,
        scheduled_for: mt.scheduled_for,
        created_by_name: creator ? creator.name : null,
      };
    });

  const membersCount = members.length + 1;

  res.json({
    id: group.id,
    name: group.name,
    description: group.description,
    subject: group.subject,
    invitation_code: group.invitation_code,
    creator_id: group.creator_id,
    members_count: membersCount,
    members,
    messages,
    meetings,
    created_at: group.created_at,
  });
});

function generateInvitationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create group
app.post('/api/groups', (req, res) => {
  const { name, description, subject, creator_id } = req.body || {};
  const currentUserId = req.user.id;

  if (!name || !description || !subject) {
    return res.status(400).json({ message: 'Name, subject and description are required.' });
  }

  if (creator_id && creator_id !== currentUserId && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You cannot create groups for other users.' });
  }

  let code;
  do {
    code = generateInvitationCode();
  } while (db.groups.some((g) => g.invitation_code === code));

  const now = new Date().toISOString();

  const group = {
    id: nextId(db.groups),
    name,
    description,
    subject,
    invitation_code: code,
    creator_id: currentUserId,
    created_at: now,
  };

  db.groups.push(group);

  // Add creator as member
  db.groupMembers.push({
    id: nextId(db.groupMembers),
    group_id: group.id,
    user_id: currentUserId,
    joined_at: now,
  });

  saveDb();

  res.status(201).json({
    group: {
      id: group.id,
      name: group.name,
      invitation_code: group.invitation_code,
      subject: group.subject,
      description: group.description,
      creator_id: group.creator_id,
      created_at: group.created_at,
    },
  });
});

// Join group by invitation code
app.post('/api/groups/join', (req, res) => {
  const { invitation_code } = req.body || {};
  const userId = req.user.id;

  if (!invitation_code) {
    return res.status(400).json({ message: 'Invitation code is required.' });
  }

  const codeUpper = invitation_code.toUpperCase();
  const group = db.groups.find((g) => g.invitation_code === codeUpper);

  if (!group) {
    return res.status(404).json({ message: 'Group not found for that code.' });
  }

  const existingMembership = db.groupMembers.find(
    (gm) => gm.group_id === group.id && gm.user_id === userId,
  );

  if (!existingMembership) {
    db.groupMembers.push({
      id: nextId(db.groupMembers),
      group_id: group.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
    });
    saveDb();
  }

  res.json({
    message: 'Joined group successfully.',
    group: {
      id: group.id,
      name: group.name,
    },
  });
});

// Group messages
app.get('/api/groups/:id/messages', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const messages = db.messages
    .filter((m) => m.group_id === group.id)
    .map((m) => {
      const author = db.users.find((u) => u.id === m.user_id);
      return {
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        author: author ? { id: author.id, name: author.name } : null,
      };
    });

  res.json(messages);
});

app.post('/api/groups/:id/messages', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { content } = req.body || {};
  const userId = req.user.id;

  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const membership = db.groupMembers.find(
    (gm) => gm.group_id === group.id && gm.user_id === userId,
  );
  if (!membership) {
    return res.status(403).json({ message: 'You must be a member to post messages.' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  const now = new Date().toISOString();
  const message = {
    id: nextId(db.messages),
    group_id: group.id,
    user_id: userId,
    content: content.trim(),
    created_at: now,
  };

  db.messages.push(message);
  saveDb();

  const author = db.users.find((u) => u.id === userId);

  res.status(201).json({
    message: {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      author: author ? { id: author.id, name: author.name } : null,
    },
  });
});

// Group meetings
app.get('/api/groups/:id/meetings', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const meetings = db.meetings
    .filter((mt) => mt.group_id === group.id)
    .map((mt) => {
      const creator = db.users.find((u) => u.id === mt.user_id);
      return {
        id: mt.id,
        title: mt.title,
        scheduled_for: mt.scheduled_for,
        created_by_name: creator ? creator.name : null,
      };
    });

  res.json(meetings);
});

app.post('/api/groups/:id/meetings', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { title, scheduled_for } = req.body || {};
  const userId = req.user.id;

  const group = db.groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const membership = db.groupMembers.find(
    (gm) => gm.group_id === group.id && gm.user_id === userId,
  );
  if (!membership) {
    return res.status(403).json({ message: 'You must be a member to schedule meetings.' });
  }

  if (!title || !scheduled_for) {
    return res.status(400).json({ message: 'Title and scheduled time are required.' });
  }

  const meeting = {
    id: nextId(db.meetings),
    group_id: group.id,
    user_id: userId,
    title: title.trim(),
    scheduled_for,
    created_at: new Date().toISOString(),
  };

  db.meetings.push(meeting);
  saveDb();

  const creator = db.users.find((u) => u.id === userId);

  res.status(201).json({
    meeting: {
      id: meeting.id,
      title: meeting.title,
      scheduled_for: meeting.scheduled_for,
      created_by_name: creator ? creator.name : null,
    },
  });
});

// Delete group (admin or creator)
app.delete('/api/groups/:id', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const groupIndex = db.groups.findIndex((g) => g.id === groupId);

  if (groupIndex === -1) {
    return res.status(404).json({ message: 'Group not found.' });
  }

  const group = db.groups[groupIndex];

  if (req.user.role !== 'admin' && group.creator_id !== req.user.id) {
    return res.status(403).json({ message: 'Only the admin or group creator can delete this group.' });
  }

  db.groups.splice(groupIndex, 1);
  db.groupMembers = db.groupMembers.filter((gm) => gm.group_id !== groupId);
  db.messages = db.messages.filter((m) => m.group_id !== groupId);
  db.meetings = db.meetings.filter((mt) => mt.group_id !== groupId);

  saveDb();

  return res.status(204).send();
});

// Admin: user overview
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const now = Date.now();
  const activeWindowMs = 5 * 60 * 1000; // 5 minutes

  const users = db.users.map((u) => {
    const lastSeen = u.last_seen_at ? Date.parse(u.last_seen_at) : 0;
    const isActive = lastSeen && now - lastSeen <= activeWindowMs;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      last_seen_at: u.last_seen_at,
      is_active: !!isActive,
    };
  });

  res.json({ users });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

