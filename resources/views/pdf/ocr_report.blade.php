<!DOCTYPE html>
<html>
<head>
    <title>OCR Extraction Report - {{ $doc->name ?? 'Document' }}</title>
    <style>
        @page { margin: 1cm; }
        body { 
            font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            color: #1e293b; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .header { 
            border-bottom: 2px solid #0f172a; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            display: table;
            width: 100%;
        }
        .header-content {
            display: table-cell;
            vertical-align: middle;
        }
        .title { 
            font-size: 22pt; 
            font-weight: 800; 
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: -0.025em;
        }
        .subtitle { 
            font-size: 10pt; 
            color: #64748b; 
            margin-top: 4px;
            font-weight: 500;
        }
        .meta-grid {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        .meta-item {
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .meta-label {
            font-size: 9pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            width: 140px;
        }
        .meta-value {
            font-size: 10pt;
            font-weight: 600;
            color: #1e293b;
        }
        .section-title { 
            font-size: 12pt; 
            font-weight: 700; 
            color: #0f172a; 
            background: #f8fafc;
            padding: 8px 12px;
            border-left: 4px solid #0f172a;
            margin: 30px 0 15px 0;
        }
        .ocr-content {
            background: #ffffff;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10.5pt;
            white-space: pre-wrap;
            color: #334155;
            min-height: 400px;
        }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center; 
            font-size: 8pt; 
            color: #94a3b8; 
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 700;
            background: #e2e8f0;
            color: #475569;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1 class="title">OCR Extraction Report</h1>
            <p class="subtitle">Republic of the Philippines &bull; Municipality of Naic &bull; CiviCORE System</p>
        </div>
    </div>

    <table class="meta-grid">
        <tr>
            <td class="meta-item">
                <span class="meta-label">Registration No:</span>
                <span class="meta-value">{{ $doc->certNumber ?? 'PENDING' }}</span>
            </td>
            <td class="meta-item">
                <span class="meta-label">Document Type:</span>
                <span class="meta-value" style="text-transform: capitalize;">{{ $doc->detected_type ?? $doc->type ?? 'N/A' }}</span>
            </td>
        </tr>
        <tr>
            <td class="meta-item">
                <span class="meta-label">Encoded By:</span>
                <span class="meta-value">{{ $doc->encoded_by ?? 'System' }}</span>
            </td>
            <td class="meta-item">
                <span class="meta-label">Date Processed:</span>
                <span class="meta-value">{{ date('F d, Y') }}</span>
            </td>
        </tr>
        <tr>
            <td class="meta-item" colspan="2">
                <span class="meta-label">Subject Name:</span>
                <span class="meta-value">{{ $doc->personName ?? $fields['full_name'] ?? 'null' }}</span>
            </td>
        </tr>
    </table>

    <div class="section-title">Extracted Document Text</div>
    <div class="ocr-content">
{{ $ocr_text ?: 'No text content available for this document.' }}
    </div>

    <div class="footer">
        This document is a computer-generated report of extracted text from an uploaded file.<br>
        <strong>Confidentiality Notice:</strong> This document may contain sensitive personal information. Handle with care.<br>
        Generated on {{ date('Y-m-d H:i:s') }} &bull; System ID: {{ $doc->id }}
    </div>
</body>
</html>
