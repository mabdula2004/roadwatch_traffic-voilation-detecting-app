import { DIVISIONS, INITIAL_OFFICERS } from './divisions';
import { supabase } from '../lib/supabase';

const USERS_STORAGE_KEY = 'roadwatch_registered_users';
const SESSION_STORAGE_KEY = 'roadwatch_auth_session';

// Build initial seed accounts
function buildInitialUsers() {
  const adminUsers = DIVISIONS.map((d) => ({
    id: d.admin.id,
    name: d.admin.name,
    email: d.admin.email.toLowerCase(),
    badge: d.admin.badge,
    role: 'division_admin',
    divisionId: d.id,
    rank: d.admin.rank,
    pin: '1234',
    clearance: d.admin.clearance,
    createdAt: d.admin.assignedDate || '2023-01-01',
  }));

  const officerUsers = INITIAL_OFFICERS.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email.toLowerCase(),
    badge: o.badge,
    role: 'review_officer',
    divisionId: o.divisionId,
    rank: o.rank,
    sector: o.sector,
    shift: o.shift,
    pin: o.pin || '1234',
    status: o.status,
    createdAt: o.joinedDate || '2024-01-01',
  }));

  return [...adminUsers, ...officerUsers];
}

export function getAllUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { }

  const initial = buildInitialUsers();
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
  } catch { }
  return initial;
}

export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch { }
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
}

export function saveSession(user) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch { }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch { }
}

// Login: matches either email or badge, verifies PIN and role
export function authenticateUser({ identifier, pin, requiredRole }) {
  const users = getAllUsers();
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPin = (pin || '').trim();

  const user = users.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      (u.badge && u.badge.toLowerCase() === cleanId)
  );

  if (!user) {
    throw new Error(`Account "${identifier}" not found. Please register or check your credentials.`);
  }

  // Verify PIN
  if (user.pin && user.pin !== cleanPin) {
    throw new Error('Incorrect Security PIN. Please verify your 4-digit code.');
  }

  // Verify Role Strictness
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'division_admin') {
      throw new Error(
        `This account is registered as Division Administrator (${user.name}). Please login through the Division Admin Portal.`
      );
    } else {
      throw new Error(
        `Access Denied: Officer "${user.name}" (${user.badge}) cannot access Admin Command. Please login via the Officer Workstation.`
      );
    }
  }

  // Save session
  saveSession(user);
  return user;
}

// Register a new Division Admin
export async function registerAdminAccount({ name, email, divisionId, pin }) {
  const users = getAllUsers();
  const cleanEmail = email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(`Email "${cleanEmail}" is already registered. Please login instead.`);
  }

  const division = DIVISIONS.find((d) => d.id === divisionId) || DIVISIONS[0];
  const newAdmin = {
    id: `admin_${division.code.toLowerCase()}_${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    email: cleanEmail,
    badge: `ADM-${division.code}-${Math.floor(10 + Math.random() * 90)}`,
    role: 'division_admin',
    divisionId: division.id,
    rank: 'Superintendent of Police (Division Admin)',
    pin: pin.trim() || '1234',
    clearance: 'Level-4 Executive Command',
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [newAdmin, ...users];
  saveUsers(updatedUsers);
  saveSession(newAdmin);

  // Sync with Supabase base_users
  try {
    await supabase.from('base_users').insert({
      name: newAdmin.name,
      email: newAdmin.email,
      role: 'admin',
      account_state: 'active',
    });
  } catch (err) {
    console.warn('Supabase admin sync note:', err);
  }

  return newAdmin;
}

// Register a new Review Officer
export async function registerOfficerAccount({
  name,
  badge,
  email,
  divisionId,
  rank,
  sector,
  shift,
  pin,
}) {
  const users = getAllUsers();
  const cleanEmail = email.trim().toLowerCase();
  const cleanBadge = badge.trim().toUpperCase();

  const existing = users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      (u.badge && u.badge.toUpperCase() === cleanBadge)
  );

  if (existing) {
    throw new Error(
      `An account with email "${cleanEmail}" or Badge "${cleanBadge}" already exists.`
    );
  }

  const division = DIVISIONS.find((d) => d.id === divisionId) || DIVISIONS[0];
  const newOfficer = {
    id: `off_${division.code.toLowerCase()}_${Date.now().toString().slice(-5)}`,
    name: name.trim(),
    badge: cleanBadge,
    email: cleanEmail,
    role: 'review_officer',
    divisionId: division.id,
    rank: 'Traffic Officer',
    sector: sector || division.sectors[0],
    shift: shift || 'Morning (07:00 - 15:00)',
    status: 'active',
    pin: pin.trim() || '1234',
    casesReviewedToday: 0,
    accuracyRate: 98.8,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [newOfficer, ...users];
  saveUsers(updatedUsers);
  saveSession(newOfficer);

  // Sync with Supabase base_users & officer_profiles
  try {
    const { data: newUser } = await supabase
      .from('base_users')
      .insert({
        name: newOfficer.name,
        email: newOfficer.email,
        role: 'officer',
        account_state: 'active',
      })
      .select('user_id')
      .single();

    if (newUser?.user_id) {
      await supabase.from('officer_profiles').insert({
        officer_id: newUser.user_id,
        badge_id: newOfficer.badge,
        duty_role: newOfficer.rank,
      });
    }
  } catch (err) {
    console.warn('Supabase officer sync note:', err);
  }

  return newOfficer;
}
