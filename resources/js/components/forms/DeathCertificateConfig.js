import { NAIC_BARANGAYS, NAME_FIELDS } from './SharedConfig.js';

/** @type {Array<{key: string, label: string, x: number, y: number, w: number, h: number}>} Normalized death-certificate overlay regions. */
export const DeathTemplateOverlayFields = [
    // REGISTRY DETAILS (header)
    { key: 'province', label: 'Province', x: 0.08, y: 0.072, w: 0.30, h: 0.014 },
    { key: 'city_municipality', label: 'City/Municipality', x: 0.08, y: 0.091, w: 0.30, h: 0.014 },
    { key: 'registry_number', label: 'Registry No.', x: 0.66, y: 0.070, w: 0.30, h: 0.020 },

    // ROW 1: NAME (First | Middle | Last)  +  2. SEX
    { key: 'first_name', label: 'First Name', x: 0.14, y: 0.120, w: 0.16, h: 0.020 },
    { key: 'middle_name', label: 'Middle Name', x: 0.32, y: 0.120, w: 0.16, h: 0.020 },
    { key: 'last_name', label: 'Last Name', x: 0.50, y: 0.120, w: 0.18, h: 0.020 },
    { key: 'sex', label: 'Sex', x: 0.72, y: 0.120, w: 0.25, h: 0.020 },

    // ROW 3 & 4: DATE OF DEATH | DATE OF BIRTH
    { key: 'date_of_death', label: 'Date of Death', x: 0.02, y: 0.156, w: 0.26, h: 0.020 },
    { key: 'date_of_birth', label: 'Date of Birth', x: 0.30, y: 0.156, w: 0.26, h: 0.020 },

    // ROW 5: AGE AT TIME OF DEATH
    { key: 'age_completed_years', label: 'Age (Completed Years)', x: 0.59, y: 0.150, w: 0.10, h: 0.014 },
    { key: 'age_months', label: 'Age (Months)', x: 0.59, y: 0.163, w: 0.08, h: 0.014 },
    { key: 'age_days', label: 'Age (Days)', x: 0.68, y: 0.163, w: 0.08, h: 0.014 },
    { key: 'age_hours', label: 'Age (Hours)', x: 0.78, y: 0.163, w: 0.08, h: 0.014 },
    { key: 'age_minutes', label: 'Age (Mins)', x: 0.88, y: 0.163, w: 0.08, h: 0.014 },

    // ROW 6 & 7: PLACE OF DEATH  |  CIVIL STATUS
    { key: 'place_of_death', label: 'Place of Death', x: 0.02, y: 0.195, w: 0.58, h: 0.020 },
    { key: 'civil_status', label: 'Civil Status', x: 0.63, y: 0.195, w: 0.34, h: 0.020 },

    // ROW 8, 9, 10: RELIGION | CITIZENSHIP | RESIDENCE
    { key: 'religion', label: 'Religion', x: 0.02, y: 0.228, w: 0.22, h: 0.018 },
    { key: 'citizenship', label: 'Citizenship', x: 0.26, y: 0.228, w: 0.22, h: 0.018 },
    { key: 'residence', label: 'Residence', x: 0.50, y: 0.228, w: 0.47, h: 0.018 },

    // ROW 11, 12, 13: OCCUPATION | FATHER NAME | MOTHER MAIDEN NAME
    { key: 'occupation', label: 'Occupation', x: 0.02, y: 0.258, w: 0.18, h: 0.018 },
    { key: 'father_name', label: 'Father Name (First Middle Last)', x: 0.22, y: 0.258, w: 0.36, h: 0.018 },
    { key: 'mother_maiden_name', label: 'Mother Maiden Name (First Middle Last)', x: 0.61, y: 0.258, w: 0.36, h: 0.018 },

    // ─── MEDICAL CERTIFICATE ───
    // 19b: CAUSES OF DEATH
    { key: 'cause_of_death_immediate', label: '19b-I. Immediate Cause (a)', x: 0.20, y: 0.418, w: 0.62, h: 0.018 },
    { key: 'cause_of_death_antecedent', label: '19b-I. Antecedent Cause (b)', x: 0.20, y: 0.445, w: 0.62, h: 0.018 },
    { key: 'cause_of_death_underlying', label: '19b-I. Underlying Cause (c)', x: 0.20, y: 0.472, w: 0.62, h: 0.018 },
    { key: 'other_significant_conditions', label: '19b-II. Other Significant Conditions', x: 0.32, y: 0.498, w: 0.65, h: 0.018 },

    // 19c: MATERNAL CONDITION
    { key: 'maternal_condition', label: '19c. Maternal Condition', x: 0.02, y: 0.530, w: 0.94, h: 0.018 },

    // 19d: DEATH BY EXTERNAL CAUSES
    { key: 'manner_of_death', label: '19d-a. Manner of Death', x: 0.28, y: 0.562, w: 0.68, h: 0.016 },
    { key: 'place_of_external_cause', label: '19d-b. Place of Occurrence of External Cause', x: 0.28, y: 0.580, w: 0.68, h: 0.016 },

    // 20: AUTOPSY
    { key: 'autopsy', label: '20. Autopsy (Yes/No)', x: 0.84, y: 0.556, w: 0.13, h: 0.018 },

    // 21a: ATTENDANT TYPE  +  21b: DURATION
    { key: 'attendant_type', label: '21a. Attendant Type', x: 0.02, y: 0.606, w: 0.58, h: 0.018 },
    { key: 'attendant_duration_from', label: '21b. Duration From', x: 0.68, y: 0.606, w: 0.12, h: 0.016 },
    { key: 'attendant_duration_to', label: '21b. Duration To', x: 0.84, y: 0.606, w: 0.12, h: 0.016 },

    // 22: CERTIFICATION OF DEATH
    { key: 'certifying_officer_name', label: '22. Certifying Officer Name in Print', x: 0.02, y: 0.660, w: 0.44, h: 0.016 },
    { key: 'certifying_officer_title', label: '22. Title of Position', x: 0.02, y: 0.676, w: 0.44, h: 0.016 },
    { key: 'certifying_officer_address', label: '22. Address', x: 0.02, y: 0.692, w: 0.44, h: 0.016 },
    { key: 'certifying_officer_date', label: '22. Date', x: 0.02, y: 0.708, w: 0.22, h: 0.016 },
    { key: 'reviewed_by_name', label: '22. Reviewed By', x: 0.52, y: 0.676, w: 0.44, h: 0.016 },

    // 23: CORPSE DISPOSAL
    { key: 'corpse_disposal', label: '23. Corpse Disposal', x: 0.22, y: 0.730, w: 0.24, h: 0.016 },

    // 24a: BURIAL/CREMATION PERMIT
    { key: 'burial_permit_number', label: '24a. Burial/Cremation Permit No.', x: 0.36, y: 0.737, w: 0.18, h: 0.014 },
    { key: 'burial_permit_date_issued', label: '24a. Date Issued', x: 0.36, y: 0.752, w: 0.18, h: 0.014 },

    // 24b: TRANSFER PERMIT
    { key: 'transfer_permit_number', label: '24b. Transfer Permit No.', x: 0.58, y: 0.737, w: 0.18, h: 0.014 },
    { key: 'transfer_permit_date_issued', label: '24b. Date Issued', x: 0.58, y: 0.752, w: 0.18, h: 0.014 },

    // 25: CEMETERY/CREMATORY
    { key: 'cemetery_address', label: '25. Cemetery / Crematory Name & Address', x: 0.02, y: 0.774, w: 0.94, h: 0.016 },

    // 26: CERTIFICATION OF INFORMANT
    { key: 'informant_name', label: '26. Informant Name in Print', x: 0.02, y: 0.820, w: 0.44, h: 0.016 },
    { key: 'informant_relationship', label: '26. Relationship to Deceased', x: 0.02, y: 0.836, w: 0.44, h: 0.016 },
    { key: 'informant_address', label: '26. Informant Address', x: 0.02, y: 0.852, w: 0.44, h: 0.016 },
    { key: 'informant_date', label: '26. Date', x: 0.02, y: 0.866, w: 0.22, h: 0.016 },

    // 27: PREPARED BY
    { key: 'prepared_by_name', label: '27. Prepared By Name in Print', x: 0.52, y: 0.820, w: 0.44, h: 0.016 },
    { key: 'prepared_by_title', label: '27. Title or Position', x: 0.52, y: 0.836, w: 0.44, h: 0.016 },
    { key: 'prepared_by_date', label: '27. Date', x: 0.52, y: 0.852, w: 0.22, h: 0.016 },

    // 28: RECEIVED BY
    { key: 'received_by_name', label: '28. Received By Name in Print', x: 0.02, y: 0.892, w: 0.44, h: 0.016 },
    { key: 'received_by_title', label: '28. Title or Position', x: 0.02, y: 0.908, w: 0.44, h: 0.016 },
    { key: 'received_by_date', label: '28. Date', x: 0.02, y: 0.922, w: 0.22, h: 0.016 },

    // 29: REGISTERED AT OFFICE OF CIVIL REGISTRAR
    { key: 'registered_by_name', label: '29. Registered By Name in Print', x: 0.52, y: 0.892, w: 0.44, h: 0.016 },
    { key: 'registered_by_title', label: '29. Title or Position', x: 0.52, y: 0.908, w: 0.44, h: 0.016 },
    { key: 'registered_by_date', label: '29. Date', x: 0.52, y: 0.922, w: 0.22, h: 0.016 },

    // REMARKS
    { key: 'remarks', label: 'Remarks / Annotations', x: 0.02, y: 0.950, w: 0.94, h: 0.030 },
];


