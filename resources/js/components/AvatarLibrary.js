/**
 * CiviCORE Curated Avatar Library
 * This file contains a set of curated names (seeds) that generate
 * high-quality, distinct 'Beam' avatars using the boring-avatars library.
 */

/** @type {Array<{id: string, name: string, url: string}>} Curated avatar choices shown in account settings. */
export const AVATAR_LIBRARY = [
    { id: 'lib_1', name: 'Justice Sentinel', seed: 'Sentinel' },
    { id: 'lib_2', name: 'Elite Guardian', seed: 'Guardian' },
    { id: 'lib_3', name: 'Vanguard Alpha', seed: 'Vanguard' },
    { id: 'lib_4', name: 'Citizen Prime', seed: 'Primary' },
    { id: 'lib_5', name: 'Digital Auditor', seed: 'Auditor' },
    { id: 'lib_6', name: 'System Architect', seed: 'Architect' },
    { id: 'lib_7', name: 'Logic Master', seed: 'Logic' },
    { id: 'lib_8', name: 'Nexus Leader', seed: 'Nexus' },
    { id: 'lib_9', name: 'Data Analyst', seed: 'Analyst' },
    { id: 'lib_10', name: 'Field Officer', seed: 'Field' },
    { id: 'lib_11', name: 'Chief Strategist', seed: 'Strategy' },
    { id: 'lib_12', name: 'Lead Coordinator', seed: 'Coord' },
    { id: 'lib_13', name: 'Service Liaison', seed: 'Liaison' },
    { id: 'lib_14', name: 'Civic Director', seed: 'Civic' },
    { id: 'lib_15', name: 'Public Trustee', seed: 'Trust' },
    { id: 'lib_16', name: 'Global Admin', seed: 'Globe' },
    { id: 'lib_17', name: 'Security Chief', seed: 'Security' },
    { id: 'lib_18', name: 'Front Desk', seed: 'Front' },
    { id: 'lib_19', name: 'Case Manager', seed: 'Manager' },
    { id: 'lib_20', name: 'Support Hero', seed: 'Hero' },
];

/** Returns a stable library avatar for a user-provided seed. */
export const getLibraryAvatarBySeed = (seed) => {
    // This helper identifies if a user is using a library seed
    return AVATAR_LIBRARY.find(a => a.seed === seed);
};
