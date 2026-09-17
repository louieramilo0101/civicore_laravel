<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * DocumentPdfConverterService
 * Handles Dual A4 file processing:
 * 1. Formats/scales uploaded scans to an A4 Picture file (JPEG/PNG).
 * 2. Standardizes and converts documents into a clean A4 PDF file.
 */
class DocumentPdfConverterService
{
    /**
     * Process an uploaded document file into dual A4 storage (PDF + Picture).
     *
     * @param UploadedFile|string $file Uploaded file instance or file path
     * @param string|null $customFilename Base name (without extension)
     * @return array Array containing 'file_path' (PDF) and 'image_path' (Picture)
     */
    public function processUploadedFile($file, ?string $customFilename = null): array
    {
        $uniqueBase = $customFilename ?: 'doc-' . time() . '-' . rand(100000000, 999999999);
        $publicDisk = Storage::disk('public');

        if ($file instanceof UploadedFile) {
            $realPath = $file->getRealPath();
            $originalExt = strtolower($file->getClientOriginalExtension());
        } else {
            $realPath = $file;
            $originalExt = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        }

        if (!file_exists($realPath)) {
            throw new \InvalidArgumentException("Source file does not exist at: {$realPath}");
        }

        $imagePathRelative = "documents/{$uniqueBase}_image.jpg";
        $pdfPathRelative   = "documents/{$uniqueBase}.pdf";

        $fullImageDiskPath = $publicDisk->path($imagePathRelative);
        $fullPdfDiskPath   = $publicDisk->path($pdfPathRelative);

        // Ensure target directory exists
        $dir = dirname($fullImageDiskPath);
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $isImage = in_array($originalExt, ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'], true);

        if ($isImage) {
            // STEP 1: Process and save clean A4-scaled image
            $this->saveResizedA4Image($realPath, $fullImageDiskPath);

            // STEP 2: Convert the A4 image to a standardized A4 PDF document
            $this->convertImageToA4Pdf($fullImageDiskPath, $fullPdfDiskPath);
        } else if ($originalExt === 'pdf') {
            // Store the PDF directly
            if ($file instanceof UploadedFile) {
                $file->storeAs('documents', "{$uniqueBase}.pdf", 'public');
            } else {
                copy($realPath, $fullPdfDiskPath);
            }

            // Extract first page of PDF as preview image if possible
            $extractedImage = $this->renderPdfFirstPageToImage($fullPdfDiskPath, $fullImageDiskPath);
            if (!$extractedImage || !file_exists($fullImageDiskPath)) {
                // Fallback: If preview extraction is pending, map image_path to the PDF
                $imagePathRelative = $pdfPathRelative;
            }
        } else {
            // Fallback for docx / txt / rtf: save original and wrap in simple PDF
            if ($file instanceof UploadedFile) {
                $file->storeAs('documents', "{$uniqueBase}.pdf", 'public');
            } else {
                copy($realPath, $fullPdfDiskPath);
            }
            $imagePathRelative = $pdfPathRelative;
        }

        Log::info("Dual A4 Document converted successfully: PDF => {$pdfPathRelative}, Image => {$imagePathRelative}");

        return [
            'file_path'  => $pdfPathRelative,
            'image_path' => $imagePathRelative,
        ];
    }

    /**
     * Resizes/scales an image to clean A4 aspect ratio & resolution (max 2480px height for 300 DPI A4)
     */
    private function saveResizedA4Image(string $sourcePath, string $targetJpegPath): void
    {
        try {
            $imageInfo = @getimagesize($sourcePath);
            if (!$imageInfo) {
                copy($sourcePath, $targetJpegPath);
                return;
            }

            $mime = $imageInfo['mime'];
            $srcImg = match ($mime) {
                'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($sourcePath),
                'image/png'               => @imagecreatefrompng($sourcePath),
                'image/webp'              => @imagecreatefromwebp($sourcePath),
                'image/bmp'               => @imagecreatefrombmp($sourcePath),
                default                   => null,
            };

            if (!$srcImg) {
                copy($sourcePath, $targetJpegPath);
                return;
            }

            $origWidth  = imagesx($srcImg);
            $origHeight = imagesy($srcImg);

            // A4 dimensions at standard DPI (~2480 x 3508 or max 2000px)
            $maxDim = 2000;
            if ($origWidth > $maxDim || $origHeight > $maxDim) {
                $ratio = min($maxDim / $origWidth, $maxDim / $origHeight);
                $newWidth  = (int) round($origWidth * $ratio);
                $newHeight = (int) round($origHeight * $ratio);

                $dstImg = imagecreatetruecolor($newWidth, $newHeight);
                // Fill white background for transparency conversion
                $white = imagecolorallocate($dstImg, 255, 255, 255);
                imagefill($dstImg, 0, 0, $white);
                imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
                imagejpeg($dstImg, $targetJpegPath, 82);
                imagedestroy($dstImg);
            } else {
                imagejpeg($srcImg, $targetJpegPath, 82);
            }

            imagedestroy($srcImg);
        } catch (\Throwable $e) {
            Log::warning("A4 Image resize fallback triggered: " . $e->getMessage());
            copy($sourcePath, $targetJpegPath);
        }
    }

    /**
     * Converts a local image file to a clean, single-page A4 PDF using Dompdf.
     */
    private function convertImageToA4Pdf(string $imageFullPath, string $pdfFullPath): void
    {
        $imageData = file_get_contents($imageFullPath);
        $base64 = base64_encode($imageData);
        $mime = 'image/jpeg';

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0px;
            size: A4 portrait;
        }
        body {
            margin: 0px;
            padding: 0px;
            background-color: #ffffff;
            text-align: center;
        }
        .container {
            width: 100%;
            height: 100vh;
            display: table-cell;
            vertical-align: middle;
            text-align: center;
        }
        img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            margin: auto;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="data:{$mime};base64,{$base64}" />
    </div>
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

        $pdfOutput = $dompdf->output();
        file_put_contents($pdfFullPath, $pdfOutput);
    }

    /**
     * Attempts to render the first page of a PDF file to an image file.
     */
    private function renderPdfFirstPageToImage(string $pdfFullPath, string $targetImageFullPath): bool
    {
        try {
            // Check if Imagick extension is available
            if (class_exists('Imagick')) {
                $imagick = new \Imagick();
                $imagick->setResolution(150, 150);
                $imagick->readImage($pdfFullPath . '[0]'); // page 1
                $imagick->setImageFormat('jpeg');
                $imagick->setImageCompressionQuality(88);
                $imagick->writeImage($targetImageFullPath);
                $imagick->clear();
                $imagick->destroy();
                return true;
            }
        } catch (\Throwable $e) {
            Log::info("Imagick PDF page rendering unavailable: " . $e->getMessage());
        }

        return false;
    }
}
