<?php
/* CareMyTrip Admin — Secure Login Page */

define('CAREMYTRIP_ADMIN', true);
require_once 'auth.php';

// Redirect if already authenticated
if (isAuthenticated()) {
    header('Location: /admin/dashboard');
    exit;
}

// Generate CSRF token
$csrf_token = CSRFToken::generate();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CareMyTrip Admin — Login</title>
    <meta name="robots" content="noindex, nofollow">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #0e8c7a 0%, #0a6d5f 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 420px;
            padding: 40px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .login-header img {
            height: 50px;
            margin-bottom: 20px;
        }
        .login-header h1 {
            font-size: 24px;
            color: #0e8c7a;
            margin-bottom: 8px;
        }
        .login-header p {
            color: #666;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            font-size: 14px;
        }
        input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 15px;
            font-family: inherit;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #0e8c7a;
            box-shadow: 0 0 0 3px rgba(14,140,122,0.1);
        }
        .submit-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #0e8c7a 0%, #0a6d5f 100%);
            color: #fff;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 10px;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(14,140,122,0.3);
        }
        .submit-btn:active {
            transform: translateY(0);
        }
        .alert {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        .alert.error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
            display: block;
        }
        .alert.success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
            display: block;
        }
        .security-notice {
            background: #f0f4f8;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 14px;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            line-height: 1.6;
        }
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
        }
        .spinner {
            width: 20px;
            height: 20px;
            border: 3px solid #f0f0f0;
            border-top: 3px solid #0e8c7a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <img src="/assets/img/logo.png" alt="CareMyTrip Logo" width="160" height="50">
            <h1>Admin Dashboard</h1>
            <p>Secure Login Required</p>
        </div>

        <div id="alert" class="alert"></div>

        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="admin@caremytrip.com"
                    required
                    autocomplete="email"
                >
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                >
            </div>

            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <input type="hidden" name="action" value="login">

            <button type="submit" class="submit-btn">
                <span id="btnText">Sign In</span>
                <span class="loading" id="loading"><span class="spinner"></span></span>
            </button>
        </form>

        <div class="security-notice">
            <strong>🔒 Security Notice:</strong>
            <ul style="margin-left: 20px; margin-top: 8px;">
                <li>This login is for authorized CareMyTrip staff only</li>
                <li>Your session will expire after 30 minutes of inactivity</li>
                <li>Failed login attempts are logged and rate-limited</li>
                <li>Use a strong, unique password</li>
            </ul>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const csrfToken = document.querySelector('input[name="csrf_token"]').value;

            // Validate inputs
            if (!email || !password) {
                showAlert('Please fill in all fields', 'error');
                return;
            }

            // Show loading state
            document.getElementById('btnText').style.display = 'none';
            document.getElementById('loading').style.display = 'block';

            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        action: 'login',
                        email: email,
                        password: password,
                        csrf_token: csrfToken
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showAlert('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/admin/dashboard';
                    }, 1000);
                } else {
                    showAlert(result.message || 'Login failed', 'error');
                    document.getElementById('password').value = '';
                }
            } catch (error) {
                showAlert('Network error. Please try again.', 'error');
            } finally {
                document.getElementById('btnText').style.display = 'inline';
                document.getElementById('loading').style.display = 'none';
            }
        });

        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = `alert ${type}`;
        }

        // Prevent autocomplete on sensitive fields
        document.getElementById('password').addEventListener('input', function() {
            this.setAttribute('value', '');
        });
    </script>
</body>
</html>
