# app/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import BuyList, Item, Unit, MoneyType, Depo
from .serializers import BuyListSerializer, ItemSerializer, UnitSerializer, MoneyTypeSerializer, DepoSerializer

class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Item.objects.none()
        user=self.request.user
        if user.is_superuser:
            return Item.objects.all()
        return Item.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class UnitViewSet(viewsets.ModelViewSet):
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Unit.objects.none()
        return Unit.objects.filter(company=self.request.user.company)
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class MoneyTypeViewSet(viewsets.ModelViewSet):
    serializer_class = MoneyTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return MoneyType.objects.none()
        return MoneyType.objects.filter(company=self.request.user.company)
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class DepoViewSet(viewsets.ModelViewSet):
    serializer_class = DepoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Depo.objects.none()
        return Depo.objects.filter(company=self.request.user.company)
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class BuyListViewSet(viewsets.ModelViewSet):
    serializer_class = BuyListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return BuyList.objects.none()
        return BuyList.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
