import { writable } from 'svelte/store';

export const user = writable(JSON.parse(localStorage.getItem('user')) || null);

user.subscribe(value => {
  if (value) {
    localStorage.setItem('user', JSON.stringify(value));
  } else {
    localStorage.removeItem('user');
  }
});

export const token = writable(localStorage.getItem('token') || null);

token.subscribe(value => {
  if (value) {
    localStorage.setItem('token', value);
  } else {
    localStorage.removeItem('token');
  }
});

// Change this line:
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
