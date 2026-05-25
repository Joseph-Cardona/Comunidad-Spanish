// client/src/lib/stores.js
import { writable } from 'svelte/store';

export const user = writable(...);
export const token = writable(...);

// Change this line:
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
