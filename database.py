import json
import os
import hashlib
import secrets
from datetime import datetime

class Database:
    def __init__(self, db_file="database.json"):
        self.db_file = db_file
        self._init_db()
    
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
            return 'GOOGLE_AUTH_USER'  # Special marker for Google users
        salt = secrets.token_hex(8)
        hash_obj = hashlib.sha256((password + salt).encode())
        return salt + ":" + hash_obj.hexdigest()
    
    def _verify_password(self, password, stored_hash):
        """Check if password matches hash"""
        if stored_hash == 'GOOGLE_AUTH_USER':
            return False  # Google users can't login with password
        try:
            salt, hash_value = stored_hash.split(":")
            hash_obj = hashlib.sha256((password + salt).encode())
            return hash_obj.hexdigest() == hash_value
        except:
            return False
    
    def create_user(self, email, password, name):
        """Save new user"""
        data = self._load()
        
        # Check if user exists
        if email in data["users"]:
            return False, "User already exists"
        
        # Save user with hashed password
        data["users"][email] = {
            "email": email,
            "password": self._hash_password(password),
            "name": name,
            "created_at": datetime.now().isoformat(),
            "auth_type": "google" if password == 'GOOGLE_AUTH_USER' else "local",
            "financial_data": {}  # Initialize empty financial data
        }
        
        self._save(data)
        return True, "User created successfully"
    
    def verify_user(self, email, password):
        """Check if login is correct"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        user = data["users"][email]
        
        # Check if Google user
        if user.get('auth_type') == 'google':
            return False, "Please login with Google"
        
        if self._verify_password(password, user["password"]):
            return True, user["name"]
        
        return False, "Wrong password"
    
    def get_user(self, email):
        """Get user details"""
        data = self._load()
        return data["users"].get(email)
    
    def is_google_user(self, email):
        """Check if user registered via Google"""
        user = self.get_user(email)
        return user and user.get('auth_type') == 'google'
    
    # ========== PHASE 5 - FINANCIAL DATA STORAGE ==========
    
    def save_monthly_record(self, email, month_data):
        """Save monthly financial record for user"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        # Get month and year from data
        month_key = month_data.get("month")
        if not month_key:
            return False, "Month not specified"
        
        # Initialize financial_data if not exists
        if "financial_data" not in data["users"][email]:
            data["users"][email]["financial_data"] = {}
        
        # Store monthly record with all details
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
            "timestamp": datetime.now().isoformat()
        }
        
        self._save(data)
        return True, "Monthly record saved"
    
    def get_user_monthly_data(self, email, month=None):
        """Get monthly data for user - returns all months or specific month"""
        data = self._load()
        
        if email not in data["users"]:
            return {} if month else []
        
        financial_data = data["users"][email].get("financial_data", {})
        
        if month:
            return financial_data.get(month, {})
        
        return financial_data
    
    def get_user_yearly_summary(self, email, financial_year=None):
        """Get yearly summary for user - calculates totals from all months"""
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
        
        # If financial_year specified, filter months containing that year
        for month_key, data in monthly_data.items():
            if financial_year and financial_year not in month_key:
                continue
                
            summary["total_income"] += data.get("income", 0)
            summary["total_tax_paid"] += data.get("tax_paid", 0)
            summary["total_deductions"] += data.get("deductions", 0)
            
            # Sum up investments
            investments = data.get("investments", {})
            summary["total_investments"] += sum(investments.values())
            
            summary["months_tracked"] += 1
            summary["monthly_breakdown"].append({
                "month": month_key,
                "income": data.get("income", 0),
                "tax_paid": data.get("tax_paid", 0),
                "deductions": data.get("deductions", 0)
            })
        
        return summary
    
    def update_monthly_investments(self, email, month, investment_data):
        """Update investment data for a specific month"""
        data = self._load()
        
        if email not in data["users"]:
            return False, "User not found"
        
        if "financial_data" not in data["users"][email] or month not in data["users"][email]["financial_data"]:
            return False, "Month data not found"
        
        # Update investments
        if "investments" not in data["users"][email]["financial_data"][month]:
            data["users"][email]["financial_data"][month]["investments"] = {}
        
        for key, value in investment_data.items():
            data["users"][email]["financial_data"][month]["investments"][key] = value
        
        self._save(data)
        return True, "Investments updated"
    
    def get_all_months_list(self, email):
        """Get list of all months user has data for"""
        monthly_data = self.get_user_monthly_data(email)
        return sorted(monthly_data.keys())

# Create global database instance
db = Database()