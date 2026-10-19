import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Admin-only account directory. Never return password hashes.
router.get('/', allowRoles('admin'), async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

// Only an Admin can create Employee accounts. Public registration always creates Clients.
router.post('/employees', allowRoles('admin'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (name.length < 2 || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ message: 'Enter a valid name/email and a temporary password of at least 8 characters.' });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'employee',
    isVerified: true,
    isActive: true
  });

  await AuditLog.create({
    actor: req.user._id,
    actorName: req.user.name,
    action: 'CREATE',
    entity: 'User',
    entityId: user._id.toString(),
    details: `Created employee account ${email}`,
    ip: req.ip
  });

  res.status(201).json({ user });
});

// Employee account activation/deactivation. Cannot change roles or deactivate Admin/Client accounts here.
router.patch('/:id', allowRoles('admin'), async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ message: 'Provide isActive as true or false.' });
  }

  const user = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!user) return res.status(404).json({ message: 'Employee account not found.' });

  const wasActive = user.isActive;
  user.isActive = req.body.isActive;
  await user.save();

  if (wasActive !== user.isActive) {
    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      action: user.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entity: 'User',
      entityId: user._id.toString(),
      details: `${user.isActive ? 'Reactivated' : 'Deactivated'} employee account ${user.email}`,
      ip: req.ip
    });
  }

  res.json({ user, message: user.isActive ? 'Employee account reactivated.' : 'Employee account deactivated.' });
});

// Users can edit only their own profile. Role and account status are never editable here.
router.patch('/profile/me', async (req, res) => {
  const allowed = {};
  for (const key of ['name', 'phone', 'profileImage']) {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  }
  if (allowed.name !== undefined) {
    allowed.name = String(allowed.name).trim();
    if (allowed.name.length < 2 || allowed.name.length > 100) {
      return res.status(400).json({ message: 'Name must contain 2 to 100 characters.' });
    }
  }
  if (allowed.phone !== undefined) allowed.phone = String(allowed.phone).trim();
  if (allowed.profileImage !== undefined) {
    const image = String(allowed.profileImage);
    if (image.length > 500_000 || (image && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(image) && !/^https:\/\//.test(image))) {
      return res.status(400).json({ message: 'Profile image must be a supported image or HTTPS URL under 500 KB.' });
    }
    allowed.profileImage = image;
  }

  const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true, runValidators: true });
  res.json({ user });
});

router.patch('/profile/password', async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  if (next.length < 8 || next.length > 128) {
    return res.status(400).json({ message: 'New password must be between 8 and 128 characters.' });
  }
  const full = await User.findById(req.user._id).select('+passwordHash');
  if (!full || !(await bcrypt.compare(current, full.passwordHash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  full.passwordHash = await bcrypt.hash(next, 12);
  await full.save();
  res.json({ message: 'Password updated successfully.' });
});

export default router;
