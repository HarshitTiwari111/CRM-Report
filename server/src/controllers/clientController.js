const Client = require('../models/Client');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../utils/activityLogger');

const listClients = asyncHandler(async (req, res) => {
  const clients = await Client.find().sort({ name: 1 });
  res.json({ success: true, data: clients });
});

const createClient = asyncHandler(async (req, res) => {
  const { name, email, phone, company, address } = req.body;

  const client = await Client.create({ name, email, phone, company, address });
  await logActivity(req.user._id, 'create-client', { name }, req.ip);

  res.status(201).json({ success: true, data: client });
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const { name, email, phone, company, address, isActive } = req.body;
  if (name !== undefined) client.name = name;
  if (email !== undefined) client.email = email;
  if (phone !== undefined) client.phone = phone;
  if (company !== undefined) client.company = company;
  if (address !== undefined) client.address = address;
  if (isActive !== undefined) client.isActive = isActive;

  await client.save();
  await logActivity(req.user._id, 'update-client', { id: client._id.toString() }, req.ip);

  res.json({ success: true, data: client });
});

const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  await client.deleteOne();
  await logActivity(req.user._id, 'delete-client', { id: req.params.id }, req.ip);

  res.json({ success: true, data: { message: 'Client deleted successfully' } });
});

module.exports = { listClients, createClient, updateClient, deleteClient };
