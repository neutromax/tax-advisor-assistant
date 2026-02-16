# Create and open app.py for editing
cat > app.py << 'EOF'
from flask import Flask, render_template, redirect, url_for
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-key-change-this')

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html', user_name="Guest")

@app.route('/tax-bot')
def tax_bot():
    return render_template('tax-bot.html', user_name="Guest")

if __name__ == '__main__':
    print("🚀 Tax Advisor Skeleton - Phase 1")
    app.run(debug=True, port=5000)
EOF