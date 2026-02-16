import os
import base64
import io
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
from database import db

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# CRITICAL: Ensure SECRET_KEY in .env is a long, unique, non-placeholder value
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- CORRECTED MODEL SELECTION ---
def find_best_vision_model():
    """Find the best available Gemini vision model by prioritizing current models."""
    
    # Prioritized list of known multimodal models (gemini-1.5-flash is preferred)
    PREFERRED_MODEL_NAMES = [
        'gemini-1.5-flash',
        'gemini-pro-vision',
        'gemini-pro'
    ]

    try:
        models = genai.list_models()
        
        print("📋 Available models:")
        
        # Filter for models that support content generation
        available_model_names = [
            m.name for m in models 
            if 'generateContent' in m.supported_generation_methods
        ]
        
        for name in available_model_names:
            print(f"  - {name}")

        # Search for the first available preferred model
        for preferred in PREFERRED_MODEL_NAMES:
            for available_name in available_model_names:
                # Use a simple string search to find the full model path
                if preferred in available_name:
                    print(f"✅ Selected model: {available_name}")
                    return available_name 
        
        print("⚠️ Warning: No suitable vision model found")
        return None
        
    except Exception as e:
        print(f"❌` Error finding model: {e}")
        return None

# -----------------
# CORE NAVIGATION
# -----------------

@app.route('/')
def index():
    """Main page - redirect to login or dashboard"""
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    """Login page"""
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    """Payslip Analyzer dashboard page - requires authentication"""
    if 'user_email' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', user_name=session.get('user_name', 'User'))

@app.route('/tax-bot')
def tax_bot():
    """Tax advisory chatbot page (CRITICALLY CORRECTED TEMPLATE NAME)"""
    if 'user_email' not in session:
        return redirect(url_for('login'))
    # FIX: Renders 'tax-bot.html' (hyphen) to match the uploaded file name
    return render_template('tax-bot.html', user_name=session.get('user_name', 'User'))
# -----------------
# AUTHENTICATION APIs
# -----------------

@app.route('/api/signup', methods=['POST'])
def api_signup():
    """Sign up a new user"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        
        if not email or not password or not name:
            return jsonify({"error": "Missing required fields"}), 400
        
        user = db.create_user(email, password, name)
        
        # Auto-login after signup
        session['user_email'] = email
        session['user_name'] = name
        
        return jsonify({
            "success": True,
            "message": "Account created successfully",
            "user": {"email": email, "name": name}
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"error": "Signup failed"}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    """Log in an existing user"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400
        
        if not db.verify_user(email, password):
            return jsonify({"error": "Invalid email or password"}), 401
        
        user = db.get_user(email)
        
        # Prevent crash if user verification succeeded but user object is missing/corrupt
        if not user:
             return jsonify({"error": "User found but profile data is missing"}), 500
        
        # Set session
        session['user_email'] = email
        session['user_name'] = user['name']
        
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {"email": email, "name": user['name']}
        })
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Log out the current user"""
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route('/api/check-session', methods=['GET'])
def api_check_session():
    """Check if user has active session"""
    if 'user_email' in session:
        return jsonify({
            "authenticated": True,
            "user": {
                "email": session['user_email'],
                "name": session['user_name']
            }
        })
    return jsonify({"authenticated": False})

# -----------------
# PAYSLIP & CORE APIs
# -----------------

@app.route('/api/test-gemini', methods=['GET'])
def api_test_gemini():
    """Test Gemini API connection and find best model"""
    if not GEMINI_API_KEY:
        return jsonify({"success": False, "error": "GEMINI_API_KEY not configured"}), 500
    
    try:
        model_name = find_best_vision_model()
        
        if not model_name:
            return jsonify({
                "success": False,
                "error": "No suitable vision model found"
            }), 500
        
        # Test the model with a simple request
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hello")
        
        print(f"✅ Gemini API test successful with model: {model_name}")
        
        return jsonify({
            "success": True,
            "message": "API key is valid",
            "model": model_name
        })
    except Exception as e:
        print(f"❌ Gemini test failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/payslip-history', methods=['GET'])
def api_payslip_history():
    """Returns a list of payslips uploaded by the current user."""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        payslips = db.get_user_payslips(user_email)
        
        # Sort by latest uploaded_at date
        payslips.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
        
        return jsonify({
            "success": True,
            "payslips": payslips
        })
    except Exception as e:
        print(f"Error loading payslip history: {e}")
        return jsonify({"success": False, "error": "Failed to load history"}), 500

@app.route('/api/payslip/<payslip_id>', methods=['DELETE'])
def api_delete_payslip(payslip_id):
    """Delete a payslip from history"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        data = db._load()
        
        if user_email in data["payslips"]:
            # Find and remove the payslip
            data["payslips"][user_email] = [
                payslip for payslip in data["payslips"][user_email] 
                if payslip["id"] != payslip_id
            ]
            db._save(data)
        
        return jsonify({
            "success": True,
            "message": "Payslip deleted successfully"
        })
    except Exception as e:
        print(f"Error deleting payslip: {e}")
        return jsonify({"success": False, "error": "Failed to delete payslip"}), 500

@app.route('/api/extract-payslip', methods=['POST'])
def api_extract_payslip():
    """Extract data from payslip image using Gemini Vision and save to history."""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not configured"}), 500
    
    try:
        data = request.json
        image_data = data.get('image')
        filename = data.get('filename', 'payslip.jpg')
        
        if not image_data:
            return jsonify({"error": "No image provided"}), 400
        
        user_email = session['user_email']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        print(f"📤 Processing image for user {user_email}: {filename}")
        
        model_name = find_best_vision_model()
        if not model_name:
            return jsonify({"error": "No suitable vision model available"}), 500
        
        model = genai.GenerativeModel(model_name)
        
        # Prompt for structured JSON extraction
        prompt = """Analyze this payslip or bank statement image and extract the following information in JSON format:

{
  "name": "Employee/Account holder full name",
  "income": "Total salary/income amount (number only)",
  "employer": "Company/Employer/Bank name",
  "date": "Pay date or statement date",
  "payPeriod": "Pay period (e.g., 'January 2024', 'Monthly')",
  "deductions": "Total deductions amount (number only)",
  "netPay": "Net pay/take-home amount (number only)"
}

Extract only the information you can clearly see. If a field is not visible, use null.
Return ONLY valid JSON, no additional text."""
        
        response = model.generate_content([prompt, image])
        response_text = response.text.strip()
        
        # Clean up markdown block if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        extracted_data = json.loads(response_text)
        
        print(f"✅ Successfully extracted data for user: {user_email}")
        
        # Save to database
        payslip_id = db.save_payslip(user_email, filename, extracted_data)
        
        # Update user's tax profile with the latest income detected
        # Note: This is an aggregation logic that should be handled carefully.
        # Here we assume the payslip income is gross and update the profile
        income_value = float(extracted_data.get('income', 0) or 0)
        db.update_tax_profile(user_email, {"total_income": income_value})


        return jsonify({
            "success": True,
            "data": extracted_data,
            "payslipId": payslip_id
        })
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        response_text_snippet = response_text[:200] if 'response_text' in locals() else "Empty response"
        print(f"   Response was: {response_text_snippet}")
        return jsonify({"error": f"Failed to parse AI response. Debugging snippet: {response_text_snippet}"}), 500
    except Exception as e:
        print(f"❌ Extract error: {e}")
        return jsonify({"error": f"Extraction failed: {str(e)}"}), 500

# -----------------
# TAX BOT APIS
# -----------------

@app.route('/api/tax/profile', methods=['GET'])
def api_get_tax_profile():
    """Get user tax profile"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        tax_profile = db.get_tax_profile(user_email)
        return jsonify({
            "success": True,
            "tax_profile": tax_profile
        })
    except Exception as e:
        print(f"Error getting tax profile: {e}")
        return jsonify({"success": False, "error": "Failed to get tax profile"}), 500

@app.route('/api/tax/update-income', methods=['POST'])
def api_update_income():
    """Update user income manually or from payslips"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        data = request.json
        income = data.get('income', 0)
        
        tax_profile = db.update_tax_profile(user_email, {"total_income": income})
        
        return jsonify({
            "success": True,
            "message": "Income updated successfully",
            "tax_profile": tax_profile
        })
    except Exception as e:
        print(f"Error updating income: {e}")
        return jsonify({"success": False, "error": "Failed to update income"}), 500

@app.route('/api/tax/update-deduction', methods=['POST'])
def api_update_deduction():
    """Update specific tax deduction (e.g., 80C)"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        data = request.json
        section = data.get('section')
        amount = data.get('amount', 0)
        
        if not section:
            return jsonify({"error": "Missing section"}), 400
        
        # Update the specific deduction
        updates = {
            "deductions": {
                section: float(amount)
            }
        }
        
        tax_profile = db.update_tax_profile(user_email, updates)
        
        return jsonify({
            "success": True,
            "message": f"{section} deduction updated successfully",
            "tax_profile": tax_profile
        })
    except Exception as e:
        print(f"Error updating deduction: {e}")
        return jsonify({"success": False, "error": "Failed to update deduction"}), 500

@app.route('/api/tax/calculate', methods=['POST'])
def api_calculate_tax():
    """Calculate final tax based on Indian tax laws"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        tax_profile = db.get_tax_profile(user_email)
        
        # Calculate taxable income (Indian tax rules for FY 2023-24 - Old Regime)
        total_income = tax_profile.get('total_income', 0)
        deductions = tax_profile.get('deductions', {})
        
        # Calculate total deductions under Section 80C (max 1.5 lakh)
        deduction_80c = min(deductions.get('80C', 0), 150000)
        
        # Calculate total deductions
        total_deductions = (
            deduction_80c +
            deductions.get('80D', 0) + 
            deductions.get('80G', 0) +  
            deductions.get('80E', 0) +  
            deductions.get('HRA', 0) +  
            deductions.get('LTA', 0) +  
            deductions.get('professional_tax', 0) +
            deductions.get('standard_deduction', 50000)
        )
        
        # Calculate taxable income
        taxable_income = max(0, total_income - total_deductions)
        
        # Calculate tax as per Indian tax slabs (Old Regime)
        tax_payable = calculate_indian_tax(taxable_income)
        
        # Update tax profile with calculation
        updates = {
            "taxable_income": taxable_income,
            "total_deductions": total_deductions,
            "final_tax_payable": tax_payable,
            "tax_calculated": True
        }
        tax_profile = db.update_tax_profile(user_email, updates)
        
        return jsonify({
            "success": True,
            "tax_calculation": {
                "total_income": total_income,
                "total_deductions": total_deductions,
                "taxable_income": taxable_income,
                "tax_payable": tax_payable,
                "effective_tax_rate": (tax_payable / total_income * 100) if total_income > 0 else 0
            },
            "tax_profile": tax_profile
        })
    except Exception as e:
        print(f"❌ Tax calculation error: {e}")
        return jsonify({"success": False, "error": "Tax calculation failed"}), 500

