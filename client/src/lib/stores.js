import { writable } from 'svelte/store';

export const user = writable(JSON.parse(localStorage.getItem('user')) || null);
export const token = writable(localStorage.getItem('token') || null);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://comunidad-spanish.onrender.com/api';
