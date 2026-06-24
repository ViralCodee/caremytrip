<?php
/* CareMyTrip Admin — Authentication Handler */

define('CAREMYTRIP_ADMIN', true);
require_once 'config.php';

session_start();

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true &&
           isset($_SESSION['user_email']) && !isSessionExpired();
}

/**
 * Check if session is expired
 */
function isSessionExpired() {
    if (!isset($_SESSION['last_activity'])) {
        return false;
    }

    $timeout = 1800; // 30 minutes
    if (time() - $_SESSION['last_activity'] > $timeout) {
        session_destroy();
        return true;
    }

    $_SESSION['last_activity'] = time();
    return false;
}

/**
 * Authenticate user
 */
function authenticate($email, $password) {
    $email = Validator::sanitizeInput($email);

    // Validate email format
    if (!Validator::validateEmail($email)) {
        logSecurity('LOGIN_FAILED', "Invalid email format: $email");
        return ['success' => false, 'message' => 'Invalid email format'];
    }

    // Check rate limiting
    if (!RateLimiter::checkLoginAttempts($email)) {
        return ['success' => false, 'message' => 'Too many login attempts. Please try again later.'];
    }

    // Verify credentials
    if ($email === ADMIN_USER && password_verify($password, ADMIN_PASS_HASH)) {
        // Successful login
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        $_SESSION['user_email'] = $email;
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'];
        $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];

        // Reset login attempts
        RateLimiter::resetAttempts($email);

        logSecurity('LOGIN_SUCCESS', "Email: $email");
        return ['success' => true, 'message' => 'Login successful'];
    } else {
        // Failed login
        RateLimiter::recordLoginAttempt($email);
        logSecurity('LOGIN_FAILED', "Email: $email | Attempts recorded");
        return ['success' => false, 'message' => 'Invalid credentials'];
    }
}

/**
 * Logout user
 */
function logout() {
    logSecurity('LOGOUT', "Email: " . ($_SESSION['user_email'] ?? 'UNKNOWN'));

    // Destroy session completely
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }
    session_destroy();
}

/**
 * Verify session security
 */
function verifySessionSecurity() {
    if (!isset($_SESSION['ip_address']) || $_SESSION['ip_address'] !== $_SERVER['REMOTE_ADDR']) {
        logSecurity('SESSION_HIJACKING_ATTEMPT', 'IP mismatch');
        session_destroy();
        return false;
    }

    if (!isset($_SESSION['user_agent']) || $_SESSION['user_agent'] !== $_SERVER['HTTP_USER_AGENT']) {
        logSecurity('SESSION_HIJACKING_ATTEMPT', 'User-Agent mismatch');
        session_destroy();
        return false;
    }

    return true;
}

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    // Verify CSRF token
    if (!isset($_POST['csrf_token']) || !CSRFToken::validate($_POST['csrf_token'])) {
        logSecurity('CSRF_VALIDATION_FAILED', 'Login attempt');
        die('Security verification failed');
    }

    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    $result = authenticate($email, $password);
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}

// Handle logout
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'logout') {
    logout();
    header('Location: /admin');
    exit;
}
?>
