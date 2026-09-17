import { NAIC_BARANGAYS, NAME_FIELDS } from './SharedConfig.js';

export const MarriageTemplateOverlayFields = [
    // REGISTRY DETAILS
    { key: 'province', label: 'Province', x: 0.09, y: 0.076, w: 0.38, h: 0.014 },
    { key: 'city_municipality', label: 'City/Municipality', x: 0.09, y: 0.092, w: 0.38, h: 0.014 },
    { key: 'registry_number', label: 'Registry No.', x: 0.68, y: 0.072, w: 0.28, h: 0.020 },

    // ROW 1: NAME — HUSBAND (left) | WIFE (right)
    { key: 'husband_first_name', label: 'Husband First Name', x: 0.14, y: 0.155, w: 0.14, h: 0.018 },
    { key: 'husband_middle_name', label: 'Husband Middle Name', x: 0.14, y: 0.173, w: 0.14, h: 0.018 },
    { key: 'husband_last_name', label: 'Husband Last Name', x: 0.14, y: 0.191, w: 0.14, h: 0.018 },
    { key: 'wife_first_name', label: 'Wife First Name', x: 0.57, y: 0.155, w: 0.40, h: 0.018 },
    { key: 'wife_middle_name', label: 'Wife Middle Name', x: 0.57, y: 0.173, w: 0.40, h: 0.018 },
    { key: 'wife_last_name', label: 'Wife Last Name', x: 0.57, y: 0.191, w: 0.40, h: 0.018 },

    // ROW 2a: DATE OF BIRTH & 2b. AGE
    { key: 'husband_dob', label: 'Husband DOB', x: 0.14, y: 0.212, w: 0.24, h: 0.018 },
    { key: 'husband_age', label: 'Husband Age', x: 0.41, y: 0.212, w: 0.10, h: 0.018 },
    { key: 'wife_dob', label: 'Wife DOB', x: 0.57, y: 0.212, w: 0.28, h: 0.018 },
    { key: 'wife_age', label: 'Wife Age', x: 0.88, y: 0.212, w: 0.10, h: 0.018 },

    // ROW 3: PLACE OF BIRTH
    { key: 'husband_place_of_birth', label: 'Husband Place of Birth', x: 0.14, y: 0.240, w: 0.40, h: 0.018 },
    { key: 'wife_place_of_birth', label: 'Wife Place of Birth', x: 0.57, y: 0.240, w: 0.40, h: 0.018 },

    // ROW 4a: SEX  |  4b: CITIZENSHIP
    { key: 'husband_citizenship', label: 'Husband Citizenship', x: 0.24, y: 0.268, w: 0.28, h: 0.018 },
    { key: 'wife_citizenship', label: 'Wife Citizenship', x: 0.67, y: 0.268, w: 0.28, h: 0.018 },

    // ROW 5: RESIDENCE
    { key: 'husband_residence', label: 'Husband Residence', x: 0.14, y: 0.300, w: 0.40, h: 0.018 },
    { key: 'wife_residence', label: 'Wife Residence', x: 0.57, y: 0.300, w: 0.40, h: 0.018 },

    // ROW 6: RELIGION
    { key: 'husband_religion', label: 'Husband Religion', x: 0.14, y: 0.330, w: 0.40, h: 0.018 },
    { key: 'wife_religion', label: 'Wife Religion', x: 0.57, y: 0.330, w: 0.40, h: 0.018 },

    // ROW 7: CIVIL STATUS
    { key: 'husband_civil_status', label: 'Husband Civil Status', x: 0.14, y: 0.352, w: 0.40, h: 0.018 },
    { key: 'wife_civil_status', label: 'Wife Civil Status', x: 0.57, y: 0.352, w: 0.40, h: 0.018 },

    // ROW 8: FATHER NAME (First | Middle | Last)
    { key: 'husband_father_name', label: 'Husband Father Name', x: 0.14, y: 0.385, w: 0.40, h: 0.028 },
    { key: 'wife_father_name', label: 'Wife Father Name', x: 0.57, y: 0.385, w: 0.40, h: 0.028 },

    // ROW 9: FATHER CITIZENSHIP
    { key: 'husband_father_citizenship', label: 'Husband Father Citizenship', x: 0.14, y: 0.418, w: 0.40, h: 0.018 },
    { key: 'wife_father_citizenship', label: 'Wife Father Citizenship', x: 0.57, y: 0.418, w: 0.40, h: 0.018 },

    // ROW 10: MOTHER MAIDEN NAME (First | Middle | Last)
    { key: 'husband_mother_maiden_name', label: 'Husband Mother Name', x: 0.14, y: 0.445, w: 0.40, h: 0.028 },
    { key: 'wife_mother_maiden_name', label: 'Wife Mother Name', x: 0.57, y: 0.445, w: 0.40, h: 0.028 },

    // ROW 11: MOTHER CITIZENSHIP
    { key: 'husband_mother_citizenship', label: 'Husband Mother Citizenship', x: 0.14, y: 0.478, w: 0.40, h: 0.018 },
    { key: 'wife_mother_citizenship', label: 'Wife Mother Citizenship', x: 0.57, y: 0.478, w: 0.40, h: 0.018 },

    // ROW 12: CONSENT PERSON (First | Middle | Last)
    { key: 'husband_consent_person', label: 'Husband Consent Person', x: 0.14, y: 0.508, w: 0.40, h: 0.028 },
    { key: 'wife_consent_person', label: 'Wife Consent Person', x: 0.57, y: 0.508, w: 0.40, h: 0.028 },

    // ROW 13: RELATIONSHIP
    { key: 'husband_consent_relationship', label: 'Husband Consent Relationship', x: 0.14, y: 0.540, w: 0.40, h: 0.018 },
    { key: 'wife_consent_relationship', label: 'Wife Consent Relationship', x: 0.57, y: 0.540, w: 0.40, h: 0.018 },

    // ROW 14: RESIDENCE
    { key: 'husband_consent_residence', label: 'Husband Consent Residence', x: 0.14, y: 0.562, w: 0.40, h: 0.018 },
    { key: 'wife_consent_residence', label: 'Wife Consent Residence', x: 0.57, y: 0.562, w: 0.40, h: 0.018 },

    // ROW 15: PLACE OF MARRIAGE
    { key: 'place_of_marriage', label: 'Place of Marriage', x: 0.14, y: 0.600, w: 0.84, h: 0.018 },

    // ROW 16: DATE & TIME OF MARRIAGE
    { key: 'date_of_marriage', label: 'Date of Marriage', x: 0.14, y: 0.627, w: 0.30, h: 0.018 },
    { key: 'time_of_marriage', label: 'Time of Marriage', x: 0.62, y: 0.627, w: 0.34, h: 0.018 },

    // ROW 19: MARRIAGE LICENSE (in solemnizing officer section)
    { key: 'marriage_license_no', label: 'Marriage License No.', x: 0.20, y: 0.720, w: 0.30, h: 0.016 },
    { key: 'solemnizing_officer_name', label: 'Solemnizing Officer', x: 0.05, y: 0.775, w: 0.35, h: 0.016 },
    { key: 'solemnizing_officer_title', label: 'Officer Title/Position', x: 0.42, y: 0.775, w: 0.22, h: 0.016 },

    // ROW 20a: WITNESSES
    { key: 'witness_1_name', label: 'Witness 1', x: 0.05, y: 0.820, w: 0.40, h: 0.016 },
    { key: 'witness_2_name', label: 'Witness 2', x: 0.50, y: 0.820, w: 0.40, h: 0.016 },

    // ROW 21 & 22: RECEIVED BY / REGISTERED BY
    { key: 'prepared_by_name', label: 'Received By Name', x: 0.05, y: 0.858, w: 0.40, h: 0.016 },
    { key: 'prepared_by_date', label: 'Received By Date', x: 0.05, y: 0.878, w: 0.40, h: 0.016 },
    { key: 'registered_by_name', label: 'Registered By Name', x: 0.52, y: 0.858, w: 0.40, h: 0.016 },
    { key: 'registered_by_date', label: 'Registered By Date', x: 0.52, y: 0.878, w: 0.40, h: 0.016 },

    // REMARKS
    { key: 'remarks', label: 'Remarks', x: 0.05, y: 0.918, w: 0.90, h: 0.040 },
];