/** @type {Array<Object>} Death-certificate form field definitions and validation metadata. */
export const DeathConfig = [
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
        section: 'Deceased Information', 
        fields: [
            ...NAME_FIELDS(''),
            { key: 'sex', label: '2. Sex', type: 'select', options: ['Male', 'Female'], required: true, width: 'sm:col-span-1' },
            { key: 'date_of_death', label: '3. Date of Death', type: 'date', required: true, width: 'sm:col-span-1' },
            { key: 'date_of_birth', label: '4. Date of Birth', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'age_completed_years', label: '5a. Age – Completed Years (if 1yr+)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'age_months', label: '5b. Age – Months (if under 1 year)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'age_days', label: '5b. Age – Days', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'age_hours', label: '5c. Age – Hours (if under 24 hours)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'age_minutes', label: '5c. Age – Minutes', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'place_of_death', label: '6. Place of Death (Hospital/Clinic/House No., Brgy., City/Municipality, Province)', type: 'text', required: false },
            { key: 'civil_status', label: '7. Civil Status', type: 'select', options: ['Single', 'Married', 'Widowed', 'Annulled', 'Divorced'], required: false, width: 'sm:col-span-1' },
            { key: 'religion', label: '8. Religion/Religious Sect', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'citizenship', label: '9. Citizenship', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'residence', label: '10. Residence (House No., St., Brgy., Municipality, Province, Country)', type: 'text', required: false },
            { key: 'occupation', label: '11. Occupation', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    { 
        section: 'Parents Information', 
        fields: [
            { key: 'father_name', label: '12. Name of Father (First, Middle, Last)', type: 'text', required: false },
            { key: 'mother_maiden_name', label: '13. Maiden Name of Mother (First, Middle, Last)', type: 'text', required: false },
        ]
    },
    { 
        section: 'Medical Certificate – Causes of Death (19b)', 
        fields: [
            { key: 'cause_of_death_immediate', label: 'I. Immediate Cause (a)', type: 'text', required: false },
            { key: 'cause_of_death_antecedent', label: 'Antecedent Cause (b)', type: 'text', required: false },
            { key: 'cause_of_death_underlying', label: 'Underlying Cause (c)', type: 'text', required: false },
            { key: 'other_significant_conditions', label: 'II. Other Significant Conditions Contributing to Death', type: 'text', required: false },
        ]
    },
    { 
        section: 'Medical Certificate – Other Details', 
        fields: [
            { 
                key: 'maternal_condition', 
                label: '19c. Maternal Condition (if female, 15–49 yrs old)', 
                type: 'select', 
                options: [
                    'a. Pregnant, not in labour',
                    'b. Pregnant, in labour',
                    'c. Less than 42 days after delivery',
                    'd. 42 days to 1 year after delivery',
                    'e. None of the choices'
                ], 
                required: false, 
                width: 'sm:col-span-2' 
            },
            { key: 'manner_of_death', label: '19d-a. Manner of Death', type: 'select', options: ['Homicide', 'Suicide', 'Accident', 'Legal intervention', 'Others'], required: false, width: 'sm:col-span-1' },
            { key: 'place_of_external_cause', label: '19d-b. Place of Occurrence of External Cause', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'autopsy', label: '20. Autopsy', type: 'select', options: ['Yes', 'No'], required: false, width: 'sm:col-span-1' },
        ]
    },
    { 
        section: '21. Attendant', 
        fields: [
            { 
                key: 'attendant_type', 
                label: '21a. Attendant Type', 
                type: 'select', 
                options: ['1 Private Physician', '2 Public Health Officer', '3 Hospital Authority', '4 None', '5 Others'], 
                required: false, 
                width: 'sm:col-span-1' 
            },
            { key: 'attendant_other', label: '21a. If Others, Specify', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_duration_from', label: '21b. Duration – From (mm/dd/yy)', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'attendant_duration_to', label: '21b. Duration – To (mm/dd/yy)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    { 
        section: '22. Certification of Death', 
        fields: [
            { key: 'certifying_officer_name', label: 'Certifying Officer – Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'certifying_officer_title', label: 'Title of Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'certifying_officer_address', label: 'Address', type: 'text', required: false },
            { key: 'certifying_officer_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'reviewed_by_name', label: 'Reviewed By (Name of Health Officer)', type: 'text', required: false, width: 'sm:col-span-1' },
        ]
    },
    { 
        section: 'Corpse Disposal & Permits', 
        fields: [
            { key: 'corpse_disposal', label: '23. Corpse Disposal (Burial / Cremation / Other)', type: 'select', options: ['Burial', 'Cremation', 'Others'], required: false, width: 'sm:col-span-1' },
            { key: 'burial_permit_number', label: '24a. Burial/Cremation Permit No.', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'burial_permit_date_issued', label: '24a. Date Issued', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'transfer_permit_number', label: '24b. Transfer Permit No.', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'transfer_permit_date_issued', label: '24b. Date Issued', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'cemetery_address', label: '25. Name & Address of Cemetery or Crematory', type: 'text', required: false },
        ]
    },
    { 
        section: '26. Certification of Informant', 
        fields: [
            { key: 'informant_name', label: 'Informant – Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'informant_relationship', label: 'Relationship to the Deceased', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'informant_address', label: 'Address', type: 'text', required: false },
            { key: 'informant_date', label: 'Date', type: 'date', required: false, width: 'sm:col-span-1' },
        ]
    },
    { 
        section: 'Certification & Registration', 
        fields: [
            { key: 'prepared_by_name', label: '27. Prepared By – Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_title', label: '27. Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'prepared_by_date', label: '27. Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_name', label: '28. Received By – Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_title', label: '28. Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'received_by_date', label: '28. Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_name', label: '29. Registered By – Name in Print', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_title', label: '29. Title or Position', type: 'text', required: false, width: 'sm:col-span-1' },
            { key: 'registered_by_date', label: '29. Date', type: 'date', required: false, width: 'sm:col-span-1' },
            { key: 'remarks', label: 'Remarks / Annotations', type: 'textarea', required: false },
        ]
    }
];
