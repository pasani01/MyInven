from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser, Company
from .serializers import CustomUserSerializer, CompanySerializer,UserLoginSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token


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
    permission_classes = [permissions.AllowAny]  # login için izin var
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Token oluştur veya al
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'role': user.role,
            'company_id': user.company.company_id if user.company else None
        })


class UserLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        request.user.auth_token.delete()  # token iptal
        return Response({"detail": "Başarıyla çıkış yapıldı."}, status=status.HTTP_200_OK)