import os
import json
import hashlib
import secrets
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

class Database:
    def __init__(self, db_file="database.json"):
        self.db_file = db_file
        self.db_url = os.getenv('DATABASE_URL')
        
        if self.db_url:
            # Use PostgreSQL on Render
            self.init_postgres()
            print("✅ Using PostgreSQL database (production)")
        else:
            # Fallback to SQLite for local development
            self._init_db()
            print("📁 Using SQLite database (local)")
    
    # ========== POSTGRESQL METHODS ==========
    
    def init_postgres(self):
        """Initialize PostgreSQL tables"""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            
            # Create users table with JSON field for financial_data
            cur.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    email TEXT PRIMARY KEY,
                    password TEXT,
                    name TEXT,
                    auth_type TEXT,
                    created_at TIMESTAMP,
                    financial_data JSONB DEFAULT '{}'::jsonb
                )
            ''')
            
            conn.commit()
            cur.close()
            conn.close()
            print("✅ PostgreSQL tables created successfully")
            
        except Exception as e:
            print(f"❌ PostgreSQL initialization error: {e}")
    
    def create_user(self, email, password, name):
        """Save new user to PostgreSQL"""
        if self.db_url:
            try:
                conn = psycopg2.connect(self.db_url)
                cur = conn.cursor()
                
                # Check if user exists
                cur.execute('SELECT email FROM users WHERE email = %s', (email,))
                if cur.fetchone():
                    cur.close()
                    conn.close()
                    return False, "User already exists"
                
                # Insert new user with empty financial_data
                cur.execute('''
                    INSERT INTO users (email, password, name, auth_type, created_at, financial_data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                ''', (
                    email,
                    self._hash_password(password),
                    name,
                    'google' if password == 'GOOGLE_AUTH_USER' else 'local',
                    datetime.now(),
                    json.dumps({})  # Empty JSON object for financial_data
                ))
                
                conn.commit()
                cur.close()
                conn.close()
                return True, "User created successfully"
                
            except Exception as e:
                print(f"❌ PostgreSQL create user error: {e}")
                return False, str(e)
        else:
            # SQLite version
            return self.create_user_sqlite(email, password, name)
    
    def get_user(self, email):
        """Get user details"""
        if self.db_url:
            try:
                conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
                cur = conn.cursor()
                
                cur.execute('SELECT * FROM users WHERE email = %s', (email,))
                user = cur.fetchone()
                cur.close()
                conn.close()
                
                if user:
                    # Convert to dict and parse JSON
                    user_dict = dict(user)
                    if user_dict.get('financial_data'):
                        # If it's already a dict, use it; otherwise parse
                        if isinstance(user_dict['financial_data'], str):
                            user_dict['financial_data'] = json.loads(user_dict['financial_data'])
                    return user_dict
                return None
                
            except Exception as e:
                print(f"❌ PostgreSQL get user error: {e}")
                return None
        else:
            return self.get_user_sqlite(email)
    
    def verify_user(self, email, password):
        """Check if login is correct"""
        if self.db_url:
            user = self.get_user(email)
            if not user:
                return False, "User not found"
            
            if user.get('auth_type') == 'google':
                return False, "Please login with Google"
            
            if self._verify_password(password, user["password"]):
                return True, user["name"]
            
            return False, "Wrong password"
        else:
            return self.verify_user_sqlite(email, password)
    
    # ========== FINANCIAL DATA METHODS (KEEPING YOUR STRUCTURE) ==========
    
    def save_monthly_record(self, email, month_data):
        """Save monthly financial record for user - KEEPS YOUR JSON STRUCTURE"""
        if self.db_url:
            try:
                conn = psycopg2.connect(self.db_url)
                cur = conn.cursor()
                
                # Get current user data
                user = self.get_user(email)
                if not user:
                    return False, "User not found"
                
                # Get existing financial_data or create new
                financial_data = user.get('financial_data', {})
                if not isinstance(financial_data, dict):
                    financial_data = {}
                
                # Get month key
                month_key = month_data.get("month")
                if not month_key:
                    return False, "Month not specified"
                
                # Calculate financial year
                from app import calculate_financial_year
                financial_year = calculate_financial_year(month_key)
                
                # Create month entry with EXACTLY your structure
                month_entry = {
                    "income": month_data.get("income", 0),
                    "employer": month_data.get("employer", ""),
                    "date": month_data.get("date", ""),
                    "deductions": month_data.get("deductions", 0),
                    "net_pay": month_data.get("net_pay", 0),
                    "hra": month_data.get("hra", {}),
                    "investments": {
                        "ppf": month_data.get("investments", {}).get("ppf", 0),
                        "elss": month_data.get("investments", {}).get("elss", 0),
                        "life_insurance": month_data.get("investments", {}).get("life_insurance", 0),
                        "nsc": month_data.get("investments", {}).get("nsc", 0)
                    },
                    "insurance": {
                        "self": month_data.get("insurance", {}).get("self", 0),
                        "parents": month_data.get("insurance", {}).get("parents", 0)
                    },
                    "tax_paid": month_data.get("tax_paid", 0),
                    "timestamp": datetime.now().isoformat(),
                    "financial_year": financial_year
                }
                
                # Add tax_analysis if present
                if 'tax_analysis' in month_data:
                    month_entry['tax_analysis'] = month_data['tax_analysis']
                
                # Update financial_data with new month
                financial_data[month_key] = month_entry
                
                # Save back to database
                cur.execute('''
                    UPDATE users 
                    SET financial_data = %s 
                    WHERE email = %s
                ''', (json.dumps(financial_data), email))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return True, "Monthly record saved"
                
            except Exception as e:
                print(f"❌ PostgreSQL save error: {e}")
                return False, str(e)
        else:
            return self.save_monthly_record_sqlite(email, month_data)
    
    def get_user_monthly_data(self, email, month=None):
        """Get monthly data - returns all months or specific month"""
        if self.db_url:
            user = self.get_user(email)
            if not user:
                return {} if month else []
            
            financial_data = user.get('financial_data', {})
            
            if month:
                return financial_data.get(month, {})
            
            return financial_data
        else:
            return self.get_user_monthly_data_sqlite(email, month)
    
    def get_user_yearly_summary(self, email, financial_year=None):
        """Get yearly summary - KEEPS YOUR LOGIC"""
        monthly_data = self.get_user_monthly_data(email)
        
        if not monthly_data:
            return {
                "total_income": 0,
                "total_tax_paid": 0,
                "total_deductions": 0,
                "total_investments": 0,
                "months_tracked": 0,
                "monthly_breakdown": []
            }
        
        summary = {
            "total_income": 0,
            "total_tax_paid": 0,
            "total_deductions": 0,
            "total_investments": 0,
            "months_tracked": 0,
            "monthly_breakdown": []
        }
        
        # Your exact filtering logic
        for month_key, data in monthly_data.items():
            month_fy = data.get('financial_year')
            if not month_fy:
                from app import calculate_financial_year
                month_fy = calculate_financial_year(month_key)
            
            if financial_year and month_fy != financial_year:
                continue
                
            summary["total_income"] += data.get("income", 0)
            summary["total_tax_paid"] += data.get("tax_paid", 0)
            summary["total_deductions"] += data.get("deductions", 0)
            
            investments = data.get("investments", {})
            summary["total_investments"] += sum(investments.values())
            
            summary["months_tracked"] += 1
            summary["monthly_breakdown"].append({
                "month": month_key,
                "income": data.get("income", 0),
                "tax_paid": data.get("tax_paid", 0),
                "deductions": data.get("deductions", 0),
                "financial_year": month_fy
            })
        
        return summary
    
    def get_available_financial_years(self, email):
        """Get list of all financial years - KEEPS YOUR LOGIC"""
        monthly_data = self.get_user_monthly_data(email)
        years = set()
        
        for month_key, data in monthly_data.items():
            fy = data.get('financial_year')
            if fy:
                years.add(fy)
            else:
                from app import calculate_financial_year
                fy = calculate_financial_year(month_key)
                if fy:
                    years.add(fy)
        
        return sorted(list(years), reverse=True)
    
    def get_all_months_list(self, email):
        """Get list of all months - KEEPS YOUR LOGIC"""
        monthly_data = self.get_user_monthly_data(email)
        return sorted(monthly_data.keys())
    
    def update_monthly_investments(self, email, month, investment_data):
        """Update investment data - KEEPS YOUR LOGIC"""
        if self.db_url:
            try:
                conn = psycopg2.connect(self.db_url)
                cur = conn.cursor()
                
                user = self.get_user(email)
                if not user:
                    return False, "User not found"
                
                financial_data = user.get('financial_data', {})
                
                if month not in financial_data:
                    return False, "Month data not found"
                
                if "investments" not in financial_data[month]:
                    financial_data[month]["investments"] = {}
                
                for key, value in investment_data.items():
                    financial_data[month]["investments"][key] = value
                
                cur.execute('''
                    UPDATE users 
                    SET financial_data = %s 
                    WHERE email = %s
                ''', (json.dumps(financial_data), email))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return True, "Investments updated"
                
            except Exception as e:
                print(f"❌ PostgreSQL update error: {e}")
                return False, str(e)
        else:
            return self.update_monthly_investments_sqlite(email, month, investment_data)
    
    def save_tax_analysis(self, email, month, answers, results):
        """Save tax analysis - KEEPS YOUR STRUCTURE"""
        if self.db_url:
            try:
                conn = psycopg2.connect(self.db_url)
                cur = conn.cursor()
                
                user = self.get_user(email)
                if not user:
                    return False
                
                financial_data = user.get('financial_data', {})
                
                if month not in financial_data:
                    financial_data[month] = {}
                
                from app import calculate_financial_year
                financial_year = calculate_financial_year(month)
                
                financial_data[month]["tax_analysis"] = {
                    "status": "completed",
                    "last_calculated": datetime.now().isoformat(),
                    "answers": answers,
                    "results": results,
                    "financial_year": financial_year
                }
                
                cur.execute('''
                    UPDATE users 
                    SET financial_data = %s 
                    WHERE email = %s
                ''', (json.dumps(financial_data), email))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return True
                
            except Exception as e:
                print(f"❌ PostgreSQL tax analysis save error: {e}")
                return False
        else:
            return self.save_tax_analysis_sqlite(email, month, answers, results)
    
    # ========== SQLITE METHODS (YOUR EXISTING CODE) ==========
    
    def _init_db(self):
        """Create database file if it doesn't exist"""
        if not os.path.exists(self.db_file):
            initial_data = {"users": {}}
            self._save(initial_data)
    
    def _load(self):
        """Load data from file"""
        try:
            with open(self.db_file, 'r') as f:
                return json.load(f)
        except:
            return {"users": {}}
    
    def _save(self, data):
        """Save data to file"""
        with open(self.db_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _hash_password(self, password):
        """Convert password to secure hash"""
        if password == 'GOOGLE_AUTH_USER':
            return 'GOOGLE_AUTH_USER'
        salt = secrets.token_hex(8)
        hash_obj = hashlib.sha256((password + salt).encode())
        return salt + ":" + hash_obj.hexdigest()
    
    def _verify_password(self, password, stored_hash):
        """Check if password matches hash"""
        if stored_hash == 'GOOGLE_AUTH_USER':
            return False
        try:
            salt, hash_value = stored_hash.split(":")
            hash_obj = hashlib.sha256((password + salt).encode())
            return hash_obj.hexdigest() == hash_value
        except:
            return False
    
    def create_user_sqlite(self, email, password, name):
        """Save new user to SQLite"""
        data = self._load()
        
        if email in data["users"]:
            return False, "User already exists"
        
        data["users"][email] = {
            "email": email,
            "password": self._hash_password(password),
            "name": name,
            "created_at": datetime.now().isoformat(),
            "auth_type": "google" if password == 'GOOGLE_AUTH_USER' else "local",
            "financial_data": {}
        }
        
        self._save(data)
        return True, "User created successfully"
    
    def verify_user_sqlite(self, email, password):
        """Check if login is correct for SQLite"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        user = data["users"][email]
        
        if user.get('auth_type') == 'google':
            return False, "Please login with Google"
        
        if self._verify_password(password, user["password"]):
            return True, user["name"]
        
        return False, "Wrong password"
    
    def get_user_sqlite(self, email):
        """Get user details from SQLite"""
        data = self._load()
        return data["users"].get(email)
    
    def save_monthly_record_sqlite(self, email, month_data):
        """Save monthly record to SQLite"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        month_key = month_data.get("month")
        if not month_key:
            return False, "Month not specified"
        
        if "financial_data" not in data["users"][email]:
            data["users"][email]["financial_data"] = {}
        
        from app import calculate_financial_year
        financial_year = calculate_financial_year(month_key)
        
        data["users"][email]["financial_data"][month_key] = {
            "income": month_data.get("income", 0),
            "employer": month_data.get("employer", ""),
            "date": month_data.get("date", ""),
            "deductions": month_data.get("deductions", 0),
            "net_pay": month_data.get("net_pay", 0),
            "hra": month_data.get("hra", {}),
            "investments": {
                "ppf": month_data.get("investments", {}).get("ppf", 0),
                "elss": month_data.get("investments", {}).get("elss", 0),
                "life_insurance": month_data.get("investments", {}).get("life_insurance", 0),
                "nsc": month_data.get("investments", {}).get("nsc", 0)
            },
            "insurance": {
                "self": month_data.get("insurance", {}).get("self", 0),
                "parents": month_data.get("insurance", {}).get("parents", 0)
            },
            "tax_paid": month_data.get("tax_paid", 0),
            "timestamp": datetime.now().isoformat(),
            "financial_year": financial_year
        }
        
        self._save(data)
        return True, "Monthly record saved"
    
    def get_user_monthly_data_sqlite(self, email, month=None):
        """Get monthly data from SQLite"""
        data = self._load()
        
        if email not in data["users"]:
            return {} if month else []
        
        financial_data = data["users"][email].get("financial_data", {})
        
        if month:
            return financial_data.get(month, {})
        
        return financial_data
    
    def update_monthly_investments_sqlite(self, email, month, investment_data):
        """Update investments in SQLite"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        if "financial_data" not in data["users"][email] or month not in data["users"][email]["financial_data"]:
            return False, "Month data not found"
        
        if "investments" not in data["users"][email]["financial_data"][month]:
            data["users"][email]["financial_data"][month]["investments"] = {}
        
        for key, value in investment_data.items():
            data["users"][email]["financial_data"][month]["investments"][key] = value
        
        self._save(data)
        return True, "Investments updated"
    
    def save_tax_analysis_sqlite(self, email, month, answers, results):
        """Save tax analysis to SQLite"""
        data = self._load()
        
        if email not in data["users"]:
            return False
        
        if "financial_data" not in data["users"][email]:
            data["users"][email]["financial_data"] = {}
        
        if month not in data["users"][email]["financial_data"]:
            data["users"][email]["financial_data"][month] = {}
        
        from app import calculate_financial_year
        financial_year = calculate_financial_year(month)
        
        data["users"][email]["financial_data"][month]["tax_analysis"] = {
            "status": "completed",
            "last_calculated": datetime.now().isoformat(),
            "answers": answers,
            "results": results,
            "financial_year": financial_year
        }
        
        self._save(data)
        return True

# Create global database instance
db = Database()