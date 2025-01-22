// This file exports interfaces and types used throughout the application, enhancing type safety.

export interface Bin {
    bin_id: string;
    fill_level: number;
    latitude: number;
    longitude: number;
    timestamp: string;
}

export interface User {
    email: string;
    password: string;
    name: string;
    address: string;
    userType: 'resident' | 'collector' | 'admin';
}