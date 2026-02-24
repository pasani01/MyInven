import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = os.environ.get('SUPER_USERNAME', 'admin')
email    = os.environ.get('SUPER_EMAIL', 'admin@admin.com')
password = os.environ.get('SUPER_PASSWORD', 'Admin1234!')

if User.objects.filter(username=username).exists():
    u = User.objects.get(username=username)
    u.role = 'superadmin'  # ← save() otomatik is_staff ve is_superuser=True yapar
    u.set_password(password)
    u.save()
    print(f"User '{username}' updated to superadmin.")
else:
    u = User(username=username, email=email, role='superadmin')
    u.set_password(password)
    u.save()
    print(f"Superuser '{username}' created successfully!")