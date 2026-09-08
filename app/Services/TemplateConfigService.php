<?php

namespace App\Services;

/**
 * Represents the Template Config Service application component.
 */
class TemplateConfigService
{
    /**
     * Executes the get fields for type operation.
     */
    public static function getFieldsForType($type)
    {
        if ($type === 'birth') {
            return [
                // REGISTRY DETAILS
                ['key' => 'registry_number', 'x' => 0.63, 'y' => 0.10, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'province', 'x' => 0.22, 'y' => 0.095, 'w' => 0.34, 'h' => 0.015],
                ['key' => 'city_municipality', 'x' => 0.28, 'y' => 0.110, 'w' => 0.20, 'h' => 0.015],

                // CHILD
                ['key' => 'first_name', 'x' => 0.29, 'y' => 0.14, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'middle_name', 'x' => 0.48, 'y' => 0.14, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'last_name', 'x' => 0.67, 'y' => 0.14, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'sex', 'x' => 0.20, 'y' => 0.16, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'dob_day', 'x' => 0.53, 'y' => 0.16, 'w' => 0.06, 'h' => 0.015],
                ['key' => 'dob_month', 'x' => 0.63, 'y' => 0.16, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'dob_year', 'x' => 0.76, 'y' => 0.16, 'w' => 0.08, 'h' => 0.015],
                ['key' => 'place_of_birth_hospital', 'x' => 0.25, 'y' => 0.19, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'place_of_birth_city', 'x' => 0.50, 'y' => 0.19, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'place_of_birth_province', 'x' => 0.69, 'y' => 0.19, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'type_of_birth', 'x' => 0.20, 'y' => 0.23, 'w' => 0.12, 'h' => 0.015],
                ['key' => 'multiple_birth_order', 'x' => 0.40, 'y' => 0.23, 'w' => 0.12, 'h' => 0.015],
                ['key' => 'birth_order', 'x' => 0.58, 'y' => 0.23, 'w' => 0.12, 'h' => 0.015],
                ['key' => 'weight_at_birth', 'x' => 0.75, 'y' => 0.23, 'w' => 0.05, 'h' => 0.015],

                // MOTHER
                ['key' => 'mother_first_name', 'x' => 0.26, 'y' => 0.26, 'w' => 0.14, 'h' => 0.015],
                ['key' => 'mother_middle_name', 'x' => 0.45, 'y' => 0.26, 'w' => 0.14, 'h' => 0.015],
                ['key' => 'mother_last_name', 'x' => 0.68, 'y' => 0.26, 'w' => 0.14, 'h' => 0.015],
                ['key' => 'mother_citizenship', 'x' => 0.19, 'y' => 0.28, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'mother_religion', 'x' => 0.53, 'y' => 0.28, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'mother_children_total', 'x' => 0.18, 'y' => 0.31, 'w' => 0.09, 'h' => 0.015],
                ['key' => 'mother_children_living', 'x' => 0.31, 'y' => 0.31, 'w' => 0.09, 'h' => 0.015],
                ['key' => 'mother_children_dead', 'x' => 0.43, 'y' => 0.31, 'w' => 0.09, 'h' => 0.015],
                ['key' => 'mother_occupation', 'x' => 0.55, 'y' => 0.31, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'mother_age', 'x' => 0.76, 'y' => 0.31, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'mother_residence_house', 'x' => 0.28, 'y' => 0.34, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'mother_residence_city', 'x' => 0.45, 'y' => 0.34, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'mother_residence_province', 'x' => 0.62, 'y' => 0.34, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'mother_residence_country', 'x' => 0.76, 'y' => 0.34, 'w' => 0.10, 'h' => 0.015],

                // FATHER
                ['key' => 'father_first_name', 'x' => 0.27, 'y' => 0.37, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_middle_name', 'x' => 0.45, 'y' => 0.37, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_last_name', 'x' => 0.68, 'y' => 0.37, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_citizenship', 'x' => 0.18, 'y' => 0.40, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_religion', 'x' => 0.37, 'y' => 0.40, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_occupation', 'x' => 0.57, 'y' => 0.40, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_age', 'x' => 0.77, 'y' => 0.40, 'w' => 0.08, 'h' => 0.015],
                ['key' => 'father_residence_house', 'x' => 0.28, 'y' => 0.43, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'father_residence_city', 'x' => 0.45, 'y' => 0.43, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'father_residence_province', 'x' => 0.62, 'y' => 0.43, 'w' => 0.13, 'h' => 0.015],
                ['key' => 'father_residence_country', 'x' => 0.76, 'y' => 0.43, 'w' => 0.10, 'h' => 0.015],

                // MARRIAGE
                ['key' => 'marriage_parents_day', 'x' => 0.24, 'y' => 0.48, 'w' => 0.06, 'h' => 0.015],
                ['key' => 'marriage_parents_month', 'x' => 0.30, 'y' => 0.48, 'w' => 0.06, 'h' => 0.015],
                ['key' => 'marriage_parents_year', 'x' => 0.36, 'y' => 0.48, 'w' => 0.06, 'h' => 0.015],
                ['key' => 'marriage_parents_place_city', 'x' => 0.52, 'y' => 0.48, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'marriage_parents_place_province', 'x' => 0.64, 'y' => 0.48, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'marriage_parents_place_country', 'x' => 0.75, 'y' => 0.48, 'w' => 0.10, 'h' => 0.015],

                // ATTENDANT
                ['key' => 'attendant_type', 'x' => 0.17, 'y' => 0.51, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'attendant_time', 'x' => 0.65, 'y' => 0.51, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'attendant_name', 'x' => 0.25, 'y' => 0.57, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'attendant_title', 'x' => 0.25, 'y' => 0.585, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'attendant_address', 'x' => 0.57, 'y' => 0.56, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'attendant_date', 'x' => 0.55, 'y' => 0.585, 'w' => 0.20, 'h' => 0.015],

                // INFORMANT & OTHERS
                ['key' => 'informant_name', 'x' => 0.25, 'y' => 0.65, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'informant_relationship', 'x' => 0.29, 'y' => 0.667, 'w' => 0.21, 'h' => 0.015],
                ['key' => 'informant_address', 'x' => 0.22, 'y' => 0.684, 'w' => 0.28, 'h' => 0.015],
                ['key' => 'informant_date', 'x' => 0.21, 'y' => 0.70, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'prepared_by_name', 'x' => 0.60, 'y' => 0.656, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'prepared_by_title', 'x' => 0.61, 'y' => 0.675, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'prepared_by_date', 'x' => 0.56, 'y' => 0.69, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'received_by_name', 'x' => 0.24, 'y' => 0.743, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'received_by_title', 'x' => 0.25, 'y' => 0.758, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'received_by_date', 'x' => 0.23, 'y' => 0.773, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'registered_by_name', 'x' => 0.60, 'y' => 0.743, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'registered_by_title', 'x' => 0.61, 'y' => 0.758, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'registered_by_date', 'x' => 0.56, 'y' => 0.773, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'remarks', 'x' => 0.17, 'y' => 0.80, 'w' => 0.70, 'h' => 0.070],
            ];
        }

        if ($type === 'death') {
            return [
                // REGISTRY DETAILS
                ['key' => 'registry_number', 'x' => 0.63, 'y' => 0.08, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'province', 'x' => 0.22, 'y' => 0.075, 'w' => 0.34, 'h' => 0.015],
                ['key' => 'city_municipality', 'x' => 0.28, 'y' => 0.09, 'w' => 0.20, 'h' => 0.015],

                // DECEASED DETAILS
                ['key' => 'first_name', 'x' => 0.25, 'y' => 0.13, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'middle_name', 'x' => 0.45, 'y' => 0.13, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'last_name', 'x' => 0.65, 'y' => 0.13, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'sex', 'x' => 0.20, 'y' => 0.15, 'w' => 0.10, 'h' => 0.015],
                ['key' => 'date_of_death', 'x' => 0.55, 'y' => 0.15, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'date_of_birth', 'x' => 0.20, 'y' => 0.175, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'age', 'x' => 0.55, 'y' => 0.175, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'place_of_death_hospital', 'x' => 0.25, 'y' => 0.20, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'place_of_death_city', 'x' => 0.52, 'y' => 0.20, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'place_of_death_province', 'x' => 0.74, 'y' => 0.20, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'civil_status', 'x' => 0.20, 'y' => 0.225, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'religion', 'x' => 0.45, 'y' => 0.225, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'citizenship', 'x' => 0.70, 'y' => 0.225, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'residence', 'x' => 0.25, 'y' => 0.25, 'w' => 0.60, 'h' => 0.015],
                ['key' => 'occupation', 'x' => 0.25, 'y' => 0.275, 'w' => 0.60, 'h' => 0.015],

                // PARENTS
                ['key' => 'father_first_name', 'x' => 0.25, 'y' => 0.32, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_middle_name', 'x' => 0.45, 'y' => 0.32, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'father_last_name', 'x' => 0.65, 'y' => 0.32, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'mother_maiden_first_name', 'x' => 0.25, 'y' => 0.35, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'mother_maiden_middle_name', 'x' => 0.45, 'y' => 0.35, 'w' => 0.15, 'h' => 0.015],
                ['key' => 'mother_maiden_last_name', 'x' => 0.65, 'y' => 0.35, 'w' => 0.15, 'h' => 0.015],

                // MEDICAL CERTIFICATE
                ['key' => 'cause_of_death_a', 'x' => 0.25, 'y' => 0.40, 'w' => 0.60, 'h' => 0.015],
                ['key' => 'cause_of_death_b', 'x' => 0.25, 'y' => 0.42, 'w' => 0.60, 'h' => 0.015],
                ['key' => 'cause_of_death_c', 'x' => 0.25, 'y' => 0.44, 'w' => 0.60, 'h' => 0.015],
                ['key' => 'maternal_condition', 'x' => 0.25, 'y' => 0.47, 'w' => 0.30, 'h' => 0.015],
                ['key' => 'manner_of_death', 'x' => 0.60, 'y' => 0.47, 'w' => 0.25, 'h' => 0.015],

                // ATTENDANT & INFORMANT
                ['key' => 'attendant_type', 'x' => 0.20, 'y' => 0.52, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'attendant_name', 'x' => 0.50, 'y' => 0.52, 'w' => 0.35, 'h' => 0.015],
                ['key' => 'attendant_title', 'x' => 0.20, 'y' => 0.55, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'attendant_address', 'x' => 0.50, 'y' => 0.55, 'w' => 0.35, 'h' => 0.015],
                ['key' => 'informant_name', 'x' => 0.25, 'y' => 0.62, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'informant_relationship', 'x' => 0.55, 'y' => 0.62, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'informant_address', 'x' => 0.25, 'y' => 0.65, 'w' => 0.55, 'h' => 0.015],
                ['key' => 'informant_date', 'x' => 0.25, 'y' => 0.68, 'w' => 0.20, 'h' => 0.015],

                // REGISTRAR & REMARKS
                ['key' => 'prepared_by_name', 'x' => 0.25, 'y' => 0.72, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'prepared_by_title', 'x' => 0.25, 'y' => 0.735, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'prepared_by_date', 'x' => 0.25, 'y' => 0.75, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'registered_by_name', 'x' => 0.60, 'y' => 0.72, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'registered_by_title', 'x' => 0.60, 'y' => 0.735, 'w' => 0.25, 'h' => 0.015],
                ['key' => 'registered_by_date', 'x' => 0.60, 'y' => 0.75, 'w' => 0.20, 'h' => 0.015],
                ['key' => 'remarks', 'x' => 0.17, 'y' => 0.80, 'w' => 0.70, 'h' => 0.070],
            ];
        }

        if ($type === 'marriage' || $type === 'marriage_license') {
            return [
                // REGISTRY DETAILS
                ['key' => 'province', 'x' => 0.12, 'y' => 0.075, 'w' => 0.48, 'h' => 0.015],
                ['key' => 'city_municipality', 'x' => 0.14, 'y' => 0.091, 'w' => 0.46, 'h' => 0.015],
                ['key' => 'registry_number', 'x' => 0.66, 'y' => 0.070, 'w' => 0.28, 'h' => 0.025],

                // HUSBAND (Left Column)
                ['key' => 'husband_first_name', 'x' => 0.17, 'y' => 0.122, 'w' => 0.11, 'h' => 0.014],
                ['key' => 'husband_middle_name', 'x' => 0.29, 'y' => 0.122, 'w' => 0.11, 'h' => 0.014],
                ['key' => 'husband_last_name', 'x' => 0.41, 'y' => 0.122, 'w' => 0.12, 'h' => 0.014],
                ['key' => 'husband_dob', 'x' => 0.17, 'y' => 0.168, 'w' => 0.25, 'h' => 0.014],
                ['key' => 'husband_age', 'x' => 0.45, 'y' => 0.168, 'w' => 0.08, 'h' => 0.014],
                ['key' => 'husband_place_of_birth', 'x' => 0.17, 'y' => 0.200, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_citizenship', 'x' => 0.31, 'y' => 0.230, 'w' => 0.22, 'h' => 0.014],
                ['key' => 'husband_residence', 'x' => 0.17, 'y' => 0.260, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_religion', 'x' => 0.17, 'y' => 0.290, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_civil_status', 'x' => 0.17, 'y' => 0.320, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_father_name', 'x' => 0.17, 'y' => 0.345, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_father_citizenship', 'x' => 0.17, 'y' => 0.375, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_mother_maiden_name', 'x' => 0.17, 'y' => 0.400, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_mother_citizenship', 'x' => 0.17, 'y' => 0.430, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_consent_person', 'x' => 0.17, 'y' => 0.455, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_consent_relationship', 'x' => 0.17, 'y' => 0.485, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'husband_consent_residence', 'x' => 0.17, 'y' => 0.510, 'w' => 0.36, 'h' => 0.014],

                // WIFE (Right Column)
                ['key' => 'wife_first_name', 'x' => 0.58, 'y' => 0.122, 'w' => 0.11, 'h' => 0.014],
                ['key' => 'wife_middle_name', 'x' => 0.70, 'y' => 0.122, 'w' => 0.11, 'h' => 0.014],
                ['key' => 'wife_last_name', 'x' => 0.82, 'y' => 0.122, 'w' => 0.12, 'h' => 0.014],
                ['key' => 'wife_dob', 'x' => 0.58, 'y' => 0.168, 'w' => 0.25, 'h' => 0.014],
                ['key' => 'wife_age', 'x' => 0.86, 'y' => 0.168, 'w' => 0.08, 'h' => 0.014],
                ['key' => 'wife_place_of_birth', 'x' => 0.58, 'y' => 0.200, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_citizenship', 'x' => 0.72, 'y' => 0.230, 'w' => 0.22, 'h' => 0.014],
                ['key' => 'wife_residence', 'x' => 0.58, 'y' => 0.260, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_religion', 'x' => 0.58, 'y' => 0.290, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_civil_status', 'x' => 0.58, 'y' => 0.320, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_father_name', 'x' => 0.58, 'y' => 0.345, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_father_citizenship', 'x' => 0.58, 'y' => 0.375, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_mother_maiden_name', 'x' => 0.58, 'y' => 0.400, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_mother_citizenship', 'x' => 0.58, 'y' => 0.430, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_consent_person', 'x' => 0.58, 'y' => 0.455, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_consent_relationship', 'x' => 0.58, 'y' => 0.485, 'w' => 0.36, 'h' => 0.014],
                ['key' => 'wife_consent_residence', 'x' => 0.58, 'y' => 0.510, 'w' => 0.36, 'h' => 0.014],

                // MARRIAGE DETAILS
                ['key' => 'place_of_marriage', 'x' => 0.22, 'y' => 0.542, 'w' => 0.72, 'h' => 0.014],
                ['key' => 'date_of_marriage', 'x' => 0.22, 'y' => 0.570, 'w' => 0.35, 'h' => 0.014],
                ['key' => 'time_of_marriage', 'x' => 0.72, 'y' => 0.570, 'w' => 0.22, 'h' => 0.014],
                ['key' => 'marriage_license_no', 'x' => 0.22, 'y' => 0.690, 'w' => 0.20, 'h' => 0.014],
                ['key' => 'solemnizing_officer_name', 'x' => 0.05, 'y' => 0.745, 'w' => 0.35, 'h' => 0.014],
                ['key' => 'solemnizing_officer_title', 'x' => 0.42, 'y' => 0.745, 'w' => 0.20, 'h' => 0.014],
                ['key' => 'witness_1_name', 'x' => 0.05, 'y' => 0.785, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'witness_2_name', 'x' => 0.50, 'y' => 0.785, 'w' => 0.42, 'h' => 0.014],

                // REGISTRAR & REMARKS
                ['key' => 'prepared_by_name', 'x' => 0.05, 'y' => 0.835, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'prepared_by_title', 'x' => 0.05, 'y' => 0.850, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'prepared_by_date', 'x' => 0.05, 'y' => 0.865, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'registered_by_name', 'x' => 0.52, 'y' => 0.835, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'registered_by_title', 'x' => 0.52, 'y' => 0.850, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'registered_by_date', 'x' => 0.52, 'y' => 0.865, 'w' => 0.42, 'h' => 0.014],
                ['key' => 'remarks', 'x' => 0.05, 'y' => 0.900, 'w' => 0.90, 'h' => 0.035],
            ];
        }
        
        return [];
    }
    
    /**
     * Executes the get template path operation.
     */
    public static function getTemplatePath($type)
    {
        $type = strtolower($type);
        
        $candidates = [
            public_path("Templates/{$type}.jpg"),
            public_path("Templates/{$type}.png"),
            public_path("Templates/{$type}.jpeg"),
            public_path("Templates/{$type}.pdf"),
        ];

        if ($type === 'birth') {
            $candidates[] = base_path('Templates/certificate of live birth template_page_1.jpg');
        } elseif ($type === 'death') {
            $candidates[] = base_path('Templates/Certificate of death template_page_1.jpg');
        } elseif ($type === 'marriage' || $type === 'marriage_license') {
            $candidates[] = base_path('Templates/certificate of marriage template_page_1.jpg');
            $candidates[] = base_path('Templates/certificate of marriage tempalte_page_1.jpg');
        }

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }
        
        return null;
    }
}