export const MarriageConfig = [
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
        section: "Husband's Profile",
        fields: [
            ...NAME_FIELDS('husband_'),
            { key: 'husband_dob', label: '2a. Date of Birth', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'husband_age', label: '2b. Age', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_place_of_birth', label: '3. Place of Birth', type: 'text', required: false },
            { key: 'husband_citizenship', label: '4b. Citizenship', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_residence', label: '5. Residence', type: 'text', required: false },
            { key: 'husband_religion', label: '6. Religion', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_civil_status', label: '7. Civil Status', type: 'select', options: ['Single', 'Widowed', 'Divorced', 'Annulled'], required: false, width: 'sm:col-span-1' },
            { key: 'husband_father_name', label: "8. Father's Full Name", type: 'text', required: false },
            { key: 'husband_father_citizenship', label: "9. Father's Citizenship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_mother_maiden_name', label: "10. Mother's Maiden Name", type: 'text', required: false },
            { key: 'husband_mother_citizenship', label: "11. Mother's Citizenship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_consent_person', label: "12. Person Giving Consent/Advice", type: 'text', required: false },
            { key: 'husband_consent_relationship', label: "13. Relationship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'husband_consent_residence', label: "14. Residence", type: 'text', required: false },
        ]
    },
    {
        section: "Wife's Profile",
        fields: [
            ...NAME_FIELDS('wife_'),
            { key: 'wife_dob', label: '2a. Date of Birth', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'wife_age', label: '2b. Age', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_place_of_birth', label: '3. Place of Birth', type: 'text', required: false },
            { key: 'wife_citizenship', label: '4b. Citizenship', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_residence', label: '5. Residence', type: 'text', required: false },
            { key: 'wife_religion', label: '6. Religion', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_civil_status', label: '7. Civil Status', type: 'select', options: ['Single', 'Widowed', 'Divorced', 'Annulled'], required: false, width: 'sm:col-span-1' },
            { key: 'wife_father_name', label: "8. Father's Full Name", type: 'text', required: false },
            { key: 'wife_father_citizenship', label: "9. Father's Citizenship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_mother_maiden_name', label: "10. Mother's Maiden Name", type: 'text', required: false },
            { key: 'wife_mother_citizenship', label: "11. Mother's Citizenship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_consent_person', label: "12. Person Giving Consent/Advice", type: 'text', required: false },
            { key: 'wife_consent_relationship', label: "13. Relationship", type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'wife_consent_residence', label: "14. Residence", type: 'text', required: false },
        ]
    },
    {
        section: 'Marriage Details',
        fields: [
            { key: 'place_of_marriage', label: '15. Place of Marriage', type: 'text', required: false },
            { key: 'date_of_marriage', label: '16. Date of Marriage', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'time_of_marriage', label: '17. Time of Marriage', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'marriage_license_no', label: 'Marriage License No.', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'solemnizing_officer_name', label: 'Solemnizing Officer Name', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'solemnizing_officer_title', label: 'Solemnizing Officer Title/Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'witness_1_name', label: '20a. Witness 1 Name', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'witness_2_name', label: '20a. Witness 2 Name', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    {
        section: 'Certification & Registration',
        fields: [
            { key: 'prepared_by_name', label: '21. Received By Name', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_date', label: '21. Received By Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_name', label: '22. Registered By Name', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_date', label: '22. Registered By Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'remarks', label: 'Remarks / Annotations', type: 'textarea', required: false },
        ]
    }
];
