import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

class Database:
    """Simple JSON-based database for storing user data, payslip history, and tax information"""
    
    def __init__(self, db_file: str = "database.json"):
        self.db_file = db_file
        self._init_db()
    
    def _init_db(self):
        """Initialize database file if it doesn't exist"""
        if not os.path.exists(self.db_file):
            initial_data = {
                "users": {},
                "payslips": {},
                # CRITICAL ADDITIONS FOR TAX FUNCTIONALITY
                "tax_profiles": {},
                "tax_documents": {},
                "tax_sessions": {}
            }
            self._save(initial_data)
    
    def _load(self) -> Dict[str, Any]:
        """Load database from file. Handles missing new keys gracefully."""
        # Define the structure defaults we expect
        default_data = {
            "users": {},
            "payslips": {},
            "tax_profiles": {},
            "tax_documents": {},
            "tax_sessions": {}
        }
        
        try:
            with open(self.db_file, 'r') as f:
                data = json.load(f)
                
            # Ensure the loaded data has all required top-level keys.
            # This prevents the KeyError if the file was created by an older version.
            for key, default_value in default_data.items():
                if key not in data:
                    data[key] = default_value
            
            return data
            
        except (FileNotFoundError, json.JSONDecodeError):
            # If file is missing or corrupted, return the full set of defaults
            return default_data
        except Exception as e:
            print(f"Error loading database: {e}")
            return default_data
    
    def _save(self, data: Dict[str, Any]):
        """Save database to file"""
        try:
            with open(self.db_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving database: {e}")
    
    # User operations
    def get_user(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        data = self._load()
        return data["users"].get(email)
    
    def create_user(self, email: str, password: str, name: str) -> Dict[str, Any]:
        """Create a new user"""
        data = self._load()
        
        if email in data["users"]:
            raise ValueError("User already exists")
        
        user = {
            "email": email,
            "password": password,
            "name": name,
            "created_at": datetime.now().isoformat()
        }
        
        data["users"][email] = user
        self._save(data)
        return user
    
    def verify_user(self, email: str, password: str) -> bool:
        """Verify user credentials"""
        user = self.get_user(email)
        if not user:
            return False
        return user["password"] == password
    
    # Payslip operations
    def save_payslip(self, user_email: str, filename: str, extracted_data: Dict[str, Any]) -> str:
        """Save payslip data"""
        data = self._load()
        
        payslip_id = f"{user_email}_{datetime.now().timestamp()}"
        
        payslip = {
            "id": payslip_id,
            "user_email": user_email,
            "filename": filename,
            "extracted_data": extracted_data,
            "uploaded_at": datetime.now().isoformat()
        }
        
        if user_email not in data["payslips"]:
            data["payslips"][user_email] = []
        
        data["payslips"][user_email].append(payslip)
        self._save(data)
        return payslip_id
    
    def get_user_payslips(self, user_email: str) -> List[Dict[str, Any]]:
        """Get all payslips for a user"""
        data = self._load()
        return data["payslips"].get(user_email, [])
    
    # Tax profile operations
    def get_tax_profile(self, user_email: str) -> Dict[str, Any]:
        """Get user tax profile, creating a default if none exists."""
        data = self._load()
        if user_email not in data["tax_profiles"]:
            tax_profile = {
                "user_email": user_email,
                "total_income": 0,
                "deductions": {
                    "80C": 0,
                    "standard_deduction": 50000
                },
                "tax_calculated": False,
                "final_tax_payable": 0,
                "taxable_income": 0,
                "total_deductions": 50000,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            data["tax_profiles"][user_email] = tax_profile
            self._save(data)
        return data["tax_profiles"][user_email]
    
    def update_tax_profile(self, user_email: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user tax profile"""
        data = self._load()
        # Ensure profile exists before updating (critical check)
        if user_email not in data["tax_profiles"]:
            self.get_tax_profile(user_email)
            data = self._load() # Reload to get the new profile we just created
        
        
        # Update the profile with new values
        for key, value in updates.items():
            if key == 'deductions':
                # Merge deductions instead of replacing
                if 'deductions' not in data["tax_profiles"][user_email]:
                    data["tax_profiles"][user_email]['deductions'] = {}
                data["tax_profiles"][user_email]['deductions'].update(value)
            else:
                data["tax_profiles"][user_email][key] = value
        
        data["tax_profiles"][user_email]["updated_at"] = datetime.now().isoformat()
        self._save(data)
        return data["tax_profiles"][user_email]
    
    def save_tax_document(self, user_email: str, document_type: str, filename: str, 
                         verified: bool, amount: float) -> str:
        """Save tax document details"""
        data = self._load()
        
        doc_id = f"{user_email}_{document_type}_{datetime.now().timestamp()}"
        
        document = {
            "id": doc_id,
            "user_email": user_email,
            "document_type": document_type,
            "filename": filename,
            "verified": verified,
            "amount": float(amount) if amount else 0,
            "uploaded_at": datetime.now().isoformat()
        }
        
        if user_email not in data["tax_documents"]:
            data["tax_documents"][user_email] = []
        
        data["tax_documents"][user_email].append(document)
        self._save(data)
        return doc_id

# Global database instance
db = Database()
