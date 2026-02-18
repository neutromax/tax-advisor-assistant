from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import re
import requests
import base64
import io
import json
from dotenv import load_dotenv
from database import db
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
from PIL import Image

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-change-this')

# OCR.space API configuration
OCR_SPACE_API_KEY = os.getenv('OCR_SPACE_API_KEY')

# Session security
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=3600
)

# Initialize OAuth
oauth = OAuth(app)

# Configure Google OAuth
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

# ========== OCR.SPACE PAYSLIP ANALYSIS ==========
@app.route('/analyze-payslip', methods=['POST'])
def analyze_payslip():
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    if not OCR_SPACE_API_KEY:
        return jsonify({"success": False, "error": "OCR.space API not configured"}), 500
    
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Call OCR.space API
        response = requests.post(
            'https://api.ocr.space/parse/image',
            data={
                'apikey': OCR_SPACE_API_KEY,
                'language': 'eng',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': '2'  # Engine 2 is better for printed text
            },
            files={'file': ('payslip.jpg', image_bytes)}
        )
        
        ocr_result = response.json()
        
        if ocr_result.get('IsErroredOnProcessing'):
            error_msg = ocr_result.get('ErrorMessage', ['Unknown error'])[0]
            return jsonify({"success": False, "error": f"OCR failed: {error_msg}"}), 500
        
        # Extract text from OCR result
        extracted_text = ""
        if 'ParsedResults' in ocr_result:
            for page in ocr_result['ParsedResults']:
                extracted_text += page['ParsedText']
        
        print(f"📝 Extracted text length: {len(extracted_text)} chars")
        
        # Parse the extracted text to find relevant fields
        parsed_data = parse_payslip_text(extracted_text)
        
        return jsonify({
            "success": True,
            "data": parsed_data
        })
        
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

def parse_payslip_text(text):
    """Extract structured data from raw OCR text with improved patterns for this payslip format"""
    
    print("🔍 Parsing payslip text...")
    
    # Initialize with null values
    result = {
        "name": None,
        "income": None,
        "employer": None,
        "date": None,
        "deductions": None,
        "net_pay": None
    }
    
    # Clean up text - remove extra spaces and newlines for better matching
    text = re.sub(r'\s+', ' ', text)
    
    # Extract Employer (Company name at top)
    employer_match = re.search(r'(Computer\s*Solutions\s*Pvt\.?\s*Ltd\.?)', text, re.IGNORECASE)
    if employer_match:
        result["employer"] = employer_match.group(1).strip()
    
    # Extract Employee Name - Look for patterns like "Name : John S" or after Employee Id section
    name_match = re.search(r'Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]?\.?)?)', text, re.IGNORECASE)
    if name_match:
        result["name"] = name_match.group(1).strip()
    else:
        # Try alternative: Look for name in the employee details section
        name_match = re.search(r'Employee Id\s*\|\s*Department\s*\|\s*Name\s*\|\s*([A-Z][a-z]+\s+[A-Z][a-z]?\.?)', text, re.IGNORECASE)
        if name_match:
            result["name"] = name_match.group(1).strip()
    
    # Extract Date - Look for "February 2011" format
    date_match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', text, re.IGNORECASE)
    if date_match:
        result["date"] = f"{date_match.group(1)} {date_match.group(2)}"
    else:
        # Try MM/DD/YYYY format
        date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', text)
        if date_match:
            result["date"] = date_match.group(1)
    
    # Extract Total Earnings (Income)
    # First try "Total Earnings" pattern
    income_match = re.search(r'Total\s*Earnings[^\d]*([\d,]+\.?\d*)', text, re.IGNORECASE)
    if income_match:
        result["income"] = float(income_match.group(1).replace(',', ''))
    else:
        # Sum up individual earnings
        earnings = re.findall(r'(?:Basic Pay|Dearness Allowance|Conveyance Allowance|Medical Allowance|House Rent Allowance|Food Allowance)[^\d]*([\d,]+\.?\d*)', text, re.IGNORECASE)
        if earnings:
            total = sum(float(e.replace(',', '')) for e in earnings)
            result["income"] = total
    
    # Extract Deductions - Look for Total Deductions
    deductions_match = re.search(r'Total\s*Deductions[^\d]*([\d,]+\.?\d*)', text, re.IGNORECASE)
    if deductions_match:
        result["deductions"] = float(deductions_match.group(1).replace(',', ''))
    
    # Extract Net Pay - Look for Net Pay
    net_pay_match = re.search(r'Net\s*Pay[^\d]*([\d,]+\.?\d*)', text, re.IGNORECASE)
    if net_pay_match:
        result["net_pay"] = float(net_pay_match.group(1).replace(',', ''))
    
    # Clean up any unreasonable values
    for field in ["income", "deductions", "net_pay"]:
        if result[field] and result[field] > 1000000:  # If > 10 lakhs, probably wrong
            result[field] = None
    
    print(f"✅ Parsed result: {result}")
    return result

# ========== GOOGLE LOGIN ROUTES ==========
@app.route('/google-login')
def google_login():
    state = generate_token()
    session['google_state'] = state
    
    # Replace with your actual Codespaces URL
    redirect_uri = "https://musical-parakeet-97jr57xp5r552wrp-5000.app.github.dev/google/auth"
    
    return google.authorize_redirect(redirect_uri, state=state)

@app.route('/google/auth')
def google_auth():
    try:
        print("=== Google Auth Callback Started ===")
        
        expected_state = session.get('google_state')
        received_state = request.args.get('state')
        
        if expected_state and expected_state != received_state:
            return render_template('login.html', error="Security verification failed")
        
        token = google.authorize_access_token()
        user_info = google.userinfo()
        
        if not user_info:
            user_info = token.get('userinfo', {})
            if not user_info:
                import jwt
                id_token = token.get('id_token')
                if id_token:
                    user_info = jwt.decode(id_token, options={"verify_signature": False})
        
        email = user_info.get('email')
        if not email:
            return render_template('login.html', error="Could not get email from Google")
        
        name = user_info.get('name', email.split('@')[0])
        
        user = db.get_user(email)
        
        if not user:
            success, message = db.create_user(
                email=email,
                password='GOOGLE_AUTH_USER',
                name=name
            )
            if not success:
                return render_template('login.html', error=f"Failed to create user: {message}")
        
        session['user_email'] = email
        session['user_name'] = name
        session.permanent = True
        
        session.pop('google_state', None)
        
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        print(f"❌ Google auth error: {str(e)}")
        import traceback
        traceback.print_exc()
        return render_template('login.html', error=f"Google login failed: {str(e)}")

# ========== AUTH ROUTES ==========
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

# ========== PAGE ROUTES ==========
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

@app.route('/dev-login')
def dev_login():
    session['user_email'] = 'dev@test.com'
    session['user_name'] = 'Developer'
    session.permanent = True
    return redirect(url_for('dashboard'))

# ========== UTILITY ROUTES ==========
@app.route('/test-ocr')
def test_ocr():
    """Simple route to test OCR.space connection"""
    if not OCR_SPACE_API_KEY:
        return "❌ OCR.space API key not configured in .env"
    return "✅ OCR.space API key is configured!"

if __name__ == '__main__':
    print("🚀 Tax Advisor - Phase 4 with OCR.space")
    print(f"OCR.space API Key: {'✅ Configured' if OCR_SPACE_API_KEY else '❌ Not configured'}")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)