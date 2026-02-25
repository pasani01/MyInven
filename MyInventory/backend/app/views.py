# app/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import BuyList, Item, Unit, MoneyType, Depo
from .serializers import BuyListSerializer, ItemSerializer, UnitSerializer, MoneyTypeSerializer, DepoSerializer,BuyListTotalSerializer
from django.db.models import F, Sum, DecimalField,ExpressionWrapper
from django.db.models.functions import Coalesce
from rest_framework.decorators import action
from rest_framework.response import Response
from .scan_view import InvoiceScanView
from .expoer_as_excel import export_buylist_as_excel
from rest_framework.views import APIView

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
        serializer.save(company=self.request.user.company,created_by=self.request.user)


class BuyListViewSet(viewsets.ModelViewSet):
    serializer_class = BuyListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return BuyList.objects.none()
        return BuyList.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['get'])
    def total_price(self, request):
        queryset = self.get_queryset()

        total_expression = ExpressionWrapper(
            F('item_count') * F('item_price'),
            output_field=DecimalField(max_digits=18, decimal_places=2)
        )

        total = queryset.aggregate(
            total=Coalesce(
                Sum(total_expression),
                0
            )
        )

        return Response(total)


class ExportBuyListAsExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, depo_id):
        return export_buylist_as_excel(request, depo_id)    