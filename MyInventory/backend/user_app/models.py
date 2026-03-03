from django.db import models
from django.contrib.auth.models import AbstractUser
import string
import random

def generate_company_id(length=16):
    chars = string.ascii_letters + string.digits
    while True:
        new_id = ''.join(random.choice(chars) for _ in range(length))
        if not Company.objects.filter(company_id=new_id).exists():
            return new_id

class Company(models.Model):
    company_id = models.CharField(max_length=20, unique=True, default=generate_company_id, editable=False)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.company_id})"

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    company = models.ForeignKey('Company', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        # Aynı şirkette aynı username olamaz, farklı şirkette olabilir
        unique_together = ('username', 'company')

    def save(self, *args, **kwargs):
        if self.role == 'superadmin':
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

class UserSettings(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    dark_mode = models.BooleanField(default=False)
    language = models.CharField(max_length=10, default='en')
    fone_color = models.IntegerField(default=0)

    def __str__(self):
        return f"Settings for {self.user.username}"


# message model
class Conversation(models.Model):
    participants = models.ManyToManyField(CustomUser, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Conversation {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(CustomUser, related_name='sent_messages', on_delete=models.CASCADE)
    text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)    
    is_read = models.BooleanField(default=False)
    
    # opsiyonel: dosya veya resim desteği
    attachment = models.FileField(upload_to='attachments/', blank=True, null=True)

    def __str__(self):
        return f"Message {self.id} by {self.sender.username}"