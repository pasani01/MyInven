# user_app/serializers.py
from rest_framework import serializers
from .models import CustomUser, Company

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'company', 'is_staff', 'is_superuser']
        read_only_fields = ['is_staff', 'is_superuser']

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name']
