/** @type {string[]} Official barangay names used by certificate forms. */
export const NAIC_BARANGAYS = [
    'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
    'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
    'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
    'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
    'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
    'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
].sort();

/** @type {string[]} Supported name suffix values for form selectors. */
export const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'M.D.', 'Esq.', 'Ph.D.'];

/** Builds the reusable first, middle, last, and suffix field definitions. */
export const NAME_FIELDS = (prefix = '') => [
    { key: `${prefix}last_name`, label: 'Last Name', type: 'text', required: true, width: 'sm:col-span-1' },
    { key: `${prefix}first_name`, label: 'First Name', type: 'text', required: true, width: 'sm:col-span-1' },
    { key: `${prefix}middle_name`, label: 'Middle Name', type: 'text', required: false, width: 'sm:col-span-1' },
    { key: `${prefix}suffix`, label: 'Suffix', type: 'select', options: SUFFIX_OPTIONS, required: false, width: 'sm:col-span-1' },
];

/** @type {string[]} Supported 12 calendar months for date selectors. */
export const MONTH_OPTIONS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/** @type {string[]} Standardized country options for birth and civil registry records. */
export const COUNTRY_OPTIONS = [
    'Philippines', 'United States', 'Canada', 'Japan', 'United Arab Emirates',
    'Saudi Arabia', 'Australia', 'United Kingdom', 'Singapore', 'Qatar',
    'Kuwait', 'Hong Kong', 'Taiwan', 'Italy', 'Germany', 'South Korea',
    'Spain', 'New Zealand', 'China', 'Malaysia', 'Others'
];

/** @type {string[]} Comprehensive Philippine provinces with Cavite prioritized. */
export const PROVINCE_OPTIONS = [
    'Cavite',
    'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao', 'Aurora',
    'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol', 'Bukidnon', 'Bulacan',
    'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin', 'Capiz', 'Catanduanes', 'Cebu', 'Cotabato',
    'Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands',
    'Eastern Samar', 'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo', 'Isabela',
    'Kalinga', 'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte',
    'Maguindanao del Norte', 'Maguindanao del Sur', 'Marinduque', 'Masbate', 'Metro Manila',
    'Misamis Occidental', 'Misamis Oriental', 'Mountain Province', 'Negros Occidental', 'Negros Oriental',
    'Northern Samar', 'Nueva Ecija', 'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro',
    'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon',
    'Samar', 'Sarangani', 'Siquijor', 'Sorsogon', 'South Cotabato', 'Southern Leyte', 'Sultan Kudarat', 'Sulu',
    'Surigao del Norte', 'Surigao del Sur', 'Tarlac', 'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte',
    'Zamboanga del Sur', 'Zamboanga Sibugay', 'Others'
];

/** @type {string[]} Municipalities and cities with Naic, Cavite LGUs, and neighboring hubs. */
export const MUNICIPALITY_OPTIONS = [
    'Naic',
    'Alfonso', 'Amadeo', 'Bacoor', 'Carmona', 'Cavite City', 'Dasmariñas',
    'General Emilio Aguinaldo', 'General Mariano Alvarez', 'General Trias',
    'Imus', 'Indang', 'Kawit', 'Magallanes', 'Maragondon', 'Mendez',
    'Noveleta', 'Rosario', 'Silang', 'Tagaytay', 'Tanza', 'Ternate', 'Trece Martires',
    'Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Malabon',
    'Mandaluyong', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay',
    'Pasig', 'San Juan', 'Taguig', 'Valenzuela',
    'Biñan', 'Cabuyao', 'Calamba', 'San Pedro', 'Santa Rosa',
    'Antipolo', 'Batangas City', 'Lipa', 'Lucena', 'Others'
];

/** @type {string[]} Supported citizenship options. */
export const CITIZENSHIP_OPTIONS = [
    'Filipino', 'American', 'Chinese', 'Japanese', 'British', 'Canadian',
    'Australian', 'Indian', 'Spanish', 'Korean', 'German', 'Italian', 'Others'
];

