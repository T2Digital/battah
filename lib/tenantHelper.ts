import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Tenant } from '../types';

// This is a temporary hardcoded fallback for the transition phase.
export const DEFAULT_TENANT: Tenant = {
    id: 'battah',
    name: 'بطاح',
    domain: 'battah.vercel.app',
    modules: ['pos', 'inventory', 'purchasing', 'hr', 'treasury', 'ecommerce', 'reports', 'settings'],
    status: 'active',
    createdAt: new Date().toISOString(),
    plan: 'enterprise'
};

export const fetchTenantByHostname = async (hostname: string): Promise<Tenant> => {
    // If it's localhost, we can default to battah for local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return DEFAULT_TENANT;
    }

    try {
        const tenantsRef = collection(db, 'tenants');
        const q = query(tenantsRef, where('domain', '==', hostname));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const tenantDoc = querySnapshot.docs[0];
            return { ...tenantDoc.data(), id: tenantDoc.id } as Tenant;
        }

        // If not found by exact domain, try matching subdomain (e.g., battah.vercel.app)
        if (hostname.includes('battah') || hostname.includes('ais-dev') || hostname.includes('ais-pre')) {
            return DEFAULT_TENANT;
        }

        return DEFAULT_TENANT; // Fallback
    } catch (error) {
        console.error("Error fetching tenant:", error);
        return DEFAULT_TENANT;
    }
};
