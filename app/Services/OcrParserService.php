<?php

namespace App\Services;

/**
 * OcrParserService — Smart Anchor-Based Extraction
 * ================================================
 * This parser uses a "semantic anchor" strategy to extract form data:
 * 
 * 1. Global Patterns: Search for highly unique IDs like Registry Numbers first.
 * 2. Targeted Anchors: Find labels (like "Province") and grab the next non-label word.
 * 3. Skip Lists: Intelligently ignore common OCR headers like "OFFICE", "REPUBLIC", etc.
 * 4. Normalization: Clean up common OCR artifacts (typos, case issues).
 *
 * This approach is DPI-independent and works on any scan size/rotation.
 */
class OcrParserService
{
    /** Defines the birth anchors configuration values. */
    private const BIRTH_ANCHORS = [
        'province'                   => ['\bprovince\b'],
        'city_municipality'          => ['city/municipality', 'city municipality', 'cily municipality', '\bmunicipality\b'],
        'barangay'                   => ['\bbarangay\b', '\bbrgy\b'],
        'first_name'                 => ['\(first\)', '1\. name', 'child.*first', 'name.*first'],
        'middle_name'                => ['\(middle\)', 'child.*middle', 'name.*middle'],
        'last_name'                  => ['\(last\)', 'child.*last', 'name.*last'],
        'sex'                        => ['sex\(male', 'sex/male', '2\. sex', '\bsex\b'],
        'dob_day'                    => ['date of birth.*day', '\(day\)', 'dob.*day'],
        'dob_month'                  => ['\(month\)', 'dob.*month'],
        'dob_year'                   => ['\(year\)', 'dob.*year'],
        'place_of_birth_hospital'    => ['4\. place of birth', 'place of birth'],
        'place_of_birth_city'        => ['place.*city/municipality', 'birth.*city'],
        'place_of_birth_province'    => ['place.*province', 'birth.*province'],
        'type_of_birth'              => ['5a\. type of birth', 'type of birth'],
        'mother_first_name'          => ['7\. maiden.*first', 'maiden.*first', 'mother.*first'],
        'mother_middle_name'         => ['7\. maiden.*middle', 'maiden.*middle', 'mother.*middle'],
        'mother_last_name'           => ['7\. maiden.*last', 'maiden.*last', 'mother.*last'],
        'father_first_name'          => ['14\. name.*first', 'father.*first'],
        'father_middle_name'         => ['14\. name.*middle', 'father.*middle'],
        'father_last_name'           => ['14\. name.*last', 'father.*last'],
        'marriage_parents_day'       => ['20a\. date.*day'],
        'marriage_parents_month'     => ['20a\. date.*month'],
        'marriage_parents_year'      => ['20a\. date.*year'],
        'attendant_type'             => ['21a\. attendant'],
        'attendant_time'             => ['21b\. time of birth'],
        'attendant_name'             => ['21b\. name in print', 'attendant.*name'],
        'attendant_title'            => ['21b\. title or position', 'attendant.*title'],
        'attendant_date'             => ['21b\. date', 'attendant.*date'],
        'informant_name'             => ['22\. informant name', 'informant.*name'],
        'informant_relationship'     => ['22\. relationship to child', 'informant.*relationship'],
        'informant_date'             => ['22\. date', 'informant.*date'],
        'prepared_by_name'           => ['23\. prepared by name', 'prepared.*name'],
        'prepared_by_date'           => ['23\. date', 'prepared.*date'],
        'received_by_name'           => ['24\. received by name', 'received.*name'],
        'received_by_date'           => ['24\. date', 'received.*date'],
        'registered_by_name'         => ['25\. registered by name', 'registered.*name'],
        'registered_by_date'         => ['25\. date', 'registered.*date'],
    ];

    /** Defines the death anchors configuration values. */
    private const DEATH_ANCHORS = [
        'province'                   => ['\bprovince\b'],
        'city_municipality'          => ['city/municipality', 'city municipality', '\bmunicipality\b'],
        'barangay'                   => ['\bbarangay\b', '\bbrgy\b'],
        'first_name'                 => ['\(first\)', '1\. name', 'deceased.*first', 'name.*first'],
        'middle_name'                => ['\(middle\)', 'deceased.*middle', 'name.*middle'],
        'last_name'                  => ['\(last\)', 'deceased.*last', 'name.*last'],
        'sex'                        => ['2\. sex', '\bsex\b'],
        'date_of_death'              => ['3\. date of death', 'date of death', 'died'],
        'date_of_birth'              => ['4\. date of birth', 'date of birth'],
        'place_of_death'             => ['6\. place of death', 'place of death', 'died at'],
        'civil_status'               => ['7\. civil status', 'civil status'],
        'religion'                   => ['8\. religion', 'religion'],
        'citizenship'                => ['9\. citizenship', 'citizenship'],
        'residence'                  => ['10\. residence', 'residence'],
        'occupation'                 => ['11\. occupation', 'occupation'],
        'father_name'                => ['12\. name of father', 'father.*name'],
        'mother_maiden_name'         => ['13\. maiden name of mother', 'mother.*name'],
        'cause_of_death_immediate'   => ['immediate cause', '19b.*a'],
        'cause_of_death_antecedent'  => ['antecedent cause', '19b.*b'],
        'cause_of_death_underlying'  => ['underlying cause', '19b.*c'],
        'manner_of_death'            => ['19d.*manner of death', 'manner of death'],
        'informant_name'             => ['26\. informant name', 'informant.*name'],
        'prepared_by_name'           => ['27\. prepared by', 'prepared.*name'],
        'received_by_name'           => ['28\. received by', 'received.*name'],
        'registered_by_name'         => ['29\. registered by', 'registered.*name'],
    ];

