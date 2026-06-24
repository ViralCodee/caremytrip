<?php
/* CareMyTrip Admin — Secure Configuration */

// Prevent direct access
if (!defined('CAREMYTRIP_ADMIN')) {
    die('Access denied');
}

// Security settings
ini_set('display_errors', false);
ini_set('log_errors', true);
error_reporting(E_ALL);

// Database simulation (replace with real DB connection)
define('ADMIN_USER', 'admin@caremytrip.com');
define('ADMIN_PASS_HASH', password_hash('SecurePass@12345', PASSWORD_BCRYPT));

// Session configuration
session_set_cookie_params([
    'lifetime' => 1800,
    'path' => '/admin',
    'domain' => $_SERVER['HTTP_HOST'] ?? '',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Strict'
]);

// Rate limiting settings
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 minutes in seconds

// CSRF token expiry
define('CSRF_TOKEN_EXPIRY', 3600); // 1 hour

// Encryption key (use a strong key in production)
define('ENCRYPTION_KEY', 'CMT_SECURE_2026_CHANGE_IN_PROD');

// Security headers
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// Log file location
define('LOG_FILE', __DIR__ . '/logs/security.log');
if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

/**
 * Security logging function
 */
function logSecurity($event, $details = '') {
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
    $user = $_SESSION['user'] ?? 'GUEST';
    $log_entry = "[$timestamp] IP: $ip | USER: $user | EVENT: $event | $details\n";

    if (defined('LOG_FILE')) {
        error_log($log_entry, 3, LOG_FILE);
    }
}

/**
 * CSRF Token generation and validation
 */
class CSRFToken {
    public static function generate() {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $_SESSION['csrf_token_time'] = time();
        }
        return $_SESSION['csrf_token'];
    }

    public static function validate($token) {
        if (empty($_SESSION['csrf_token']) || empty($_SESSION['csrf_token_time'])) {
            return false;
        }

        // Check token expiry
        if (time() - $_SESSION['csrf_token_time'] > CSRF_TOKEN_EXPIRY) {
            unset($_SESSION['csrf_token'], $_SESSION['csrf_token_time']);
            return false;
        }

        // Verify token
        if (!hash_equals($_SESSION['csrf_token'], $token ?? '')) {
            logSecurity('CSRF_ATTACK_DETECTED', 'Token mismatch');
            return false;
        }

        return true;
    }
}

/**
 * Rate limiting for login attempts
 */
class RateLimiter {
    public static function checkLoginAttempts($email) {
        $file = __DIR__ . "/logs/login_attempts_{$email}.log";

        if (file_exists($file)) {
            $attempts = file_get_contents($file);
            $data = json_decode($attempts, true);

            // Check if locked out
            if ($data['attempts'] >= MAX_LOGIN_ATTEMPTS) {
                if (time() - $data['last_attempt'] < LOGIN_LOCKOUT_TIME) {
                    logSecurity('LOGIN_LOCKOUT', "Email: $email");
                    return false;
                } else {
                    // Reset attempts
                    self::resetAttempts($email);
                    return true;
                }
            }
        }

        return true;
    }

    public static function recordLoginAttempt($email) {
        $file = __DIR__ . "/logs/login_attempts_{$email}.log";
        $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['attempts' => 0];

        $data['attempts']++;
        $data['last_attempt'] = time();

        file_put_contents($file, json_encode($data));
    }

    public static function resetAttempts($email) {
        $file = __DIR__ . "/logs/login_attempts_{$email}.log";
        if (file_exists($file)) {
            unlink($file);
        }
    }
}

/**
 * Input validation and sanitization
 */
class Validator {
    public static function sanitizeInput($input) {
        return htmlspecialchars(stripslashes(trim($input)), ENT_QUOTES, 'UTF-8');
    }

    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function validatePassword($password) {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $password);
    }
}
?>
