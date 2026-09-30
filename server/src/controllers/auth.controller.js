const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function signToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken(admin);
  return res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
};

exports.me = async (req, res) => {
  return res.json({ admin: req.admin });
};