    /** Defines the marriage anchors configuration values. */
    private const MARRIAGE_ANCHORS = [
        'province'                   => ['\bprovince\b'],
        'city_municipality'          => ['city/municipality', 'city municipality', '\bmunicipality\b'],
        'barangay'                   => ['\bbarangay\b', '\bbrgy\b'],
        'husband_first_name'         => ['husband.*first', 'groom.*first'],
        'husband_middle_name'        => ['husband.*middle', 'groom.*middle'],
        'husband_last_name'          => ['husband.*last', 'groom.*last'],
        'wife_first_name'            => ['wife.*first', 'bride.*first'],
        'wife_middle_name'           => ['wife.*middle', 'bride.*middle'],
        'wife_last_name'             => ['wife.*last', 'bride.*last'],
        'place_of_marriage'          => ['15\. place of marriage', 'place of marriage', 'married at'],
        'date_of_marriage'           => ['16\. date of marriage', 'date of marriage', 'married on'],
        'marriage_license_no'        => ['19a\. marriage license', 'license no'],
        'solemnizing_officer_name'   => ['18\. solemnizing officer', 'solemnizing officer'],
        'witness_1_name'             => ['20a\. witness 1', 'witness 1'],
        'witness_2_name'             => ['20a\. witness 2', 'witness 2'],
        'prepared_by_name'           => ['21\. received by', 'received.*name'],
        'registered_by_name'         => ['22\. registered by', 'registered.*name'],
    ];

    /** Defines the skip words configuration values. */
    private const SKIP_WORDS = [
        'OFFICE', 'GENERAL', 'REGISTRAR', 'CERTIFICATE', 'BIRTH', 'REPUBLIC', 'FORM', 
        'PHILIPPINES', 'DEPARTMENT', 'HEALTH', 'STATISTICS', 'AUTHORITY', 'MUNICIPAL', 
        'PROVINCIAL', 'CIVIL', 'REGISURY', 'REGISTRY', 'NUMBER', 'AFFIDAVIT', 'ACKNOWLEDGMENT', 'CERTIFICATION'
    ];

    /**
     * Executes the parse text operation.
     */
    public function parseText(string $rawText): array
    {
        $fields = [];
        $detectedType = 'unknown';

        if (!trim($rawText)) {
            return ['detected_type' => $detectedType, 'extracted_fields' => $fields];
        }

        // ── 1. Detect Type ───────────────────────────────────────────────────
        $lower = strtolower($rawText);
        if (preg_match('/live\s*birth|birth\s*certificate/i', $rawText)) {
            $detectedType = 'birth';
        } elseif (preg_match('/death|deceased/i', $rawText)) {
            $detectedType = 'death';
        } elseif (preg_match('/marriage/i', $rawText)) {
            $detectedType = 'marriage';
        }

        // ── 2. Global Patterns (High Confidence) ────────────────────────────
        // Registry No: XXXX-XXXXXX
        if (preg_match('/\b(\d{4}-\d{3,10})\b/', $rawText, $m)) {
            $fields['registry_number'] = $m[1];
        }

        // ── 3. Anchor Extraction ─────────────────────────────────────────────
        $lines = array_values(array_filter(
            array_map('trim', preg_split('/\r?\n/', $rawText)),
            fn($l) => strlen($l) >= 2
        ));

        if ($detectedType === 'birth') {
            $fields = array_merge($fields, $this->extractByAnchors($lines, self::BIRTH_ANCHORS));
        } elseif ($detectedType === 'death') {
            $fields = array_merge($fields, $this->extractByAnchors($lines, self::DEATH_ANCHORS));
        } elseif ($detectedType === 'marriage') {
            $fields = array_merge($fields, $this->extractByAnchors($lines, self::MARRIAGE_ANCHORS));
        }

        // ── 4. Fallback for Names ───────────────────────────────────────────
        if (empty($fields['first_name'])) {
            $names = $this->findNameCandidates($lines);
            if (count($names) >= 2) {
                $fields['first_name'] = $names[0];
                $fields['middle_name'] = $fields['middle_name'] ?? ($names[1] ?? '');
                $fields['last_name'] = $fields['last_name'] ?? ($names[2] ?? '');
            }
        }

        // ── 5. Normalization ────────────────────────────────────────────────
        if (!empty($fields['sex'])) {
            $s = strtoupper($fields['sex']);
            if (str_contains($s, 'FEM') || $s === 'F') $fields['sex'] = 'Female';
            else if (str_contains($s, 'MAL') || $s === 'M') $fields['sex'] = 'Male';
        }

        // Month fix
        if (!empty($fields['dob_month'])) {
            $fields['dob_month'] = $this->fixMonth($fields['dob_month']);
        }

        // Barangay fuzzy match
        if (!empty($fields['barangay'])) {
            $fields['barangay'] = $this->fixBarangay($fields['barangay']);
        } elseif (!empty($fields['mother_residence_house'])) {
            // Try to find barangay inside residence text
            $fields['barangay'] = $this->fixBarangay($fields['mother_residence_house']);
        }

        return [
            'detected_type'   => $detectedType,
            'extracted_fields' => array_filter($fields, fn($v) => trim((string)$v) !== ''),
        ];
    }

