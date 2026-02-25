import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = os.environ.get('SUPER_USERNAME', 'admin')
email    = os.environ.get('SUPER_EMAIL', 'admin@admin.com')
password = os.environ.get('SUPER_PASSWORD', 'Admin1234!')

# username VEYA email ile ara
user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()

if user:
    user.username = username
    user.email = email
    user.role = 'superadmin'
    user.set_password(password)
    user.save()
    print(f"Superadmin '{username}' güncellendi.")
else:
    user = User(username=username, email=email, role='superadmin')
    user.set_password(password)
    user.save()
    print(f"Superadmin '{username}' oluşturuldu.")