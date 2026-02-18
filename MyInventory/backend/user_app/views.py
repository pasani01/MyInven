from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CustomUser, Company
from .serializers import CustomUserSerializer, CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Kullanıcı sadece kendi şirketini görebilir
        user = self.request.user
        if user.role == 'admin' and user.company:
            return Company.objects.filter(id=user.company.id)
        return Company.objects.none()


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin kendi şirketindeki kullanıcıları görebilir
        if user.role == 'admin' and user.company:
            return CustomUser.objects.filter(company=user.company)
        return CustomUser.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        # Sadece admin kendi company için kullanıcı oluşturabilir
        if user.role != 'admin' or not user.company:
            raise PermissionError("Sadece admin kendi company içindeki kullanıcıyı oluşturabilir.")
        serializer.save(company=user.company)