    /**
     * Executes the extract by anchors operation.
     */
    private function extractByAnchors(array $lines, array $anchors): array
    {
        $fields = [];
        $count = count($lines);
        foreach ($anchors as $key => $patterns) {
            foreach ($patterns as $pattern) {
                for ($i = 0; $i < $count; $i++) {
                    if (!preg_match('#' . $pattern . '#i', $lines[$i])) continue;

                    // Try same line
                    $val = trim(preg_replace('#' . $pattern . '#i', '', $lines[$i]));
                    $val = preg_replace('/^[\s:|\-]+/', '', $val);
                    if (strlen($val) >= 2 && !$this->isLabel($val)) {
                        $fields[$key] = $this->clean($key, $val);
                        break 2;
                    }

                    // Try next 3 lines
                    for ($j = $i + 1; $j < $count && $j <= $i + 3; $j++) {
                        $val = trim($lines[$j]);
                        if (strlen($val) >= 2 && !$this->isLabel($val)) {
                            $fields[$key] = $this->clean($key, $val);
                            break 3;
                        }
                    }
                    break;
                }
            }
        }
        return $fields;
    }

    /**
     * Executes the find name candidates operation.
     */
    private function findNameCandidates(array $lines): array
    {
        $names = [];
        foreach ($lines as $line) {
            $u = strtoupper(trim($line));
            if (preg_match('/^[A-Z\s\-\.]{3,}$/', $u)) {
                $words = explode(' ', $u);
                $firstWord = $words[0] ?? '';
                if (!in_array($firstWord, self::SKIP_WORDS) && 
                    !preg_match('/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i', $firstWord) &&
                    !preg_match('/AFFIDAVIT|ACKNOWLEDGMENT|CERTIFICATION|NOTARY|SUBSCRIBED/i', $u)) {
                    $names[] = ucwords(strtolower($line));
                }
            }
            if (count($names) >= 3) break;
        }
        return $names;
    }

    /**
     * Executes the is label operation.
     */
    private function isLabel(string $text): bool
    {
        $text = strtoupper(trim($text));
        if (in_array($text, self::SKIP_WORDS)) return true;
        $labels = ['PROVINCE', 'CITY', 'MUNICIPALITY', 'NAME', 'REGISTRY', 'SEX', 'BIRTH', 'DATE', 'PLACE', 'HOSPITAL'];
        foreach ($labels as $l) {
            if ($text === $l) return true;
        }
        return false;
    }

    /**
     * Executes the fix month operation.
     */
    private function fixMonth(string $m): string
    {
        $map = ['jan'=>'January','feb'=>'February','mar'=>'March','apr'=>'April','may'=>'May','jun'=>'June','jul'=>'July','aug'=>'August','sep'=>'September','oct'=>'October','nov'=>'November','dec'=>'December'];
        $m = strtolower(trim($m));
        foreach ($map as $k => $v) if (str_starts_with($m, $k)) return $v;
        return ucfirst($m);
    }

    /**
     * Executes the fix barangay operation.
     */
    private function fixBarangay(string $val): string
    {
        $brgyList = [
            'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
            'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
            'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
            'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
            'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
            'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
        ];
        $val = strtoupper($val);
        foreach ($brgyList as $b) {
            $bUpper = strtoupper($b);
            // Check for exact match or word match
            if (str_contains($val, $bUpper)) return $b;
            // Handle parts (e.g. "Timalan" matches "Timalan Balsahan")
            $parts = explode(' ', str_replace(['(', ')', '.', '&', '2', '3'], ' ', $bUpper));
            foreach ($parts as $p) {
                if (strlen($p) > 3 && str_contains($val, trim($p))) return $b;
            }
        }
        return '';
    }

    /**
     * Executes the clean operation.
     */
    private function clean(string $key, string $val): string
    {
        $val = trim(preg_replace('/^[|\-=.:]+/', '', $val));
        if (str_contains($key, 'name')) return ucwords(strtolower(preg_replace('/\b\d+\b/', '', $val)));
        return $val;
    }
}
