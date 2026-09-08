import { NAIC_BARANGAYS, NAME_FIELDS, SUFFIX_OPTIONS } from './SharedConfig.js';

/** @type {Array<{key: string, label: string, x: number, y: number, w: number, h: number}>} Normalized birth-certificate overlay regions. */
export const BirthTemplateOverlayFields = [
    // REGISTRY DETAILS
    { key: 'registry_number', label: 'Registry No.', x: 0.63, y: 0.10, w: 0.20, h: 0.015 },
    { key: 'province', label: 'Province', x: 0.22, y: 0.095, w: 0.34, h: 0.015 },
    { key: 'city_municipality', label: 'City/Municipality', x: 0.28, y: 0.110, w: 0.20, h: 0.015 },

    // CHILD
    { key: 'first_name', label: 'Child First Name', x: 0.29, y: 0.14, w: 0.10, h: 0.015 },
    { key: 'middle_name', label: 'Child Middle Name', x: 0.48, y: 0.14, w: 0.10, h: 0.015 },
    { key: 'last_name', label: 'Child Last Name', x: 0.67, y: 0.14, w: 0.10, h: 0.015 },

    { key: 'sex', label: 'Sex', x: 0.20, y: 0.16, w: 0.10, h: 0.015 },
    { key: 'dob_day', label: 'Day', x: 0.53, y: 0.16, w: 0.06, h: 0.015 },
    { key: 'dob_month', label: 'Month', x: 0.63, y: 0.16, w: 0.10, h: 0.015 },
    { key: 'dob_year', label: 'Year', x: 0.76, y: 0.16, w: 0.08, h: 0.015 },

    { key: 'place_of_birth_hospital', label: 'Hospital/Clinic/Institution', x: 0.25, y: 0.19, w: 0.15, h: 0.015 },
    { key: 'place_of_birth_city', label: 'City/Municipality', x: 0.50, y: 0.19, w: 0.15, h: 0.015 },
    { key: 'place_of_birth_province', label: 'Province', x: 0.69, y: 0.19, w: 0.15, h: 0.015 },

    { key: 'type_of_birth', label: 'Type of Birth', x: 0.20, y: 0.23, w: 0.12, h: 0.015 },
    { key: 'multiple_birth_order', label: 'If Multiple, Child Was', x: 0.40, y: 0.23, w: 0.12, h: 0.015 },
    { key: 'birth_order', label: 'Birth Order', x: 0.58, y: 0.23, w: 0.12, h: 0.015 },
    { key: 'weight_at_birth', label: 'Weight at Birth', x: 0.75, y: 0.23, w: 0.05, h: 0.015 },

    // MOTHER
    { key: 'mother_first_name', label: 'Mother First Name', x: 0.26, y: 0.26, w: 0.14, h: 0.015 },
    { key: 'mother_middle_name', label: 'Mother Middle Name', x: 0.45, y: 0.26, w: 0.14, h: 0.015 },
    { key: 'mother_last_name', label: 'Mother Last Name', x: 0.68, y: 0.26, w: 0.14, h: 0.015 },

    { key: 'mother_citizenship', label: 'Mother Citizenship', x: 0.19, y: 0.28, w: 0.15, h: 0.015 },
    { key: 'mother_religion', label: 'Mother Religion', x: 0.53, y: 0.28, w: 0.20, h: 0.015 },

    { key: 'mother_children_total', label: 'Total Born Alive', x: 0.18, y: 0.31, w: 0.09, h: 0.015 },
    { key: 'mother_children_living', label: 'Still Living', x: 0.31, y: 0.31, w: 0.09, h: 0.015 },
    { key: 'mother_children_dead', label: 'Now Dead', x: 0.43, y: 0.31, w: 0.09, h: 0.015 },
    { key: 'mother_occupation', label: 'Mother Occupation', x: 0.55, y: 0.31, w: 0.15, h: 0.015 },
    { key: 'mother_age', label: 'Mother Age', x: 0.76, y: 0.31, w: 0.10, h: 0.015 },

    { key: 'mother_residence_house', label: 'House/Street/Brgy', x: 0.28, y: 0.34, w: 0.13, h: 0.015 },
    { key: 'mother_residence_city', label: 'City/Municipality', x: 0.45, y: 0.34, w: 0.13, h: 0.015 },
    { key: 'mother_residence_province', label: 'Province', x: 0.62, y: 0.34, w: 0.13, h: 0.015 },
    { key: 'mother_residence_country', label: 'Country', x: 0.76, y: 0.34, w: 0.10, h: 0.015 },

    // FATHER
    { key: 'father_first_name', label: 'Father First Name', x: 0.27, y: 0.37, w: 0.15, h: 0.015 },
    { key: 'father_middle_name', label: 'Father Middle Name', x: 0.45, y: 0.37, w: 0.15, h: 0.015 },
    { key: 'father_last_name', label: 'Father Last Name', x: 0.68, y: 0.37, w: 0.15, h: 0.015 },

    { key: 'father_citizenship', label: 'Father Citizenship', x: 0.18, y: 0.40, w: 0.15, h: 0.015 },
    { key: 'father_religion', label: 'Father Religion', x: 0.37, y: 0.40, w: 0.15, h: 0.015 },
    { key: 'father_occupation', label: 'Father Occupation', x: 0.57, y: 0.40, w: 0.15, h: 0.015 },
    { key: 'father_age', label: 'Father Age', x: 0.77, y: 0.40, w: 0.08, h: 0.015 },

    { key: 'father_residence_house', label: 'House/Street/Brgy', x: 0.28, y: 0.43, w: 0.13, h: 0.015 },
    { key: 'father_residence_city', label: 'City/Municipality', x: 0.45, y: 0.43, w: 0.13, h: 0.015 },
    { key: 'father_residence_province', label: 'Province', x: 0.62, y: 0.43, w: 0.13, h: 0.015 },
    { key: 'father_residence_country', label: 'Country', x: 0.76, y: 0.43, w: 0.10, h: 0.015 },

    // MARRIAGE
    { key: 'marriage_parents_day', label: 'Day', x: 0.24, y: 0.48, w: 0.06, h: 0.015 },
    { key: 'marriage_parents_month', label: 'Month', x: 0.30, y: 0.48, w: 0.06, h: 0.015 },
    { key: 'marriage_parents_year', label: 'Year', x: 0.36, y: 0.48, w: 0.06, h: 0.015 },
    { key: 'marriage_parents_place_city', label: 'City/Municipality', x: 0.52, y: 0.48, w: 0.10, h: 0.015 },
    { key: 'marriage_parents_place_province', label: 'Province', x: 0.64, y: 0.48, w: 0.10, h: 0.015 },
    { key: 'marriage_parents_place_country', label: 'Country', x: 0.75, y: 0.48, w: 0.10, h: 0.015 },

    // ATTENDANT
    { key: 'attendant_type', label: 'Attendant Type', x: 0.17, y: 0.51, w: 0.15, h: 0.015 },
    { key: 'attendant_time', label: 'Time of Birth', x: 0.65, y: 0.51, w: 0.15, h: 0.015 },
    { key: 'attendant_signature', label: 'Attendant Signature', x: 0.22, y: 0.55, w: 0.25, h: 0.015 },
    { key: 'attendant_name', label: 'Attendant Name', x: 0.25, y: 0.57, w: 0.25, h: 0.015 },
    { key: 'attendant_title', label: 'Title or Position', x: 0.25, y: 0.585, w: 0.25, h: 0.015 },
    { key: 'attendant_address', label: 'Attendant Address', x: 0.57, y: 0.56, w: 0.20, h: 0.015 },
    { key: 'attendant_date', label: 'Attendant Date', x: 0.55, y: 0.585, w: 0.20, h: 0.015 },

    // INFORMANT
    { key: 'informant_signature', label: 'Informant Signature', x: 0.23, y: 0.634, w: 0.25, h: 0.015 },
    { key: 'informant_name', label: 'Informant Name', x: 0.25, y: 0.65, w: 0.25, h: 0.015 },
    { key: 'informant_relationship', label: 'Relationship', x: 0.29, y: 0.667, w: 0.21, h: 0.015 },
    { key: 'informant_address', label: 'Informant Address', x: 0.22, y: 0.684, w: 0.28, h: 0.015 },
    { key: 'informant_date', label: 'Informant Date', x: 0.21, y: 0.70, w: 0.20, h: 0.015 },

    // PREPARED BY
    { key: 'prepared_by_signature', label: 'Prepared By Signature', x: 0.58, y: 0.637, w: 0.25, h: 0.015 },
    { key: 'prepared_by_name', label: 'Prepared By Name', x: 0.60, y: 0.656, w: 0.25, h: 0.015 },
    { key: 'prepared_by_title', label: 'Prepared By Title', x: 0.61, y: 0.675, w: 0.25, h: 0.015 },
    { key: 'prepared_by_date', label: 'Prepared Date', x: 0.56, y: 0.69, w: 0.25, h: 0.015 },

    // RECEIVED BY
    { key: 'received_by_signature', label: 'Received By Signature', x: 0.23, y: 0.728, w: 0.25, h: 0.015 },
    { key: 'received_by_name', label: 'Received By Name', x: 0.24, y: 0.743, w: 0.25, h: 0.015 },
    { key: 'received_by_title', label: 'Received By Title', x: 0.25, y: 0.758, w: 0.25, h: 0.015 },
    { key: 'received_by_date', label: 'Received Date', x: 0.23, y: 0.773, w: 0.25, h: 0.015 },

    // REGISTERED BY
    { key: 'registered_by_signature', label: 'Registered By Signature', x: 0.58, y: 0.728, w: 0.25, h: 0.015 },
    { key: 'registered_by_name', label: 'Registered By Name', x: 0.60, y: 0.743, w: 0.25, h: 0.015 },
    { key: 'registered_by_title', label: 'Registered By Title', x: 0.61, y: 0.758, w: 0.25, h: 0.015 },
    { key: 'registered_by_date', label: 'Registered Date', x: 0.56, y: 0.773, w: 0.25, h: 0.015 },

    // REMARKS & OFFICE GRID
    { key: 'remarks', label: 'Remarks / Annotations', x: 0.17, y: 0.80, w: 0.70, h: 0.070 },
    { key: 'office_registry_code', label: 'Office Grid Code', x: 0.10, y: 1.03, w: 0.85, h: 0.015 },
];

