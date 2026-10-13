<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Queue Ticket – {{ $ticket->ticket_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f4f8;
            color: #1e293b;
            padding: 24px 16px;
        }
        .wrapper { max-width: 560px; margin: 0 auto; }

        /* Header */
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
            border-radius: 16px 16px 0 0;
            padding: 32px 32px 24px;
            text-align: center;
            color: #fff;
        }
        .header .logo-text {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }
        .header .logo-sub {
            font-size: 11px;
            opacity: 0.75;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 900;
            margin-top: 20px;
            letter-spacing: -0.5px;
        }
        .header .ticket-num {
            display: inline-block;
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 30px;
            padding: 6px 20px;
            font-size: 18px;
            font-weight: 800;
            margin-top: 10px;
            letter-spacing: 1px;
        }

        /* Body card */
        .card {
            background: #ffffff;
            padding: 32px;
            border-left: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
        }

        /* Details Table */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0 20px;
            background-color: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
        }
        .details-table td {
            padding: 10px 16px;
            font-size: 14px;
            vertical-align: middle;
        }
        .details-table .label-col {
            color: #64748b;
            font-weight: 500;
            width: 38%;
            border-bottom: 1px solid #e2e8f0;
        }
        .details-table .value-col {
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
        }
        .details-table tr:last-child td {
            border-bottom: none;
        }

        /* Warning box */
        .warning {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 14px 16px;
            margin: 20px 0;
            font-size: 13px;
            color: #78350f;
            line-height: 1.6;
        }
        .warning strong { color: #b45309; }

        /* CTA Button */
        .cta {
            text-align: center;
            margin: 24px 0 8px;
        }
        .cta a {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb, #1e40af);
            color: #fff;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.3px;
        }

        /* Footer */
        .footer {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 16px 16px;
            padding: 20px 32px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.7;
        }
        .footer strong { color: #64748b; }

        /* Mobile */
        @media (max-width: 480px) {
            .card { padding: 20px; }
            .header { padding: 24px 20px 18px; }
            .header h1 { font-size: 22px; }
            .details-table td { padding: 8px 12px; font-size: 13px; }
        }
    </style>
</head>
<body>
<div class="wrapper">

    <!-- Header -->
    <div class="header">
        <div class="logo-text">CiviCORE</div>
        <div class="logo-sub">Civil Registry Management System</div>
        <h1>Your Queue Ticket</h1>
        <div class="ticket-num">{{ $ticket->ticket_number }}</div>
    </div>

    <!-- Card Body -->
    <div class="card">

        <p style="font-size:15px; color:#475569; margin-bottom:6px;">Hello, <strong style="color:#0f172a;">{{ $ticket->client_name }}</strong>!</p>
        <p style="font-size:14px; color:#64748b; margin-bottom:16px;">Your appointment request has been received. Please present your ticket number at the Civil Registry counter.</p>

        <!-- Details Table -->
        <table class="details-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin:16px 0 20px; background-color:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;">
            <tr>
                <td class="label-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#64748b; width:38%;">Ticket Number:</td>
                <td class="value-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#0f172a; font-weight:bold;">{{ $ticket->ticket_number }}</td>
            </tr>
            <tr>
                <td class="label-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#64748b;">Purpose:</td>
                <td class="value-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#0f172a;">{{ ucfirst(str_replace('_', ' ', $ticket->purpose)) }} Certificate</td>
            </tr>
            <tr>
                <td class="label-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#64748b;">Name:</td>
                <td class="value-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#0f172a;">{{ $ticket->client_name }}</td>
            </tr>
            <tr>
                <td class="label-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#64748b;">Date:</td>
                <td class="value-col" style="padding:10px 16px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#0f172a;">{{ \Carbon\Carbon::parse($ticket->created_at)->format('F j, Y') }}</td>
            </tr>
            <tr>
                <td style="padding:10px 16px; font-size:14px; color:#64748b;">Valid Until:</td>
                <td style="padding:10px 16px; font-size:14px; color:#dc2626; font-weight:bold;">{{ \Carbon\Carbon::parse($ticket->expires_at)->format('g:i A') }} today</td>
            </tr>
        </table>

        <!-- Expiry Warning -->
        <div class="warning">
            <strong>Important:</strong> This ticket is valid only until <strong>{{ \Carbon\Carbon::parse($ticket->expires_at)->format('g:i A') }} today</strong>. If you do not visit the Civil Registry within this period, your ticket will expire and you will need to request a new one online.
        </div>

        <!-- Walk-in note -->
        <p style="font-size:13px; color:#64748b; margin-bottom:20px;">
            <strong>Don't have access to your email?</strong> Walk-in clients are welcome at the counter. Staff can issue an on-site ticket for you.
        </p>

        <!-- CTA -->
        <div class="cta">
            <a href="{{ $ticketUrl }}">View Ticket Status Online →</a>
        </div>

    </div>

    <!-- Footer -->
    <div class="footer">
        <strong>Local Civil Registry Office</strong><br>
        This is an automated message from CiviCORE. Please do not reply to this email.<br>
        If you have concerns, visit the civil registry office directly.
    </div>

</div>
</body>
</html>
