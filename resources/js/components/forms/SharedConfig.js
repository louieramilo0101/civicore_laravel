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
