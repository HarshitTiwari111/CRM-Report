require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Settings = require('../models/Settings');

const run = async () => {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('Seed aborted: could not establish a MongoDB connection.');
    process.exit(1);
  }

  console.log('Seeding database...');

  const departmentsData = [
    { name: 'Engineering', description: 'Software development and technical operations' },
    { name: 'Marketing', description: 'Marketing, branding and outreach' },
    { name: 'Human Resources', description: 'HR, recruitment and employee relations' },
  ];

  const departments = [];
  for (const dept of departmentsData) {
    let existing = await Department.findOne({ name: dept.name });
    if (!existing) {
      existing = await Department.create(dept);
      console.log(`Created department: ${dept.name}`);
    }
    departments.push(existing);
  }

  const adminEmail = 'admin@crm.local';
  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    admin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      passwordHash,
      role: 'superadmin',
      department: departments[0]._id,
      designation: 'Administrator',
      joiningDate: new Date(),
      isActive: true,
    });
    console.log(`Created superadmin user: ${adminEmail} / Admin@123`);
  } else {
    console.log('Superadmin user already exists, skipping.');
  }

  const settings = await Settings.findOne();
  if (!settings) {
    await Settings.create({});
    console.log('Created default settings document.');
  }

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
