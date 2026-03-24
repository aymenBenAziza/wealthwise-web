const authService = require('../services/authService');

async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, updateMe };
