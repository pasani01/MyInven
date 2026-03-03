from rest_framework import serializers
from .models import CustomUser, Company, Conversation, Message
from django.contrib.auth import authenticate

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'company']

    def validate(self, data):
        username = data.get('username')
        company = data.get('company')
        
        # Güncelleme (PUT/PATCH) durumunda mevcut instance'ı hariç tut
        instance = self.instance
        qs = CustomUser.objects.filter(username=username, company=company)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        
        if qs.exists():
            raise serializers.ValidationError(
                {"username": f"Bu şirkette '{username}' kullanıcı adı zaten mevcut."}
            )
        return data

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    company_token = serializers.CharField()

    def validate(self, data):
        # Önce company_token'ı doğrula
        try:
            company = Company.objects.get(company_id=data['company_token'], is_active=True)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Geçersiz şirket linki")

        # O şirketteki kullanıcıyı bul
        try:
            user_obj = CustomUser.objects.get(username=data['username'], company=company)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Kullanıcı adı veya şifre hatalı")

        # Şifreyi kontrol et
        if not user_obj.check_password(data['password']):
            raise serializers.ValidationError("Kullanıcı adı veya şifre hatalı")

        if not user_obj.is_active:
            raise serializers.ValidationError("Kullanıcı pasif")

        data['user'] = user_obj
        return data

# message serializers
class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'sender_role', 'text', 'created_at', 'is_read', 'attachment']
        read_only_fields = ['sender', 'created_at', 'is_read']

class ConversationSerializer(serializers.ModelSerializer):
    participants = CustomUserSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'messages', 'created_at']