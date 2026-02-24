from rest_framework import serializers
from .models import CustomUser, Company
from django.contrib.auth import authenticate

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class CustomUserSerializer(serializers.ModelSerializer):
    password_hash = serializers.SerializerMethodField(read_only=True)

    def get_password_hash(self, obj):
        return obj.password  # Django saqlangan hash (pbkdf2_sha256$...)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'company', 'password_hash']


from django.contrib.auth import authenticate
from rest_framework import serializers

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Geçersiz email veya şifre")
        
        user = authenticate(username=user.username, password=data['password'])
        if not user:
            raise serializers.ValidationError("Geçersiz email veya şifre")
        if not user.is_active:
            raise serializers.ValidationError("Kullanıcı pasif")

        data['user'] = user
        return data