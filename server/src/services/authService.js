const crypto = require('crypto');
const { z } = require('zod');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');

const registerSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().max(150),
  password: z.string().min(6).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(3).max(100),
  monthlyIncome: z.coerce.number().min(0),
  preferredCurrency: z.string().min(3).max(10),
  language: z.enum(['FR', 'EN', 'AR']),
});

function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    profile: {
      monthlyIncome: Number(row.monthly_income ?? 0),
      preferredCurrency: row.preferred_currency ?? 'TND',
      language: row.language ?? 'FR',
      bio: row.bio ?? '',
      avatarUrl: row.avatar_url ?? '',
    },
  };
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT u.*, up.avatar_url, up.bio, up.monthly_income, up.preferred_currency, up.language
     FROM user u
     LEFT JOIN user_profile up ON up.user_id = u.id
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT u.*, up.avatar_url, up.bio, up.monthly_income, up.preferred_currency, up.language
     FROM user u
     LEFT JOIN user_profile up ON up.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function register(input) {
  const data = registerSchema.parse(input);
  const existing = await findUserByEmail(data.email);
  if (existing) {
    const error = new Error('Email already in use');
    error.status = 409;
    throw error;
  }

  const hashedPassword = hashPassword(data.password);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      'INSERT INTO user (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.email, hashedPassword, 'USER', true]
    );

    await connection.execute(
      'INSERT INTO user_profile (user_id, monthly_income, preferred_currency, language) VALUES (?, ?, ?, ?)',
      [userResult.insertId, 0, 'TND', 'FR']
    );

    await connection.commit();

    const user = await findUserById(userResult.insertId);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return { token, user: mapUser(user) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function login(input) {
  const data = loginSchema.parse(input);
  const user = await findUserByEmail(data.email);

  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const passwordMatches = hashPassword(data.password) === user.password;
  if (!passwordMatches) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { token, user: mapUser(user) };
}

async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return mapUser(user);
}

async function updateProfile(userId, input) {
  const data = updateProfileSchema.parse(input);

  await pool.execute('UPDATE user SET name = ? WHERE id = ?', [data.name, userId]);
  await pool.execute(
    `UPDATE user_profile
     SET monthly_income = ?, preferred_currency = ?, language = ?
     WHERE user_id = ?`,
    [data.monthlyIncome, data.preferredCurrency, data.language, userId]
  );

  const user = await findUserById(userId);
  return mapUser(user);
}

module.exports = { register, login, getProfile, updateProfile };