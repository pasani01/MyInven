from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser, Company
from .serializers import CustomUserSerializer, CompanySerializer, UserLoginSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CustomUser.objects.none()
        user = self.request.user
        if user.role == 'admin':
            return CustomUser.objects.filter(company=user.company)
        return CustomUser.objects.none()

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)
        
        if user is None:
            return Response(
                {"detail": "Kullanıcı veya şifre yanlış"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ Token oluştur veya mevcut olanı getir
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            "token": token.key,          # ← Frontend bunu bekliyor
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": getattr(user, 'role', 'staff'),
                "company": getattr(user, 'company_id', None),
            }
        })


class UserLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({"detail": "Başarıyla çıkış yapıldı."}, status=status.HTTP_200_OK)