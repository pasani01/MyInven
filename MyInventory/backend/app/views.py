from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import F, Sum

from .models import Depo, Item, Unit, MoneyType, BuyList
from .serializers import (
    DepoSerializer, ItemSerializer, UnitSerializer, MoneyTypeSerializer,
    BuyListSerializer
)


class DepoViewSet(viewsets.ModelViewSet):
    serializer_class = DepoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:   # AnonymousUser ise boş queryset döndür
            return Depo.objects.none()
        return Depo.objects.filter(created_by=user)
    
    @swagger_auto_schema(request_body=DepoSerializer)
    def create(self, request, *args, **kwargs):
        # Depo oluştururken otomatik created_by ataması
        request.data['created_by'] = request.user.id
        return super().create(request, *args, **kwargs)


class BuyListViewSet(viewsets.ModelViewSet):
    serializer_class = BuyListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Kullanıcının sadece kendi depolarındaki buylistleri görmesini sağla
        user = self.request.user
        return BuyList.objects.filter(depo__created_by=user)

    @action(detail=False, methods=['get'])
    def total(self, request):
        """
        Belirli bir depo için toplam fiyatları para birimi bazında döndür
        ?depo_id=1
        """
        user = request.user
        depo_id = request.query_params.get('depo_id')
        if not depo_id:
            return Response({"error": "depo_id parametresi gerekli"}, status=400)

        if not Depo.objects.filter(id=depo_id, created_by=user).exists():
            return Response({"error": "Bu depo kullanıcının yetkisinde değil"}, status=403)

        buylist_qs = BuyList.objects.filter(depo_id=depo_id)

        totals = (
            buylist_qs
            .values('item_price_type__type')
            .annotate(total_price=Sum(F('item_price') * F('item_count')))
        )

        result = [{"currency": t['item_price_type__type'], "total_price": t['total_price']} for t in totals]

        return Response({"depo_id": depo_id, "totals": result})

    @action(detail=False, methods=['get'])
    def total_all_depos(self, request):
        """
        Kullanıcının tüm depolarındaki toplam fiyatları depo ve para birimi bazında döndür
        """
        user = request.user
        buylist_qs = BuyList.objects.filter(depo__created_by=user)

        totals = (
            buylist_qs
            .values('depo__id', 'depo__name', 'item_price_type__type')
            .annotate(total_price=Sum(F('item_price') * F('item_count')))
        )

        result = {}
        for t in totals:
            depo_id = t['depo__id']
            depo_name = t['depo__name']
            currency = t['item_price_type__type']
            total_price = t['total_price']

            if depo_id not in result:
                result[depo_id] = {"depo_name": depo_name, "totals": []}

            result[depo_id]["totals"].append({"currency": currency, "total_price": total_price})

        return Response(result)


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated]


class MoneyTypeViewSet(viewsets.ModelViewSet):
    queryset = MoneyType.objects.all()
    serializer_class = MoneyTypeSerializer
    permission_classes = [IsAuthenticated]
