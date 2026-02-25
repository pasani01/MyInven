from rest_framework.views import APIView
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate
from .models import CustomUser, Company
from .serializers import CustomUserSerializer, CompanySerializer, UserLoginSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ('admin', 'superadmin')


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CustomUser.objects.none()
        user = self.request.user

        if user.role == 'superadmin':
            return CustomUser.objects.exclude(role='superadmin')

        if user.company:
            return CustomUser.objects.filter(
                company=user.company
            ).exclude(role='superadmin')

        return CustomUser.objects.filter(id=user.id)

    def perform_create(self, serializer):
        company = self.request.user.company
        username = self.request.data.get('username')
        password = self.request.data.get('password')

        if CustomUser.objects.filter(username=username, company=company).exists():
            raise ValidationError(
                {"username": f"Bu şirkette '{username}' kullanıcı adı zaten mevcut."}
            )

        # Şifreyi hash'leyerek kaydet
        user = serializer.save(company=company)
        if password:
            user.set_password(password)
            user.save()

    def perform_update(self, serializer):
        company = self.request.user.company
        username = self.request.data.get('username')
        password = self.request.data.get('password')
        instance = self.get_object()

        if username and CustomUser.objects.filter(
            username=username, company=company
        ).exclude(pk=instance.pk).exists():
            raise ValidationError(
                {"username": f"Bu şirkette '{username}' kullanıcı adı zaten mevcut."}
            )

        user = serializer.save()
        # Güncelleme sırasında da şifre geldiyse hash'le
        if password:
            user.set_password(password)
            user.save()

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not user.check_password(current_password):
            return Response({"detail": "Mevcut şifre hatalı"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Şifre başarıyla değiştirildi"}, status=status.HTTP_200_OK)


class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, company_token):
        username = request.data.get("username")
        password = request.data.get("password")

        try:
            company = Company.objects.get(company_id=company_token, is_active=True)
        except Company.DoesNotExist:
            return Response({"detail": "Geçersiz şirket linki"}, status=status.HTTP_404_NOT_FOUND)

        try:
            user = CustomUser.objects.get(username=username, company=company)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Kullanıcı adı veya şifre hatalı"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"detail": "Kullanıcı adı veya şifre hatalı"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({"detail": "Kullanıcı pasif"}, status=status.HTTP_400_BAD_REQUEST)

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "company": user.company_id,
                "company_name": user.company.name,
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