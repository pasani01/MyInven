"""
One-time superuser creation script.
Run: python create_super.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = os.environ.get('SUPER_USERNAME', 'admin')
email = os.environ.get('SUPER_EMAIL', 'admin@admin.com')
password = os.environ.get('SUPER_PASSWORD', 'Admin1234!')

if User.objects.filter(username=username).exists():
    print(f"User '{username}' already exists.")
else:
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Superuser '{username}' created successfully!")
