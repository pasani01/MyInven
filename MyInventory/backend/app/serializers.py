from rest_framework import serializers
from app.models import BuyList, Item, Unit, MoneyType, Depo

class BuyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyList
        fields = ['id', 'item', 'item_count', 'item_unit', 'item_price', 'money_type', 'depo']  # BuyList modelinde company yoksa viewset'te filtreleyeceğiz

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name']  # Tek string yerine liste kullanıyoruz

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'unit']

class MoneyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoneyType
        fields = ['id', 'type']

class DepoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depo
        fields = ['id', 'name']

class BuyListTotalSerializer(serializers.Serializer):
    depo_id = serializers.IntegerField()
    total_price = serializers.FloatField()
