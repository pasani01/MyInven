from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
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


class IsAdminRole(permissions.BasePermission):
    """Admin va superadmin role ga ruxsat (create, update, delete uchun)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # GET (ko'rish) barchaga ruxsat
        if request.method in permissions.SAFE_METHODS:
            return True
        # Yozish (POST, PUT, DELETE) — admin yoki superadmin
        return request.user.role in ('admin', 'superadmin')


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CustomUser.objects.none()
        user = self.request.user

        # Superadmin barcha foydalanuvchilarni ko'ra oladi
        if user.role == 'superadmin':
            return CustomUser.objects.exclude(role='superadmin')

        # Admin va oddiy userlar — o'z kompaniyadagi barcha userlarni ko'radi
        # (superadminlardan tashqari)
        if user.company:
            return CustomUser.objects.filter(
                company=user.company
            ).exclude(role='superadmin')

        # Kompaniyasiz user — faqat o'zini ko'radi
        return CustomUser.objects.filter(id=user.id)

    def perform_create(self, serializer):
        # Yangi user avtomatik admin kompaniyasiga biriktiriladi
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not user.check_password(current_password):
            return Response({"detail": "Joriy parol noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Parol muvaffaqiyatli o'zgartirildi"}, status=status.HTTP_200_OK)


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

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": getattr(user, 'role', 'user'),
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