# Entity Relationship Diagram (ERD)

This is the ERD for the CiviCORE database. You can show this to the panelists to explain how the core tables in your MySQL database relate to each other. 

> [!TIP]
> The diagram below uses Mermaid syntax. If you are viewing this in a markdown viewer that supports Mermaid (like GitHub or many code editors), it will render as a beautiful visual graphic. If not, the text structure perfectly explains the relationships!

```mermaid
erDiagram
    USERS ||--o{ ACTIVITY_LOGS : "performs"
    USERS {
        bigint id PK
        string name
        string email
        string password "Bcrypt Hashed"
        string role "Admin / Staff"
    }

    DOCUMENTS ||--o{ ISSUANCES : "is_finalized_as"
    DOCUMENTS {
        bigint id PK
        string file_path "Raw PDF/Image"
        text ocr_text "Raw AI string"
        json extracted_fields "JSON from Gemini"
        string status "pending/extracted"
    }

    ISSUANCES ||--|{ TICKETS : "satisfies_request_for"
    ISSUANCES {
        bigint id PK
        bigint document_id FK "Links to raw scan"
        string certNumber "e.g., BC-2026-001"
        string type "birth, death, marriage"
        string name "Full Name"
        string barangay "Mapped via Fuzzy Logic"
        json extracted_data "Verified final JSON"
        string status "Processed/Issued"
    }

    TICKETS {
        bigint id PK
        bigint document_id FK "Links to final record"
        string ticket_number "e.g., WI-2026-0001"
        string client_name "Citizen Name"
        string purpose "birth, death, marriage"
        string qr_code_token "Random Hash"
        string request_status "pending/completed"
        int queue_number "e.g., 101"
    }

    ACTIVITY_LOGS {
        bigint id PK
        string user_name FK "Who did it"
        string action "Created/Updated"
        string record_type "Issuance/Document"
        bigint record_id "Which row was touched"
    }
```

## How to Explain This ERD to the Panel:

1.  **Users & Logs (1-to-Many):** One User can perform Many Activity Logs. This ensures strict accountability for who edits what.
2.  **Documents & Issuances (1-to-1/Many):** A `document` is the messy, raw scan. Once verified, it generates a clean `issuance` (the official registry record). The `document_id` acts as a Foreign Key so you can always trace an official record back to the original physical paper.
3.  **Tickets & Issuances:** A `ticket` represents a citizen waiting in the lobby. When staff process their ticket, the system links the ticket to the finalized `issuance` so the physical paper can be printed and handed to the citizen.
