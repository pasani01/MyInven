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


class IsAdminOrSelf(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # POST (Yangi foydalanuvchi yaratish) faqat adminlar uchun
        if request.method == 'POST':
            return request.user.role in ('admin', 'superadmin')
            
        return True

    def has_object_permission(self, request, view, obj):
        # Superadmin va Admin hamma amalni bajara oladi
        if request.user.role in ('admin', 'superadmin'):
            return True
            
        # O'qish (GET) hamma uchun ochiq (get_queryset orqali filtrlangan)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # DELETE (O'chirish) faqat adminlar uchun (yuqorida admin bo'lmasa True qaytmaydi)
        if request.method == 'DELETE':
            return False
            
        # Update (PUT/PATCH) faqat o'zi uchun ruxsat
        return obj == request.user


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSelf]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CustomUser.objects.none()
        user = self.request.user

        if user.role == 'superadmin':
            return CustomUser.objects.exclude(role='superadmin')

        # Eğer kullanıcının bir şirketi varsa, o şirketteki herkesi görsün (istek sahibi admin olmasa bile)
        if user.company:
            return CustomUser.objects.filter(
                company=user.company
            ).exclude(role='superadmin')

        # Şirketi yoksa sadece kendisini görsün
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
        user = self.request.user
        company = user.company
        username = self.request.data.get('username')
        password = self.request.data.get('password')
        role = self.request.data.get('role')
        company_data = self.request.data.get('company')
        instance = self.get_object()

        # Rol ve şirket değişikliği sadece admin/superadmin tarafından yapılabilir
        # Veya en azından kullanıcı kendi rolünü yükseltemez
        if user.role not in ('admin', 'superadmin'):
            if role and role != instance.role:
                raise ValidationError({"detail": "Senda ro'xsat yo'q (Rolni o'zgartira olmaysiz)"})
            if company_data and int(company_data) != instance.company_id:
                raise ValidationError({"detail": "Senda ro'xsat yo'q (Şirketni o'zgartira olmaysiz)"})

        if username and CustomUser.objects.filter(
            username=username, company=company
        ).exclude(pk=instance.pk).exists():
            raise ValidationError(
                {"username": f"Bu şirkette '{username}' kullanıcı adı zaten mevcut."}
            )

        updated_instance = serializer.save()
        if password:
            updated_instance.set_password(password)
            updated_instance.save()

    def destroy(self, request, *args, **kwargs):
        import traceback
        from django.db import transaction, DatabaseError, connection
        instance = self.get_object()
        user_id = instance.id
        
        try:
            with transaction.atomic():
                instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except DatabaseError as e:
            traceback.print_exc()
            msg = str(e)
            # Agar muammo bog'langan UserSettings jadvali yo'qligida bo'lsa
            if "usersettings" in msg.lower():
                try:
                    # To'g'ridan-to'g'ri SQL bilan o'chirib ko'ramiz (Django ORM bog'liqliklarni tekshirmasligi uchun)
                    with connection.cursor() as cursor:
                        cursor.execute('DELETE FROM user_app_customuser WHERE id = %s', [user_id])
                    return Response(status=status.HTTP_204_NO_CONTENT)
                except Exception as ex:
                    return Response(
                        {"detail": f"Bazaviy o'chirishda xato: {str(ex)}. Iltimos, serverda 'python manage.py migrate' buyrug'ini bering."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            return Response(
                {"detail": f"Bazaviy xatolik yuz berdi: {msg}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"detail": f"O'chirishda kutilmagan xatolik: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

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