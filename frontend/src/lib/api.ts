// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Automatically send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debounce flag — prevents multiple concurrent 401s from all triggering redirect
let isRedirectingToLogin = false;

// Response interceptor: handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true;
        localStorage.removeItem('chims_token');
        localStorage.removeItem('chims_user');
        // Delete cookie client side just in case (will only work if not HttpOnly, but good hygiene)
        document.cookie = "chims_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        // Small delay so all in-flight requests can settle before redirect
        setTimeout(() => {
          window.location.href = '/login';
          isRedirectingToLogin = false;
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

