<?php

namespace App\Support;

use Illuminate\Support\Facades\Crypt;

/**
 * Helpers for encrypted JSON columns stored as LONGTEXT.
 *
 * Eloquent models use the `encrypted:array` cast, but several controllers and
 * jobs read/write these columns through the query builder or raw SQL. Those
 * paths bypass casts, so they must use these helpers to keep the value on disk
 * as an encrypted JSON string.
 */
class EncryptedJson
{
    /**
     * Encrypt an array (or JSON string) for storage.
     *
     * Already-encrypted payloads are returned unchanged so the helper is safe
     * to call more than once on the same value.
     */
    public static function encode($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            if (self::isEncrypted($value)) {
                return $value;
            }
            $json = $value;
        } else {
            $json = json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        if ($json === false || $json === '') {
            $json = '[]';
        }

        // Use encryptString (no serialization) so the encrypted:array cast
        // can decrypt with unserialize=false and get back valid JSON.
        return Crypt::encryptString($json);
    }

    /**
     * Decrypt a stored value and return it as an array.
     *
     * Falls back to treating the value as legacy plaintext JSON so rows written
     * before encryption was enabled still render.
     */
    public static function decode($value): array
    {
        if (empty($value)) {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value)) {
            return [];
        }

        $plain = null;

        // 1. Try decrypt with unserialize=false (modern encryptString / raw JSON)
        try {
            $plain = Crypt::decrypt($value, false);
        } catch (\Throwable $e) {
            // Fallback to unserialize=true below
        }

        // 2. If $plain is null (decrypt failed) or looks like a PHP serialized string (e.g. s:123:"..."), try unserializing
        if ($plain === null || (is_string($plain) && preg_match('/^[aOsibd]:[0-9]+:/', $plain))) {
            try {
                $unserialized = Crypt::decrypt($value, true);
                if (is_array($unserialized)) {
                    return $unserialized;
                }
                if (is_string($unserialized)) {
                    $plain = $unserialized;
                }
            } catch (\Throwable $e) {
                if (is_string($plain)) {
                    $un = @unserialize($plain);
                    if (is_array($un)) {
                        return $un;
                    }
                    if (is_string($un)) {
                        $plain = $un;
                    }
                }
            }
        }

        // 3. Fallback for legacy plaintext JSON
        if ($plain === null) {
            $plain = $value;
        }

        if (is_array($plain)) {
            return $plain;
        }

        $decoded = json_decode((string) $plain, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Whether a value looks like a Laravel-encrypted payload.
     */
    public static function isEncrypted($value): bool
    {
        if (!is_string($value) || strlen($value) < 50) {
            return false;
        }

        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }

        return str_starts_with($decoded, '{"iv"') || str_starts_with($decoded, '{"value"');
    }
}
