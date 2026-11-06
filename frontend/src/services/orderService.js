import api from './api';
export const orderService = {
  list: () => api.get('/orders'),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  pay: (id, data) => api.post(`/orders/${id}/payment`, data),
  update: (id, data) => api.patch(`/orders/${id}`, data),
};