/** @type {Array<Object>} Birth-certificate form field definitions and validation metadata. */
export const BirthConfig = [
    {
        section: 'Registry Details',
        fields: [
            { key: 'province', label: 'Province', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'city_municipality', label: 'City/Municipality', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'registry_number', label: 'Registry No.', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'barangay', label: 'Barangay (For analytics)', type: 'select', options: NAIC_BARANGAYS, required: true, width: 'sm:col-span-1' },
        ]
    },
    {
        section: 'Child Information',
        fields: [
            { key: 'first_name', label: '1. Name (First)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'middle_name', label: '1. Name (Middle)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'last_name', label: '1. Name (Last)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'sex', label: '2. Sex', type: 'select', options: ['Male', 'Female'], required: true, width: 'sm:col-span-1' },
            { key: 'dob_day', label: '3. Date of Birth (Day)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'dob_month', label: '3. Date of Birth (Month)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'dob_year', label: '3. Date of Birth (Year)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'place_of_birth_hospital', label: '4. Place of Birth (Hospital/Clinic/Institution/House No., St., Barangay)', type: 'text', required: true, width: 'sm:col-span-2' },
            { key: 'place_of_birth_city', label: 'Place of Birth (City/Municipality)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'place_of_birth_province', label: 'Place of Birth (Province)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'type_of_birth', label: '5a. Type of Birth', type: 'select', options: ['Single', 'Twin', 'Triplet', 'Others'], required: false, width: 'sm:col-span-1' },
            { key: 'multiple_birth_order', label: '5b. If Multiple Birth, Child Was', type: 'select', options: ['First', 'Second', 'Third', 'Others'], required: false, width: 'sm:col-span-1' },
            { key: 'birth_order', label: '5c. Birth Order', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'weight_at_birth', label: '6. Weight at Birth (grams)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '7-13. Mother\'s Information',
        fields: [
            { key: 'mother_first_name', label: '7. Maiden Name (First)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'mother_middle_name', label: '7. Maiden Name (Middle)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_last_name', label: '7. Maiden Name (Last)', type: 'text', required: true, width: 'sm:col-span-1' },
            { key: 'mother_citizenship', label: '8. Citizenship', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_religion', label: '9. Religion/Religious Sect', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_children_total', label: '10a. Total children born alive', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_children_living', label: '10b. Children still living', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_children_dead', label: '10c. Children born alive but dead', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_occupation', label: '11. Occupation', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_age', label: '12. Age at birth', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_residence_house', label: '13. Residence (House No., St., Barangay)', type: 'text', required: false, width: 'sm:col-span-2' },
            { key: 'mother_residence_city', label: '13. Residence (City/Municipality)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_residence_province', label: '13. Residence (Province)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'mother_residence_country', label: '13. Residence (Country)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '14-19. Father\'s Information',
        fields: [
            { key: 'father_first_name', label: '14. Name (First)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_middle_name', label: '14. Name (Middle)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_last_name', label: '14. Name (Last)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_citizenship', label: '15. Citizenship', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_religion', label: '16. Religion/Religious Sect', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_occupation', label: '17. Occupation', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_age', label: '18. Age at birth', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_residence_house', label: '19. Residence (House No., St., Barangay)', type: 'text', required: false, width: 'sm:col-span-2' },
            { key: 'father_residence_city', label: '19. Residence (City/Municipality)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_residence_province', label: '19. Residence (Province)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'father_residence_country', label: '19. Residence (Country)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: 'Marriage of Parents',
        fields: [
            { key: 'marriage_parents_day', label: '20a. Date (Day)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_parents_month', label: '20a. Date (Month)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_parents_year', label: '20a. Date (Year)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_parents_place_city', label: '20b. Place (City/Municipality)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_parents_place_province', label: '20b. Place (Province)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_parents_place_country', label: '20b. Place (Country)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '21. Attendant Information',
        fields: [
            { key: 'attendant_type', label: '21a. Attendant', type: 'select', options: ['Physician', 'Nurse', 'Midwife', 'Hilot (Traditional Birth Attendant)', 'Others'], required: false, width: 'sm:col-span-1' },
            { key: 'attendant_time', label: '21b. Time of birth (am/pm)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_signature', label: '21b. Signature', type: 'signature', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_name', label: '21b. Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_title', label: '21b. Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_address', label: '21b. Address', type: 'text', required: false, width: 'sm:col-span-2' },
            { key: 'attendant_date', label: '21b. Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '22. Informant',
        fields: [
            { key: 'informant_signature', label: 'Signature', type: 'signature', required: false, width: 'sm:col-span-1' },
            { key: 'informant_name', label: 'Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'informant_relationship', label: 'Relationship to Child', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'informant_address', label: 'Address', type: 'text', required: false, width: 'sm:col-span-2' },
            { key: 'informant_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '23. Prepared By',
        fields: [
            { key: 'prepared_by_signature', label: 'Signature', type: 'signature', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_name', label: 'Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_title', label: 'Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '24. Received By',
        fields: [
            { key: 'received_by_signature', label: 'Signature', type: 'signature', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_name', label: 'Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_title', label: 'Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: '25. Registered at the Office of the Civil Registrar',
        fields: [
            { key: 'registered_by_signature', label: 'Signature', type: 'signature', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_name', label: 'Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_title', label: 'Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: 'Official Remarks & Coding',
        fields: [
            { key: 'remarks', label: 'Remarks / Annotations (For LCRO/OCRG Use Only)', type: 'text', required: false, width: 'sm:col-span-2' },
            { key: 'office_registry_code', label: 'Registry Coding (To be filled up at the office)', type: 'text', required: false, width: 'sm:col-span-2' },
        ]
    }
];
