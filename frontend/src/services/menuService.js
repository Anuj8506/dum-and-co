import api from './api';
export const menuService = {
  list: (outlet) => api.get('/menu', { params: { outlet } }),
  admin: () => api.get('/menu/admin'),
  save: (id, data) => (id ? api.put(`/menu/${id}`, data) : api.post('/menu', data)),
  availability: (id, data) => api.patch(`/menu/${id}/availability`, data),
};
