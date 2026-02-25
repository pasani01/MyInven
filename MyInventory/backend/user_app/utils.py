import secrets
from django.core.mail import send_mail
from django.conf import settings

def send_verification_email(user):
    token = secrets.token_urlsafe(32)
    user.email_verification_token = token
    user.save()

    verification_url = f"{settings.FRONTEND_URL}/verify-email/?token={token}"

    send_mail(
        subject="Email Doğrulama",
        message=f"Hesabınızı doğrulamak için tıklayın: {verification_url}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )