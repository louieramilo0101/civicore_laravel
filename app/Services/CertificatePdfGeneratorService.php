<?php

namespace App\Services;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * CertificatePdfGeneratorService
 * Generates official standardized A4 PDF certificates with template backgrounds and overlaid registry fields.
 */
class CertificatePdfGeneratorService
{
    /**
     * Generates a PDF certificate for an issuance record and saves it to disk.
     */
    public function generateForIssuance(int $issuanceId): ?string
    {
        $issuance = DB::table('issuances')->where('id', $issuanceId)->first();
        if (!$issuance) {
            return null;
        }

        $type = strtolower($issuance->certificate_type ?: $issuance->type ?: 'birth');
        if ($type === 'marriage_license') {
            $type = 'marriage';
        }

        $extractedFields = [];
        if (!empty($issuance->extracted_data)) {
            $decoded = json_decode($issuance->extracted_data, true);
            if (is_array($decoded)) {
                $extractedFields = $decoded;
            }
        }

        // If issuance extracted data is empty or minimal, merge from linked document if available
        if (empty($extractedFields) && !empty($issuance->document_id)) {
            $doc = DB::table('documents')->where('id', $issuance->document_id)->first();
            if ($doc && !empty($doc->extracted_fields)) {
                $docDecoded = json_decode($doc->extracted_fields, true);
                if (is_array($docDecoded)) {
                    $extractedFields = $docDecoded;
                }
            }
        }

        // Fill basic issuance info if not present in fields
        if (empty($extractedFields['registry_number']) && !empty($issuance->certNumber)) {
            $extractedFields['registry_number'] = $issuance->certNumber;
        }
        if (empty($extractedFields['barangay']) && !empty($issuance->barangay)) {
            $extractedFields['barangay'] = $issuance->barangay;
        }

        $extractedFields = $this->normalizeFieldAliases($type, $extractedFields);

        $relativePdfPath = "documents/issuance_{$type}_{$issuanceId}.pdf";
        $absolutePdfPath = Storage::disk('public')->path($relativePdfPath);

        $success = $this->renderCertificatePdf($type, $extractedFields, $absolutePdfPath);
        if (!$success) {
            return null;
        }

        // Build raw searchable text from extracted fields for full-text indexing
        $searchableText = implode(' ', array_filter($extractedFields, fn($v) => is_string($v) && $v !== 'n/a' && $v !== ''));

        // Update issuance record with the newly generated PDF path
        DB::table('issuances')->where('id', $issuanceId)->update([
            'file_path'  => $relativePdfPath,
            'updated_at' => now(),
        ]);

        if (!empty($issuance->document_id)) {
            $doc = DB::table('documents')->where('id', $issuance->document_id)->first();
            $metadata = json_decode($doc->metadata ?? '[]', true) ?: [];
            $metadata['generated_pdf'] = true;
            $metadata['filesize'] = file_exists($absolutePdfPath) ? filesize($absolutePdfPath) : 0;
            $metadata['mimetype'] = 'application/pdf';

            DB::table('documents')->where('id', $issuance->document_id)->update([
                'file_path'  => $relativePdfPath,
                'raw_text'   => $searchableText,
                'ocr_text'   => $searchableText,
                'metadata'   => json_encode($metadata),
                'updated_at' => now(),
            ]);
        }

        return $absolutePdfPath;
    }

    /**
     * Generates a PDF certificate for a document record and saves it to disk.
     */
    public function generateForDocument(int $documentId): ?string
    {
        $document = DB::table('documents')->where('id', $documentId)->first();
        if (!$document) {
            return null;
        }

        $type = strtolower($document->detected_type ?: $document->type ?: 'birth');
        if ($type === 'marriage_license') {
            $type = 'marriage';
        }

        $extractedFields = [];
        if (!empty($document->extracted_fields)) {
            $decoded = json_decode($document->extracted_fields, true);
            if (is_array($decoded)) {
                $extractedFields = $decoded;
            }
        }

        if (empty($extractedFields['barangay']) && !empty($document->barangay)) {
            $extractedFields['barangay'] = $document->barangay;
        }

        $extractedFields = $this->normalizeFieldAliases($type, $extractedFields);

        $relativePdfPath = "documents/cert_{$type}_{$documentId}.pdf";
        $absolutePdfPath = Storage::disk('public')->path($relativePdfPath);

        $success = $this->renderCertificatePdf($type, $extractedFields, $absolutePdfPath);
        if (!$success) {
            return null;
        }

        // Build raw searchable text from extracted fields for full-text indexing
        $searchableText = implode(' ', array_filter($extractedFields, fn($v) => is_string($v) && $v !== 'n/a' && $v !== ''));

        $metadata = json_decode($document->metadata ?? '[]', true) ?: [];
        $metadata['generated_pdf'] = true;
        $metadata['filesize'] = file_exists($absolutePdfPath) ? filesize($absolutePdfPath) : 0;
        $metadata['mimetype'] = 'application/pdf';

        DB::table('documents')->where('id', $documentId)->update([
            'file_path'  => $relativePdfPath,
            'raw_text'   => $searchableText,
            'ocr_text'   => $searchableText,
            'metadata'   => json_encode($metadata),
            'updated_at' => now(),
        ]);

        // Sync with linked issuance if present
        DB::table('issuances')->where('document_id', $documentId)->update([
            'file_path'  => $relativePdfPath,
            'updated_at' => now(),
        ]);

        return $absolutePdfPath;
    }

