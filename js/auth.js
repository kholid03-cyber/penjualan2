import { auth } from './firebase.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isReady = false;
        this.initAuthListener();
    }

    // Initialize Firebase Auth state listener
    initAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (user) {
                // User is signed in
                console.log('User signed in:', user.email);
                this.handleAuthSuccess(user);
            } else {
                // User is signed out
                console.log('User signed out');
                this.handleAuthSignOut();
            }
        });
    }

    // Handle successful authentication
    handleAuthSuccess(user) {
        // Store user data in localStorage for easy access
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: this.getUserRole(user.email), // Determine role based on email
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(userData));

        // Redirect to appropriate dashboard
        this.redirectToDashboard(userData.role);
    }

    // Handle sign out
    handleAuthSignOut() {
        localStorage.removeItem('userData');
        // If not on login page, redirect to login
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    // Get user role based on email (you can customize this logic)
    getUserRole(email) {
        if (!email) return 'user';

        // Demo roles based on email patterns
        if (email.includes('admin')) return 'admin';
        if (email.includes('kasir')) return 'kasir';
        if (email.includes('admin1')) return 'admin1';
        if (email.includes('demo')) return 'demo';

        return 'user'; // Default role
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            // Check if Firebase is available
            if (!auth || !auth.app) {
                return { success: false, error: 'Firebase belum dikonfigurasi. Silakan setup Firebase terlebih dahulu.' };
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Sign up new user
    async signUp(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update display name
            await updateProfile(userCredential.user, { displayName });
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Sign out
    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current user
    getUser() {
        if (this.currentUser) {
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                role: this.getUserRole(this.currentUser.email)
            };
        }
        // Fallback to localStorage
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get user token (for API calls)
    async getIdToken() {
        if (this.currentUser) {
            return await this.currentUser.getIdToken();
        }
        return null;
    }

    // Redirect to appropriate dashboard based on role
    redirectToDashboard(role) {
        const dashboardUrls = {
            admin: '/admin-dashboard.html',
            user: '/user-dashboard.html',
            demo: '/demo-dashboard.html',
            kasir: '/admin-dashboard.html',
            admin1: '/admin-dashboard.html'
        };

        const url = dashboardUrls[role] || '/admin-dashboard.html';
        window.location.href = url;
    }

    // Protect pages (call this on protected pages)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }

    // Get human-readable error message
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'Email tidak ditemukan',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/user-disabled': 'Akun dinonaktifkan',
            'auth/email-already-in-use': 'Email sudah digunakan',
            'auth/weak-password': 'Password terlalu lemah',
            'auth/network-request-failed': 'Koneksi internet bermasalah',
            'auth/too-many-requests': 'Terlalu banyak percobaan, coba lagi nanti'
        };

        return errorMessages[errorCode] || 'Terjadi kesalahan, silakan coba lagi';
    }

    // Initialize auth check on page load
    init() {
        // Check if we're on login page and user is already authenticated
        if ((window.location.pathname === '/' || window.location.pathname.includes('index.html'))
            && this.isAuthenticated()) {
            const user = this.getUser();
            this.redirectToDashboard(user.role);
        }
    }
}

// Create global auth instance
window.auth = new AuthManager();

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (window.auth) {
        window.auth.init();
    }
});
