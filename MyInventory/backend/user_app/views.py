from rest_framework.views import APIView
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate
from .models import CustomUser, Company, Conversation, Message
from .serializers import CustomUserSerializer, CompanySerializer, UserLoginSerializer, ConversationSerializer, MessageSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Count


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

        # Agar foydalanuvchining kompaniyasi bo'lsa, xuddi shu kompaniyadagi barchani ko'rsin (Admin yoki User farqsiz)
        if user.company:
            return CustomUser.objects.filter(
                company=user.company
            ).exclude(role='superadmin')

        # Oddiy user faqat o'zini ko'radi
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
                # Explicitly delete tokens first to avoid foreign key violation
                Token.objects.filter(user=instance).delete()
                instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except DatabaseError as e:
            traceback.print_exc()
            msg = str(e)
            # Agar muammo bog'langan UserSettings jadvali yoki Token bog'liqligida bo'lsa
            if "usersettings" in msg.lower() or "authtoken_token" in msg.lower():
                try:
                    # To'g'ridan-to'g'ri SQL bilan o'chirib ko'ramiz
                    with connection.cursor() as cursor:
                        # Avval tokenni o'chirish (SQL orqali ham)
                        cursor.execute('DELETE FROM authtoken_token WHERE user_id = %s', [user_id])
                        # Keyin foydalanuvchini
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


# message views

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            return Conversation.objects.filter(participants=self.request.user).distinct()
        except Exception as e:
            # This will help us see the real error in the network tab
            raise ValidationError({"detail": f"Conversation Query Error: {str(e)}"})

    def perform_create(self, serializer):
        participants_data = self.request.data.get('participants', [])
        if not participants_data:
            participants_data = [self.request.user.id]
        elif self.request.user.id not in participants_data:
            participants_data.append(self.request.user.id)
        
        instance = serializer.save()
        instance.participants.set(participants_data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            return Message.objects.filter(conversation__participants=self.request.user).distinct()
        except Exception as e:
            raise ValidationError({"detail": f"Message Query Error: {str(e)}"})

    def perform_create(self, serializer):
        try:
            conversation_id = self.request.data.get('conversation')
            if not conversation_id:
                raise ValidationError({"detail": "Conversation ID is required"})
            
            conversation = get_object_or_404(Conversation, id=conversation_id, participants=self.request.user)
            serializer.save(sender=self.request.user, conversation=conversation)
        except Exception as e:
            raise ValidationError({"detail": str(e)})

    @action(detail=False, methods=['post'], url_path='direct-message')
    def direct_message(self, request):
        conversation_id = request.data.get('conversation')
        receiver_id = request.data.get('receiver_id')
        text = request.data.get('text')
        
        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        conversation = None
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
            except Conversation.DoesNotExist:
                return Response({"detail": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
        elif receiver_id:
            try:
                receiver = CustomUser.objects.get(id=receiver_id)
            except CustomUser.DoesNotExist:
                return Response({"detail": "Receiver not found"}, status=status.HTTP_404_NOT_FOUND)
                
            # Find DM conversation (exactly 2 participants)
            conversation = Conversation.objects.annotate(num_p=Count('participants'))\
                .filter(num_p=2)\
                .filter(participants=request.user)\
                .filter(participants=receiver)\
                .first()
            
            if not conversation:
                conversation = Conversation.objects.create()
                conversation.participants.set([request.user, receiver])
        else:
            return Response({"detail": "Either receiver_id or conversation is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                text=text
            )
            serializer = self.get_serializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Message Creation Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