    /**
     * Normalizes field aliases across death, birth, and marriage templates.
     */
    private function normalizeFieldAliases(string $type, array $fields): array
    {
        if (empty($fields['province'])) {
            $fields['province'] = 'Cavite';
        }
        if (empty($fields['city_municipality'])) {
            $fields['city_municipality'] = 'Naic';
        }

        if ($type === 'birth') {
            if (empty($fields['place_of_birth_province'])) {
                $fields['place_of_birth_province'] = 'Cavite';
            }
            if (empty($fields['place_of_birth_city'])) {
                $fields['place_of_birth_city'] = 'Naic';
            }
        } elseif ($type === 'death') {
            if (!empty($fields['place_of_death']) && empty($fields['place_of_death_hospital'])) {
                $fields['place_of_death_hospital'] = $fields['place_of_death'];
            }
            if (!empty($fields['father_name']) && empty($fields['father_first_name'])) {
                $fields['father_first_name'] = $fields['father_name'];
            }
            if (!empty($fields['mother_maiden_name']) && empty($fields['mother_maiden_first_name'])) {
                $fields['mother_maiden_first_name'] = $fields['mother_maiden_name'];
            }
            if (!empty($fields['age_completed_years']) && empty($fields['age'])) {
                $fields['age'] = $fields['age_completed_years'];
            }
            if (!empty($fields['cause_of_death_immediate']) && empty($fields['cause_of_death_a'])) {
                $fields['cause_of_death_a'] = $fields['cause_of_death_immediate'];
            }
            if (!empty($fields['cause_of_death_antecedent']) && empty($fields['cause_of_death_b'])) {
                $fields['cause_of_death_b'] = $fields['cause_of_death_antecedent'];
            }
            if (!empty($fields['cause_of_death_underlying']) && empty($fields['cause_of_death_c'])) {
                $fields['cause_of_death_c'] = $fields['cause_of_death_underlying'];
            }
        }

        return $fields;
    }

    /**
     * Renders a certificate template with overlay text fields into an A4 PDF file using Dompdf.
     */
    private function renderCertificatePdf(string $type, array $fields, string $outputPdfPath): bool
    {
        try {
            $dir = dirname($outputPdfPath);
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }

            // Find template image
            $templateImagePath = public_path("Templates/{$type}.jpg");
            if (!file_exists($templateImagePath)) {
                $templateImagePath = public_path("Templates/{$type}.png");
            }
            if (!file_exists($templateImagePath)) {
                $templateImagePath = TemplateConfigService::getTemplatePath($type);
            }

            $bgBase64 = '';
            $bgMime = 'image/jpeg';
            if ($templateImagePath && file_exists($templateImagePath)) {
                $ext = strtolower(pathinfo($templateImagePath, PATHINFO_EXTENSION));
                if ($ext === 'png') {
                    $bgMime = 'image/png';
                }
                $bgBase64 = base64_encode(file_get_contents($templateImagePath));
            }

            $templateFields = TemplateConfigService::getFieldsForType($type);

            $fieldsHtml = '';
            foreach ($templateFields as $tf) {
                $key = $tf['key'];
                $val = $fields[$key] ?? '';
                if ($val === 'n/a' || $val === 'Select...' || $val === '') {
                    continue;
                }

                $left = ($tf['x'] ?? 0) * 100;
                $top  = ($tf['y'] ?? 0) * 100;
                $width = ($tf['w'] ?? 0.1) * 100;
                $height = ($tf['h'] ?? 0.015) * 80 * 100; // relative percent

                $valEscaped = htmlspecialchars((string)$val);

                $fieldsHtml .= "<div class=\"field\" style=\"left: {$left}%; top: {$top}%; width: {$width}%;\">{$valEscaped}</div>\n";
            }

            $bgHtml = $bgBase64 ? "<img class=\"bg\" src=\"data:{$bgMime};base64,{$bgBase64}\" />" : '';

            $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        margin: 0px;
        size: 210mm 297mm;
    }
    body {
        margin: 0px;
        padding: 0px;
        width: 210mm;
        height: 297mm;
        position: relative;
        font-family: Arial, Helvetica, sans-serif;
        background-color: #ffffff;
    }
    .bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 210mm;
        height: 297mm;
        z-index: 1;
    }
    .field {
        position: absolute;
        z-index: 2;
        font-size: 8pt;
        font-weight: bold;
        color: #0f172a;
        line-height: 1.1;
        overflow: hidden;
        white-space: nowrap;
    }
</style>
</head>
<body>
    {$bgHtml}
    {$fieldsHtml}
</body>
</html>
HTML;

            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', true);

            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            file_put_contents($outputPdfPath, $dompdf->output());

            return true;
        } catch (\Throwable $e) {
            Log::error("CertificatePdfGeneratorService failed: " . $e->getMessage(), [
                'type' => $type,
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return false;
        }
    }
}
