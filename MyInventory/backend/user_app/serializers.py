from rest_framework import serializers
from .models import CustomUser, Company
from django.contrib.auth import authenticate

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'company']


from django.contrib.auth import authenticate
from rest_framework import serializers

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            username=data['username'],
            password=data['password']
        )
        if not user:
            raise serializers.ValidationError("Geçersiz kullanıcı adı veya şifre")
        if not user.is_active:
            raise serializers.ValidationError("Kullanıcı pasif")

        data['user'] = user
        return data