def calculate_indian_tax(taxable_income):
    """Calculate Indian income tax as per old regime slabs (FY 2023-24)"""
    if taxable_income <= 250000:
        return 0
    elif taxable_income <= 500000:
        # 5% on income between 2.5L and 5L
        return (taxable_income - 250000) * 0.05
    elif taxable_income <= 1000000:
        # 12500 (tax on 5L) + 20% on income between 5L and 10L
        return 12500 + (taxable_income - 500000) * 0.20
    else:
        # 112500 (tax on 10L) + 30% on income above 10L
        return 112500 + (taxable_income - 1000000) * 0.30

@app.route('/api/tax/documents', methods=['GET'])
def api_get_tax_documents():
    """Get user's verified tax documents"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_email = session['user_email']
        data = db._load()
        documents = data["tax_documents"].get(user_email, [])
        
        return jsonify({
            "success": True,
            "documents": documents
        })
    except Exception as e:
        print(f"Error getting tax documents: {e}")
        return jsonify({"success": False, "error": "Failed to get tax documents"}), 500

@app.route('/api/tax/verify-document', methods=['POST'])
def api_verify_document():
    """Verify tax document using Gemini AI (e.g., 80C proof)"""
    if 'user_email' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not configured"}), 500
    
    try:
        data = request.json
        image_data = data.get('image')
        filename = data.get('filename', 'document.jpg')
        document_type = data.get('document_type')
        
        if not image_data or not document_type:
            return jsonify({"error": "Missing required fields"}), 400
        
        user_email = session['user_email']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Find best model
        model_name = find_best_vision_model()
        if not model_name:
            return jsonify({"error": "No suitable vision model available"}), 500
        
        model = genai.GenerativeModel(model_name)
        
        # Prepare the prompt based on document type
        prompts = {
            "80C": """Analyze this investment document and extract the following information in JSON format:
            {
                "document_type": "Identify if this is for PPF, ELSS, NSC, Tax-saving FD, Life Insurance Premium, EPF, Sukanya Samriddhi, etc.",
                "amount": "Investment amount (number only)",
                "valid_for_80C": true/false,
                "verification_confidence": "High/Medium/Low"
            }
            Return ONLY valid JSON, no additional text.""",
            
            "80D": """Analyze this health insurance document and extract the following information in JSON format:
            {
                "document_type": "Health Insurance Premium",
                "amount": "Premium amount paid (number only)",
                "valid_for_80D": true/false,
                "verification_confidence": "High/Medium/Low"
            }
            Return ONLY valid JSON, no additional text.""",
            
            "HRA": """Analyze this rent receipt or rental agreement and extract the following information in JSON format:
            {
                "document_type": "Rent Receipt/Rental Agreement",
                "rent_amount": "Monthly rent amount (number only)",
                "valid_for_HRA": true/false,
                "verification_confidence": "High/Medium/Low"
            }
            Return ONLY valid JSON, no additional text."""
        }
        
        prompt = prompts.get(document_type, prompts["80C"])
        response = model.generate_content([prompt, image])
        response_text = response.text.strip()
        
        # Clean up markdown block if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        verification_result = json.loads(response_text)
        
        # Extract verification flags and amount for storage
        verified = verification_result.get('valid_for_80C', verification_result.get('valid_for_80D', verification_result.get('valid_for_HRA', False)))
        amount = verification_result.get('amount', verification_result.get('rent_amount', 0))
        
        doc_id = db.save_tax_document(user_email, document_type, filename, verified, amount)
        
        return jsonify({
            "success": True,
            "verification_result": verification_result,
            "document_id": doc_id
        })
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return jsonify({"error": "Failed to parse AI response"}), 500
    except Exception as e:
        print(f"❌ Document verification error: {e}")
        return jsonify({"error": f"Document verification failed: {str(e)}"}), 500


# Run the app
if __name__ == '__main__':
    print("🚀 Starting Payslip Analyzer...")
    
    if GEMINI_API_KEY:
        model = find_best_vision_model()
        if model:
            print(f"🎯 Will use model: {model}")
        else:
            print("⚠️  Warning: No suitable vision model found")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
