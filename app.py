from flask import Flask, render_template, request, redirect, url_for, session
import os
from dotenv import load_dotenv
from database import db
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-change-this')

# Session security
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=3600
)

# Initialize OAuth
oauth = OAuth(app)

# Configure Google OAuth - FIXED VERSION
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

# Login attempts tracking
login_attempts = {}

@app.route('/')
def index():
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

# Google Login Route
@app.route('/google-login')
def google_login():
    # Generate state token for security
    state = generate_token()
    session['google_state'] = state
    
    # IMPORTANT: Replace with YOUR actual Codespaces URL
    redirect_uri = "https://musical-parakeet-97jr57xp5r552wrp-5000.app.github.dev/google/auth"
    
    return google.authorize_redirect(redirect_uri, state=state)

# Google Callback Route - FIXED VERSION
@app.route('/google/auth')
def google_auth():
    try:
        print("=== Google Auth Callback Started ===")
        
        # Verify state matches
        expected_state = session.get('google_state')
        received_state = request.args.get('state')
        
        print(f"Expected state: {expected_state}")
        print(f"Received state: {received_state}")
        
        if expected_state and expected_state != received_state:
            return render_template('login.html', error="Security verification failed. Please try again.")
        
        # Get token from Google
        token = google.authorize_access_token()
        print(f"Token received: {token}")
        
        # FIX: Get user info without nonce parameter
        # Use this method instead of parse_id_token
        user_info = google.userinfo()
        print(f"User info: {user_info}")
        
        if not user_info:
            # Fallback method
            user_info = token.get('userinfo', {})
            if not user_info:
                # Try to get from id_token
                import jwt
                id_token = token.get('id_token')
                if id_token:
                    user_info = jwt.decode(id_token, options={"verify_signature": False})
        
        print(f"Final user info: {user_info}")
        
        # Extract user details
        email = user_info.get('email')
        if not email:
            return render_template('login.html', error="Could not get email from Google")
        
        name = user_info.get('name', email.split('@')[0])
        
        print(f"Email: {email}, Name: {name}")
        
        # Check if user exists in our database
        user = db.get_user(email)
        print(f"Existing user: {user}")
        
        if not user:
            # Create new user for Google login
            print("Creating new user...")
            success, message = db.create_user(
                email=email,
                password='GOOGLE_AUTH_USER',
                name=name
            )
            print(f"User creation result: {success}, {message}")
            if not success:
                return render_template('login.html', error=f"Failed to create user: {message}")
        
        # Log the user in
        session['user_email'] = email
        session['user_name'] = name
        session.permanent = True
        
        # Clear the state
        session.pop('google_state', None)
        
        print("Login successful, redirecting to dashboard")
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        print(f"❌ Google auth error: {str(e)}")
        import traceback
        traceback.print_exc()
        return render_template('login.html', error=f"Google login failed: {str(e)}")

# Rest of your routes remain the same...
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    
    ip = request.remote_addr
    if ip in login_attempts and login_attempts[ip] >= 5:
        return render_template('login.html', 
                             error="Too many failed attempts. Please try again later.")
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = db.get_user(email)
        if user and user['password'] == 'GOOGLE_AUTH_USER':
            return render_template('login.html', 
                                 error="This account uses Google login. Please click 'Login with Google'.")
        
        success, result = db.verify_user(email, password)
        
        if success:
            login_attempts.pop(ip, None)
            session['user_email'] = email
            session['user_name'] = result
            session.permanent = True
            return redirect(url_for('dashboard'))
        else:
            login_attempts[ip] = login_attempts.get(ip, 0) + 1
            return render_template('login.html', error=result)
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        
        existing = db.get_user(email)
        if existing:
            return render_template('signup.html', 
                                 error="Email already registered. Try logging in.")
        
        if len(password) < 6:
            return render_template('signup.html', 
                                 error="Password must be at least 6 characters")
        
        success, message = db.create_user(email, password, name)
        
        if success:
            session['user_email'] = email
            session['user_name'] = name
            session.permanent = True
            return redirect(url_for('dashboard'))
        else:
            return render_template('signup.html', error=message)
    
    return render_template('signup.html')

@app.route('/dashboard')
def dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', 
                         user_name=session.get('user_name', 'User'))

@app.route('/tax-bot')
def tax_bot():
    if 'user_email' not in session:
        return redirect(url_for('login'))
    return render_template('tax-bot.html', 
                         user_name=session.get('user_name', 'User'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    print("🚀 Tax Advisor - Phase 2.5 with Google Login (FIXED)")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)