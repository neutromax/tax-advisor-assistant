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
            "auth_type": "google" if password == 'GOOGLE_AUTH_USER' else "local"
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

# Create global database instance
db = Database()