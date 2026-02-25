
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = os.environ.get('SUPER_USERNAME', 'admin')
email    = os.environ.get('SUPER_EMAIL', 'admin@admin.com')
password = os.environ.get('SUPER_PASSWORD', 'Admin1234!')

if User.objects.filter(email=email).exists():
    u = User.objects.get(email=email)
    u.role = 'superadmin'
    u.is_email_verified = True  # ekle
    u.set_password(password)
    u.save()
    print(f"User with email '{email}' updated to superadmin.")
else:
    u = User(username=username, email=email, role='superadmin')
    u.is_email_verified = True  # ekle
    u.set_password(password)
    u.save()
    print(f"Superuser with email '{email}' created successfully!")
