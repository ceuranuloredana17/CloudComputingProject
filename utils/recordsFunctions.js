// /utils/recordsFunctions.js

export const getRecords = async () => {
  const response = await fetch('/api/records');
  if (!response.ok) return null;
  return response.json();
};

export const getRecordById = async (id) => {
  const response = await fetch(`/api/records/${id}`);
  if (!response.ok) return null;
  return response.json();
};

export const createRecord = async (data) => {
  const response = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) return null;
  return response.json();
};

export const updateRecord = async (data) => {
  const { _id, ...body } = data;
  const response = await fetch(`/api/records/${_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
};

export const deleteRecord = async (id) => {
  const response = await fetch(`/api/records/${id}`, { method: 'DELETE' });
  return response.ok;
};
